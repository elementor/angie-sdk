import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { setAngieInteractionMode } from './interaction-mode-utils';
import { AngieInteractionMode, MessageEventType } from './types';

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
	} );

	it( 'returns false when Angie iframe is not found', () => {
		mockGetAngieIframe.mockReturnValue( null );

		expect( setAngieInteractionMode( AngieInteractionMode.ASK ) ).toBe( false );
		expect( mockPostMessageToAngieIframe ).not.toHaveBeenCalled();
	} );

	it( 'posts angie/set-interaction-mode with payload', () => {
		setAngieInteractionMode( AngieInteractionMode.PLAN, { source: 'help-center', isStudioOpen: true } );

		expect( mockPostMessageToAngieIframe ).toHaveBeenCalledWith( {
			type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
			payload: { mode: AngieInteractionMode.PLAN, source: 'help-center', isStudioOpen: true },
		} );
	} );

	it( 'sets angie-prompt hash when prompt is provided', () => {
		setAngieInteractionMode( AngieInteractionMode.ASK, { prompt: 'Help me with ' } );

		expect( window.location.hash ).toBe( '#angie-prompt=Help%20me%20with%20' );
	} );

	it( 'posts ask mode with source and prompt', () => {
		setAngieInteractionMode( AngieInteractionMode.ASK, { source: 'help-center', prompt: 'Need help' } );

		expect( mockPostMessageToAngieIframe ).toHaveBeenCalledWith( {
			type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
			payload: { mode: AngieInteractionMode.ASK, source: 'help-center', isStudioOpen: false },
		} );
		expect( window.location.hash ).toBe( '#angie-prompt=Need%20help' );
	} );
} );
