import { h } from 'snabbdom/h';
import { Store } from '../store';
import { UiOptionsTabShow, ActionType } from '../store/action-types';
import { SitesOptions } from './sites-options';

const Heading = () => {
	return h('h3.text-center', 'News Feed Eradicator');
};

// Footer removed per personalization

// Simplified options: Sites only (no Quotes or About)
const CurrentTab = (store: Store) => SitesOptions(store);

const InfoPanel = (store: Store) => {
	const state = store.getState();

return h('div.nfe-info-panel', [
    h('div.nfe-info-col.v-stack-4', [
        Heading(),
        h('div.shadow-mid.bg-1.pad-3', [CurrentTab(store)]),
        // Footer removed
    ]),
]);
};

export default InfoPanel;
