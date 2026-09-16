import { appState, type AppState } from './config';
import { createChildLogger } from './logger';
import { listenToOAuthFromIframe, setupOidcLoginFlowHandler } from './oauth';
import { flushPendingSdkMessages, registerSdkInstance, startSdkMessageRouting } from './sdk';
import { loadWidth } from './sidebar';
import { HostEventType, MessageEventType } from './types';
import { isFromIframe, isMobile, isSafeUrl, sendSuccessMessage, toggleAngieSidebar } from './utils';
import { ANGIE_SDK_VERSION } from './version';
import { openSaaSPage } from './openSaaSPage';
import type { HostEmbeddedConfigPayload } from './load-sidebar-v2/config';

type OpenIframeProps = {
	origin?: string;
	uiTheme: string;
	isRTL: boolean;
	path?: string;
	embeddedConfig?: HostEmbeddedConfigPayload;
}

type IframeHostHandler = {
	instance: AppState;
	trustedOrigins: string[];
};

const iframeLogger = createChildLogger( 'iframe' );

const DEFAULT_PATH = 'angie/wp-admin';

const iframeHostHandlers: IframeHostHandler[] = [];
let iframeHostMessageListener: ( ( event: MessageEvent ) => void ) | null = null;

export const isValidPath = ( path: string ): boolean => {
	if ( path.includes( '://' ) || path.startsWith( '//' ) ) {
		return false;
	}

	try {
		const base = 'https://test.com';
		const url = new URL( path, base );
		return url.origin === base;
	} catch {
		return false;
	}
};

export const disableNavigationPrevention = async ( instance: AppState = appState ): Promise<void> => {
	if ( ! instance.iframe?.contentWindow || ! instance.iframeUrlObject ) {
		iframeLogger.warn( 'Cannot disable navigation prevention: iframe or origin not available' );
		return;
	}

	try {
		iframeLogger.log( 'Disabling navigation prevention in Angie iframe' );
		instance.iframe.contentWindow.postMessage(
			{ type: MessageEventType.ANGIE_DISABLE_NAVIGATION_PREVENTION },
			instance.iframeUrlObject.origin
		);
		await new Promise( resolve => setTimeout( resolve, 100 ) );
	} catch ( error ) {
		iframeLogger.error( 'Failed to disable navigation prevention:', error );
		throw error;
	}
};

const handleIframeHostMessage = async (
	event: MessageEvent,
	instance: AppState,
): Promise<void> => {
	if ( event?.data?.type === MessageEventType.ANGIE_CHAT_TOGGLE ) {
		instance.open = event.data.open;

		if ( instance.iframe ) {
			toggleAngieSidebar( instance.iframe, instance.open, instance.containerId );
		}
	} else if ( event?.data?.type === MessageEventType.ANGIE_STUDIO_TOGGLE ) {
		const isStudioOpen = event.data.isStudioOpen;

		if ( ! instance.iframe ) {
			return;
		}

		if ( ! isStudioOpen ) {
			const savedWidth = loadWidth();
			document.documentElement.style.setProperty( '--angie-sidebar-width', `${ savedWidth }px` );
			document.documentElement.classList.remove( 'angie-studio-active' );
		} else {
			document.documentElement.classList.add( 'angie-studio-active' );
		}
	} else if ( event?.data?.type === MessageEventType.ANGIE_NAVIGATE_TO_URL ) {
		const { url = '', confirmed = false } = event.data.payload || {};

		if ( ! confirmed ) {
			iframeLogger.log( 'Navigation requires user confirmation' );
			return;
		}

		if ( isSafeUrl( url ) ) {
			await disableNavigationPrevention( instance );
			window.location.assign( url );
		} else {
			iframeLogger.error( 'Navigation blocked: Invalid or unsafe URL', { url } );
		}
	} else if ( event?.data?.type === MessageEventType.ANGIE_PAGE_RELOAD ) {
		const { confirmed = false } = event.data.payload || {};

		if ( ! confirmed ) {
			iframeLogger.log( 'Page reload requires user confirmation' );
			return;
		}

		iframeLogger.log( 'Page reload confirmed - disabling navigation prevention and reloading' );

		await disableNavigationPrevention( instance );

		setTimeout( () => {
			window.location.reload();
		}, 50 );
	} else if ( event?.data?.type === HostEventType.RESET_HASH ) {
		window.location.hash = '';

		sendSuccessMessage( event.ports[ 0 ], {
			message: 'Hash reset successfully',
		} );
	}
};

const ensureIframeHostMessageListener = (): void => {
	if ( iframeHostMessageListener ) {
		return;
	}

	iframeHostMessageListener = ( event: MessageEvent ) => {
		const match = iframeHostHandlers.find( ( handler ) => isFromIframe( event, handler.instance.iframe ) );

		if ( ! match || ! match.trustedOrigins.includes( event.origin ) ) {
			return;
		}

		void handleIframeHostMessage( event, match.instance );
	};

	window.addEventListener( 'message', iframeHostMessageListener );
};

export const registerIframeHostHandler = ( handler: IframeHostHandler ): void => {
	iframeHostHandlers.push( handler );
	ensureIframeHostMessageListener();
};

export const resetIframeHostHandlersForTests = (): void => {
	if ( iframeHostMessageListener ) {
		window.removeEventListener( 'message', iframeHostMessageListener );
		iframeHostMessageListener = null;
	}

	iframeHostHandlers.length = 0;
};

export type OpenIframeResult = {
	iframe: HTMLIFrameElement;
	iframeOrigin: string;
};

export const openIframe = async (
	props: OpenIframeProps,
	instance: AppState = appState
): Promise<OpenIframeResult | undefined> => {
	if ( isMobile() ) {
		iframeLogger.log( 'Mobile detected, skipping iframe injection' );
		return;
	}

	const containerId = instance.containerId;

	// Check if sidebar container exists
	let sidebarContainer = document.getElementById( containerId );

	if ( ! sidebarContainer ) {
		// Use MutationObserver for more efficient DOM watching
		const sidebarWaitStart = performance.now();
		iframeLogger.log( '⏱️ Waiting for sidebar container...' );

		await new Promise<void>( ( resolve ) => {
			// First try with shorter polling interval for immediate cases
			let attempts = 0;
			const quickCheck = setInterval( () => {
				sidebarContainer = document.getElementById( containerId );
				attempts++;
				if ( sidebarContainer || attempts > 20 ) { // Check for 2 seconds max with 100ms intervals
					clearInterval( quickCheck );
					if ( sidebarContainer ) {
						resolve();
					}
				}
			}, 100 );

			// If not found quickly, use MutationObserver for remaining time
			setTimeout( () => {
				// Clear the quick polling interval to prevent resource leak
				clearInterval( quickCheck );

				if ( sidebarContainer ) {
					resolve();
					return;
				}

				const observer = new MutationObserver( () => {
					sidebarContainer = document.getElementById( containerId );
					if ( sidebarContainer ) {
						observer.disconnect();
						resolve();
					}
				} );

				observer.observe( document.body, {
					childList: true,
					subtree: true,
				} );

				// Final timeout after 8 more seconds (10 total)
				setTimeout( () => {
					observer.disconnect();
					resolve();
				}, 8000 );
			}, 2000 );
		} );

		iframeLogger.log( `⏱️ Sidebar container detection took: ${ ( performance.now() - sidebarWaitStart ).toFixed( 2 ) }ms` );

		if ( ! sidebarContainer ) {
			iframeLogger.error( 'Sidebar container not found' );
			return;
		}
	}

	// Determine insertion method and styling based on sidebar availability
	const insertCallback = ( iframeElement: HTMLIFrameElement ) => {
		// Sidebar mode - inject into sidebar container
		iframeLogger.log( 'Injecting Angie iframe into sidebar container' );

		// Set iframe attributes for accessibility
		iframeElement.setAttribute( 'title', 'Angie AI Assistant' );
		iframeElement.setAttribute( 'role', 'application' );
		iframeElement.setAttribute( 'aria-label', 'Angie AI Assistant Interface' );

		// Clear any loading states
		const loadingElement = document.getElementById( 'angie-sidebar-loading' );
		if ( loadingElement ) {
			loadingElement.textContent = '';
		}

		// Insert iframe into sidebar
		sidebarContainer?.appendChild( iframeElement );
	};

	// Determine CSS styling based on mode
	const iframeCss = {
		// Sidebar mode - fill container
		width: '100%',
		height: '100%',
		border: 'none',
		outline: 'none',
	};

	const { iframe, iframeUrlObject } = await openSaaSPage( {
		origin: props.origin || 'https://angie.elementor.com',
		path: props.path && isValidPath( props.path ) ? props.path : DEFAULT_PATH,
		insertCallback,
		embeddedConfig: props.embeddedConfig,
		css: iframeCss,
		uiTheme: props.uiTheme,
		isRTL: props.isRTL,
		sdkVersion: ANGIE_SDK_VERSION,
		iframeElementId: instance.iframeElementId,
		instanceId: instance.instanceId,
		appId: instance.appId,
	} );

	instance.iframe = iframe;
	instance.iframeUrlObject = iframeUrlObject;

	flushPendingSdkMessages( instance );

	registerSdkInstance( instance );
	startSdkMessageRouting();

	listenToOAuthFromIframe( instance );
	setupOidcLoginFlowHandler( instance );

	registerIframeHostHandler( {
		instance,
		trustedOrigins: [ window.location.origin, props.origin || 'https://angie.elementor.com' ],
	} );

	return {
		iframe,
		iframeOrigin: iframeUrlObject.origin,
	};
};
