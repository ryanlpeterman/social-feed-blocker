import { Store } from '../store/index';
import SocialFeedBlocker from '../components/index';
import { getBrowser } from '../webextension';
import { init } from 'snabbdom';
import { h } from 'snabbdom/h';
import propsModule from 'snabbdom/modules/props';
import attrsModule from 'snabbdom/modules/attributes';
import eventsModule from 'snabbdom/modules/eventlisteners';
import { toVNode } from 'snabbdom/tovnode';

export function isAlreadyInjected() {
	return document.querySelector('#nfe-container') != null;
}

const rgbRe = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;

/**
 * Inject the Social Feed Blocker panel into the page.
 */
export default function injectUI(
    streamContainer: Node,
    store: Store,
    opts: { asFirstChild?: boolean } = {}
) {
	const nfeContainer = document.createElement('div');
	nfeContainer.id = 'nfe-container';
	if (opts.asFirstChild && streamContainer.firstChild) {
		streamContainer.insertBefore(nfeContainer, streamContainer.firstChild);
	} else {
		streamContainer.appendChild(nfeContainer);
	}

	const patch = init([propsModule, attrsModule, eventsModule]);

	let vnode = toVNode(nfeContainer);

    const render = () => {
        const newVnode = h('div#nfe-container', [SocialFeedBlocker(store)]);

		patch(vnode, newVnode);
		vnode = newVnode;

		const col = window.getComputedStyle(document.body)['background-color'];
		const match = rgbRe.exec(col);
		if (match) {
			const r = parseInt(match[1], 10);
			const g = parseInt(match[2], 10);
			const b = parseInt(match[3], 10);
			// Check the background color
			let mode: string;
			if (r < 100 && g < 100 && b < 100) {
				mode = 'dark';
			} else {
				mode = 'light';
			}
			document.body.dataset.nfeColorScheme = mode;
        }
    };

    render();
    // Subscribe for updates and re-render; ignore returned unsubscribe since this lives for page lifetime
    try { (store.subscribe as any)(render); } catch (_) { store.subscribe(render as any); }

    // Increment a daily counter for "times blocked" and re-render once updated.
    (async () => {
        try {
            const browser = getBrowser();
            const key = 'nfeDailyBlockCount';
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
                today.getDate()
            ).padStart(2, '0')}`;

            const data = await browser.storage.sync.get(key);
            let rec = (data && data[key]) || { date: todayStr, count: 0 };
            if (rec.date !== todayStr) {
                rec = { date: todayStr, count: 0 };
            }
            rec.count += 1;
            await browser.storage.sync.set({ [key]: rec });

            // Expose count for rendering (simple shared state for snabbdom component)
            (window as any).__NFE_DAILY_BLOCK_COUNT = rec.count;
            (window as any).__NFE_DAILY_BLOCK_DATE = rec.date;
            render();
        } catch (e) {
            // Non-fatal: if storage fails, just skip the counter
        }
    })();
}
