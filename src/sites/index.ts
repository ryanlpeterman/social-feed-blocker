import instagramCss from './instagram.str.css';
import twitterCss from './twitter.str.css';
import linkedinCss from './linkedin.str.css';
// GitHub feed eradicator removed
import threadsCss from './threads.str.css';
import tiktokCss from './tiktok.str.css';
import substackCss from './substack.str.css';

export type SiteId =
	| 'facebook'
	| 'twitter'
	| 'reddit'
	| 'hackernews'
	| 'linkedin'
	| 'youtube'
	| 'instagram'
	| 'threads'
	| 'tiktok'
	| 'substack';

export const Sites: Record<SiteId, Site> = {
	facebook: {
		label: 'Facebook',
		domain: ['facebook.com'],
		paths: [
			'/',
			'/home.php',
			'/watch',
			'/reel',
			'/reels',
			'/marketplace/',
			'/groups/feed/',
			'/gaming/feed/',
		],
		origins: [
			'https://facebook.com/*',
			'https://*.facebook.com/*',
		],
	},
	instagram: {
		label: 'Instagram',
		domain: ['instagram.com'],
		paths: ['/', '/explore/', '/reels/', '/reels/*/', '/reels/*'],
		origins: ['https://instagram.com/*', 'https://*.instagram.com/*'],
		css: instagramCss,
	},
	twitter: {
		label: 'Twitter/X',
		domain: ['twitter.com', 'x.com'],
		paths: ['/home', '/compose/tweet'],
		origins: [
			'https://twitter.com/*',
			'https://*.twitter.com/*',
			'https://x.com/*',
		],
		css: twitterCss,
	},
	youtube: {
		label: 'YouTube',
		domain: ['youtube.com'],
		paths: ['/', '/feed/trending', '/shorts'],
		origins: ['https://youtube.com/*', 'https://*.youtube.com/*'],
	},
	linkedin: {
		label: 'LinkedIn',
		domain: ['linkedin.com'],
		paths: ['/feed'],
		excludePaths: ['/feed/update'],
		origins: ['https://linkedin.com/*', 'https://*.linkedin.com/*'],
		css: linkedinCss,
	},
	reddit: {
		label: 'Reddit',
		domain: ['reddit.com'],
		paths: ['/', '/r/all/', '/r/popular/']
			.map((i) => [
				i + '',
				i + 'home/',
				i + 'hot/',
				i + 'new/',
				i + 'top/',
				i + 'rising/',
			])
			.reduce((i, j) => i.concat(j)),
		origins: ['https://reddit.com/*', 'https://*.reddit.com/*'],
	},
	hackernews: {
		label: 'Y Combinator News (HN)',
		domain: ['news.ycombinator.com'],
		paths: ['/', '/news'],
		origins: ['https://news.ycombinator.com/*'],
	},
    threads: {
        label: 'Threads',
        domain: ['threads.com'],
        paths: ['/', '/home', '/feed', '/explore', '/search', '/notifications'],
        origins: ['https://threads.com/*', 'https://*.threads.com/*'],
        css: threadsCss,
    },
    tiktok: {
        label: 'TikTok',
        domain: ['tiktok.com'],
        paths: ['/'],
        origins: ['https://tiktok.com/*', 'https://*.tiktok.com/*'],
        css: tiktokCss,
    },
    substack: {
        label: 'Substack',
        domain: ['substack.com'],
        paths: ['/', '/home'],
        origins: ['https://substack.com/*'],
        css: substackCss,
    },
};

export type Site = {
	// Label displayed in the options UI
	label: string;

	// Note: these must also be added to optional_permissions in manifest.json
	origins: string[];

	// Will be enabled for any hostnames containing this value
	domain: string[];

	// Will only be enabled for these paths
	paths: string[];

	// Optional: path prefixes to explicitly disable even if they match `paths`
	excludePaths?: string[];

	css?: string;
};
