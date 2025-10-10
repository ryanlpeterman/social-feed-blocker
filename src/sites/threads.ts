import injectUI, { isAlreadyInjected } from '../lib/inject-ui';
import { isEnabled } from '../lib/is-enabled';
import { Store } from '../store';
import { injectCSS } from './shared';

export function checkSite(): boolean {
  return window.location.host.includes('threads.com');
}

export function eradicate(store: Store) {
  // Load site-specific CSS to hide the feed content
  injectCSS('threads');

  function eradicateRetry() {
    const settings = store.getState().settings;
    if (settings == null || !isEnabled(settings)) return;

    // Prefer the explicit column body region if present; include common fallbacks
    const selectors = [
      "div[role='region'][aria-label='Column body']",
      "[role='feed']",
      'main',
      "[role='main']",
    ];

    let feed: Element | null = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel) as Element | null;
      if (el) {
        feed = el;
        break;
      }
    }

    if (feed == null) return;

    if (!isAlreadyInjected()) {
      // Inject within the feed container so our CSS can preserve our panel
      injectUI(feed, store, { asFirstChild: true });
    }
  }

  // Poll periodically to handle client-side route changes and lazy rendering
  setInterval(eradicateRetry, 1000);
}

