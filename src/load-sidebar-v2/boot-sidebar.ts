import { ensureSidebarContainer } from './container';
import { buildHostEmbeddedConfigPayload, type LoadSidebarV2Options } from './config';
import { sendEmbeddedConfig, sendWidgetConfig } from './embedded-handshake';
import { readEnv } from './env';
import { initHostApiBridge } from './host-api-bridge';
import { LAYOUT_STRATEGIES } from './layouts';
import { openEmbeddedIframe } from './open-embedded-iframe';
import { handlePostConsentRedirect } from '../oauth';
import { createAngieInstance } from '../instance-registry';
import { resolveConfig, shouldBoot } from './resolve-config';
import { generateInstanceId } from '../utils';

export const bootSidebar = async (
	options: LoadSidebarV2Options,
	sdkInstanceId = ''
): Promise<void> => {
	handlePostConsentRedirect();

	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	const instanceId = sdkInstanceId || generateInstanceId();

	const instance = createAngieInstance( {
		containerId: config.container.id,
		instanceId,
		layout: config.container.layout,
	} );

	initHostApiBridge( {
		iframeOrigin: config.iframe.origin,
		host: config.host,
		getExternalHeaders: config.callbacks.getExternalHeaders,
		instance,
	} );

	ensureSidebarContainer( config.container.id, env.isRTL );

	const strategy = LAYOUT_STRATEGIES[ config.container.layout ];
	const bootContext = { config, env, instance };

	strategy.initShell( bootContext );
	strategy.beforeOpenIframe?.( bootContext );

	const embeddedPayload = buildHostEmbeddedConfigPayload( config.host );

	const opened = await openEmbeddedIframe( {
		container: config.container,
		iframe: config.iframe,
		embeddedConfig: embeddedPayload,
		instance,
	} );

	strategy.afterOpenIframe?.( bootContext );

	if ( ! opened ) {
		return;
	}

	// HOST_READY delivers config during iframe load; post-open message supports older embedded clients.
	sendEmbeddedConfig( embeddedPayload, instance );

	if ( config.widgetConfig ) {
		sendWidgetConfig( config.widgetConfig, instance );
	}
};
