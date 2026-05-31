import { DEFAULT_CONTAINER_ID, DEFAULTS, SIDEBAR_PRESET_DEFAULTS } from './defaults';
import type { Env } from './env';
import type { LoadSidebarV2Options, ResolvedConfigV2 } from './config';
import { resolveWidgetConfig } from './widget-config';

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

	const chatToggleEnabled = container.chatToggleButton?.enabled ?? SIDEBAR_PRESET_DEFAULTS.chatToggleButtonEnabled;

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
			layout: container.layout ?? DEFAULTS.container.layout,
			styleTheme: container.styleTheme ?? DEFAULTS.container.styleTheme,
			persistOpenState: container.persistOpenState ?? SIDEBAR_PRESET_DEFAULTS.persistOpenState,
			resizable: container.resizable ?? SIDEBAR_PRESET_DEFAULTS.resizable,
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
		widgetConfig: resolveWidgetConfig( options.widgetConfig ),
	};
};
