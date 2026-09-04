# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Strip unread counters from the tab title on every enabled site: "(1) Home"
  becomes "Home", "(3) Home / X" becomes "Home / X", and so on. The counter is
  visible in the tab strip even when the tab is in the background, which is the
  same "come back and check" pull the notification-button hiding removes.
- New site-wide flag `data-nfe-site-enabled` (set from settings alone, ignoring
  the path) gates rules that should apply on every page of an enabled site.
  Notification buttons (Twitter/X, LinkedIn, Threads, Facebook, YouTube bell) now
  stay hidden on all routes - e.g. x.com/i/chat - not just on the blocked feed
  paths.
- Fix LinkedIn feed blocking after another DOM migration: the
  `data-display-contents` post marker moved inside new `data-lazy-mount-id`
  wrappers. The "Start a post" composer and sort bar stay visible.
- Fix Threads notification hiding: the icon's wrapper was hidden but the
  `/activity` link kept its clickable hit area; hide the link itself.
- Fix Facebook notification hiding: the bell is a `div[role=button]` in the
  current DOM, not an anchor.
- YouTube Shorts: a short you navigate to directly now plays normally. Only
  advancing to the next short is blocked - next/prev arrows are hidden,
  wheel/arrow-key advancement is swallowed (comment-panel scrolling still
  works), and if an advancement slips through anyway (touch swipe,
  auto-advance) the player is blanked and muted until you go back.
- Stop blocking pages that aren't configured feeds. Several CSS rules (Reddit's
  `shreddit-feed > article`, YouTube's `#content #related`, Twitter's sidebar,
  the old Facebook selectors) had no enabled-check at all, so they hid content on
  every page of those hosts - every subreddit, every video - regardless of settings.
- Blocking CSS now requires `data-nfe-enabled='true'` instead of merely "not
  `false`". The flag is set synchronously at document_start from the URL alone, so
  a page is no longer blanked while waiting on the background script, and stays
  usable if the service worker never answers.
- Only scroll back to the top when the blocker actually switches on, instead of on
  every settings broadcast (which fired each time the service worker reconnected).

## [1.0.3] - 2026-09-01

- Hide notification buttons site-wide on Twitter/X, LinkedIn, Threads, Facebook
  and YouTube, not just on blocked feed paths.
- YouTube Shorts: a short opened directly plays normally; only advancing to the
  next short is blocked.
- Fix LinkedIn feed blocking after DOM migrations (hashed class names,
  `data-lazy-mount-id` wrappers); keep the "Start a post" composer visible.
- Stop blocking pages that aren't configured feeds; blocking CSS now requires
  an explicit `data-nfe-enabled='true'`.
- Remove dead code: the unreachable quote subsystem, unused modules, deps and
  CSS.

## [1.0.2] - 2025-11-02

- Open the options page once on install.

## [1.0.1] - 2025-10-14

- Optional host permissions are https-only and deduplicated; add an
  "Enable All" button that requests every site in one prompt.
- LinkedIn: block only `/feed`, leaving `/feed/update/*` post pages usable.
- Remove noisy console logging; harden the Close Tab flow when there is no
  previous tab.

## [1.0.0] - 2025-10-11

Forked from News Feed Eradicator 2.3.1 and renamed to Social Feed Blocker.

- Options page rebuilt with React + Material UI; injected overlay redesigned
  with a Close Tab button (restores the previous tab) and a daily block counter.
- Quotes removed.
- Short-form video blocking: Instagram and Facebook Reels, TikTok, YouTube
  Shorts (autoplay audio muted).
- New sites: Threads and Substack Notes. GitHub feed support removed.

## Upstream history (News Feed Eradicator)

## [2.2.7] - 2024-06-09

- Fix x.com

## [2.2.6] - 2024-03-02

- Fix new Reddit
- Fix non-English Twitter/X and prepare for redirect to x.com

## [2.2.5] - 2023-05-09

- [Fix Facebook for languages other than English (thanks @nzawirski)](https://github.com/jordwest/news-feed-eradicator/pull/256)
- [Fix GitHub home (thanks @Khanaru220)](https://github.com/jordwest/news-feed-eradicator/pull/251)
- [Fix logged out Twitter feed (thanks @weeksling)](https://github.com/jordwest/news-feed-eradicator/pull/263)

## [2.2.4] - 2022-11-15

- [Fixed Facebook (thanks @nzawirski)](https://github.com/jordwest/news-feed-eradicator/pull/244)
- Fixed Hacker News

## [2.2.3] - 2022-09-27

### Fixed

- Fixed Facebook
- Fixed Twitter
- Reverted change that made YouTube related vids appears

## [2.2.2] - 2022-07-29

### Fixed

- Fixed instagram

## [2.2.1] - 2021-06-05

### Added

- [Instagram support by @ryanmonro](https://github.com/jordwest/news-feed-eradicator/pull/105)

### Fixed

- LinkedIn

## [2.2.0] - 2021-01-25

### Added

- YouTube support
- [LinkedIn support by @viswanathgs](https://github.com/jordwest/news-feed-eradicator/pull/101)

### Fixed

- Also blocks feed
  on `facebook.com/home.php` [(thanks @hannoeru)](https://github.com/jordwest/news-feed-eradicator/pull/109)
- Ekhart Tolle is Eckhart Tolle

## [2.1.0] - 2020-10-21

### Added

- [Reddit support by @kessido](https://github.com/jordwest/news-feed-eradicator/pull/98)
- [Hacker News support by @rjshade](https://github.com/jordwest/news-feed-eradicator/pull/97)

### Fixed

- Fixed Twitter feed showing up when first visiting Twitter directly (#99)
