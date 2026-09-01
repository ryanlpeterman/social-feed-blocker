import {
	enabledStatus,
	matchesBlockablePath,
	matchesConfiguredSite,
	siteEnabledStatus,
} from './is-enabled';
import { Store } from '../store';
import { POLL_INTERVAL_MS } from './constants';

// Unforunately the browser provides no native way to observe route changes initiated
// by the page. The `popstate` event only observes browser initiated back/forward events.
// So, we resort to this hack: checking the document URL every n milliseconds, to see if
// it's changed.
// NB: I also tried monkey patching history.pushState to intercept the calls, but that
// had no effect.
const CHECK_INTERVAL = POLL_INTERVAL_MS;

let lastPath: string | undefined = undefined;
let element = document.querySelector('html');

/**
 * Set the flag the blocking CSS keys off. Always leave it in a definite state:
 * every rule requires `data-nfe-enabled='true'`, so an unset attribute would mean
 * "block nothing" on a feed page, and a stale 'true' would mean "block everything"
 * on a page we never wanted to touch.
 */
const setEnabled = (enabled: boolean) => {
	element!.dataset.nfeEnabled = enabled ? 'true' : 'false';
};

/**
 * Site-wide flag, independent of the current path: 'true' whenever the blocker
 * is turned on for this site at all. Gates rules that should apply on every
 * page of a site (notification buttons, Shorts navigation) while
 * `data-nfe-enabled` stays scoped to the blocked feed paths.
 */
const setSiteEnabled = (enabled: boolean) => {
	element!.dataset.nfeSiteEnabled = enabled ? 'true' : 'false';
};

/**
 * Best guess at the enabled state before the settings arrive from the background
 * script. Path-only, so it never blocks a page that isn't a configured feed, and
 * it blocks a feed page immediately rather than flashing the feed first.
 * The site-wide flag guesses from the host alone: content scripts only run on
 * granted origins, so hide site chrome immediately rather than flashing it.
 */
export function applyProvisionalEnabledStatus() {
	setEnabled(matchesBlockablePath());
	setSiteEnabled(matchesConfiguredSite());
}

export function setupRouteChange(store: Store) {
	const updateEnabledStatus = (): any => {
		const settings = store.getState().settings;
		if (settings == null) {
			// Settings not loaded yet. Fall back to the path-only guess so a route
			// change is reflected even while the background script is unreachable.
			applyProvisionalEnabledStatus();
			setTimeout(updateEnabledStatus, 100);
			return;
		}

		// The site-wide flag ignores the path, so `enabledStatus` (which fails on
		// path mismatch first) can't drive it. When the site is snoozed on a
		// non-feed path, schedule our own re-check: nothing else would re-hide
		// the site chrome when the snooze expires.
		const siteStatus = siteEnabledStatus(settings);
		setSiteEnabled(siteStatus.type === 'enabled');
		if (siteStatus.type === 'disabled-temporarily') {
			const remaining = siteStatus.until - Date.now();
			setTimeout(updateEnabledStatus, remaining > 60000 ? 60000 : remaining);
		}

		const wasEnabled = element!.dataset.nfeEnabled === 'true';
		const status = enabledStatus(settings);
		switch (status.type) {
			case 'enabled':
				setEnabled(true);
				// Scroll back to top when reenabled. Only on the transition: this runs on
				// every store update (including background reconnects), and scrolling the
				// user to the top of the page on a timer is its own kind of distraction.
				if (!wasEnabled) {
					setTimeout(() => window.scrollTo(0, 0), 100);
				}
				return;
			case 'disabled':
				// Delay showing the feed when switching pages, sometimes it can appear
				// before the page has switched
				//
				// Removed for now as this was causing issues when loading twitter. When
				// it's disabled then enabled immediately after, the timeout still hangs around
				// for a second and eventually disables it.
				// setTimeout(() => {
				// 	element!.dataset.nfeEnabled = 'false';
				// }, 1000);

				setEnabled(false);
				return;
			case 'disabled-temporarily':
				setEnabled(false);
				const remainingTime = status.until - Date.now();
				const checkAgainDelay = remainingTime > 60000 ? 60000 : remainingTime;
				setTimeout(updateEnabledStatus, checkAgainDelay);
		}
	};

	let timer: NodeJS.Timer | undefined = undefined;
	const checkIfLocationChanged = () => {
		let path = document.location.pathname;
		if (path != lastPath) {
			lastPath = path;
			updateEnabledStatus();
		}
		if (timer != null) {
			clearTimeout(timer);
		}
		timer = setTimeout(checkIfLocationChanged, CHECK_INTERVAL);
	};
	window.addEventListener('popstate', checkIfLocationChanged);

	// When the store changes, we might want to check if the enabled state has changed
	store.subscribe(() => {
		updateEnabledStatus();
	});

	checkIfLocationChanged();
}
