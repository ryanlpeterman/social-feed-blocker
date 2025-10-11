import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';

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

		// Add News Feed Eradicator quote/info panel
		if (container && !isAlreadyInjected()) {
			// Hack so that injectUI can handle dark theme
			document.body.style.background = 'var(--yt-spec-general-background-a)';

			injectUI(container, store);
		}
	}

	// This delay ensures that the elements have been created before we attempt
	// to replace them
	setInterval(eradicateRetry, 1000);
}
