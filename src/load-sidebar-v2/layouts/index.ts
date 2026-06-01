import { initFloatingChatLayout } from '../chat-toggle/init-floating-chat-layout';
import { LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR, type LoadSidebarV2Layout, type ResolvedConfigV2 } from '../config';
import type { Env } from '../env';
import {
	applyInitialSidebarShellState,
	finalizeSidebarShellState,
	initSidebarShell,
} from '../shell';

export type LayoutBootContext = {
	config: ResolvedConfigV2;
	env: Env;
};

export type LayoutStrategy = {
	initShell: ( ctx: LayoutBootContext ) => void;
	beforeOpenIframe?: ( ctx: LayoutBootContext ) => void;
	afterOpenIframe?: ( ctx: LayoutBootContext ) => void;
};

const sidebarStrategy: LayoutStrategy = {
	initShell: ( { config } ) => {
		initSidebarShell( config.container, config.callbacks );
	},
	beforeOpenIframe: ( { config } ) => {
		applyInitialSidebarShellState( config.container );
	},
	afterOpenIframe: ( { config } ) => {
		finalizeSidebarShellState( config.container );
	},
};

const floatingChatStrategy: LayoutStrategy = {
	initShell: ( { config } ) => {
		const { chatToggleButton } = config.container;

		initFloatingChatLayout( {
			containerId: config.container.id,
			iframeOrigin: config.iframe.origin,
			onClose: config.callbacks.onClose,
			toggleButtonSelector: chatToggleButton.selector,
			injectToggleButton: chatToggleButton.enabled,
		} );
	},
};

export const LAYOUT_STRATEGIES = {
	[ LAYOUT_SIDEBAR ]: sidebarStrategy,
	[ LAYOUT_FLOATING_CHAT ]: floatingChatStrategy,
} satisfies Record<LoadSidebarV2Layout, LayoutStrategy>;
