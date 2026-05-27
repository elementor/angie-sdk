import { appState } from '../config';
import { openIframe } from '../iframe';
import { ensureSidebarContainer } from './container';
import type { LoadSidebarV2Options } from './config';
import { buildEmbeddedPayload, sendEmbeddedConfig } from './embedded-handshake';
import { readEnv } from './env';
import { resolveConfig, shouldBoot } from './resolve-config';
import { initSidebarShell } from './shell';

export const bootSidebar = async ( options: LoadSidebarV2Options ): Promise<void> => {
	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	appState.containerId = config.container.id;

	if ( config.container.preset === 'sidebar' ) {
		ensureSidebarContainer( config.container.id, env.isRTL );
		initSidebarShell( config.container, config.callbacks );
	}

	const embeddedPayload = buildEmbeddedPayload( config.host );

	await openIframe( {
		isRTL: config.iframe.isRTL,
		origin: config.iframe.origin,
		path: config.iframe.path,
		uiTheme: config.iframe.uiTheme,
	} );

	sendEmbeddedConfig( embeddedPayload );
};
