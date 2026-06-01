import type { WidgetConfig } from '../angie-mcp-sdk';

export const LOAD_SIDEBAR_V2_CONFIG_VERSION = 2 as const;

export const LAYOUT_SIDEBAR = 'sidebar' as const;

export const LAYOUT_FLOATING_CHAT = 'floatingChat' as const;

export type LoadSidebarV2Layout = typeof LAYOUT_SIDEBAR | typeof LAYOUT_FLOATING_CHAT;

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

export type ContainerConfig = {
	id: string;
	layout: LoadSidebarV2Layout;
	styleTheme: LoadSidebarV2ContainerStyleTheme;
	persistOpenState: boolean;
	resizable: boolean;
	chatToggleButton: {
		enabled: boolean;
		selector: string;
	};
};

export type ContainerOptions = Partial<ContainerConfig>;

export type IframeConfig = {
	origin: string;
	path: string;
	uiTheme: string;
	isRTL: boolean;
};

export type IframeOptions = Partial<IframeConfig>;

export type ExternalHeadersCallback = () =>
	| Record<string, string | undefined>
	| Promise<Record<string, string | undefined>>;

export type CallbacksConfig = {
	onClose?: () => void;
	getExternalHeaders?: ExternalHeadersCallback;
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
