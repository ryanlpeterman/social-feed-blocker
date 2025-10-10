import {SiteId, Sites} from "./index";

export function injectCSS(siteId: SiteId) {
	const css = Sites[siteId].css;

	if (css != null) {
		const style = document.createElement('style');
		style.textContent = css;

		const append = () => {
			if (document.head && !style.isConnected) {
				document.head.append(style);
			}
		};

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', append, { once: true });
		} else {
			append();
		}
	}
}
