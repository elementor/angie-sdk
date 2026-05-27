import { DEFAULT_CONTAINER_ID } from '../config';
import { DEFAULT_CHAT_TOGGLE_BUTTON_ID } from './chat-toggle/constants';
import { FLOATING_CHAT_PRESET_DEFAULTS } from './presets/floating-chat';

export { DEFAULT_CONTAINER_ID };

export const DEFAULTS = {
	boot: {
		allowInIframe: false,
	},
	container: {
		layout: FLOATING_CHAT_PRESET_DEFAULTS.layout,
		styleTheme: FLOATING_CHAT_PRESET_DEFAULTS.styleTheme,
		persistOpenState: FLOATING_CHAT_PRESET_DEFAULTS.persistOpenState,
		resizable: FLOATING_CHAT_PRESET_DEFAULTS.resizable,
		chatToggleButtonId: DEFAULT_CHAT_TOGGLE_BUTTON_ID,
	},
	iframe: {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
	},
} as const;

export const SIDEBAR_LOADING_ID = 'angie-sidebar-loading';
export const EMBEDDED_CONFIG_MESSAGE_TYPE = 'sdk-embedded-config';
