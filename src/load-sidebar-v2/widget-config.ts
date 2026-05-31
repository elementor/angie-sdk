import type { WidgetConfig } from '../angie-mcp-sdk';

const SIDEBAR_WIDGET_DEFAULTS: WidgetConfig = {
	closeButton: 'collapse',
};

export const resolveWidgetConfig = (
	widgetConfig?: WidgetConfig,
): WidgetConfig | undefined => {
	if ( ! widgetConfig ) {
		return SIDEBAR_WIDGET_DEFAULTS;
	}

	return {
		...SIDEBAR_WIDGET_DEFAULTS,
		...widgetConfig,
	};
};
