import { BackgroundActionObject } from '../background/store/action-types';
import { SettingsState } from '../background/store/reducer';

export enum MessageType {
	SETTINGS_ACTION,
	SETTINGS_CHANGED,
	CLOSE_ACTIVE_TAB,
}

export type Message =
	| { t: MessageType.CLOSE_ACTIVE_TAB }
	| {
			t: MessageType.SETTINGS_ACTION;
			action: BackgroundActionObject;
	  }
	| {
			t: MessageType.SETTINGS_CHANGED;
			settings: SettingsState;
	  };
