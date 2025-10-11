import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import { POLL_INTERVAL_MS } from '../lib/constants';

export function checkSite(): boolean {
	return window.location.host.includes('youtube.com');
}

export function eradicate(store: Store) {
    function eradicateRetry() {
        const settings = store.getState().settings;
        if (settings == null || !isEnabled(settings)) {
            return;
        }

		// Flag Shorts route so CSS can apply shorts-specific blocking
		try {
			const onShorts = /^\/shorts(\/|$)/.test(window.location.pathname);
			if (onShorts) {
				document.documentElement.setAttribute('data-nfe-yt-shorts', 'true');
			} else {
				document.documentElement.removeAttribute('data-nfe-yt-shorts');
			}
		} catch (_) {}

		// Don't do anything if the UI hasn't loaded yet
        const feed = document.querySelector(
            (document.documentElement.getAttribute('data-nfe-yt-shorts') === 'true')
                ? 'ytd-shorts, #shorts-container, [role="main"]'
                : '#primary'
        );

		if (feed == null) {
			return;
		}

        const container = feed;

        // If already injected but in the wrong container (e.g., switched tabs between Home/Shorts), move it.
        try {
            const existing = document.querySelector('#nfe-container');
            if (existing && container && !container.contains(existing)) {
                // Prefer inserting at top for Shorts; append otherwise
                if (document.documentElement.getAttribute('data-nfe-yt-shorts') === 'true' && container.firstChild) {
                    container.insertBefore(existing, container.firstChild);
                } else {
                    container.appendChild(existing);
                }
            }
        } catch (_) {}

        // Add News Feed Eradicator quote/info panel
        if (container && !isAlreadyInjected()) {
            // Hack so that injectUI can handle dark theme
            document.body.style.background = 'var(--yt-spec-general-background-a)';

            injectUI(container, store);
        }

        // Proactively mute and pause any video/audio elements (e.g., Shorts autoplay audio)
        try {
            const scope: ParentNode = (feed as ParentNode) || document;
            const media = scope.querySelectorAll('video, audio') as NodeListOf<HTMLMediaElement>;
            media.forEach((m) => {
                try {
                    m.muted = true;
                    // Some players ignore muted until attribute is set too
                    (m as any).setAttribute?.('muted', '');
                    m.volume = 0;
                    if (!m.paused) m.pause();
                    // Avoid autoplay restarting
                    (m as any).removeAttribute?.('autoplay');
                } catch (_) {}
            });
        } catch (_) {}
    }

	// This delay ensures that the elements have been created before we attempt
	// to replace them
	setInterval(eradicateRetry, POLL_INTERVAL_MS);
	eradicateRetry();
}
