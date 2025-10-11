import { Store } from '../store';
import { h } from 'snabbdom/h';
import { ActionType } from '../store/action-types';

const NewsFeedEradicator = (store: Store) => {
	const footerText = 'News Feed Eradicator Settings ↵';

	const onShowInfoPanel = () => {
		store.dispatch({ type: ActionType.UI_OPTIONS_SHOW });
	};

    const link = h('a.nfe-info-link', { props: { href: 'javascript:;' }, on: { click: onShowInfoPanel } }, [
        h('span', footerText),
    ]);

	// Entire app component: Only render the settings link (no quotes)
	return h('div', [link]);
};

export default NewsFeedEradicator;
