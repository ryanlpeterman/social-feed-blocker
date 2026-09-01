import { ActionType, ActionObject } from './action-types';
import { BackgroundActionType } from '../background/store/action-types';
import { SiteId } from '../sites';
import { Settings } from '../background/store';

export const setSiteState = (
	siteId: SiteId,
	state: Settings.SiteState
): ActionObject => ({
	type: ActionType.BACKGROUND_ACTION,
	action: {
		type: BackgroundActionType.SITES_SET_STATE,
		siteId,
		state,
	},
});
