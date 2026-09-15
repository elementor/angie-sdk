import {
	ANGIE_SIDEBAR_STATE_CLOSED,
	ANGIE_SIDEBAR_STATE_OPEN,
	applyState,
	getAngieSidebarSavedState,
	initAngieSidebar,
	initializeResize,
	loadState,
} from '../sidebar';
import { appState, type AppState } from '../config';
import type { ContainerConfig, ResolvedConfigV2 } from './config';
import {
	syncToggleButton,
	wireToggleButton,
} from './toggle-button';
import { injectStyleThemeCss } from './inject-style-theme';
import { notifyClose, registerInstanceCloser } from './close';

export const initSidebarShell = (
	container: ContainerConfig,
	callbacks: ResolvedConfigV2['callbacks'],
	instance: AppState = appState,
): void => {
	const toggleButtonSelector = container.chatToggleButton.enabled
		? container.chatToggleButton.selector
		: undefined;

	// Set only for the duration of one synchronous close, and consumed by the
	// `onToggle` below. Every other close reports `{}`.
	let closeParams: Record<string, unknown> | undefined;

	const consumeCloseParams = (): Record<string, unknown> => {
		const params = closeParams ?? {};
		closeParams = undefined;

		return params;
	};

	initAngieSidebar( {
		instance,
		skipDefaultCss: container.skipDefaultCss,
		onToggle: ( isOpen ) => {
			if ( toggleButtonSelector ) {
				syncToggleButton( toggleButtonSelector, isOpen );
			}

			callbacks.onToggle?.( isOpen );

			if ( ! isOpen ) {
				notifyClose( callbacks.onClose, consumeCloseParams() );
			}
		},
	} );

	registerInstanceCloser( instance.instanceId, ( params ) => {
		closeParams = params;

		try {
			window.toggleAngieSidebar?.( false );
		} finally {
			// The sidebar bails out when its container is missing, so deliver
			// the result the host asked to send even if the UI never toggled.
			if ( closeParams ) {
				notifyClose( callbacks.onClose, consumeCloseParams() );
			}
		}
	} );

	injectStyleThemeCss( container.styleTheme );

	if ( toggleButtonSelector ) {
		wireToggleButton( {
			toggleButtonSelector,
			onClick: ( event ) => {
				event.preventDefault();
				window.toggleAngieSidebar?.();
			},
		} );
	}
};

export const applyInitialSidebarShellState = (
	container: ContainerConfig,
): void => {
	if ( ! container.chatToggleButton.enabled ) {
		return;
	}

	if (
		container.persistOpenState &&
		getAngieSidebarSavedState() === ANGIE_SIDEBAR_STATE_OPEN
	) {
		return;
	}

	applyState( ANGIE_SIDEBAR_STATE_CLOSED );
};

export const finalizeSidebarShellState = (
	container: ContainerConfig,
	instance: AppState = appState,
): void => {
	if ( container.persistOpenState ) {
		loadState(
			container.chatToggleButton.enabled
				? ANGIE_SIDEBAR_STATE_CLOSED
				: ANGIE_SIDEBAR_STATE_OPEN,
		);
	}

	if ( container.resizable ) {
		initializeResize( instance );
	}
};
