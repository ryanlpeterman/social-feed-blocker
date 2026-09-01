import { BackgroundActionObject } from '../background/store/action-types';
import { SettingsState } from '../background/store/reducer';
import { SiteId } from '../sites';

export enum ActionType {
	BACKGROUND_ACTION = 'BACKGROUND_ACTION',
	BACKGROUND_SETTINGS_CHANGED = 'BACKGROUND_SETTINGS_CHANGED',
	UI_SITES_SITE_CLICK = 'sites/site/click',

	/**
	 * Show the confirmation for disabling Social Feed Blocker for a site
	 */
	UI_SITES_SITE_DISABLE_CONFIRM_SHOW = 'sites/site/disable/confirm/show',

	/**
	 * User confirmed site being disabled
	 */
	UI_SITES_SITE_DISABLE_CONFIRMED = 'sites/site/disable/confirmed',

	// UI action: request closing the current tab (handled by background)
	UI_CLOSE_TAB = 'ui/close_tab',
}

export type ActionObject =
	| BackgroundAction
	| BackgroundSettingsChanged
	| UiSitesSiteClick
	| UiSitesSiteDisableConfirmShow
	| UiSitesSiteDisableConfirmed
	| UiCloseTab;

export type BackgroundAction = {
	type: ActionType.BACKGROUND_ACTION;
	action: BackgroundActionObject;
};
export type BackgroundSettingsChanged = {
	type: ActionType.BACKGROUND_SETTINGS_CHANGED;
	settings: SettingsState;
};

export type UiSitesSiteClick = {
	type: ActionType.UI_SITES_SITE_CLICK;
	site: SiteId;
};
export type UiSitesSiteDisableConfirmShow = {
	type: ActionType.UI_SITES_SITE_DISABLE_CONFIRM_SHOW;
	site: SiteId;
};
export type UiSitesSiteDisableConfirmed = {
	type: ActionType.UI_SITES_SITE_DISABLE_CONFIRMED;
	site: SiteId;
	until: { t: 'forever' } | { t: 'temporarily'; milliseconds: number };
};

export type UiCloseTab = {
	type: ActionType.UI_CLOSE_TAB;
};
