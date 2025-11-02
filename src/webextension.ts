/**
 * See the WebExtension API:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
 */
type WebExtensionAPI = {
    runtime: {
        openOptionsPage: () => Promise<void>;
        sendMessage: (message: any) => Promise<void>;
        connect: () => Port;
        onConnect: WebExtensionEvent<Port>;
        onInstalled?: WebExtensionEvent<{ reason?: string }>;
        getURL: (path: string) => string;
    };
	action: {
		onClicked: WebExtensionEvent<void>;
	};
	permissions: {
		getAll: () => Promise<Permissions>;
		remove: (p: Permissions) => Promise<boolean>;
		request: (p: Permissions) => Promise<boolean>;
	};
    tabs: {
        onUpdated: WebExtensionEvent<TabId>;
        onActivated: WebExtensionEvent<{ tabId: number; windowId: number }>;
        query: (q: TabsQuery) => Promise<Tab[]>;
        remove: (tabId: number) => Promise<void>;
        update: (tabId: number, props: { active?: boolean }) => Promise<Tab>;
    };
	scripting: {
		executeScript: (opts: ExecuteOptions) => Promise<any>;
		insertCSS: (opts: InsertCssOptions) => Promise<any>;
		registerContentScripts: (opts: RegisteredContentScript[]) => Promise<void>;
		unregisterContentScripts: () => Promise<void>;
	};
	storage: {
		sync: {
			get(keys: string | string[] | null): Promise<any>;
			set(keys: object): void;
		};
	};
};

export type TabId = number & { __tabId: never };
export type Tab = { id: number };
export type TabsQuery = { active?: boolean; currentWindow?: boolean };

type InjectionTarget = {
	tabId: TabId;
};
type InsertCssOptions = {
	target: InjectionTarget;
	files?: string[];
	css?: string;
};
type ExecuteOptions = {
	target: { tabId: TabId };
	injectImmediately?: boolean;
	files?: string[];
	func?: () => void;
};

type RegisteredContentScript = {
	id: string;
	js?: string[];
	css?: string[];
	matches: string[];
	runAt: 'document_start' | 'document_end' | 'document_idle';
};

type WebExtensionEvent<Arg> = {
	addListener: (cb: (a: Arg) => void) => void;
};

export type Permissions = {
	permissions: string[];
	origins: string[];
};

export type Port = {
	postMessage(msg: any): void;
	onDisconnect: WebExtensionEvent<Port>;
	onMessage: WebExtensionEvent<any>;
};

/**
 * Chrome doesn't exactly match the WebExtension API, notably using callbacks instead of promises.
 * See full list of incompatibilities here:
 *
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
 */
type ChromeWebExtensionAPI = {
    runtime: {
        openOptionsPage: (cb: () => void) => void;
        sendMessage: (
            extId: string | undefined,
            message: any,
            options: undefined,
            responseCallback: (res: any) => void
        ) => void;
        connect: () => Port;
        onConnect: WebExtensionEvent<Port>;
        onInstalled?: WebExtensionEvent<{ reason?: string }>;
        getURL: (path: string) => string;
    };
	action: {
		onClicked: WebExtensionEvent<void>;
	};
	permissions: {
		getAll: (cb: (p: Permissions) => void) => void;
		remove: (p: Permissions, cb: (removed: boolean) => void) => void;
		request: (p: Permissions, cb: (granted: boolean) => void) => void;
	};
    tabs: {
        onUpdated: WebExtensionEvent<TabId>;
        onActivated: WebExtensionEvent<{ tabId: number; windowId: number }>;
        query: (q: TabsQuery, cb: (tabs: Tab[]) => void) => void;
        remove: (tabId: number, cb: () => void) => void;
        update: (tabId: number, props: { active?: boolean }, cb: (tab: Tab) => void) => void;
    };
	scripting: {
		executeScript: (opts: ExecuteOptions) => Promise<any>;
		insertCSS: (opts: InsertCssOptions) => Promise<any>;
		registerContentScripts: (opts: RegisteredContentScript[]) => Promise<void>;
		unregisterContentScripts: () => Promise<void>;
	};
	storage: {
		sync: {
			get(keys: string | string[] | null, callback: (data: any) => void): void;
			set(keys: object): void;
		};
	};
};

declare var browser: WebExtensionAPI | undefined;
declare var chrome: ChromeWebExtensionAPI | undefined;

export function getBrowser(): WebExtensionAPI {
	if (typeof browser !== 'undefined') {
		return browser;
    } else if (typeof chrome !== 'undefined') {
        // Chrome uses callbacks instead of promises, so we promisify everything
        return {
            runtime: {
                openOptionsPage: () =>
                    new Promise((resolve) => chrome!.runtime.openOptionsPage(resolve)),
                sendMessage: (m) =>
                    new Promise((resolve) =>
                        chrome!.runtime.sendMessage(undefined, m, undefined, resolve)
                    ),
                connect: chrome.runtime.connect.bind(chrome.runtime),
                onConnect: chrome.runtime.onConnect,
                onInstalled: (chrome.runtime as any).onInstalled,
                getURL: chrome.runtime.getURL.bind(chrome.runtime),
            },
			action: chrome.action,
			permissions: {
				getAll: () =>
					new Promise((resolve) => chrome!.permissions?.getAll(resolve)),
				request: (p) =>
					new Promise((resolve) => chrome!.permissions?.request(p, resolve)),
				remove: (p) =>
					new Promise((resolve) => chrome!.permissions?.remove(p, resolve)),
			},
            tabs: {
                onUpdated: chrome!.tabs?.onUpdated,
                onActivated: chrome!.tabs?.onActivated,
                query: (q) => new Promise((resolve) => chrome!.tabs?.query(q as any, resolve as any)),
                remove: (tabId) => new Promise((resolve) => chrome!.tabs?.remove(tabId as any, resolve)),
                update: (tabId, props) => new Promise((resolve) => chrome!.tabs?.update(tabId as any, props as any, resolve as any)),
            },
			scripting: chrome.scripting,
			storage: {
				sync: {
					get: (key: string | string[]) =>
						new Promise((resolve) => {
							chrome!.storage.sync.get(key, resolve);
						}),
					set: chrome.storage.sync.set.bind(chrome!.storage.sync),
				},
			},
		};
	} else {
		throw new Error('Could not find WebExtension API');
	}
}
