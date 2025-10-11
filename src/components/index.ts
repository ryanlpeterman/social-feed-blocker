import { Store } from '../store';
import { h } from 'snabbdom/h';
import { ActionType } from '../store/action-types';

const NewsFeedEradicator = (store: Store) => {
		const footerText = 'News Feed Eradicator Settings';

	const onShowInfoPanel = () => {
		store.dispatch({ type: ActionType.UI_OPTIONS_SHOW });
		};

		const onCloseTab = () => {
			store.dispatch({ type: ActionType.UI_CLOSE_TAB } as any);
		};

	const link = h('button.nfe-settings-btn', { on: { click: onShowInfoPanel } }, footerText);
		const closeBtn = h('button.nfe-close-btn', { on: { click: onCloseTab } }, 'Close Tab');

	// Entire app component: Only render the settings link (no quotes)
	return h('div', [link, closeBtn]);
};

export default NewsFeedEradicator;
