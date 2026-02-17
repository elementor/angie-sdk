import { createChildLogger } from './logger';
import { openSaaSPage } from './openSaaSPage';
import { loadWidth } from './sidebar';
import { isMobile, isSafeUrl, sendSuccessMessage, toggleAngieSidebar } from './utils';
import { ANGIE_SDK_VERSION } from './version';
import { listenToSDK } from './sdk';
import { addLocalStorageListener } from './localStorage';
import { HostEventType } from './types';
import { appState } from './config';
import { listenToOAuthFromIframe } from './oauth';

declare global {
	interface Window {
		angieConfig?: {
			version: string;
		};
	}
}

export enum MessageEventType {
	SDK_ANGIE_ALL_SERVERS_REGISTERED = 'sdk-angie-all-servers-registered',
	SDK_ANGIE_READY_PING = 'sdk-angie-ready-ping',
	SDK_REQUEST_CLIENT_CREATION = 'sdk-request-client-creation',
	SDK_TRIGGER_ANGIE = 'sdk-trigger-angie',
	SDK_TRIGGER_ANGIE_RESPONSE = 'sdk-trigger-angie-response',
	
	ANGIE_SIDEBAR_RESIZED = 'angie-sidebar-resized',
	ANGIE_SIDEBAR_TOGGLED = 'angie-sidebar-toggled',
	ANGIE_CHAT_TOGGLE = 'angie-chat-toggle',
	ANGIE_STUDIO_TOGGLE = 'angie-studio-toggle',
	ANGIE_NAVIGATE_TO_URL = 'angie/navigate-to-url',
	ANGIE_PAGE_RELOAD = 'angie/page-reload',
	
}

type OpenIframeProps = {
	origin?: string;
	uiTheme: string;
	isRTL: boolean;
}

const iframeLogger = createChildLogger( 'iframe' );

export const openIframe = async ( props: OpenIframeProps ) => {
	if ( isMobile() ) {
		iframeLogger.log( 'Mobile detected, skipping iframe injection' );
		return;
	}

	// Check if sidebar container exists
	let sidebarContainer = document.getElementById( 'angie-sidebar-container' );

	if ( ! sidebarContainer ) {
		// Use MutationObserver for more efficient DOM watching
		const sidebarWaitStart = performance.now();
		iframeLogger.log( '⏱️ Waiting for sidebar container...' );

		await new Promise<void>( ( resolve ) => {
			// First try with shorter polling interval for immediate cases
			let attempts = 0;
			const quickCheck = setInterval( () => {
				sidebarContainer = document.getElementById( 'angie-sidebar-container' );
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
					sidebarContainer = document.getElementById( 'angie-sidebar-container' );
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

		toggleAngieSidebar( iframeElement, true );

		// Focus management after iframe loads
		iframeElement.addEventListener( 'load', () => {
			iframeElement.focus();
		} );
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
		path: `angie/wp-admin`,
		insertCallback,
		css: iframeCss,
		uiTheme: props.uiTheme,
		isRTL: props.isRTL,
		sdkVersion: ANGIE_SDK_VERSION,
	} );

	appState.iframe = iframe;
	appState.iframeUrlObject = iframeUrlObject;

	addLocalStorageListener();

	listenToSDK( appState );

	listenToOAuthFromIframe();

	window.addEventListener( 'message', async ( event ) => {

		const trustedOrigins = [ window.location.origin, props.origin || 'https://angie.elementor.com' ];

		if ( ! trustedOrigins.includes( event.origin ) ) {
			return;
		}

		if ( event?.data?.type === MessageEventType.ANGIE_CHAT_TOGGLE ) {
			appState.open = event.data.open;

			if ( appState.iframe ) {
				toggleAngieSidebar( appState.iframe, appState.open );
			}
		} else if ( event?.data?.type === MessageEventType.ANGIE_STUDIO_TOGGLE ) {
			const isStudioOpen = event.data.isStudioOpen;

			if ( ! appState.iframe ) {
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
			const { url = '' } = event.data;
			if ( isSafeUrl( url ) ) {
				window.location.assign( url );
			} else {
				throw new Error( 'Angie: Invalid URL - navigation blocked for security reasons' );
			}
		} else if ( event?.data?.type === MessageEventType.ANGIE_PAGE_RELOAD ) {
			iframeLogger.log( 'Angie requested page reload - database operations completed' );
			window.location.reload();
		} else if ( event?.data?.type === HostEventType.RESET_HASH ) {
			window.location.hash = '';

			sendSuccessMessage( event.ports[ 0 ], {
				message: 'Hash reset successfully',
			} );
		}

	} );
};
