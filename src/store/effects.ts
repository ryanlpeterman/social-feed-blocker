import { Effect } from '../lib/redux-effects';
import { IState } from './reducer';
import { ActionType, ActionObject } from './action-types';
import { setSiteState } from './actions';
import { getBrowser } from '../webextension';
import { Message, MessageType } from '../messaging/types';
import { BackgroundActionType } from '../background/store/action-types';
import { Sites } from '../sites';
import {
	getSiteStatus,
	SiteStatusTag,
} from '../background/store/sites/selectors';
import { Store } from '.';
import { Settings } from '../background/store';

export type AppEffect = Effect<IState, ActionObject>;

const requestPermissions = async (store: Store, origins: string[]) => {
	const success = await getBrowser().permissions.request({
		permissions: [],
		origins: origins,
	});
	if (success) {
		// Check and update permissions
		store.dispatch({
			type: ActionType.BACKGROUND_ACTION,
			action: { type: BackgroundActionType.PERMISSIONS_CHECK },
		});
	}
	return success;
};
const removePermissions = async (store: Store, origins: string[]) => {
	const success = await getBrowser().permissions.remove({
		permissions: [],
		origins: origins,
	});
	if (success) {
		// Check and update permissions
		store.dispatch({
			type: ActionType.BACKGROUND_ACTION,
			action: { type: BackgroundActionType.PERMISSIONS_CHECK },
		});
	}
	return success;
};

const siteClicked: AppEffect = (store) => async (action) => {
	if (action.type === ActionType.UI_SITES_SITE_CLICK) {
		const state = store.getState();
		if (state.settings == null) {
			// Can't do anything until settings have loaded
			return;
		}
		const sites = getSiteStatus(state.settings);
		const site = Sites[action.site];

		const s = sites[action.site];
		if (s.type == SiteStatusTag.NEEDS_NEW_PERMISSIONS) {
			if (await requestPermissions(store as Store, site.origins)) {
				store.dispatch(
					setSiteState(action.site, {
						type: Settings.SiteStateTag.ENABLED,
					})
				);
			} else {
				// Permission denied, disable the site
				store.dispatch(
					setSiteState(action.site, {
						type: Settings.SiteStateTag.DISABLED,
					})
				);
			}
		} else if (s.type === SiteStatusTag.DISABLED) {
			const success = await requestPermissions(store as Store, site.origins);
			if (success) {
				store.dispatch(
					setSiteState(action.site, {
						type: Settings.SiteStateTag.ENABLED,
					})
				);
			}
		} else if (s.type === SiteStatusTag.DISABLED_TEMPORARILY) {
			store.dispatch(
				setSiteState(action.site, {
					type: Settings.SiteStateTag.ENABLED,
				})
			);
		} else if (s.type === SiteStatusTag.ENABLED) {
			store.dispatch({
				type: ActionType.UI_SITES_SITE_DISABLE_CONFIRM_SHOW,
				site: action.site,
			});
		}
	}
};

const confirmSiteDisabled: AppEffect = (store) => async (action) => {
	if (action.type === ActionType.UI_SITES_SITE_DISABLE_CONFIRMED) {
		if (action.until.t === 'forever') {
			// Don't need the permissions anymore
			const site = Sites[action.site];
			await removePermissions(store as Store, site.origins);
			store.dispatch(
				setSiteState(action.site, {
					type: Settings.SiteStateTag.DISABLED,
				})
			);
		} else {
			store.dispatch(
				setSiteState(action.site, {
					type: Settings.SiteStateTag.DISABLED_TEMPORARILY,
					disabled_until: Date.now() + action.until.milliseconds,
				})
			);
		}
	}
};

// Connect to the background script and handle reconnection/fallbacks
const connect: AppEffect = (store) => {
	const browser = getBrowser();
	let port = undefined as undefined | import('../webextension').Port;
	let retryTimer: any = undefined;
	let nextDelayMs = 200;

	const clearRetry = () => {
		if (retryTimer) {
			clearTimeout(retryTimer);
			retryTimer = undefined;
		}
	};
	const scheduleRetry = () => {
		if (retryTimer) return;
		retryTimer = setTimeout(() => {
			retryTimer = undefined;
			connectPort();
		}, nextDelayMs);
		nextDelayMs = Math.min(nextDelayMs * 2, 1000);
	};
	const connectPort = () => {
		try {
			const p = browser.runtime.connect();
			p.onMessage.addListener((msg: Message) => {
				if (msg.t === MessageType.SETTINGS_CHANGED) {
					store.dispatch({
						type: ActionType.BACKGROUND_SETTINGS_CHANGED,
						settings: msg.settings,
					});
				}
			});
			p.onDisconnect.addListener(() => {
				// Port disconnected (e.g., service worker went idle). Schedule retry.
				port = undefined;
				scheduleRetry();
			});
			port = p;
			// Connected: reset backoff
			nextDelayMs = 200;
			clearRetry();
			// Nudge background to compute and send fresh settings
			try {
				p.postMessage({
					t: MessageType.SETTINGS_ACTION,
					action: { type: BackgroundActionType.PERMISSIONS_CHECK } as any,
				});
			} catch (_) {}
		} catch (e) {
			// Could not connect right now; schedule retry
			port = undefined;
			scheduleRetry();
		}
	};

	// Establish initial connection (best-effort) and schedule retries if needed
	connectPort();
	if (!port) scheduleRetry();

	return async (action) => {
		// Forward any actions to the background script
		if (action.type === ActionType.BACKGROUND_ACTION) {
			if (!port) {
				connectPort();
				if (!port) scheduleRetry();
			}
			try {
				port &&
					port.postMessage({
						t: MessageType.SETTINGS_ACTION,
						action: action.action,
					});
			} catch (_e) {
				// Retry once on a fresh connection
				connectPort();
				if (!port) scheduleRetry();
				try {
					port &&
						port.postMessage({
							t: MessageType.SETTINGS_ACTION,
							action: action.action,
						});
				} catch (_e2) {
					// Give up silently
				}
			}
		} else if (action.type === ActionType.UI_CLOSE_TAB) {
			if (!port) {
				connectPort();
				if (!port) scheduleRetry();
			}
			try {
				port && port.postMessage({ t: MessageType.CLOSE_ACTIVE_TAB });
			} catch (_e) {
				connectPort();
				if (!port) scheduleRetry();
				try {
					port && port.postMessage({ t: MessageType.CLOSE_ACTIVE_TAB });
				} catch (_e2) {}
			}
		}
	};
};

export const rootEffect: AppEffect = Effect.all(
	siteClicked,
	confirmSiteDisabled,
	connect
);
