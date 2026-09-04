import { Sites, Site } from '../sites';
import { SettingsState } from '../background/store/reducer';
import {
	getSiteStatus,
	SiteStatusTag,
	SiteStatus,
} from '../background/store/sites/selectors';

export type EnabledStatus =
	| { type: 'enabled' }
	| { type: 'disabled' }
	| { type: 'disabled-temporarily'; until: number };

export function isEnabled(state: SettingsState): boolean {
	return enabledStatus(state).type === 'enabled';
}

const pathMatchesFor = (site: Site): boolean => {
	// Allow exact match or prefix match for subroutes (except root '/')
	const pathname = window.location.pathname;
	const pathMatches = (p: string) => {
		if (p === '/') {
			return pathname === '/';
		}
		const base = p.endsWith('/') ? p : p + '/';
		return pathname === p || pathname.startsWith(base);
	};

	if (!site.paths.some(pathMatches)) {
		return false;
	}
	return !site.excludePaths?.some(pathMatches);
};

/**
 * Is the current URL one we would ever block, ignoring user settings?
 *
 * This only depends on `window.location`, so it can be answered synchronously at
 * document_start - before the settings have arrived from the background script.
 * We use it to decide the initial value of `data-nfe-enabled` so the blocking CSS
 * never applies to a page we would never block (e.g. a subreddit, a YouTube video).
 */
export function matchesBlockablePath(): boolean {
	for (const siteId of Object.keys(Sites)) {
		const site: Site = Sites[siteId];
		if (
			site.domain.find((domain) => window.location.host.includes(domain)) !=
			null
		) {
			return pathMatchesFor(site);
		}
	}
	return false;
}

/**
 * Host-only match: is the current host one of the configured sites at all?
 *
 * Like `matchesBlockablePath` this only depends on `window.location`, so it can
 * be answered synchronously at document_start. Used for the provisional value of
 * `data-nfe-site-enabled`: content scripts only run on granted origins, so
 * "host matches a configured site" is the best guess for "blocker is on here"
 * before the settings arrive.
 */
export function matchesConfiguredSite(): boolean {
	for (const siteId of Object.keys(Sites)) {
		const site: Site = Sites[siteId];
		if (
			site.domain.find((domain) => window.location.host.includes(domain)) !=
			null
		) {
			return true;
		}
	}
	return false;
}

/**
 * Like `enabledStatus`, but ignoring the current path: is the blocker turned on
 * for this site at all? Drives `data-nfe-site-enabled`, which gates rules that
 * should apply on every page of a site (e.g. hiding the notifications button),
 * not just on its blocked feed paths.
 */
export function siteEnabledStatus(state: SettingsState): EnabledStatus {
	const siteStatuses = getSiteStatus(state);
	for (const siteId of Object.keys(Sites)) {
		const site: Site = Sites[siteId];
		if (
			site.domain.find((domain) => window.location.host.includes(domain)) !=
			null
		) {
			const siteStatus: SiteStatus = siteStatuses[siteId];
			if (siteStatus.type === SiteStatusTag.ENABLED) {
				return { type: 'enabled' };
			}
			if (siteStatus.type === SiteStatusTag.DISABLED_TEMPORARILY) {
				return { type: 'disabled-temporarily', until: siteStatus.until };
			}
			// DISABLED and NEEDS_NEW_PERMISSIONS both mean "off"
			return { type: 'disabled' };
		}
	}
	return { type: 'disabled' };
}

export function enabledStatus(state: SettingsState): EnabledStatus {
	const siteStatuses = getSiteStatus(state);
	for (let siteId of Object.keys(Sites)) {
		let site: Site = Sites[siteId];
		const siteStatus: SiteStatus = siteStatuses[siteId];
		if (
			site.domain.find((domain) => window.location.host.includes(domain)) !=
			null
		) {
			// Always disabled if the path doesn't match, or is explicitly excluded
			if (!pathMatchesFor(site)) {
				return { type: 'disabled' };
			}

			if (siteStatus.type === SiteStatusTag.DISABLED) {
				return { type: 'disabled' };
			} else if (siteStatus.type === SiteStatusTag.DISABLED_TEMPORARILY) {
				return { type: 'disabled-temporarily', until: siteStatus.until };
			}

			return { type: 'enabled' };
		}
	}

	return { type: 'disabled' };
}
