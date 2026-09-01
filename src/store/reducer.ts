import { combineReducers } from 'redux';
import { ActionObject, ActionType } from './action-types';
import { SettingsState } from '../background/store/reducer';
import { OptionsState, optionsReducer } from './options/reducer';

const settings = (
	state: SettingsState | null = null,
	action: ActionObject
): SettingsState | null => {
	if (action.type === ActionType.BACKGROUND_SETTINGS_CHANGED) {
		return action.settings;
	}
	return state;
};

export interface IState {
	settings: SettingsState | null;
	uiOptions: OptionsState;
}

export default combineReducers({
	settings,
	uiOptions: optionsReducer,
});
