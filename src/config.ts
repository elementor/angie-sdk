import type { LoadSidebarV2Layout } from './load-sidebar-v2/config';

export const DEFAULT_CONTAINER_ID = 'angie-sidebar-container';

export const DEFAULT_IFRAME_ELEMENT_ID = 'angie-iframe';

export type AppState = {
	open: boolean;
	iframe: HTMLIFrameElement | null;
	iframeUrlObject: URL | null;
	containerId: string;
	instanceId: string;
	layout: LoadSidebarV2Layout | '';
	iframeElementId: string;
};

export const createDefaultAppState = (): AppState => ( {
	open: false,
	iframe: null,
	iframeUrlObject: null,
	containerId: DEFAULT_CONTAINER_ID,
	instanceId: '',
	layout: '',
	iframeElementId: DEFAULT_IFRAME_ELEMENT_ID,
} );

export const appState: AppState = createDefaultAppState();
