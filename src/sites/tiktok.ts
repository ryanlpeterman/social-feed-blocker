import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import { injectCSS } from './shared';

export function checkSite(): boolean {
    return window.location.host.includes('tiktok.com');
}

export function eradicate(store: Store) {
    injectCSS('tiktok');

    function eradicateRetry() {
        const settings = store.getState().settings;
        if (settings == null || !isEnabled(settings)) {
            return;
        }

        // Don't do anything if the UI hasn't loaded yet
        const feed = document.querySelector('main');
        if (feed == null) {
            return;
        }

        const container = feed;

        // Add News Feed Eradicator panel
        if (container && !isAlreadyInjected()) {
            injectUI(container, store);
        }
    }

    // Poll to handle SPA updates
    setInterval(eradicateRetry, 1000);
}
