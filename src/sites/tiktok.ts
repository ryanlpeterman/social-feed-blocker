import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import { POLL_INTERVAL_MS } from '../lib/constants';
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

        // Add Social Media Blocker panel
        if (container && !isAlreadyInjected()) {
            injectUI(container, store);
        }

        // Proactively mute and pause any video/audio elements (TikTok often autoplays sound)
        try {
            const scope: ParentNode = (container as ParentNode) || document;
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
        } catch (_) {}
    }

    // Poll to handle SPA updates
    setInterval(eradicateRetry, POLL_INTERVAL_MS);
    eradicateRetry();
}
