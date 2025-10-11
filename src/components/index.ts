import { Store } from '../store';
import { h } from 'snabbdom/h';
import { ActionType } from '../store/action-types';
import { getBrowser } from '../webextension';

const SocialFeedBlocker = (store: Store) => {
	const onShowInfoPanel = () => {
		store.dispatch({ type: ActionType.UI_OPTIONS_SHOW });
	};

	const onCloseTab = () => {
		store.dispatch({ type: ActionType.UI_CLOSE_TAB } as any);
	};

	// Informational text before the buttons
    const count = (window as any).__NFE_DAILY_BLOCK_COUNT as number | undefined;
    const countSuffix = count != null ? ` ${count} ${count === 1 ? 'time' : 'times'} today` : '';
    const bannerText = h('span.nfe-banner-text', 'Blocked' + countSuffix);

    // Card layout to mirror the settings page: header + subtitle, then list-like rows
    const brandIconUrl = getBrowser().runtime.getURL('transparent-icon.png');

    return h('div.nfe-card', [
        h('div.nfe-card-header', [
            h('div.nfe-card-title-row', [
                h('h3.nfe-card-title', 'Social Feed Blocker'),
                h('img.nfe-brand-icon', { attrs: { src: brandIconUrl, alt: '' } }),
            ]),
            h('div.nfe-card-subtitle', [bannerText]),
        ]),
        h('div.nfe-list', [
            h('button.nfe-list-item', { on: { click: onCloseTab } }, 'Close Tab'),
            h('button.nfe-list-item', { on: { click: onShowInfoPanel } }, 'Blocker Settings'),
        ]),
    ]);
};

export default SocialFeedBlocker;
