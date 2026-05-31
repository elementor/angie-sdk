import type { LoadSidebarV2Layout } from '../config';

export const SIDEBAR_LAYOUT: LoadSidebarV2Layout = 'sidebar';

export const SIDEBAR_PRESET_DEFAULTS = {
	layout: SIDEBAR_LAYOUT,
	persistOpenState: true,
	resizable: true,
	chatToggleButtonEnabled: false,
} as const;
