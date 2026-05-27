import { describe, expect, it, jest } from '@jest/globals';
import { initAngieSidebar, initializeResize, loadState } from '../sidebar';
import { initSidebarShell } from './shell';

jest.mock( '../sidebar', () => ( {
	initAngieSidebar: jest.fn(),
	initializeResize: jest.fn(),
	loadState: jest.fn(),
} ) );

describe( 'load-sidebar-v2/shell', () => {
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
				persistOpenState: false,
				preset: 'sidebar',
				resizable: false,
				stylePreset: 'wordpress',
			},
			{ onClose },
		);

		capturedOnToggle?.( false );

		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( loadState ).not.toHaveBeenCalled();
		expect( initializeResize ).not.toHaveBeenCalled();
	} );
} );
