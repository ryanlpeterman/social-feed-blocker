import { Effect } from '../../lib/redux-effects';
import { BackgroundState, SettingsState } from './reducer';
import { BackgroundActionObject, BackgroundActionType } from './action-types';
import { getBrowser, Port } from '../../webextension';
import { Message, MessageType } from '../../messaging/types';
import { Settings } from './index';
import { getPermissions, sitesEffect } from './sites/effects';
import { SiteId, Sites } from '../../sites';

export type BackgroundEffect = Effect<BackgroundState, BackgroundActionObject>;

const getSettings = (state: SettingsState): Settings.T => {
	return {
		version: 1,
		sites: state.sites,
	};
};

/**
 * Listen for content scripts
 */
export const listen: BackgroundEffect = (store) => {
	const browser = getBrowser();
	let lastActiveTabId: number | null = null;
	let currentActiveTabId: number | null = null;
	browser.tabs.onActivated.addListener((info) => {
		lastActiveTabId = currentActiveTabId;
		currentActiveTabId = info.tabId;
	});
	let pages: Port[] = [];
	const send = (port: Port, settings: SettingsState) => {
		try {
			port.postMessage({ t: MessageType.SETTINGS_CHANGED, settings });
		} catch (_) {
			pages = pages.filter((p) => p !== port);
		}
	};
	browser.runtime.onConnect.addListener((port) => {
		pages.push(port);
		const tabId = port.sender?.tab?.id;
		const state = store.getState();
		if (state.ready) send(port, state.settings);
		port.onDisconnect.addListener(() => {
			pages = pages.filter((p) => p !== port);
		});
		port.onMessage.addListener((msg: Message) => {
			if (msg.t === MessageType.SETTINGS_ACTION) store.dispatch(msg.action);
			if (
				msg.t === MessageType.CLOSE_ACTIVE_TAB &&
				typeof tabId === 'number' &&
				Number.isInteger(tabId) &&
				tabId >= 0
			) {
				// The sender remains the close target even if focus changes while awaiting APIs.
				const target = currentActiveTabId === tabId ? lastActiveTabId : null;
				void (async () => {
					if (target != null && target !== tabId) {
						try {
							await browser.tabs.update(target, { active: true });
						} catch (_) {
							/* target closed */
						}
					}
					try {
						await browser.tabs.remove(tabId);
					} catch (_) {
						/* sender already closed */
					}
				})();
			}
		});
	});

	let saved: string | null = null,
		pending: string | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let saving = false,
		failures = 0;
	const schedule = (delay: number) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = null;
			void flush();
		}, delay);
	};
	const flush = async () => {
		if (saving || pending === null || pending === saved) return;
		const snapshot = pending;
		saving = true;
		try {
			await Settings.save(JSON.parse(snapshot));
			saved = snapshot;
			failures = 0;
		} catch (error) {
			failures++;
			console.error('Settings save failed; retaining pending settings', error);
		} finally {
			saving = false;
			if (pending !== saved && failures <= 3)
				schedule(1000 * Math.max(1, failures));
		}
	};
	return (action) => {
		const state = store.getState();
		if (!state.ready) return;
		const serialized = JSON.stringify(getSettings(state.settings));
		if (action.type === BackgroundActionType.SETTINGS_LOADED && saved === null)
			saved = serialized;
		if (serialized !== pending) {
			pending = serialized;
			failures = 0;
			if (pending !== saved && !saving) schedule(1000);
		}
		for (const port of [...pages]) send(port, state.settings);
	};
};

export const loadSettings: BackgroundEffect = (store) => {
	let loading = false,
		failures = 0;
	return async (action) => {
		if (
			action.type !== BackgroundActionType.SETTINGS_LOAD ||
			loading ||
			store.getState().ready
		)
			return;
		loading = true;
		try {
			const [settings, permissions] = await Promise.all([
				Settings.load(),
				getPermissions(),
			]);
			const sites = Settings.defaultSites();
			for (const key of Object.keys(Sites) as SiteId[]) {
				if (settings.sites[key]) sites[key] = settings.sites[key]!;
			}
			store.dispatch({
				type: BackgroundActionType.SETTINGS_LOADED,
				settings: { sites, permissions },
			});
			store.dispatch({ type: BackgroundActionType.CONTENT_SCRIPTS_REGISTER });
		} catch (error) {
			console.error(
				'Settings load failed; existing storage is unchanged',
				error
			);
			if (++failures <= 3)
				setTimeout(
					() => store.dispatch({ type: BackgroundActionType.SETTINGS_LOAD }),
					failures * 1000
				);
		} finally {
			loading = false;
		}
	};
};

export const registerContentScripts: BackgroundEffect = (store) => {
	let locked = false,
		queued = false;
	const run = async () => {
		const browser = getBrowser();
		const state = store.getState();
		if (!state.ready) return;
		const registered = await browser.scripting.getRegisteredContentScripts({
			ids: ['intercept'],
		});
		if (registered.some((script) => script.id === 'intercept'))
			await browser.scripting.unregisterContentScripts({ ids: ['intercept'] });
		const granted = new Set(state.settings.permissions.origins || []);
		const matches = [
			...new Set(
				(Object.keys(Sites) as SiteId[])
					.flatMap((site) => Sites[site].origins)
					.filter((origin) => granted.has(origin))
			),
		];
		if (matches.length)
			await browser.scripting.registerContentScripts([
				{
					id: 'intercept',
					js: ['intercept.js'],
					css: ['eradicate.css'],
					matches,
					runAt: 'document_start',
				},
			]);
	};
	return async (action) => {
		if (
			action.type !== BackgroundActionType.CONTENT_SCRIPTS_REGISTER &&
			action.type !== BackgroundActionType.PERMISSIONS_UPDATE
		)
			return;
		if (locked) {
			queued = true;
			return;
		}
		locked = true;
		try {
			do {
				queued = false;
				try {
					await run();
				} catch (error) {
					console.error('Content script registration failed', error);
				}
			} while (queued);
		} finally {
			locked = false;
		}
	};
};

export const rootEffect = Effect.all(
	listen,
	loadSettings,
	sitesEffect,
	registerContentScripts
);
