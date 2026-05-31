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

const sidebarContainer = ( overrides: Partial<ContainerConfig> = {} ): ContainerConfig => ( {
	id: 'angie-sidebar-container',
	layout: 'sidebar',
	styleTheme: 'wordpress',
	persistOpenState: true,
	resizable: true,
	chatToggleButton: { enabled: false, selector: '#angie-widget-toggle' },
	...overrides,
} );

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

		initSidebarShell( sidebarContainer( { persistOpenState: false } ), { onClose } );
		capturedOnToggle?.( false );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should skip default css when styleTheme is empty', () => {
		initSidebarShell( sidebarContainer( { styleTheme: '', persistOpenState: false } ), {} );

		expect( initAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true, styleTheme: '' } ),
		);
	} );

	it( 'should apply closed state before restore when toggle is enabled', () => {
		( getAngieSidebarSavedState as jest.Mock ).mockReturnValue( null );

		applyInitialSidebarShellState(
			sidebarContainer( { chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' } } ),
		);

		expect( applyState ).toHaveBeenCalledWith( 'closed' );
		expect( loadState ).not.toHaveBeenCalled();
	} );

	it( 'should defer open restore when saved state is open', () => {
		( getAngieSidebarSavedState as jest.Mock ).mockReturnValue( 'open' );

		applyInitialSidebarShellState(
			sidebarContainer( { chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' } } ),
		);

		expect( applyState ).not.toHaveBeenCalled();
	} );

	it( 'should restore persisted state on finalize based on toggle', () => {
		finalizeSidebarShellState(
			sidebarContainer( { chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' } } ),
		);
		expect( loadState ).toHaveBeenCalledWith( 'closed' );

		jest.clearAllMocks();
		finalizeSidebarShellState( sidebarContainer() );
		expect( loadState ).toHaveBeenCalledWith( 'open' );
		expect( initializeResize ).toHaveBeenCalled();
	} );
} );
