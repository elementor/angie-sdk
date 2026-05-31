import type { WidgetConfig } from '../angie-mcp-sdk';

export const LOAD_SIDEBAR_V2_CONFIG_VERSION = 2 as const;

export type LoadSidebarV2Layout = 'sidebar';

export type LoadSidebarV2ContainerStyleTheme = 'wordpress' | '';

export type HostConfig = {
	appId: string;
	aiContext?: Record<string, unknown>;
	website?: Record<string, unknown>;
};

export type BootConfig = {
	allowInIframe: boolean;
};

export type BootOptions = Partial<BootConfig>;

export type ChatToggleButtonConfig = {
	enabled?: boolean;
	selector?: string;
};

export type ResolvedChatToggleButtonConfig = {
	enabled: boolean;
	selector: string;
};

export type ContainerOptions = {
	id?: string;
	layout?: LoadSidebarV2Layout;
	styleTheme?: LoadSidebarV2ContainerStyleTheme;
	persistOpenState?: boolean;
	resizable?: boolean;
	chatToggleButton?: ChatToggleButtonConfig;
};

export type ContainerConfig = {
	id: string;
	layout: LoadSidebarV2Layout;
	styleTheme: LoadSidebarV2ContainerStyleTheme;
	persistOpenState: boolean;
	resizable: boolean;
	chatToggleButton: ResolvedChatToggleButtonConfig;
};

export type IframeOptions = {
	isRTL?: boolean;
	origin?: string;
	path?: string;
	uiTheme?: string;
};

export type IframeConfig = {
	origin: string;
	path: string;
	uiTheme: string;
	isRTL: boolean;
};

export type CallbacksConfig = {
	onClose?: () => void;
};

export type LoadSidebarV2Options = {
	host: HostConfig;
	boot?: BootOptions;
	container?: ContainerOptions;
	iframe?: IframeOptions;
	callbacks?: CallbacksConfig;
	widgetConfig?: WidgetConfig;
};

export type ResolvedConfigV2 = {
	host: HostConfig;
	boot: BootConfig;
	container: ContainerConfig;
	iframe: IframeConfig;
	callbacks: CallbacksConfig;
	widgetConfig?: WidgetConfig;
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
