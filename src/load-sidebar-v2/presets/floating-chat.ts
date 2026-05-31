import type { LoadSidebarV2Layout } from '../config';

export const FLOATING_CHAT_LAYOUT: LoadSidebarV2Layout = 'floating-chat';

export const FLOATING_CHAT_PRESET_DEFAULTS = {
	layout: FLOATING_CHAT_LAYOUT,
	styleTheme: '' as const,
	persistOpenState: false,
	resizable: false,
	chatToggleButtonEnabled: true,
} as const;
