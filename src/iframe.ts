import { addLocalStorageListener } from './localStorage';
import { appState } from './config';
import { createChildLogger } from './logger';
import { listenToOAuthFromIframe } from './oauth';
import { listenToSDK } from './sdk';
import { loadWidth } from './sidebar';
import { HostEventType, MessageEventType } from './types';
import { isMobile, isSafeUrl, sendSuccessMessage, toggleAngieSidebar } from './utils';
import { ANGIE_SDK_VERSION } from './version';
import { openSaaSPage } from './openSaaSPage';

type OpenIframeProps = {
	origin?: string;
	uiTheme: string;
	isRTL: boolean;
}

const iframeLogger = createChildLogger( 'iframe' );

/**
 * Helper function to disable navigation prevention in Angie iframe
 * Sends a message to the iframe to allow navigation/reload to proceed
 */
export const disableNavigationPrevention = async (): Promise<void> => {
	if ( ! appState.iframe?.contentWindow || ! appState.iframeUrlObject ) {
		iframeLogger.warn( 'Cannot disable navigation prevention: iframe or origin not available' );
		return;
	}

	try {
		iframeLogger.log( 'Disabling navigation prevention in Angie iframe' );
		appState.iframe.contentWindow.postMessage(
			{ type: MessageEventType.ANGIE_DISABLE_NAVIGATION_PREVENTION },
			appState.iframeUrlObject.origin
		);
		await new Promise( resolve => setTimeout( resolve, 100 ) );
	} catch ( error ) {
		iframeLogger.error( 'Failed to disable navigation prevention:', error );
		throw error;
	}
};

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
			const { url = '', confirmed = false } = event.data.payload || {};
			
			if ( ! confirmed ) {
				iframeLogger.log( 'Navigation requires user confirmation' );
				// Future: Send confirmation request back to iframe
				return;
			}
			
			if ( isSafeUrl( url ) ) {
				// Disable navigation prevention in Angie iframe
				await disableNavigationPrevention();
				window.location.assign( url );
			} else {
				iframeLogger.error( 'Navigation blocked: Invalid or unsafe URL', { url } );
				return;
			}
		} else if ( event?.data?.type === MessageEventType.ANGIE_PAGE_RELOAD ) {
			const { confirmed = false } = event.data.payload || {};
			
			if ( ! confirmed ) {
				iframeLogger.log( 'Page reload requires user confirmation' );
				// Future: Send confirmation request back to iframe
				return;
			}
			
			iframeLogger.log( 'Page reload confirmed - disabling navigation prevention and reloading' );
			
			// Disable navigation prevention in Angie iframe
			await disableNavigationPrevention();
			
			// Reload the page
			setTimeout( () => {
				window.location.reload();
			}, 50 );
		} else if ( event?.data?.type === HostEventType.RESET_HASH ) {
			window.location.hash = '';

			sendSuccessMessage( event.ports[ 0 ], {
				message: 'Hash reset successfully',
			} );
		}

	} );
};
