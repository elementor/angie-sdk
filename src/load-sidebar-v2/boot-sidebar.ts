import { appState } from '../config';
import { ensureSidebarContainer } from './container';
import { buildHostEmbeddedConfigPayload, type LoadSidebarV2Options } from './config';
import { sendEmbeddedConfig, sendWidgetConfig } from './embedded-handshake';
import { readEnv } from './env';
import { openEmbeddedIframe } from './open-embedded-iframe';
import { resolveConfig, shouldBoot } from './resolve-config';
import { applyInitialSidebarShellState, finalizeSidebarShellState, initSidebarShell } from './shell';

export const bootSidebar = async ( options: LoadSidebarV2Options ): Promise<void> => {
	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	appState.containerId = config.container.id;

	ensureSidebarContainer( config.container.id, env.isRTL );

	initSidebarShell( config.container, config.callbacks );
	applyInitialSidebarShellState( config.container );

	const embeddedPayload = buildHostEmbeddedConfigPayload( config.host );

	await openEmbeddedIframe( {
		container: config.container,
		iframe: config.iframe,
		hostReadyEmbedded: embeddedPayload,
	} );

	finalizeSidebarShellState( config.container );

	sendEmbeddedConfig( embeddedPayload );

	if ( config.widgetConfig ) {
		sendWidgetConfig( config.widgetConfig );
	}
};
