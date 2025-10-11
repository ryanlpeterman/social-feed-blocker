import { Store } from '../store/index';
import { createRoot } from 'react-dom/client';
import React from 'react';
import NewsFeedEradicatorReact from '../components/index-react';

export function isAlreadyInjected() {
	return document.querySelector('#nfe-container') != null;
}

const rgbRe = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/;

/**
 * Inject the News Feed Eradicator panel into the page.
 */
export default function injectUI(
	streamContainer: Node,
	store: Store,
	opts: { asFirstChild?: boolean } = {}
) {
	const nfeContainer = document.createElement('div');
	nfeContainer.id = 'nfe-container';
	if (opts.asFirstChild && streamContainer.firstChild) {
		streamContainer.insertBefore(nfeContainer, streamContainer.firstChild);
	} else {
		streamContainer.appendChild(nfeContainer);
	}

	const root = createRoot(nfeContainer);
	const render = () => {
		root.render(React.createElement(NewsFeedEradicatorReact, { store }));

		const col = window.getComputedStyle(document.body)['background-color'];
		const match = rgbRe.exec(col);
		if (match) {
			const r = parseInt(match[1], 10);
			const g = parseInt(match[2], 10);
			const b = parseInt(match[3], 10);
			let mode: string = r < 100 && g < 100 && b < 100 ? 'dark' : 'light';
			(document.body as any).dataset.nfeColorScheme = mode;
		}
	};

	render();
	store.subscribe(render);
}
