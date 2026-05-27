import { describe, expect, it, jest } from '@jest/globals';
import { initAngieSidebar, initializeResize, loadState, applyState, getAngieSidebarSavedState } from '../sidebar';
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

		initSidebarShell(
			{
				id: 'angie-sidebar-container',
				layout: 'sidebar',
				styleTheme: 'wordpress',
				persistOpenState: false,
				resizable: false,
				chatToggleButton: { enabled: false, id: 'angie-widget-toggle' },
			},
			{ onClose },
		);

		capturedOnToggle?.( false );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( loadState ).not.toHaveBeenCalled();
		expect( initializeResize ).not.toHaveBeenCalled();
	} );

	it( 'should skip default css when styleTheme is empty', () => {
		initSidebarShell(
			{
				id: 'angie-sidebar-container',
				layout: 'sidebar',
				styleTheme: '',
				persistOpenState: false,
				resizable: false,
				chatToggleButton: { enabled: false, id: 'angie-widget-toggle' },
			},
			{},
		);

		expect( initAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true, styleTheme: '' } ),
		);
	} );

	it( 'should start closed when toggle is enabled and no saved open state', () => {
		( getAngieSidebarSavedState as jest.Mock ).mockReturnValue( null );

		applyInitialSidebarShellState( {
			id: 'angie-sidebar-container',
			layout: 'sidebar',
			styleTheme: 'wordpress',
			persistOpenState: true,
			resizable: true,
			chatToggleButton: { enabled: true, id: 'angie-lite-toggle' },
		} );

		expect( applyState ).toHaveBeenCalledWith( 'closed' );
		expect( loadState ).not.toHaveBeenCalled();
		expect( initializeResize ).not.toHaveBeenCalled();
	} );

	it( 'should defer open restore until finalize when saved state is open', () => {
		( getAngieSidebarSavedState as jest.Mock ).mockReturnValue( 'open' );

		applyInitialSidebarShellState( {
			id: 'angie-sidebar-container',
			layout: 'sidebar',
			styleTheme: 'wordpress',
			persistOpenState: true,
			resizable: true,
			chatToggleButton: { enabled: true, id: 'angie-lite-toggle' },
		} );

		expect( applyState ).not.toHaveBeenCalled();
	} );

	it( 'should restore persisted state when toggle is enabled', () => {
		finalizeSidebarShellState( {
			id: 'angie-sidebar-container',
			layout: 'sidebar',
			styleTheme: 'wordpress',
			persistOpenState: true,
			resizable: true,
			chatToggleButton: { enabled: true, id: 'angie-lite-toggle' },
		} );

		expect( loadState ).toHaveBeenCalledWith( 'closed' );
		expect( initializeResize ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should restore persisted state when toggle is disabled', () => {
		finalizeSidebarShellState( {
			id: 'angie-sidebar-container',
			layout: 'sidebar',
			styleTheme: 'wordpress',
			persistOpenState: true,
			resizable: true,
			chatToggleButton: { enabled: false, id: 'angie-widget-toggle' },
		} );

		expect( loadState ).toHaveBeenCalledWith( 'open' );
		expect( applyState ).not.toHaveBeenCalled();
		expect( initializeResize ).toHaveBeenCalledTimes( 1 );
	} );
} );
