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
		mockGetAngieIframe.mockReturnValue( mockIframe );
		mockPostMessageToAngieIframe.mockReturnValue( true );
	} );

	it( 'returns false when Angie iframe is not found', () => {
		mockGetAngieIframe.mockReturnValue( null );

		expect( setAngieInteractionMode( AngieInteractionMode.ASK ) ).toBe( false );
		expect( mockPostMessageToAngieIframe ).not.toHaveBeenCalled();
	} );

	it( 'posts angie/set-interaction-mode with mode only', () => {
		setAngieInteractionMode( AngieInteractionMode.PLAN );

		expect( mockPostMessageToAngieIframe ).toHaveBeenCalledWith( {
			type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
			payload: { mode: AngieInteractionMode.PLAN },
		} );
	} );
} );
