/**
 * Strip unread-notification counters from the tab title.
 *
 * Most of the configured sites advertise pending notifications by prefixing
 * the document title, e.g. "(1) Home / X", "(3) Facebook", "(5) Feed | LinkedIn",
 * "(1) Home • Threads". That counter is visible in the tab strip even when the
 * tab is in the background, which is exactly the "come back and check" pull
 * the notification-hiding CSS is meant to remove. So we watch the title and
 * rewrite it without the prefix whenever the site is enabled.
 */

// A leading "(N)" / "(N+)" counter, or the bare unread marker ("•", "●", "*")
// some sites use instead of a count. Capped at three digits so a title that
// starts with a year, "(2019) ...", is left alone. Bare digits are not matched:
// a page called "10 tips for ..." is not a notification counter.
const COUNTER_PREFIX = /^\s*(?:\(\d{1,3}\+?\)|[•●*])\s*/;

export function scrubTitle(title: string): string {
	return title.replace(COUNTER_PREFIX, '');
}

const isSiteEnabled = () =>
	document.documentElement.dataset.nfeSiteEnabled === 'true';

export function setupTitleScrub() {
	const apply = () => {
		if (!isSiteEnabled()) return;
		const current = document.title;
		const clean = scrubTitle(current);
		// Only write when something changed: assigning document.title mutates the
		// <title> node, which would re-trigger the observer below.
		if (clean !== current) {
			document.title = clean;
		}
	};

	// <title> lives in <head>, so observing the head subtree catches both the
	// site editing the text in place and it swapping the whole <title> element.
	// Head sees far fewer mutations than body, so this is cheap.
	const observeHead = (head: HTMLHeadElement) => {
		new MutationObserver(apply).observe(head, {
			subtree: true,
			childList: true,
			characterData: true,
		});
		apply();
	};

	// Re-check when the site-wide flag flips, e.g. the user toggles the site on
	// in the options page while this tab is open.
	new MutationObserver(apply).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-nfe-site-enabled'],
	});

	if (document.head) {
		observeHead(document.head);
		return;
	}

	// We run at document_start, so <head> may not have been parsed yet.
	const waitForHead = new MutationObserver(() => {
		if (document.head) {
			waitForHead.disconnect();
			observeHead(document.head);
		}
	});
	waitForHead.observe(document.documentElement, { childList: true });
}
