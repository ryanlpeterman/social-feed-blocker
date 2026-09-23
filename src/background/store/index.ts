import { getBrowser } from '../../webextension';
import { SiteId, Sites } from '../../sites';

export namespace Settings {
	type V1 = {
		version: 1;
		sites: Partial<SitesState>;
	};

	export type SitesState = Record<SiteId, SiteState>;

	const defaults: V1 = {
		version: 1,
		sites: {},
	};
	export const defaultSites = (): SitesState => {
		const sites: SitesState = {} as SitesState;
		for (const siteId of Object.keys(Sites)) {
			sites[siteId] = { type: SiteStateTag.CHECK_PERMISSIONS };
		}
		return sites;
	};

	export enum SiteStateTag {
		ENABLED = 'enabled',
		CHECK_PERMISSIONS = 'check_permissions',
		DISABLED = 'disabled',
		DISABLED_TEMPORARILY = 'disabled_temporarily',
	}

	export type SiteState =
		| { type: SiteStateTag.ENABLED }
		| { type: SiteStateTag.DISABLED }
		| { type: SiteStateTag.CHECK_PERMISSIONS }
		| { type: SiteStateTag.DISABLED_TEMPORARILY; disabled_until: number };

	export type T = V1;

	export function validSiteState(value: unknown): value is SiteState {
		if (!value || typeof value !== 'object') return false;
		const state = value as Partial<SiteState>;
		if (state.type === SiteStateTag.DISABLED_TEMPORARILY)
			return (
				Number.isSafeInteger(state.disabled_until) &&
				Number(state.disabled_until) >= 0
			);
		return (
			state.type === SiteStateTag.ENABLED ||
			state.type === SiteStateTag.DISABLED ||
			state.type === SiteStateTag.CHECK_PERMISSIONS
		);
	}

	export function parse(value: unknown): T {
		if (!value || typeof value !== 'object' || Array.isArray(value))
			throw new Error('Invalid saved settings');
		const settings = value as Partial<V1>;
		if (settings.version !== undefined && settings.version !== 1)
			throw new Error('Unsupported saved settings version');
		if (
			settings.sites !== undefined &&
			(!settings.sites ||
				typeof settings.sites !== 'object' ||
				Array.isArray(settings.sites))
		)
			throw new Error('Invalid saved sites');
		const sites: Partial<SitesState> = {};
		for (const id of Object.keys(Sites) as SiteId[]) {
			const state = settings.sites && settings.sites[id];
			if (validSiteState(state))
				sites[id] =
					state.type === SiteStateTag.DISABLED_TEMPORARILY
						? { type: state.type, disabled_until: state.disabled_until }
						: { type: state.type };
		}
		return { version: 1, sites };
	}

	export async function load(): Promise<T> {
		return parse(await getBrowser().storage.sync.get(null));
	}

	export async function save(settings: T) {
		return getBrowser().storage.sync.set({ ...defaults, ...settings });
	}
}
