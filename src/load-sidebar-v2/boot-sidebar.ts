import { ensureSidebarContainer } from './container';
import {
	buildHostEmbeddedConfigPayload,
	LAYOUT_SIDEBAR,
	type LoadSidebarV2Options,
} from './config';
import { DEFAULT_CHAT_TOGGLE_BUTTON_SELECTOR } from './defaults';
import { sendEmbeddedConfig, sendWidgetConfig } from './embedded-handshake';
import { readEnv } from './env';
import { initHostApiBridge } from './host-api-bridge';
import { LAYOUT_STRATEGIES } from './layouts';
import { openEmbeddedIframe } from './open-embedded-iframe';
import { handlePostConsentRedirect } from '../oauth';
import {
	createAngieInstance,
	getFirstInstance,
	getInstanceByContainerId,
	getInstanceById,
	hasSidebarLayoutInstance,
} from '../instance-registry';
import { resolveConfig, shouldBoot } from './resolve-config';
import { registerSdkInstance, startSdkMessageRouting } from '../sdk';
import { generateInstanceId } from '../utils';

export const bootSidebar = async ( options: LoadSidebarV2Options ): Promise<void> => {
	handlePostConsentRedirect();

	const env = readEnv();
	const config = resolveConfig( options, env );

	if ( ! shouldBoot( config, env ) ) {
		return;
	}

	// Sidebar uses page-wide CSS and open state, so only one is supported.
	if ( config.container.layout === LAYOUT_SIDEBAR && hasSidebarLayoutInstance() ) {
		throw new Error(
			'Angie SDK: only one sidebar layout instance is supported on a page. ' +
			'Use container.layout "floatingChat" for the extra instance.'
		);
	}

	if ( getInstanceByContainerId( config.container.id ) ) {
		throw new Error(
			`Angie SDK: container id "${ config.container.id }" is already used by another ` +
			'Angie instance. Give this instance its own container.id.'
		);
	}

	const instanceId = config.host.instanceId || options.sdkInstanceId || generateInstanceId();

	if ( getInstanceById( instanceId ) ) {
		throw new Error(
			`Angie SDK: instance id "${ instanceId }" is already used by another ` +
			'Angie instance. Give this instance its own host.instanceId.'
		);
	}

	// Two instances would otherwise fight over the same default toggle button.
	if (
		getFirstInstance() &&
		config.container.chatToggleButton.selector === DEFAULT_CHAT_TOGGLE_BUTTON_SELECTOR
	) {
		config.container.chatToggleButton.selector =
			`${ DEFAULT_CHAT_TOGGLE_BUTTON_SELECTOR }-${ instanceId }`;
	}

	const instance = createAngieInstance( {
		containerId: config.container.id,
		instanceId,
		layout: config.container.layout,
	} );

	registerSdkInstance( instance );
	startSdkMessageRouting();

	initHostApiBridge( {
		iframeOrigin: config.iframe.origin,
		host: config.host,
		getExternalHeaders: config.callbacks.getExternalHeaders,
		getWebsiteContext: config.callbacks.getWebsiteContext,
		getAnalyticsContext: config.callbacks.getAnalyticsContext,
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
