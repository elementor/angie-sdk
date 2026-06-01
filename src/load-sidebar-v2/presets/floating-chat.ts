import { LAYOUT_FLOATING_CHAT } from '../config';

export const FLOATING_CHAT_PRESET_DEFAULTS = {
	layout: LAYOUT_FLOATING_CHAT,
	styleTheme: '' as const,
	persistOpenState: false,
	resizable: false,
	chatToggleButtonEnabled: true,
} as const;
