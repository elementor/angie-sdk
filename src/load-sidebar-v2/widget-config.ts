import type { WidgetConfig } from '../angie-mcp-sdk';
import { LAYOUT_FLOATING_CHAT, type LoadSidebarV2Layout } from './config';

const SIDEBAR_WIDGET_DEFAULTS: WidgetConfig = {
	closeButton: 'collapse',
};

export const resolveWidgetConfig = (
	layout: LoadSidebarV2Layout,
	widgetConfig?: WidgetConfig,
): WidgetConfig | undefined => {
	if ( layout === LAYOUT_FLOATING_CHAT ) {
		return {
			closeButton: 'close',
			...widgetConfig,
		};
	}

	if ( ! widgetConfig ) {
		return SIDEBAR_WIDGET_DEFAULTS;
	}

	return {
		...SIDEBAR_WIDGET_DEFAULTS,
		...widgetConfig,
	};
};
