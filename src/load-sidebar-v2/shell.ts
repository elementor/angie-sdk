import {
	ANGIE_SIDEBAR_STATE_CLOSED,
	ANGIE_SIDEBAR_STATE_OPEN,
	applyState,
	getAngieSidebarSavedState,
	initAngieSidebar,
	initializeResize,
	loadState,
} from '../sidebar';
import type { ResolvedConfigV2 } from './config';
import { syncSidebarToggleButton, wireSidebarToggleButton } from './sidebar-toggle';

export const initSidebarShell = (
	container: ResolvedConfigV2['container'],
	callbacks: ResolvedConfigV2['callbacks'],
): void => {
	const toggleButtonSelector = container.chatToggleButton.enabled
		? container.chatToggleButton.selector
		: undefined;

	initAngieSidebar( {
		onToggle: ( isOpen ) => {
			if ( toggleButtonSelector ) {
				syncSidebarToggleButton( toggleButtonSelector, isOpen );
			}

			if ( ! isOpen && callbacks.onClose ) {
				callbacks.onClose();
			}
		},
		styleTheme: container.styleTheme,
	} );

	if ( toggleButtonSelector ) {
		wireSidebarToggleButton( { toggleButtonSelector } );
	}
};

export const applyInitialSidebarShellState = (
	container: ResolvedConfigV2['container'],
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
	container: ResolvedConfigV2['container'],
): void => {
	if ( container.persistOpenState ) {
		loadState(
			container.chatToggleButton.enabled
				? ANGIE_SIDEBAR_STATE_CLOSED
				: ANGIE_SIDEBAR_STATE_OPEN,
		);
	}

	if ( container.resizable ) {
		initializeResize();
	}
};
