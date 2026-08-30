import { postMessageToInstance } from "./angie-iframe-utils";
import { appState, type AppState } from "./config";
import { MessageEventType } from "./types";
import { createChildLogger } from "./logger";
import { isOidcFlowInUrl } from "@elementor/oidc-auth";
import { isFromIframe, isTrustedIframeMessage, sendSuccessMessage, toggleAngieSidebar as setIframeAccessibility } from "./utils";
import sidebarCssContent from "./sidebar.css?raw";

const sidebarLogger = createChildLogger( 'sidebar' );
let cssInjected = false;

function injectCSS(): void {
	if (typeof document === 'undefined' || cssInjected) {
		return;
	}

	const styleId = 'angie-sidebar-styles';
	
	if (document.getElementById(styleId)) {
		cssInjected = true;
		return;
	}

	const style = document.createElement('style');
	style.id = styleId;
	style.textContent = sidebarCssContent;
	
	const head = document.head || document.getElementsByTagName('head')[0];
	head.insertBefore(style, head.firstChild);
	
	cssInjected = true;
}

export const ANGIE_SIDEBAR_STATE_OPEN = 'open';
export const ANGIE_SIDEBAR_STATE_CLOSED = 'closed';

// Only the sidebar layout persists state, and only one sidebar may run on a page, so
// these keys never collide and stay unprefixed.
export const STATE_STORAGE_KEY = 'angie_sidebar_state';
const WIDTH_STORAGE_KEY = 'angie_sidebar_width';

const SIDE_MENU_WIDTH = 40;
const MIN_WIDTH = 310 + SIDE_MENU_WIDTH;
const MAX_WIDTH = 550 + SIDE_MENU_WIDTH;
const DEFAULT_WIDTH = 330 + SIDE_MENU_WIDTH;

export type AngieSidebarState = typeof ANGIE_SIDEBAR_STATE_OPEN | typeof ANGIE_SIDEBAR_STATE_CLOSED;
export type AngieSidebarToggleEventData = {
	isOpen: boolean;
	sidebar: HTMLElement;
	skipTransition?: boolean;
};

export function loadWidth(): number {
	if ( typeof window === 'undefined' ) {
		return DEFAULT_WIDTH;
	}

	try {
		const savedWidth = window.localStorage.getItem( WIDTH_STORAGE_KEY );
		if ( savedWidth ) {
			const width = parseInt( savedWidth, 10 );
			if ( width >= MIN_WIDTH && width <= MAX_WIDTH ) {
				return width;
			}
		}
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
	return DEFAULT_WIDTH;
}

export function getAngieSidebarSavedState(): AngieSidebarState | null {
	if ( typeof window === 'undefined' ) {
		return null;
	}
	return localStorage.getItem( STATE_STORAGE_KEY ) as AngieSidebarState | null;
}

export function handleFocus( isOpen: boolean, delay: number, instance: AppState = appState ): void {
	if ( isOpen ) {
		setTimeout( function() {
			postMessageToInstance( instance, {
				type: 'focusInput',
			} );
		}, delay );
	}
}

export function saveState( state: string ): void {
	try {
		localStorage.setItem( STATE_STORAGE_KEY, state );
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
}

export function saveWidth( width: number ): void {
	try {
		localStorage.setItem( WIDTH_STORAGE_KEY, width.toString() );
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
}

export function applyWidth( width: number ): void {
	document.documentElement.style.setProperty( '--angie-sidebar-width', `${ width }px` );
}

export function forceSidebarClosedDuringOAuth(): void {
	applyState( ANGIE_SIDEBAR_STATE_CLOSED );
	try {
		localStorage.setItem( STATE_STORAGE_KEY, ANGIE_SIDEBAR_STATE_CLOSED );
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
}

export function loadState( defaultState: AngieSidebarState = ANGIE_SIDEBAR_STATE_OPEN ): void {
	if ( isOidcFlowInUrl() ) {
		forceSidebarClosedDuringOAuth();
		return;
	}

	applyState( getAngieSidebarSavedState() || defaultState );
}

export function applyState( state: AngieSidebarState ): void {
	if ( typeof window !== 'undefined' && window.toggleAngieSidebar ) {
		window.toggleAngieSidebar( state === ANGIE_SIDEBAR_STATE_OPEN, true );
	}
}

export function initializeResize( instance: AppState = appState ): void {
	const sidebar = document.getElementById( instance.containerId );
	if ( ! sidebar ) {
		return;
	}

	let isResizing = false;
	let startX = 0;
	let startWidth = 0;

	const handleMouseDown = ( e: MouseEvent ) => {
		const rect = sidebar.getBoundingClientRect();
		const isRTL = document.documentElement.dir === 'rtl';
		const resizeZone = isRTL ? e.clientX <= rect.left + 4 : e.clientX >= rect.right - 4;

		if ( resizeZone ) {
			isResizing = true;
			startX = e.clientX;
			startWidth = rect.width;
			sidebar.classList.add( 'angie-resizing' );
			document.body.style.cursor = 'ew-resize';
			document.body.style.userSelect = 'none';
			e.preventDefault();
			e.stopPropagation();
		}
	};

	const handleMouseMove = ( e: MouseEvent ) => {
		if ( ! isResizing ) {
			return;
		}

		const isRTL = document.documentElement.dir === 'rtl';
		let deltaX;

		if ( isRTL ) {
			deltaX = startX - e.clientX;
		} else {
			deltaX = e.clientX - startX;
		}

		const newWidth = Math.max( MIN_WIDTH, Math.min( MAX_WIDTH, startWidth + deltaX ) );

		applyWidth( newWidth );
		e.preventDefault();
		e.stopPropagation();
	};

	const handleMouseUp = ( e: MouseEvent ) => {
		if ( isResizing ) {
			isResizing = false;
			sidebar.classList.remove( 'angie-resizing' );
			document.body.style.cursor = '';
			document.body.style.userSelect = '';

			const currentWidth = parseInt( getComputedStyle( document.documentElement ).getPropertyValue( '--angie-sidebar-width' ), 10 );
			saveWidth( currentWidth );

			postMessageToInstance( instance, {
				type: MessageEventType.ANGIE_SIDEBAR_RESIZED,
				payload: { initialWidth: startWidth, width: currentWidth },
			} );

			e.preventDefault();
			e.stopPropagation();
		}
	};

	sidebar.addEventListener( 'mousedown', handleMouseDown );
	document.addEventListener( 'mousemove', handleMouseMove );
	document.addEventListener( 'mouseup', handleMouseUp );

	const savedWidth = loadWidth();
	applyWidth( savedWidth );
}

export function createToggleSidebarFunction(
	onToggle?: ( isOpen: boolean, sidebar: HTMLElement, skipTransition?: boolean ) => void,
	instance: AppState = appState
): ( force?: boolean, skipTransition?: boolean ) => void {
	return function( force?: boolean, skipTransition?: boolean ): void {
		const body = document.body;
		const sidebar = document.getElementById( instance.containerId );

		if ( ! sidebar ) {
			sidebarLogger.warn( 'Required elements not found!' );
			return;
		}

		const isActive = body.classList.contains( 'angie-sidebar-active' );
		const shouldOpen = force !== undefined ? force : ! isActive;

		if ( ! skipTransition ) {
			body.classList.add( 'angie-sidebar-transitioning' );
			setTimeout( function() {
				body.classList.remove( 'angie-sidebar-transitioning' );
			}, 300 );
		}

		if ( shouldOpen ) {
			body.classList.add( 'angie-sidebar-active' );
		} else {
			body.classList.remove( 'angie-sidebar-active' );
		}

		if ( instance.iframe ) {
			setIframeAccessibility( instance.iframe, shouldOpen, instance.containerId );
		}

		const focusDelay = skipTransition ? 0 : 300;
		handleFocus( shouldOpen, focusDelay, instance );

		if ( onToggle ) {
			onToggle( shouldOpen, sidebar, skipTransition );
		}

		saveState( shouldOpen ? ANGIE_SIDEBAR_STATE_OPEN : ANGIE_SIDEBAR_STATE_CLOSED );

		const event = new CustomEvent<AngieSidebarToggleEventData>( 'angieSidebarToggle', {
			detail: { isOpen: shouldOpen, sidebar, skipTransition },
		} );
		document.dispatchEvent( event );

		postMessageToInstance( instance, {
			type: MessageEventType.ANGIE_SIDEBAR_TOGGLED,
			payload: { state: shouldOpen ? 'opened' : 'closed' },
		} );
	};
}

let sidebarToggleMessageListenerAttached = false;

export function setupMessageListener( instance: AppState = appState ): void {
	if ( sidebarToggleMessageListenerAttached ) {
		return;
	}

	sidebarToggleMessageListenerAttached = true;

	window.addEventListener( 'message', function( event ) {
		if ( event.data?.type !== 'toggleAngieSidebar' ) {
			return;
		}

		const iframeOrigin = instance.iframeUrlObject?.origin;
		const isTrusted = iframeOrigin
			? isTrustedIframeMessage( event, iframeOrigin, instance.iframe )
			: isFromIframe( event, instance.iframe );

		if ( ! isTrusted ) {
			return;
		}

		const { force, skipTransition } = event.data.payload || {};
		if ( window.toggleAngieSidebar ) {
			window.toggleAngieSidebar( force, skipTransition );
		}

		const port = event.ports?.[ 0 ];
		if ( port ) {
			sendSuccessMessage( port );
		}
	} );
}

export const resetSidebarMessageListenerForTests = (): void => {
	sidebarToggleMessageListenerAttached = false;
};

type InitAngieSidebarOptions = {
	onToggle?: ( isOpen: boolean, sidebar: HTMLElement, skipTransition?: boolean ) => void;
	skipDefaultCss?: boolean;
	instance?: AppState;
};

export function initAngieSidebar( options?: InitAngieSidebarOptions ): void {
	if ( ! options?.skipDefaultCss ) {
		injectCSS();
	}

	const instance = options?.instance ?? appState;

	if ( typeof window !== 'undefined' ) {
		window.toggleAngieSidebar = createToggleSidebarFunction( options?.onToggle, instance );
		setupMessageListener( instance );
	}
}

declare global {
	interface Window {
		toggleAngieSidebar: ( force?: boolean, skipTransition?: boolean ) => void;
	}
}