import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import { POLL_INTERVAL_MS } from '../lib/constants';

export function checkSite(): boolean {
	return window.location.host.includes('youtube.com');
}

const SHORTS_RE = /^\/shorts(\/|$)/;

const currentShortId = (): string | null => {
	const m = window.location.pathname.match(/^\/shorts\/([^/]+)/);
	return m ? m[1] : null;
};

// The short the user actually navigated to (from a search result, a channel
// page, an external link, ...). That one is allowed to play; any other short id
// seen while still on /shorts means the feed advanced and gets blocked.
let entryShortId: string | null = null;

const siteEnabled = () =>
	document.documentElement.dataset.nfeSiteEnabled === 'true';

/**
 * Maintain the Shorts attributes on <html> and the entry-short watchdog.
 * Runs every poll tick, before any settings-based early return, so the CSS
 * gating always reflects the current route.
 */
function updateShortsState(): { onShorts: boolean; blocked: boolean } {
	const html = document.documentElement;
	if (!SHORTS_RE.test(window.location.pathname)) {
		html.removeAttribute('data-nfe-yt-shorts');
		html.removeAttribute('data-nfe-yt-shorts-blocked');
		entryShortId = null;
		return { onShorts: false, blocked: false };
	}

	html.setAttribute('data-nfe-yt-shorts', 'true');
	const id = currentShortId();
	if (entryShortId == null) {
		entryShortId = id;
	}
	// Recomputed, not latched: navigating Back to the entry short un-blocks.
	const blocked = id != null && entryShortId != null && id !== entryShortId;
	if (blocked) {
		html.setAttribute('data-nfe-yt-shorts-blocked', 'true');
	} else {
		html.removeAttribute('data-nfe-yt-shorts-blocked');
	}
	return { onShorts: true, blocked };
}

/**
 * Swallow the input gestures that advance the Shorts feed (wheel/trackpad
 * scroll, arrow/page keys). The next/prev buttons are hidden in CSS. Anything
 * that slips through (touch swipe, auto-advance) is caught by the id watchdog.
 */
function blockShortsAdvancementInputs() {
	window.addEventListener(
		'wheel',
		(e) => {
			if (!SHORTS_RE.test(window.location.pathname) || !siteEnabled()) {
				return;
			}
			// Allow scrolling inside the comments/description engagement panel.
			// composedPath (not target) so shadow-DOM retargeting can't hide it.
			if (
				e
					.composedPath()
					.some((n) => (n as HTMLElement)?.id === 'shorts-panel-container')
			) {
				return;
			}
			e.preventDefault();
			e.stopImmediatePropagation();
		},
		// passive: false is required for preventDefault to work on wheel
		{ capture: true, passive: false }
	);

	const BLOCKED_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp']);
	window.addEventListener(
		'keydown',
		(e) => {
			if (!SHORTS_RE.test(window.location.pathname) || !siteEnabled()) {
				return;
			}
			if (!BLOCKED_KEYS.has(e.key)) {
				return;
			}
			const t = e.target as HTMLElement | null;
			if (
				t &&
				(t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
			) {
				return;
			}
			e.preventDefault();
			e.stopImmediatePropagation();
		},
		true
	);
}

export function eradicate(store: Store) {
	blockShortsAdvancementInputs();

	function eradicateRetry() {
		const shorts = updateShortsState();

		if (shorts.onShorts) {
			// The entry short is allowed to play; only a slipped-through
			// advancement gets the blocked treatment (blank + overlay + silence).
			if (!siteEnabled() || !shorts.blocked) {
				return;
			}

			const feed = document.querySelector(
				'ytd-shorts, #shorts-container, [role="main"]'
			);
			if (feed == null) {
				return;
			}

			// If the panel was injected elsewhere (e.g. on Home), move it here.
			try {
				const existing = document.querySelector('#nfe-container');
				if (existing && !feed.contains(existing)) {
					if (feed.firstChild) {
						feed.insertBefore(existing, feed.firstChild);
					} else {
						feed.appendChild(existing);
					}
				}
			} catch (_) {}

			if (!isAlreadyInjected()) {
				// Hack so that injectUI can handle dark theme
				document.body.style.background = 'var(--yt-spec-general-background-a)';
				injectUI(feed, store);
			}

			muteAndPauseMedia(feed);
			return;
		}

		// Home / trending: unchanged feed blocking.
		const settings = store.getState().settings;
		if (settings == null || !isEnabled(settings)) {
			return;
		}

		// Don't do anything if the UI hasn't loaded yet
		const feed = document.querySelector('#primary');
		if (feed == null) {
			return;
		}

		// If already injected but in the wrong container (e.g. came back from
		// Shorts), move it.
		try {
			const existing = document.querySelector('#nfe-container');
			if (existing && !feed.contains(existing)) {
				feed.appendChild(existing);
			}
		} catch (_) {}

		// Add Social Feed Blocker panel
		if (!isAlreadyInjected()) {
			// Hack so that injectUI can handle dark theme
			document.body.style.background = 'var(--yt-spec-general-background-a)';
			injectUI(feed, store);
		}

		muteAndPauseMedia(feed);
	}

	// This delay ensures that the elements have been created before we attempt
	// to replace them
	setInterval(eradicateRetry, POLL_INTERVAL_MS);
	eradicateRetry();
}

// Proactively mute and pause any video/audio elements in a blocked container
// (e.g. feed or Shorts autoplay audio behind the overlay)
function muteAndPauseMedia(scope: ParentNode) {
	try {
		const media = scope.querySelectorAll(
			'video, audio'
		) as NodeListOf<HTMLMediaElement>;
		media.forEach((m) => {
			try {
				m.muted = true;
				// Some players ignore muted until attribute is set too
				m.setAttribute('muted', '');
				m.volume = 0;
				if (!m.paused) m.pause();
				// Avoid autoplay restarting
				m.removeAttribute('autoplay');
			} catch (_) {}
		});
	} catch (_) {}
}
