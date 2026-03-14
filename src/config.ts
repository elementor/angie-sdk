export const DEFAULT_CONTAINER_ID = 'angie-sidebar-container';

export type AppState = {
	open: boolean;
	iframe: HTMLIFrameElement | null;
	iframeUrlObject: URL | null;
	containerId: string;
};

export const appState: AppState = {
	open: false,
	iframe: null as HTMLIFrameElement | null,
	iframeUrlObject: null as URL | null,
	containerId: DEFAULT_CONTAINER_ID,
};
