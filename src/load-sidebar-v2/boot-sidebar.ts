import { appState } from '../config';
import { ensureSidebarContainer } from './container';
import type { LoadSidebarV2Options } from './config';
import { buildHostEmbeddedConfigPayload } from './config';
import { sendEmbeddedConfig, sendWidgetConfig } from './embedded-handshake';
import { readEnv } from './env';
import { openEmbeddedIframe } from './open-embedded-iframe';
import { resolveConfig, shouldBoot } from './resolve-config';
import { finalizeSidebarShellState, initSidebarShell } from './shell';

export const bootSidebar = async ( options: LoadSidebarV2Options ): Promise<void> => {
	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	appState.containerId = config.container.id;

	ensureSidebarContainer( config.container.id, env.isRTL );

	initSidebarShell( config.container, config.callbacks );
	await openEmbeddedIframe( {
		container: config.container,
		iframe: config.iframe,
	} );

	finalizeSidebarShellState( config.container );

	const embeddedPayload = buildHostEmbeddedConfigPayload( config.host );
	sendEmbeddedConfig( embeddedPayload );

	if ( config.widgetConfig ) {
		sendWidgetConfig( config.widgetConfig );
	}
};
