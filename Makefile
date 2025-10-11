.PHONY: all clean install dev copy-assets package-source

# The current git tag is used as the version number
GITTAG=$(shell git describe --always --tag)
BIN=$(shell npm bin)

build: install copy-assets
	mkdir -p build
	NODE_ENV=production ./node_modules/.bin/rollup -c
	mkdir -p dist
	(cd build && zip -r ../dist/SocialFeedBlocker_$(GITTAG).zip .)

# Typecheck only
check:
	npm run check

# Firefox Add-on store requires source to be submitted as a zip, so this command builds that zip
package-source:
	mkdir -p dist
	git archive --output=dist/SocialFeedBlocker_source_$(GITTAG).zip HEAD

copy-assets:
	mkdir -p build
	mkdir -p build/icons
	# Copy optional icon assets if present
	if ls src/icons/* >/dev/null 2>&1; then cp src/icons/* build/icons/; fi
	cp src/manifest-chrome.json build/manifest.json
	cp src/options/options.html build/options.html
	cp assets/icon16.png build/icon16.png
	cp assets/icon32.png build/icon32.png
	cp assets/icon48.png build/icon48.png
	cp assets/icon64.png build/icon64.png
	cp assets/icon128.png build/icon128.png
	# Brand asset for UI
	cp assets/transparent-icon.png build/transparent-icon.png

dev: install copy-assets
	mkdir -p build
	./node_modules/.bin/rollup -c --watch

install:
	npm install

clean:
	rm -rf dist
	rm -rf build
	rm -rf node_modules
