import { DEFAULT_CONTAINER_ID } from '../config';

export { DEFAULT_CONTAINER_ID };

export const DEFAULTS = {
	boot: {
		allowInIframe: false,
	},
	container: {
		preset: 'sidebar' as const,
		stylePreset: 'wordpress' as const,
		persistOpenState: true,
		resizable: true,
	},
	iframe: {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
	},
} as const;

export const SIDEBAR_LOADING_ID = 'angie-sidebar-loading';
export const EMBEDDED_CONFIG_MESSAGE_TYPE = 'sdk-embedded-config';
