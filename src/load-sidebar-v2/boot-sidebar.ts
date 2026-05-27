import { appState } from '../config';
import { initFloatingChatLayout } from './chat-toggle/init-floating-chat-layout';
import { ensureSidebarContainer } from './container';
import type { LoadSidebarV2Options } from './config';
import { buildEmbeddedPayload, sendEmbeddedConfig, sendWidgetConfig } from './embedded-handshake';
import { readEnv } from './env';
import { openEmbeddedIframe } from './open-embedded-iframe';
import { resolveConfig, shouldBoot } from './resolve-config';
import { initHostApiBridge } from './host-api-bridge';
import { applyInitialSidebarShellState, finalizeSidebarShellState, initSidebarShell } from './shell';

export const bootSidebar = async ( options: LoadSidebarV2Options ): Promise<void> => {
	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	initHostApiBridge( {
		iframeOrigin: config.iframe.origin,
		getExternalHeaders: config.callbacks.getExternalHeaders,
	} );

	appState.containerId = config.container.id;

	ensureSidebarContainer( config.container.id, env.isRTL );

	const { layout, chatToggleButton } = config.container;

	if ( layout === 'floating-chat' ) {
		initFloatingChatLayout( {
			containerId: config.container.id,
			iframeOrigin: config.iframe.origin,
			onClose: config.callbacks.onClose,
			toggleButtonSelector: chatToggleButton.selector,
			injectToggleButton: chatToggleButton.enabled,
		} );
	} else {
		initSidebarShell( config.container, config.callbacks );
		applyInitialSidebarShellState( config.container );
	}

	const embeddedPayload = buildEmbeddedPayload( config.host );

	await openEmbeddedIframe( {
		container: config.container,
		iframe: config.iframe,
		hostReadyEmbedded: embeddedPayload,
	} );

	if ( layout === 'sidebar' ) {
		finalizeSidebarShellState( config.container );
	}

	sendEmbeddedConfig( embeddedPayload );

	if ( config.widgetConfig ) {
		sendWidgetConfig( config.widgetConfig );
	}
};
