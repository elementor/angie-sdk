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

	// closeAngie reuses toggleAngieSidebar(false) so UI, onToggle, and persist
	// stay in sync. That ends in onToggle(false), same as a user dismiss: write
	// the result here, take it once. Empty slot → onClose({}).
	let pendingOnCloseParams: Record<string, unknown> | undefined;

	const takeOnCloseParams = (): Record<string, unknown> => {
		const params = pendingOnCloseParams ?? {};
		pendingOnCloseParams = undefined;

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
				notifyClose( callbacks.onClose, takeOnCloseParams() );
			}
		},
	} );

	registerInstanceCloser( instance.instanceId, ( params ) => {
		pendingOnCloseParams = params;

		try {
			window.toggleAngieSidebar?.( false );
		} finally {
			// No container → toggle skips onToggle. Still deliver the result.
			if ( pendingOnCloseParams ) {
				notifyClose( callbacks.onClose, takeOnCloseParams() );
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
