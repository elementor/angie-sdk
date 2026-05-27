import type { WidgetConfig } from '../angie-mcp-sdk';
import type { LoadSidebarV2Layout } from './config';

const FLOATING_CHAT_WIDGET_DEFAULTS: WidgetConfig = {
	closeButton: 'close',
};

const SIDEBAR_WIDGET_DEFAULTS: WidgetConfig = {
	closeButton: 'collapse',
};

export const resolveWidgetConfig = (
	layout: LoadSidebarV2Layout,
	widgetConfig?: WidgetConfig,
): WidgetConfig | undefined => {
	if ( layout === 'floating-chat' ) {
		return {
			...FLOATING_CHAT_WIDGET_DEFAULTS,
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
