import type { WidgetConfig } from '../angie-mcp-sdk';

export const LOAD_SIDEBAR_V2_CONFIG_VERSION = 2 as const;

export type LoadSidebarV2Layout = 'floating-chat' | 'sidebar';
export type LoadSidebarV2ContainerStyleTheme = 'wordpress' | '';

export type ChatToggleButtonConfig = {
	enabled?: boolean;
	id?: string;
};

export type LoadSidebarV2Options = {
	host: {
		appId: string;
		aiContext?: Record<string, unknown>;
		website?: Record<string, unknown>;
	};
	boot?: {
		allowInIframe?: boolean;
	};
	container?: {
		id?: string;
		layout?: LoadSidebarV2Layout;
		styleTheme?: LoadSidebarV2ContainerStyleTheme;
		persistOpenState?: boolean;
		resizable?: boolean;
		chatToggleButton?: ChatToggleButtonConfig;
	};
	iframe?: {
		isRTL?: boolean;
		origin?: string;
		path?: string;
		uiTheme?: string;
	};
	callbacks?: {
		onClose?: () => void;
	};
	widgetConfig?: WidgetConfig;
};

export type ResolvedConfigV2 = {
	host: {
		appId: string;
		aiContext?: Record<string, unknown>;
		website?: Record<string, unknown>;
	};
	boot: {
		allowInIframe: boolean;
	};
	container: {
		id: string;
		layout: LoadSidebarV2Layout;
		styleTheme: LoadSidebarV2ContainerStyleTheme;
		persistOpenState: boolean;
		resizable: boolean;
		chatToggleButton: {
			enabled: boolean;
			id: string;
		};
	};
	iframe: {
		origin: string;
		path: string;
		uiTheme: string;
		isRTL: boolean;
	};
	callbacks: {
		onClose?: () => void;
	};
	widgetConfig?: WidgetConfig;
};

export type LoadSidebarV2HostConfig = LoadSidebarV2Options & {
	configVersion: typeof LOAD_SIDEBAR_V2_CONFIG_VERSION;
};

export type HostEmbeddedConfigPayload = {
	aiContext?: Record<string, unknown>;
	appId?: string;
	configVersion: typeof LOAD_SIDEBAR_V2_CONFIG_VERSION;
	telemetry?: Record<string, unknown>;
	website?: Record<string, unknown>;
};

export const buildHostEmbeddedConfigPayload = (
	host: ResolvedConfigV2['host']
): HostEmbeddedConfigPayload => ( {
	aiContext: host.aiContext,
	appId: host.appId,
	configVersion: LOAD_SIDEBAR_V2_CONFIG_VERSION,
	telemetry: {
		screenPath: window.location.pathname,
	},
	website: {
		docTitle: document.title,
		homeUrl: window.location.origin,
		name: document.title,
		platform: 'frontend',
		siteLang: document.documentElement.lang,
		tagline: '',
		...host.website,
	},
} );
