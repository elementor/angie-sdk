import { describe, expect, it, jest } from '@jest/globals';
import { initAngieSidebar, initializeResize, loadState, applyState, getAngieSidebarSavedState } from '../sidebar';
import type { ContainerConfig } from './config';
import { initSidebarShell, applyInitialSidebarShellState, finalizeSidebarShellState } from './shell';

jest.mock( '../sidebar', () => ( {
	ANGIE_SIDEBAR_STATE_CLOSED: 'closed',
	ANGIE_SIDEBAR_STATE_OPEN: 'open',
	applyState: jest.fn(),
	getAngieSidebarSavedState: jest.fn(),
	initAngieSidebar: jest.fn(),
	initializeResize: jest.fn(),
	loadState: jest.fn(),
} ) );

const baseContainer: ContainerConfig = {
	id: 'angie-sidebar-container',
	layout: 'sidebar',
	styleTheme: 'wordpress',
	persistOpenState: false,
	resizable: false,
	chatToggleButton: { enabled: false, selector: '#angie-widget-toggle' },
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

	it( 'should start closed when toggle is enabled', () => {
		( getAngieSidebarSavedState as jest.Mock ).mockReturnValue( null );

		applyInitialSidebarShellState( {
			...baseContainer,
			persistOpenState: true,
			chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
		} );

		expect( applyState ).toHaveBeenCalledWith( 'closed' );
	} );

	it( 'should restore closed state on finalize when toggle is enabled', () => {
		finalizeSidebarShellState( {
			...baseContainer,
			persistOpenState: true,
			resizable: true,
			chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
		} );

		expect( loadState ).toHaveBeenCalledWith( 'closed' );
	} );
} );
