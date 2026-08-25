import type { AppState } from '../../config';
import { hasSidebarLayoutInstance } from '../../instance-registry';
import { MessageEventType } from '../../types';
import { isTrustedIframeMessage, sendSuccessMessage, toggleAngieSidebar } from '../../utils';
import { syncToggleButton, wireToggleButton } from '../toggle-button';
import { addHostMessageHandler } from '../host-message-router';
import {
	CHAT_WIDGET_FULLSCREEN_CLASS,
	CHAT_WIDGET_HIDDEN_CLASS,
} from './constants';
import { findToggleButton } from './toggle-button-element';

type InitChatShellArgs = {
	containerId: string;
	iframeOrigin: string;
	toggleButtonSelector: string;
	onClose?: () => void;
	instance: AppState;
};

type SetChatWidgetOpenArgs = {
	containerId: string;
	toggleButtonSelector: string;
	isOpen: boolean;
	instance: AppState;
};

const TOGGLE_ANGIE_SIDEBAR_MESSAGE = 'toggleAngieSidebar';

const removeMessageHandlers = new Map<AppState, () => void>();

export const setChatWidgetOpen = ( args: SetChatWidgetOpenArgs ): void => {
	const container = document.getElementById( args.containerId );

	if ( ! container ) {
		return;
	}

	if ( args.isOpen ) {
		container.classList.remove( CHAT_WIDGET_HIDDEN_CLASS );
	} else {
		container.classList.add( CHAT_WIDGET_HIDDEN_CLASS );
	}

	if ( args.instance.iframe ) {
		toggleAngieSidebar( args.instance.iframe, args.isOpen, args.containerId );
	}

	syncToggleButton( args.toggleButtonSelector, args.isOpen );
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

const setOpen = ( args: InitChatShellArgs, isOpen: boolean ): void => {
	setChatWidgetOpen( {
		containerId: args.containerId,
		toggleButtonSelector: args.toggleButtonSelector,
		isOpen,
		instance: args.instance,
	} );
};

const isWidgetOpen = ( containerId: string ): boolean => {
	const container = document.getElementById( containerId );
	return !! container && ! container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS );
};

const handleSidebarToggleMessage = (
	args: InitChatShellArgs,
	payload: { force?: boolean } | undefined,
): void => {
	const force = payload?.force;

	if ( force !== undefined ) {
		setOpen( args, force );

		if ( ! force ) {
			args.onClose?.();
		}

		return;
	}

	const wasOpen = isWidgetOpen( args.containerId );
	setOpen( args, ! wasOpen );

	if ( wasOpen ) {
		args.onClose?.();
	}
};

const initToggleButton = ( args: InitChatShellArgs ): void => {
	wireToggleButton( {
		toggleButtonSelector: args.toggleButtonSelector,
		onClick: () => {
			const toggleEl = findToggleButton( args.toggleButtonSelector );
			const wasOpen = toggleEl?.getAttribute( 'aria-expanded' ) === 'true';

			setOpen( args, ! wasOpen );

			if ( wasOpen ) {
				args.onClose?.();
			}
		},
	} );
};

const setupChatWidgetMessageListeners = ( args: InitChatShellArgs ): void => {
	const { instance } = args;

	removeMessageHandlers.get( instance )?.();
	removeMessageHandlers.set( instance, addHostMessageHandler( ( event: MessageEvent ) => {
		if ( ! isTrustedIframeMessage( event, args.iframeOrigin, instance.iframe ) ) {
			return;
		}

		const port = event.ports?.[ 0 ];
		const { type, payload } = event.data || {};

		switch ( type ) {
			case MessageEventType.ANGIE_SIDEBAR_TOGGLED:
			case TOGGLE_ANGIE_SIDEBAR_MESSAGE:
				handleSidebarToggleMessage( args, payload );
				if ( port ) {
					sendSuccessMessage( port );
				}
				break;

			case MessageEventType.ANGIE_STUDIO_TOGGLE: {
				const isStudioOpen = !! event.data.isStudioOpen;
				setChatWidgetFullscreen( args.containerId, isStudioOpen );

				if ( isStudioOpen ) {
					setOpen( args, true );
				}

				if ( port ) {
					sendSuccessMessage( port );
				}
				break;
			}
		}
	} ) );
};

export const initChatShell = ( args: InitChatShellArgs ): void => {
	initToggleButton( args );
	setupChatWidgetMessageListeners( args );

	// Preserve the sidebar's global toggle when both layouts are used.
	if ( ! hasSidebarLayoutInstance() ) {
		window.toggleAngieSidebar = ( force?: boolean ) => {
			handleSidebarToggleMessage( args, { force } );
		};
	}
};

export const resetChatShellForTests = (): void => {
	removeMessageHandlers.forEach( ( remove ) => remove() );
	removeMessageHandlers.clear();
};
