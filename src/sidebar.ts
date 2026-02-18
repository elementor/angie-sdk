import { postMessageToAngieIframe } from "./angie-iframe-utils";
import { createChildLogger } from "./logger";
import { MessageEventType } from "./types";
import { waitForDocumentReady } from "./utils";
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
		const savedWidth = window.localStorage.getItem( 'angie_sidebar_width' );
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
	return localStorage.getItem( 'angie_sidebar_state' ) as AngieSidebarState | null;
}

export function handleFocus( isOpen: boolean, delay: number ): void {
	if ( isOpen ) {
		setTimeout( function() {
			postMessageToAngieIframe( {
				type: 'focusInput',
			} );
		}, delay );
	}
}

export function saveState( state: string ): void {
	try {
		localStorage.setItem( 'angie_sidebar_state', state );
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
}

export function saveWidth( width: number ): void {
	try {
		localStorage.setItem( 'angie_sidebar_width', width.toString() );
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
}

export function applyWidth( width: number ): void {
	document.documentElement.style.setProperty( '--angie-sidebar-width', `${ width }px` );
}

export function isInOAuthFlow(): boolean {
	const urlParams = new URLSearchParams( window.location.search );
	return urlParams.has( 'start-oauth' ) ||
			urlParams.has( 'oauth_code' ) ||
			urlParams.has( 'oauth_state' ) ||
			urlParams.has( 'oauth_error' );
}

export function forceSidebarClosedDuringOAuth(): void {
	applyState( ANGIE_SIDEBAR_STATE_CLOSED );
	try {
		localStorage.setItem( 'angie_sidebar_state', ANGIE_SIDEBAR_STATE_CLOSED );
	} catch ( e ) {
		sidebarLogger.warn( 'localStorage not available' );
	}
}

export function loadState(): void {
	if ( isInOAuthFlow() ) {
		forceSidebarClosedDuringOAuth();
		return;
	}

	applyState( getAngieSidebarSavedState() || ANGIE_SIDEBAR_STATE_OPEN );
}

export function applyState( state: AngieSidebarState ): void {
	if ( typeof window !== 'undefined' && window.toggleAngieSidebar ) {
		window.toggleAngieSidebar( state === ANGIE_SIDEBAR_STATE_OPEN, true );
	}
}

export function initializeResize(): void {
	const sidebar = document.getElementById( 'angie-sidebar-container' );
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

			postMessageToAngieIframe( {
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

export function createToggleSidebarFunction( onToggle?: ( isOpen: boolean, sidebar: HTMLElement, skipTransition?: boolean ) => void ): ( force?: boolean, skipTransition?: boolean ) => void {
	return function( force?: boolean, skipTransition?: boolean ): void {
		const body = document.body;
		const sidebar = document.getElementById( 'angie-sidebar-container' );

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

		const focusDelay = skipTransition ? 0 : 300;
		handleFocus( shouldOpen, focusDelay );

		if ( onToggle ) {
			onToggle( shouldOpen, sidebar, skipTransition );
		}

		saveState( shouldOpen ? ANGIE_SIDEBAR_STATE_OPEN : ANGIE_SIDEBAR_STATE_CLOSED );

		const event = new CustomEvent<AngieSidebarToggleEventData>( 'angieSidebarToggle', {
			detail: { isOpen: shouldOpen, sidebar, skipTransition },
		} );
		document.dispatchEvent( event );

		postMessageToAngieIframe( {
			type: MessageEventType.ANGIE_SIDEBAR_TOGGLED,
			payload: { state: shouldOpen ? 'opened' : 'closed' },
		} );
	};
}

export function setupMessageListener(): void {
	window.addEventListener( 'message', function( event ) {
		if ( event.data && event.data.type === 'toggleAngieSidebar' ) {
			const { force, skipTransition } = event.data.payload || {};
			if ( window.toggleAngieSidebar ) {
				window.toggleAngieSidebar( force, skipTransition );
			}
		}
	} );
}

export function initAngieSidebar( onToggle?: ( isOpen: boolean, sidebar: HTMLElement, skipTransition?: boolean ) => void ): void {
	injectCSS();

	if ( typeof window !== 'undefined' ) {
		window.toggleAngieSidebar = createToggleSidebarFunction( onToggle );
		setupMessageListener();
	}
}

declare global {
	interface Window {
		toggleAngieSidebar: ( force?: boolean, skipTransition?: boolean ) => void;
	}
}