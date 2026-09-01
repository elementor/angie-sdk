import { LAYOUT_SIDEBAR } from '../config';

export const SIDEBAR_PRESET_DEFAULTS = {
	layout: LAYOUT_SIDEBAR,
	styleTheme: '' as const,
	create: true,
	skipDefaultCss: false,
	persistOpenState: true,
	resizable: true,
	chatToggleButtonEnabled: false,
} as const;
