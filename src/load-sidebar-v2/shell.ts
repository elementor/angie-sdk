import {
	ANGIE_SIDEBAR_STATE_OPEN,
	initAngieSidebar,
	initializeResize,
	loadState,
} from '../sidebar';
import type { ResolvedConfigV2 } from './config';

export const initSidebarShell = (
	container: ResolvedConfigV2['container'],
	callbacks: ResolvedConfigV2['callbacks'],
): void => {
	initAngieSidebar( {
		onToggle: ( isOpen ) => {
			if ( ! isOpen && callbacks.onClose ) {
				callbacks.onClose();
			}
		},
	} );
};

export const applyInitialSidebarShellState = (
	_container: ResolvedConfigV2['container'],
): void => {
};

export const finalizeSidebarShellState = (
	container: ResolvedConfigV2['container'],
): void => {
	if ( container.persistOpenState ) {
		loadState( ANGIE_SIDEBAR_STATE_OPEN );
	}

	if ( container.resizable ) {
		initializeResize();
	}
};
