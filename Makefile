.PHONY: build check clean install dev copy-assets package-source

# package.json's version is the version number: copy-assets writes it into
# build/manifest.json and it names the zips
VERSION=$(shell node -p "require('./package.json').version")

build: install copy-assets
	mkdir -p build
	NODE_ENV=production ./node_modules/.bin/rollup -c
	mkdir -p dist
	(cd build && zip -r ../dist/SocialFeedBlocker_$(VERSION).zip .)

# Typecheck only
check:
	npm run check

# Firefox Add-on store requires source to be submitted as a zip, so this command builds that zip
package-source:
	mkdir -p dist
	git archive --output=dist/SocialFeedBlocker_source_$(VERSION).zip HEAD

copy-assets:
	mkdir -p build
	node -e "const fs = require('fs'); const m = JSON.parse(fs.readFileSync('src/manifest-chrome.json', 'utf8')); m.version = require('./package.json').version; fs.writeFileSync('build/manifest.json', JSON.stringify(m, null, '\\t') + '\\n');"
	cp src/options/options.html build/options.html
	cp assets/icon16.png build/icon16.png
	cp assets/icon32.png build/icon32.png
	cp assets/icon48.png build/icon48.png
	cp assets/icon64.png build/icon64.png
	cp assets/icon128.png build/icon128.png
	# Brand asset for UI
	cp assets/transparent-icon-green.png build/transparent-icon-green.png

dev: install copy-assets
	mkdir -p build
	./node_modules/.bin/rollup -c --watch

install:
	npm install

clean:
	rm -rf dist
	rm -rf build
	rm -rf node_modules
