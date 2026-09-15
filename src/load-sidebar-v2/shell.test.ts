import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { initAngieSidebar, initializeResize, loadState } from '../sidebar';
import { createAngieInstance, resetInstancesForTests } from '../instance-registry';
import { initSidebarShell, finalizeSidebarShellState } from './shell';
import { closeAngie, resetCloseForTests } from './close';

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
	styleTheme: '' as const,
	create: true,
	skipDefaultCss: false,
	persistOpenState: false,
	resizable: false,
	chatToggleButton: { enabled: false, selector: '#angie-widget-toggle' },
};

describe( 'load-sidebar-v2/shell', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		resetCloseForTests();
		resetInstancesForTests();
		delete ( window as Partial<Window> ).toggleAngieSidebar;
	} );

	const captureOnToggle = (): ( () => ( ( isOpen: boolean ) => void ) | undefined ) => {
		let capturedOnToggle: ( ( isOpen: boolean ) => void ) | undefined;

		( initAngieSidebar as jest.Mock ).mockImplementation( ( ...args: unknown[] ) => {
			const options = args[ 0 ] as { onToggle?: ( isOpen: boolean ) => void };
			capturedOnToggle = options.onToggle;
		} );

		return () => capturedOnToggle;
	};

	it( 'should invoke onClose when sidebar closes via onToggle', () => {
		const onClose = jest.fn();
		const getOnToggle = captureOnToggle();

		initSidebarShell( baseContainer, { onClose } );
		getOnToggle()?.( false );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( onClose ).toHaveBeenCalledWith( {} );
		expect( loadState ).not.toHaveBeenCalled();
		expect( initializeResize ).not.toHaveBeenCalled();
	} );

	it( 'should invoke onClose once with params on closeAngie', () => {
		const onClose = jest.fn();
		const getOnToggle = captureOnToggle();

		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		initSidebarShell( baseContainer, { onClose }, instance );
		window.toggleAngieSidebar = jest.fn( ( force?: boolean ) => getOnToggle()?.( !! force ) );

		closeAngie( { reason: 'user-finished' } );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( onClose ).toHaveBeenCalledWith( { reason: 'user-finished' } );

		// A later dismiss must not repeat the previous result.
		getOnToggle()?.( false );

		expect( onClose ).toHaveBeenCalledTimes( 2 );
		expect( onClose ).toHaveBeenLastCalledWith( {} );
	} );

	it( 'should invoke onClose with params when the sidebar never toggles', () => {
		const onClose = jest.fn();
		const getOnToggle = captureOnToggle();

		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		initSidebarShell( baseContainer, { onClose }, instance );
		window.toggleAngieSidebar = jest.fn();

		closeAngie( { reason: 'user-finished' } );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( onClose ).toHaveBeenCalledWith( { reason: 'user-finished' } );

		getOnToggle()?.( false );

		expect( onClose ).toHaveBeenLastCalledWith( {} );
	} );

	it( 'should still close when onClose throws', () => {
		const onClose = jest.fn( () => {
			throw new Error( 'Callback error' );
		} );
		const getOnToggle = captureOnToggle();

		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		initSidebarShell( baseContainer, { onClose }, instance );
		const toggle = jest.fn( ( force?: boolean ) => getOnToggle()?.( !! force ) );
		window.toggleAngieSidebar = toggle;

		expect( () => closeAngie( { test: 'value' } ) ).not.toThrow();

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( toggle ).toHaveBeenCalledWith( false );
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

	it( 'should inject wordpress theme CSS when styleTheme is wordpress', () => {
		initSidebarShell(
			{ ...baseContainer, styleTheme: 'wordpress' },
			{ onClose: jest.fn() },
		);

		expect( document.getElementById( 'angie-sidebar-wordpress-styles' ) ).toBeTruthy();
	} );

	it( 'should inject default sidebar CSS when styleTheme is empty', () => {
		initSidebarShell( baseContainer, { onClose: jest.fn() } );

		expect( initAngieSidebar ).toHaveBeenCalledWith(
			expect.not.objectContaining( { skipDefaultCss: true } ),
		);
	} );

	it( 'should skip the default sidebar CSS when skipDefaultCss is true', () => {
		initSidebarShell(
			{ ...baseContainer, skipDefaultCss: true },
			{ onClose: jest.fn() },
		);

		expect( initAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true } ),
		);
	} );

	it( 'should forward every toggle to callbacks.onToggle', () => {
		const onToggle = jest.fn();

		initSidebarShell( baseContainer, { onToggle } );

		const options = ( initAngieSidebar as jest.Mock ).mock.calls[ 0 ][ 0 ] as {
			onToggle: ( isOpen: boolean ) => void;
		};
		options.onToggle( true );
		options.onToggle( false );

		expect( onToggle ).toHaveBeenNthCalledWith( 1, true );
		expect( onToggle ).toHaveBeenNthCalledWith( 2, false );
	} );
} );
