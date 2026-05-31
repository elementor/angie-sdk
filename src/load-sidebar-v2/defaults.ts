import { DEFAULT_CONTAINER_ID } from '../config';
import { SIDEBAR_PRESET_DEFAULTS } from './presets/sidebar';

export { DEFAULT_CONTAINER_ID };

export const DEFAULT_CHAT_TOGGLE_BUTTON_SELECTOR = '#angie-widget-toggle';

export const DEFAULTS = {
	boot: {
		allowInIframe: false,
	},
	container: {
		layout: SIDEBAR_PRESET_DEFAULTS.layout,
		styleTheme: SIDEBAR_PRESET_DEFAULTS.styleTheme,
		persistOpenState: SIDEBAR_PRESET_DEFAULTS.persistOpenState,
		resizable: SIDEBAR_PRESET_DEFAULTS.resizable,
		chatToggleButtonSelector: DEFAULT_CHAT_TOGGLE_BUTTON_SELECTOR,
	},
	iframe: {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
	},
} as const;

export const SIDEBAR_LOADING_ID = 'angie-sidebar-loading';
export const EMBEDDED_CONFIG_MESSAGE_TYPE = 'sdk-embedded-config';
