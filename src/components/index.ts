import { Store } from '../store';
import { h } from 'snabbdom/h';
import { ActionType } from '../store/action-types';

const NewsFeedEradicator = (store: Store) => {
		const footerText = 'Blocker Settings';

	const onShowInfoPanel = () => {
		store.dispatch({ type: ActionType.UI_OPTIONS_SHOW });
		};

		const onCloseTab = () => {
			store.dispatch({ type: ActionType.UI_CLOSE_TAB } as any);
		};

	const link = h('button.nfe-settings-btn', { on: { click: onShowInfoPanel } }, footerText);
		const closeBtn = h('button.nfe-close-btn', { on: { click: onCloseTab } }, 'Close Tab');

	// Informational text before the buttons
    const count = (window as any).__NFE_DAILY_BLOCK_COUNT as number | undefined;
    const countSuffix = count != null ? ` ${count} ${count === 1 ? 'time' : 'times'} today` : '';
    const bannerText = h('span.nfe-banner-text', 'News feed blocked' + countSuffix);

	// Entire app component: order buttons with the primary action first (Close), then Settings
	return h('div', [bannerText, closeBtn, link]);
};

export default NewsFeedEradicator;
