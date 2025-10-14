import { createBackgroundStore } from './store/store';
import { getBrowser, TabId } from '../webextension';
import { Sites } from '../sites';

createBackgroundStore();

const browser = getBrowser();
browser.action.onClicked.addListener(() => {
	browser.runtime.openOptionsPage();
});

// Open Options once on install to let users configure sites
try {
    (browser.runtime as any).onInstalled?.addListener((details: any) => {
        if (details?.reason === 'install') {
            try { browser.runtime.openOptionsPage(); } catch (_e) {}
        }
    });
} catch (_e) {
    // Ignore if not available in this environment
}
