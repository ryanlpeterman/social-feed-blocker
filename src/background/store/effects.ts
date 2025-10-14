import { Effect } from '../../lib/redux-effects';
import { BackgroundState, SettingsState } from './reducer';
import { BackgroundActionObject, BackgroundActionType } from './action-types';
import { getBrowser, Port } from '../../webextension';
import { Message, MessageType } from '../../messaging/types';
import { Settings } from './index';
import { getPermissions, sitesEffect } from './sites/effects';
import { SiteId, Sites } from '../../sites';
import SiteStateTag = Settings.SiteStateTag;

export type BackgroundEffect = Effect<BackgroundState, BackgroundActionObject>;

const getSettings = (state: SettingsState): Settings.T => {
	return {
		version: 1,
		showQuotes: state.showQuotes,
		builtinQuotesEnabled: state.builtinQuotesEnabled,
		hiddenBuiltinQuotes: state.hiddenBuiltinQuotes,
		customQuotes: state.customQuotes,
		sites: state.sites,
	};
};

/**
 * Listen for content scripts
 */
const listen: BackgroundEffect = (store) => {
    const browser = getBrowser();
    // Track last active tab id to support returning to it after close
    let lastActiveTabId: number | null = null;
    let currentActiveTabId: number | null = null;
    try {
        browser.tabs.onActivated.addListener((info: any) => {
            lastActiveTabId = currentActiveTabId;
            currentActiveTabId = info?.tabId ?? null;
        });
    } catch (e) {
        // ignore if tabs API not available
    }
	let pages: Port[] = [];
	browser.runtime.onConnect.addListener((port) => {
		pages.push(port);

		const state = store.getState();
		// Send the new client the latest settings
		if (state.ready === true) {
			const settings: SettingsState = state.settings;
			port.postMessage({ t: MessageType.SETTINGS_CHANGED, settings });
		}

		// Remove the port when it closes
		port.onDisconnect.addListener(
			() => (pages = pages.filter((p) => p !== port))
		);
		port.onMessage.addListener((msg: Message) => {
			if (msg.t === MessageType.SETTINGS_ACTION) {
				store.dispatch(msg.action);
			}
            if (msg.t === MessageType.OPTIONS_PAGE_OPEN) {
                browser.runtime.openOptionsPage().catch((e) => console.error(e));
            }
            if (msg.t === MessageType.CLOSE_ACTIVE_TAB) {
                (async () => {
                    try {
                        const tabs = await browser.tabs.query({ active: true, currentWindow: true } as any);
                        const active = tabs && tabs[0];
                        const activeId: number | undefined = active && (active as any).id;
                        const target = (lastActiveTabId != null && lastActiveTabId !== activeId) ? lastActiveTabId : undefined;
                        if (target != null) {
                            try { await (browser.tabs as any).update(target, { active: true }); } catch (e) { console.error(e); }
                        }
                        if (typeof activeId === 'number') {
                            await browser.tabs.remove(activeId);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                })();
            }
            if (msg.t === MessageType.CLOSE_ACTIVE_TAB) {
                try {
                    getBrowser().tabs
                        .query({ active: true, currentWindow: true })
                        .then((tabs) => {
                            const tab = tabs && tabs[0];
                            if (tab && typeof (tab as any).id === 'number') {
                                return getBrowser().tabs.remove((tab as any).id as number);
                            }
                        })
                        .catch((e) => console.error(e));
                } catch (e) {
                    console.error(e);
                }
            }
		});
	});

	// Then, after every store action we save the settings and
	// let all the clients know the new settings
	return () => {
		const state = store.getState();
		// Send the new client the latest settings
		if (state.ready === true) {
			const settings: SettingsState = state.settings;
			Settings.save(getSettings(state.settings));
			pages.forEach((port) =>
				port.postMessage({ t: MessageType.SETTINGS_CHANGED, settings })
			);
		}
	};
};

// Removed new-feature helper: no feature-bump prompts anymore

const loadSettings: BackgroundEffect = (store) => async (action) => {
	if (action.type === BackgroundActionType.SETTINGS_LOAD) {
		const [settings, permissions] = await Promise.all([
			Settings.load(),
			getPermissions(),
		]);

		const sites: Record<SiteId, Settings.SiteState> = {} as Record<
			SiteId,
			Settings.SiteState
		>;
		// For any sites that don't yet exist in the settings,
		// add a note to look at the permissions as the source of
		// truth instead
		for (const key of Object.keys(Sites)) {
			sites[key] =
				settings.sites[key] != null
					? settings.sites[key]
					: { type: Settings.SiteStateTag.CHECK_PERMISSIONS };
		}

		const state: SettingsState = {
			showQuotes: settings.showQuotes,
			builtinQuotesEnabled: settings.builtinQuotesEnabled,
			hiddenBuiltinQuotes: settings.hiddenBuiltinQuotes,
			customQuotes: settings.customQuotes,
			sites,
			permissions,
		};

		store.dispatch({
			type: BackgroundActionType.SETTINGS_LOADED,
			settings: state,
		});

		store.dispatch({ type: BackgroundActionType.CONTENT_SCRIPTS_REGISTER });
	}
};

export const registerContentScripts: BackgroundEffect =
    (store) => async (action) => {
        // Simple debounce/lock to avoid duplicate register calls racing
        const anySelf = registerContentScripts as any;
        if (anySelf._lock == null) anySelf._lock = false;
        if (anySelf._queued == null) anySelf._queued = false;

        const run = async () => {
            const browser = getBrowser();
            // Unregister existing scripts first to avoid duplicate ID errors
            try { await browser.scripting.unregisterContentScripts(); } catch (_) {}

            const state = store.getState();
            if (state.ready === false) return;

            // Only register for granted origins to avoid API errors
            const granted = new Set(state.settings.permissions.origins || []);
            const siteIds = Object.keys(state.settings.sites) as SiteId[];
            const siteMatches = siteIds
                .flatMap((siteId) => Sites[siteId].origins)
                .filter((origin) => granted.has(origin));

            if (siteMatches.length === 0) return; // Nothing to register

            try {
                await browser.scripting.registerContentScripts([
                    {
                        id: 'intercept',
                        js: ['intercept.js'],
                        css: ['eradicate.css'],
                        matches: siteMatches,
                        runAt: 'document_start',
                    },
                ]);
            } catch (e: any) {
                // Handle duplicate ID race by force-unregistering and retrying once
                const msg = String(e || '');
                if (msg.includes('Duplicate script ID') || msg.includes('duplicate script id')) {
                    try { await browser.scripting.unregisterContentScripts(); } catch (_) {}
                    try {
                        await browser.scripting.registerContentScripts([
                            {
                                id: 'intercept',
                                js: ['intercept.js'],
                                css: ['eradicate.css'],
                                matches: siteMatches,
                                runAt: 'document_start',
                            },
                        ]);
                    } catch (_) {
                        // give up silently; next update will retry
                    }
                } else {
                    // Non-duplicate error: ignore to avoid crashing the SW
                }
            }
        };

        if (
            action.type === BackgroundActionType.CONTENT_SCRIPTS_REGISTER ||
            action.type === BackgroundActionType.PERMISSIONS_UPDATE
        ) {
            if (anySelf._lock) {
                anySelf._queued = true;
                return;
            }
            anySelf._lock = true;
            try {
                await run();
            } finally {
                anySelf._lock = false;
                if (anySelf._queued) {
                    anySelf._queued = false;
                    // Schedule a follow-up registration to apply latest state
                    store.dispatch({ type: BackgroundActionType.CONTENT_SCRIPTS_REGISTER });
                }
            }
        }
    };

export const logAction: BackgroundEffect = (store) => async (action) => {
	console.info(action);
};

export const rootEffect = Effect.all(
	listen,
	loadSettings,
	sitesEffect,
	registerContentScripts,
	logAction
);
