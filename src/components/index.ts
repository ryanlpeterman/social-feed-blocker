import { Store } from '../store';
import { h } from 'snabbdom/h';
import { ActionType } from '../store/action-types';

const SocialFeedBlocker = (store: Store) => {
	const onCloseTab = () => {
		store.dispatch({ type: ActionType.UI_CLOSE_TAB } as any);
	};

	return h('div.nfe-card', [
		h('div.nfe-card-header', [
			h('div.nfe-card-title-row', [
				h('h3.nfe-card-title', 'Social Feed Blocker'),
			]),
		]),
		h('div.nfe-list', [
			h('button.nfe-list-item', { on: { click: onCloseTab } }, 'Close Tab'),
		]),
	]);
};

export default SocialFeedBlocker;
