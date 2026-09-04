/**
 * This script should run at document start to set up
 * intercepts before the site loads.
 */

import './eradicate.css';
import {
	applyProvisionalEnabledStatus,
	setupRouteChange,
} from './lib/route-change';
import { setupTitleScrub } from './lib/title-scrub';

import * as FbClassic from './sites/fb-classic';
import * as Fb2020 from './sites/fb-2020';
import * as Twitter from './sites/twitter';
import * as Reddit from './sites/reddit';
import * as HackerNews from './sites/hackernews';
import * as LinkedIn from './sites/linkedin';
import * as Instagram from './sites/instagram';
import * as YouTube from './sites/youtube';
import * as TikTok from './sites/tiktok';
import * as Threads from './sites/threads';
import * as Substack from './sites/substack';
import { createStore, Store } from './store';

// Decide up front whether this page is blockable at all. Without this the CSS
// would be in its indeterminate state until the background script answers, which
// blanked pages we never block (any subreddit, any YouTube video) - and blanked
// them permanently whenever the service worker never replied.
applyProvisionalEnabledStatus();

const store = createStore();

export function eradicate(store: Store) {
	// Determine which site we're working with
	if (Reddit.checkSite()) {
		Reddit.eradicate(store);
	} else if (Twitter.checkSite()) {
		Twitter.eradicate(store);
	} else if (HackerNews.checkSite()) {
		HackerNews.eradicate(store);
	} else if (LinkedIn.checkSite()) {
		LinkedIn.eradicate(store);
	} else if (YouTube.checkSite()) {
		YouTube.eradicate(store);
	} else if (Instagram.checkSite()) {
		Instagram.eradicate(store);
	} else if (TikTok.checkSite()) {
		TikTok.eradicate(store);
	} else if (Substack.checkSite()) {
		Substack.eradicate(store);
	} else if (Threads.checkSite()) {
		Threads.eradicate(store);
	} else if (FbClassic.checkSite()) {
		FbClassic.eradicate(store);
	} else {
		Fb2020.eradicate(store);
	}
}

setupRouteChange(store);
setupTitleScrub();
eradicate(store);
