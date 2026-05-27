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
import { ensureSidebarToggleButton, syncSidebarToggleButton } from './sidebar-toggle';

export const initSidebarShell = (
	container: ResolvedConfigV2['container'],
	callbacks: ResolvedConfigV2['callbacks'],
): void => {
	const skipDefaultCss = container.styleTheme !== 'wordpress';
	const toggleButtonId = container.chatToggleButton.enabled
		? container.chatToggleButton.id
		: undefined;

	initAngieSidebar( {
		onToggle: ( isOpen ) => {
			if ( toggleButtonId ) {
				syncSidebarToggleButton( toggleButtonId, isOpen );
			}

			if ( ! isOpen && callbacks.onClose ) {
				callbacks.onClose();
			}
		},
		skipDefaultCss,
		styleTheme: container.styleTheme,
	} );

	if ( toggleButtonId ) {
		ensureSidebarToggleButton( { toggleButtonId } );
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
