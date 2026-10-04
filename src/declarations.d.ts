declare module '*.str.css';

// @types/react-dom is not installed; declare the one entry point we use.
declare module 'react-dom/client' {
	import type { ReactNode } from 'react';

	export interface Root {
		render(children: ReactNode): void;
		unmount(): void;
	}

	export function createRoot(container: Element | DocumentFragment): Root;
}
