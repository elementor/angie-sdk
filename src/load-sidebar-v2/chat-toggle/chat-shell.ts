import { MessageEventType } from '../../types';
import {
	CHAT_WIDGET_FULLSCREEN_CLASS,
	CHAT_WIDGET_HIDDEN_CLASS,
} from './constants';

type InitChatShellArgs = {
	containerId: string;
	iframeOrigin: string;
	toggleButtonId: string;
	onClose?: () => void;
};

type SetChatWidgetOpenArgs = {
	containerId: string;
	toggleButtonId: string;
	isOpen: boolean;
};

const TOGGLE_ANGIE_SIDEBAR_MESSAGE = 'toggleAngieSidebar';

const sendPortSuccess = ( port: MessagePort, payload?: unknown ) => {
	port.postMessage( { status: 'success', payload } );
};

export const setChatWidgetOpen = ( args: SetChatWidgetOpenArgs ): void => {
	const container = document.getElementById( args.containerId );
	const toggleButton = document.getElementById( args.toggleButtonId );

	if ( ! container || ! toggleButton ) {
		return;
	}

	if ( args.isOpen ) {
		container.classList.remove( CHAT_WIDGET_HIDDEN_CLASS );
		container.setAttribute( 'aria-hidden', 'false' );
	} else {
		container.classList.add( CHAT_WIDGET_HIDDEN_CLASS );
		container.setAttribute( 'aria-hidden', 'true' );
	}

	toggleButton.setAttribute( 'aria-expanded', String( args.isOpen ) );
	toggleButton.setAttribute( 'aria-label', args.isOpen ? 'Close Angie' : 'Open Angie' );
};

const setChatWidgetFullscreen = ( containerId: string, isFullscreen: boolean ): void => {
	const container = document.getElementById( containerId );

	if ( ! container ) {
		return;
	}

	if ( isFullscreen ) {
		container.classList.add( CHAT_WIDGET_FULLSCREEN_CLASS );
	} else {
		container.classList.remove( CHAT_WIDGET_FULLSCREEN_CLASS );
	}
};

const handleSidebarToggleMessage = (
	args: InitChatShellArgs,
	payload: { force?: boolean } | undefined,
): void => {
	const force = payload?.force;

	if ( force === false ) {
		setChatWidgetOpen( {
			containerId: args.containerId,
			toggleButtonId: args.toggleButtonId,
			isOpen: false,
		} );
		args.onClose?.();
		return;
	}

	if ( force === true ) {
		setChatWidgetOpen( {
			containerId: args.containerId,
			toggleButtonId: args.toggleButtonId,
			isOpen: true,
		} );
		return;
	}

	const container = document.getElementById( args.containerId );
	const isCurrentlyOpen = container && ! container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS );
	setChatWidgetOpen( {
		containerId: args.containerId,
		toggleButtonId: args.toggleButtonId,
		isOpen: ! isCurrentlyOpen,
	} );

	if ( isCurrentlyOpen ) {
		args.onClose?.();
	}
};

const initToggleButton = ( args: InitChatShellArgs ): void => {
	const toggleButton = document.getElementById( args.toggleButtonId );

	if ( ! toggleButton ) {
		return;
	}

	toggleButton.addEventListener( 'click', () => {
		const isCurrentlyOpen = toggleButton.getAttribute( 'aria-expanded' ) === 'true';
		setChatWidgetOpen( {
			containerId: args.containerId,
			toggleButtonId: args.toggleButtonId,
			isOpen: ! isCurrentlyOpen,
		} );

		if ( isCurrentlyOpen ) {
			args.onClose?.();
		}
	} );
};

const setupChatWidgetMessageListeners = ( args: InitChatShellArgs ): void => {
	window.addEventListener( 'message', ( event: MessageEvent ) => {
		if ( event.origin !== args.iframeOrigin ) {
			return;
		}

		const port = event.ports?.[ 0 ];
		const { type, payload } = event.data || {};

		switch ( type ) {
			case MessageEventType.ANGIE_SIDEBAR_TOGGLED:
			case TOGGLE_ANGIE_SIDEBAR_MESSAGE:
				handleSidebarToggleMessage( args, payload );
				if ( port ) {
					sendPortSuccess( port );
				}
				break;

			case MessageEventType.ANGIE_STUDIO_TOGGLE: {
				const isStudioOpen = !! event.data.isStudioOpen;
				setChatWidgetFullscreen( args.containerId, isStudioOpen );

				if ( isStudioOpen ) {
					setChatWidgetOpen( {
						containerId: args.containerId,
						toggleButtonId: args.toggleButtonId,
						isOpen: true,
					} );
				}

				if ( port ) {
					sendPortSuccess( port );
				}
				break;
			}
		}
	} );
};

export const initChatShell = ( args: InitChatShellArgs ): void => {
	initToggleButton( args );
	setupChatWidgetMessageListeners( args );

	window.toggleAngieSidebar = ( force?: boolean ) => {
		handleSidebarToggleMessage( args, { force } );
	};
};
