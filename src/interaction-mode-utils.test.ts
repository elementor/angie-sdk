import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { setAngieInteractionMode, openAngieInAskMode } from './interaction-mode-utils';
import { MessageEventType } from './types';

jest.mock( './angie-iframe-utils', () => ( {
	getAngieIframe: jest.fn(),
	postMessageToAngieIframe: jest.fn(),
} ) );

const mockGetAngieIframe = require( './angie-iframe-utils' ).getAngieIframe as jest.MockedFunction<typeof import( './angie-iframe-utils' ).getAngieIframe>;
const mockPostMessageToAngieIframe = require( './angie-iframe-utils' ).postMessageToAngieIframe as jest.MockedFunction<typeof import( './angie-iframe-utils' ).postMessageToAngieIframe>;

describe( 'interaction-mode-utils', () => {
	const mockIframe = document.createElement( 'iframe' );

	beforeEach( () => {
		jest.clearAllMocks();
		window.location.hash = '';
		mockGetAngieIframe.mockReturnValue( mockIframe );
		mockPostMessageToAngieIframe.mockReturnValue( true );
		delete ( window as { toggleAngieSidebar?: ( force?: boolean ) => void } ).toggleAngieSidebar;
	} );

	it( 'returns false when Angie iframe is not found', () => {
		mockGetAngieIframe.mockReturnValue( null );

		expect( setAngieInteractionMode( 'ask' ) ).toBe( false );
		expect( mockPostMessageToAngieIframe ).not.toHaveBeenCalled();
	} );

	it( 'posts angie/set-interaction-mode with payload', () => {
		setAngieInteractionMode( 'plan', { source: 'help-center', isStudioOpen: true } );

		expect( mockPostMessageToAngieIframe ).toHaveBeenCalledWith( {
			type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
			payload: { mode: 'plan', source: 'help-center', isStudioOpen: true },
		} );
	} );

	it( 'opens sidebar when isOpen is true', () => {
		const toggleAngieSidebar = jest.fn();
		window.toggleAngieSidebar = toggleAngieSidebar;

		setAngieInteractionMode( 'ask', { isOpen: true } );

		expect( toggleAngieSidebar ).toHaveBeenCalledWith( true );
	} );

	it( 'sets angie-prompt hash when prompt is provided', () => {
		setAngieInteractionMode( 'ask', { prompt: 'Help me with ' } );

		expect( window.location.hash ).toBe( '#angie-prompt=Help%20me%20with%20' );
	} );

	it( 'openAngieInAskMode defaults to ask mode with sidebar open', () => {
		const toggleAngieSidebar = jest.fn();
		window.toggleAngieSidebar = toggleAngieSidebar;

		openAngieInAskMode( { source: 'help-center', prompt: 'Need help' } );

		expect( toggleAngieSidebar ).toHaveBeenCalledWith( true );
		expect( mockPostMessageToAngieIframe ).toHaveBeenCalledWith( {
			type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
			payload: { mode: 'ask', source: 'help-center', isStudioOpen: false },
		} );
		expect( window.location.hash ).toBe( '#angie-prompt=Need%20help' );
	} );
} );
