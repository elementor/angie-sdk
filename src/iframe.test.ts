import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { disableNavigationPrevention, isValidPath } from './iframe';
import { appState } from './config';
import { MessageEventType } from './types';

jest.mock( './logger', () => ( {
	createChildLogger: jest.fn( () => ( {
		log: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} ) ),
} ) );

describe( 'disableNavigationPrevention', () => {
	let mockContentWindow: { postMessage: jest.Mock };
	let mockIframe: HTMLIFrameElement;
	let mockOrigin: URL;
	let originalSetTimeout: typeof setTimeout;

	beforeEach( () => {
		jest.clearAllMocks();
		
		originalSetTimeout = global.setTimeout;
		
		global.setTimeout = jest.fn( ( callback: () => void ) => {
			callback();
			return 0 as unknown as NodeJS.Timeout;
		} ) as unknown as typeof setTimeout;

		mockContentWindow = {
			postMessage: jest.fn(),
		};

		mockIframe = {
			contentWindow: mockContentWindow as unknown as Window,
		} as HTMLIFrameElement;

		mockOrigin = new URL( 'https://angie.elementor.com' );

		appState.iframe = mockIframe;
		appState.iframeUrlObject = mockOrigin;
	} );

	afterEach( () => {
		global.setTimeout = originalSetTimeout;
		
		appState.iframe = null;
		appState.iframeUrlObject = null;
	} );

	it( 'should successfully post message when iframe and origin are available', async () => {
		// Act
		await disableNavigationPrevention();

		// Assert
		expect( mockContentWindow.postMessage ).toHaveBeenCalledWith(
			{ type: MessageEventType.ANGIE_DISABLE_NAVIGATION_PREVENTION },
			mockOrigin.origin
		);
		expect( mockContentWindow.postMessage ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should not post message when iframe is null', async () => {
		// Arrange
		appState.iframe = null;

		// Act
		await disableNavigationPrevention();

		// Assert
		expect( mockContentWindow.postMessage ).not.toHaveBeenCalled();
	} );

	it( 'should throw error when postMessage fails', async () => {
		// Arrange
		const mockError = new Error( 'postMessage failed' );
		mockContentWindow.postMessage.mockImplementation( () => {
			throw mockError;
		} );

		// Act & Assert
		await expect( disableNavigationPrevention() ).rejects.toThrow( 'postMessage failed' );
	} );
} );

describe( 'isValidPath', () => {
	it.each( [
		'angie/wp-admin',
		'custom/path',
		'/angie/wp-admin',
		'angie',
	] )( 'should accept valid relative path: %s', ( path ) => {
		expect( isValidPath( path ) ).toBe( true );
	} );

	it.each( [
		'https://evil.com',
		'http://evil.com/path',
		'//evil.com',
		'https://evil.com/angie/wp-admin',
	] )( 'should reject absolute URL or protocol-relative path: %s', ( path ) => {
		expect( isValidPath( path ) ).toBe( false );
	} );
} );
