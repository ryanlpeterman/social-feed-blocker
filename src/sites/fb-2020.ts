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

        // Detect Reels route to apply reels-specific hiding rules
        try {
            const onReels = /\/reel(s)?\//i.test(window.location.pathname);
            if (onReels) {
                document.documentElement.setAttribute('data-nfe-fb-reels', 'true');
            } else {
                document.documentElement.removeAttribute('data-nfe-fb-reels');
            }
        } catch (_) {}

        // Don't do anything if the FB UI hasn't loaded yet
        const feed =
            document.querySelector('#ssrb_feed_start + div') || // For home and groups feed
            document.querySelector('[data-pagelet=MainFeed]') || // For watch and marketplace feeds
            document.querySelector('#watch_feed') || // For Reels/Watch feed container
            document.querySelector('div[aria-label=Gaming][role=main]') || // For gaming feed
            document.querySelector('div[role=main]') ||
            document.querySelector('div.x1hc1fzr.x1unhpq9.x6o7n8i'); // For new fb layout (Q4 2022)

		if (feed == null) {
			return;
		}

        // Prefer injecting directly into the feed container for Reels/Watch to avoid layout issues
        const isWatchOrReels = (feed as Element)?.id === 'watch_feed' ||
            document.documentElement.getAttribute('data-nfe-fb-reels') === 'true';
        const container = isWatchOrReels ? (feed as Element) : ((feed as any).parentNode || feed);

        // Add News Feed Eradicator quote/info panel
        if (container && !isAlreadyInjected()) {
            const opts = (isWatchOrReels ? { asFirstChild: true } : undefined) as any;
            injectUI(container, store, opts);
        }

        // Proactively mute/pause any video/audio on Reels pages to avoid sound
        try {
            if (document.documentElement.getAttribute('data-nfe-fb-reels') === 'true') {
                const scope: ParentNode = (feed as ParentNode) || document;
                const media = scope.querySelectorAll('video, audio') as NodeListOf<HTMLMediaElement>;
                media.forEach((m) => {
                    try {
                        m.muted = true;
                        (m as any).setAttribute?.('muted', '');
                        m.volume = 0;
                        if (!m.paused) m.pause();
                        (m as any).removeAttribute?.('autoplay');
                    } catch (_) {}
                });
            }
        } catch (_) {}
    }

	// This delay ensures that the elements have been created by Facebook's
	// scripts before we attempt to replace them
	setInterval(eradicateRetry, POLL_INTERVAL_MS);
	eradicateRetry();
}
