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
	const bannerText = h('span.nfe-banner-text', 'News Feed Blocked');

	// Entire app component: order buttons with the primary action first (Close), then Settings
	return h('div', [bannerText, closeBtn, link]);
};

export default NewsFeedEradicator;
