import { DEFAULT_CONTAINER_ID, DEFAULTS } from './defaults';
import type { Env } from './env';
import type { LoadSidebarV2Options, ResolvedConfigV2 } from './config';
import { SIDEBAR_PRESET_DEFAULTS } from './presets/sidebar';
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

	const layout = container.layout ?? DEFAULTS.container.layout;
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
			persistOpenState: container.persistOpenState ?? SIDEBAR_PRESET_DEFAULTS.persistOpenState,
			resizable: container.resizable ?? SIDEBAR_PRESET_DEFAULTS.resizable,
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
