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

export function enabledStatus(state: SettingsState): EnabledStatus {
    const siteStatuses = getSiteStatus(state);
    for (let siteId of Object.keys(Sites)) {
        let site: Site = Sites[siteId];
        const siteStatus: SiteStatus = siteStatuses[siteId];
        if (site.domain.find(domain => window.location.host.includes(domain)) != null) {
            // Always disabled if the path doesn't match
            // Allow exact match or prefix match for subroutes (except root '/')
            const pathname = window.location.pathname;
            const pathMatches = (p: string) => {
                if (p === '/') {
                    return pathname === '/';
                }
                const base = p.endsWith('/') ? p : p + '/';
                return pathname === p || pathname.startsWith(base);
            };
            const matchesPath = site.paths.some(pathMatches);
            if (!matchesPath) {
                return { type: 'disabled' };
            }

            // If the current path is explicitly excluded for this site, disable
            const isExcluded = (site as any).excludePaths?.some((p: string) => pathMatches(p));
            if (isExcluded) {
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
