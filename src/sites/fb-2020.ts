import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import { POLL_INTERVAL_MS } from '../lib/constants';

//export function checkSite(): boolean {
//	return !!document.querySelector('#stream_pagelet');
//}

export function eradicate(store: Store) {
	function eradicateRetry() {
		const settings = store.getState().settings;
		if (settings == null || !isEnabled(settings)) {
			return;
		}

		// Remove notification text from document.title (i.e. '(7)' in '(7) Facebook')
		if (document.title !== 'Facebook') {
			document.title = 'Facebook';
		}


		// Detect Reels route and expose a flag for CSS-only rules
		let onReels = false;
		try {
			onReels = /\/reel(s)?\//i.test(window.location.pathname);
			if (onReels) {
				document.documentElement.setAttribute('data-nfe-fb-reels', 'true');
			} else {
				document.documentElement.removeAttribute('data-nfe-fb-reels');
			}
		} catch (_) {}

		// Choose container depending on route: prefer dedicated Reels container
		const feed = onReels
			? (document.querySelector('#watch_feed') || document.querySelector("div[role='main']"))
			: (document.querySelector('#ssrb_feed_start + div') || // For home and groups feed
				document.querySelector('[data-pagelet=MainFeed]') || // For watch and marketplace feeds
				document.querySelector("div[aria-label=Gaming][role=main]") || // For gaming feed
				document.querySelector('div.x1hc1fzr.x1unhpq9.x6o7n8i'));

		if (feed == null) {
			return;
		}

		const container = feed as Element;

		// Add News Feed Eradicator quote/info panel
		if (container && !isAlreadyInjected()) {
			// Insert first so it appears at the top of the feed (like LinkedIn)
			injectUI(container, store, { asFirstChild: true });
		}
	}

	// This delay ensures that the elements have been created by Facebook's
	// scripts before we attempt to replace them
	setInterval(eradicateRetry, POLL_INTERVAL_MS);
	eradicateRetry();
}
