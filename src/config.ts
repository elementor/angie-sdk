export type AppState = {
	open: boolean;
	iframe: HTMLIFrameElement | null;
	iframeUrlObject: URL | null;
};

export const appState: AppState = {
	open: false,
	iframe: null as HTMLIFrameElement | null,
	iframeUrlObject: null as URL | null,
};
