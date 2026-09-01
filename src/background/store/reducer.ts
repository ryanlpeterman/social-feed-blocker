import {
	BackgroundActionObject as ActionObject,
	BackgroundActionType as ActionType,
} from './action-types';
import { combineReducers } from 'redux';
import { Permissions } from '../../webextension';
import { SiteId } from '../../sites';
import { Settings } from './index';

function permissions(
	state: Permissions | undefined,
	action: ActionObject
): Permissions {
	switch (action.type) {
		case ActionType.PERMISSIONS_UPDATE:
			return action.permissions;
	}
	return state || { permissions: [], origins: [] };
}

function sites(
	state: Settings.SitesState | undefined = Settings.defaultSites(),
	action: ActionObject
): Record<SiteId, Settings.SiteState> {
	switch (action.type) {
		case ActionType.SITES_SET_STATE:
			return { ...state, [action.siteId]: action.state };
	}
	return state || {};
}

export type SettingsState = {
	sites: Record<SiteId, Settings.SiteState>;
	permissions: Permissions;
};

export type BackgroundState =
	| { ready: false }
	| {
			ready: true;
			settings: SettingsState;
	  };

const settingsReducer = combineReducers({
	sites,
	permissions,
});

export default (
	state: BackgroundState | undefined,
	action: ActionObject
): BackgroundState => {
	// We can't do anything until the initial settings have been loaded,

	if (action.type === ActionType.SETTINGS_LOADED) {
		return { ready: true, settings: action.settings };
	} else if (state == null || state.ready === false) {
		return { ready: false };
	} else if (state.ready === true) {
		return {
			ready: true,
			settings: settingsReducer(state.settings, action),
		};
	}
	return state;
};
