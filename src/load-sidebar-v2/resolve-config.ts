import { DEFAULT_CONTAINER_ID, DEFAULTS } from './defaults';
import type { Env } from './env';
import type { LoadSidebarV2Layout, LoadSidebarV2Options, ResolvedConfigV2 } from './config';
import { FLOATING_CHAT_PRESET_DEFAULTS } from './presets/floating-chat';
import { SIDEBAR_PRESET_DEFAULTS } from './presets/sidebar';
import { resolveWidgetConfig } from './widget-config';

const getLayoutDefaults = ( layout: LoadSidebarV2Layout ) => (
	layout === 'floating-chat'
		? FLOATING_CHAT_PRESET_DEFAULTS
		: SIDEBAR_PRESET_DEFAULTS
);

export const shouldBoot = ( config: ResolvedConfigV2, env: Env ): boolean => {
	if ( ! config.boot.allowInIframe && env.isInIframe ) {
		return false;
	}

	return true;
};

export const resolveConfig = ( options: LoadSidebarV2Options, env: Env ): ResolvedConfigV2 => {
	const boot = options.boot ?? {};
	const container = options.container ?? {};
	const iframe = options.iframe ?? {};
	const callbacks = options.callbacks ?? {};

	const layout = container.layout ?? DEFAULTS.container.layout;
	const layoutDefaults = getLayoutDefaults( layout );
	const chatToggleEnabled = container.chatToggleButton?.enabled ?? layoutDefaults.chatToggleButtonEnabled;

	return {
		host: {
			appId: options.host.appId,
			aiContext: options.host.aiContext,
			website: options.host.website,
		},
		boot: {
			allowInIframe: boot.allowInIframe ?? DEFAULTS.boot.allowInIframe,
		},
		container: {
			id: container.id?.trim() || DEFAULT_CONTAINER_ID,
			layout,
			styleTheme: container.styleTheme ?? DEFAULTS.container.styleTheme,
			persistOpenState: container.persistOpenState ?? layoutDefaults.persistOpenState,
			resizable: container.resizable ?? layoutDefaults.resizable,
			chatToggleButton: {
				enabled: chatToggleEnabled,
				selector: container.chatToggleButton?.selector?.trim() || DEFAULTS.container.chatToggleButtonSelector,
			},
		},
		iframe: {
			origin: iframe.origin?.trim() || DEFAULTS.iframe.origin,
			path: iframe.path?.trim() || DEFAULTS.iframe.path,
			uiTheme: iframe.uiTheme ?? env.browserUiTheme,
			isRTL: iframe.isRTL ?? env.isRTL,
		},
		callbacks: {
			onClose: callbacks.onClose,
		},
		widgetConfig: resolveWidgetConfig( layout, options.widgetConfig ),
	};
};
