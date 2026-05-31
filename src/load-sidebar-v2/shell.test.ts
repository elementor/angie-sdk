import { describe, expect, it, jest } from '@jest/globals';
import { initAngieSidebar, initializeResize, loadState } from '../sidebar';
import { initSidebarShell, finalizeSidebarShellState } from './shell';

jest.mock( '../sidebar', () => ( {
	ANGIE_SIDEBAR_STATE_CLOSED: 'closed',
	ANGIE_SIDEBAR_STATE_OPEN: 'open',
	applyState: jest.fn(),
	getAngieSidebarSavedState: jest.fn(),
	initAngieSidebar: jest.fn(),
	initializeResize: jest.fn(),
	loadState: jest.fn(),
} ) );

const baseContainer = {
	id: 'angie-sidebar-container',
	layout: 'sidebar' as const,
	persistOpenState: false,
	resizable: false,
};

describe( 'load-sidebar-v2/shell', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'should invoke onClose when sidebar closes via onToggle', () => {
		const onClose = jest.fn();
		let capturedOnToggle: ( ( isOpen: boolean ) => void ) | undefined;

		( initAngieSidebar as jest.Mock ).mockImplementation( ( ...args: unknown[] ) => {
			const options = args[ 0 ] as { onToggle?: ( isOpen: boolean ) => void };
			capturedOnToggle = options.onToggle;
		} );

		initSidebarShell( baseContainer, { onClose } );

		capturedOnToggle?.( false );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( loadState ).not.toHaveBeenCalled();
		expect( initializeResize ).not.toHaveBeenCalled();
	} );

	it( 'should restore persisted open state on finalize', () => {
		finalizeSidebarShellState( {
			...baseContainer,
			persistOpenState: true,
			resizable: true,
		} );

		expect( loadState ).toHaveBeenCalledWith( 'open' );
		expect( initializeResize ).toHaveBeenCalledTimes( 1 );
	} );
} );
