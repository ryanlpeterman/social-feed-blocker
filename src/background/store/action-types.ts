import { SettingsState } from './reducer';
import { Permissions } from '../../webextension';
import { SiteId } from '../../sites';
import { Settings } from '.';

export enum BackgroundActionType {
	SETTINGS_LOAD = 'SETTINGS_LOAD',
	SETTINGS_LOADED = 'SETTINGS_LOADED',
	PERMISSIONS_CHECK = 'permissions/check',
	PERMISSIONS_UPDATE = 'permissions/update',
	SITES_SET_STATE = 'sites/set_state',
	CONTENT_SCRIPTS_REGISTER = 'content_scripts/register',
}

export type BackgroundActionObject =
	| SettingsLoad
	| SettingsLoaded
	| PermissionsCheck
	| PermissionsUpdate
	| SitesSetState
	| ContentScriptsRegister;

export type SettingsLoad = { type: BackgroundActionType.SETTINGS_LOAD };
export type SettingsLoaded = {
	type: BackgroundActionType.SETTINGS_LOADED;
	settings: SettingsState;
};

export type PermissionsCheck = {
	type: BackgroundActionType.PERMISSIONS_CHECK;
};
export type PermissionsUpdate = {
	type: BackgroundActionType.PERMISSIONS_UPDATE;
	permissions: Permissions;
};
export type SitesSetState = {
	type: BackgroundActionType.SITES_SET_STATE;
	siteId: SiteId;
	state: Settings.SiteState;
};
export type ContentScriptsRegister = {
	type: BackgroundActionType.CONTENT_SCRIPTS_REGISTER;
};
