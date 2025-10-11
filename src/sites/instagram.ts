import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import {injectCSS} from "./shared";
import { POLL_INTERVAL_MS } from '../lib/constants';

export function checkSite(): boolean {
	return window.location.host.includes('instagram.com');
}

export function eradicate(store: Store) {
    injectCSS('instagram');

    function eradicateRetry() {
        const settings = store.getState().settings;
        if (settings == null || !isEnabled(settings)) {
            return;
        }

        // Flag reels route so CSS can apply reels-specific blocking without affecting other pages
        try {
            const onReels = /\/reels\/?/i.test(window.location.pathname);
            if (onReels) {
                document.documentElement.setAttribute('data-nfe-ig-reels', 'true');
            } else {
                document.documentElement.removeAttribute('data-nfe-ig-reels');
            }
        } catch (_) {}

        // Don't do anything if the UI hasn't loaded yet
        const feed = document.querySelector('main, [role="main"]');
        if (feed == null) {
            return;
        }

        const container = feed;

        // Add News Feed Eradicator quote/info panel
        if (feed && !isAlreadyInjected()) {
            injectUI(feed, store);
        }
    }

    // This delay ensures that the elements have been created by Twitter's
    // scripts before we attempt to replace them
    setInterval(eradicateRetry, POLL_INTERVAL_MS);
    eradicateRetry();
}
