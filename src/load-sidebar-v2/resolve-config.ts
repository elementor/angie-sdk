import { DEFAULT_CONTAINER_ID, DEFAULTS } from './defaults';
import type { Env } from './env';
import type { LoadSidebarV2Options, ResolvedConfigV2 } from './config';

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
			preset: container.preset ?? DEFAULTS.container.preset,
			stylePreset: container.stylePreset ?? DEFAULTS.container.stylePreset,
			persistOpenState: container.persistOpenState ?? DEFAULTS.container.persistOpenState,
			resizable: container.resizable ?? DEFAULTS.container.resizable,
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
	};
};
