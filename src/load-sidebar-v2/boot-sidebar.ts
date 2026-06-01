import { appState } from '../config';
import { ensureSidebarContainer } from './container';
import { buildHostEmbeddedConfigPayload, type LoadSidebarV2Options } from './config';
import { sendEmbeddedConfig, sendWidgetConfig } from './embedded-handshake';
import { readEnv } from './env';
import { LAYOUT_STRATEGIES } from './layouts';
import { openEmbeddedIframe } from './open-embedded-iframe';
import { resolveConfig, shouldBoot } from './resolve-config';

export const bootSidebar = async ( options: LoadSidebarV2Options ): Promise<void> => {
	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	appState.containerId = config.container.id;

	ensureSidebarContainer( config.container.id, env.isRTL );

	const strategy = LAYOUT_STRATEGIES[ config.container.layout ];
	const bootContext = { config, env };

	strategy.initShell( bootContext );
	strategy.beforeOpenIframe?.( bootContext );

	const embeddedPayload = buildHostEmbeddedConfigPayload( config.host );

	await openEmbeddedIframe( {
		container: config.container,
		iframe: config.iframe,
		hostReadyEmbedded: embeddedPayload,
	} );

	strategy.afterOpenIframe?.( bootContext );

	// HOST_READY delivers config during iframe load; post-open message supports older embedded clients.
	sendEmbeddedConfig( embeddedPayload );

	if ( config.widgetConfig ) {
		sendWidgetConfig( config.widgetConfig );
	}
};
