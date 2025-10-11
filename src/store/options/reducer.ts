import { combineReducers } from 'redux';
import { ActionObject, ActionType } from '../action-types';
import { SiteId } from '../../sites';

const confirmDisableSite = (
	state: SiteId | null = null,
	action: ActionObject
): SiteId | null => {
	switch (action.type) {
		case ActionType.UI_SITES_SITE_DISABLE_CONFIRM_SHOW:
			if (state === action.site) return null;
			return action.site;
		case ActionType.UI_SITES_SITE_DISABLE_CONFIRMED:
			return null;
	}
	return state;
};

// Removed legacy options tab state (tab, quotesTab)

export type OptionsState = {
    confirmDisableSite: SiteId | null;
};

export const optionsReducer = combineReducers({
    confirmDisableSite,
});
