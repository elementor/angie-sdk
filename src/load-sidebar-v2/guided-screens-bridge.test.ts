import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
	GUIDED_WELCOME_CONFIRM_MESSAGE_TYPE,
	GUIDED_WIDGET_SELECT_MESSAGE_TYPE,
	initGuidedScreensBridge,
	resetGuidedScreensBridgeForTests,
} from './guided-screens-bridge';
import { resetHostMessageRouterForTests } from './host-message-router';

const IFRAME_ORIGIN = 'http://localhost:4000';

const dispatchMessage = ( data: unknown, origin: string = IFRAME_ORIGIN ): void => {
	window.dispatchEvent( new MessageEvent( 'message', { data, origin } ) );
};

describe( 'load-sidebar-v2/guided-screens-bridge', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		resetGuidedScreensBridgeForTests();
		resetHostMessageRouterForTests();
	} );

	it( 'should invoke onGuidedWelcomeConfirm on a welcome-confirm message', () => {
		const onGuidedWelcomeConfirm = jest.fn();
		initGuidedScreensBridge( { iframeOrigin: IFRAME_ORIGIN, callbacks: { onGuidedWelcomeConfirm } } );

		dispatchMessage( { type: GUIDED_WELCOME_CONFIRM_MESSAGE_TYPE } );

		expect( onGuidedWelcomeConfirm ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should invoke onGuidedWidgetSelect with the selection payload', () => {
		const onGuidedWidgetSelect = jest.fn();
		initGuidedScreensBridge( { iframeOrigin: IFRAME_ORIGIN, callbacks: { onGuidedWidgetSelect } } );

		const selection = { id: 'hero', label: 'Hero', prompt: 'Create a hero section' };
		dispatchMessage( { type: GUIDED_WIDGET_SELECT_MESSAGE_TYPE, payload: selection } );

		expect( onGuidedWidgetSelect ).toHaveBeenCalledTimes( 1 );
		expect( onGuidedWidgetSelect ).toHaveBeenCalledWith( selection );
	} );

	it( 'should ignore messages from other origins', () => {
		const onGuidedWelcomeConfirm = jest.fn();
		initGuidedScreensBridge( { iframeOrigin: IFRAME_ORIGIN, callbacks: { onGuidedWelcomeConfirm } } );

		dispatchMessage( { type: GUIDED_WELCOME_CONFIRM_MESSAGE_TYPE }, 'https://evil.example.com' );

		expect( onGuidedWelcomeConfirm ).not.toHaveBeenCalled();
	} );

	it( 'should ignore unknown message types', () => {
		const onGuidedWelcomeConfirm = jest.fn();
		const onGuidedWidgetSelect = jest.fn();
		initGuidedScreensBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			callbacks: { onGuidedWelcomeConfirm, onGuidedWidgetSelect },
		} );

		dispatchMessage( { type: 'angie/guided-screens/unknown' } );

		expect( onGuidedWelcomeConfirm ).not.toHaveBeenCalled();
		expect( onGuidedWidgetSelect ).not.toHaveBeenCalled();
	} );

	it( 'should not register a listener when no callbacks are provided', () => {
		const addEventListenerSpy = jest.spyOn( window, 'addEventListener' );

		initGuidedScreensBridge( { iframeOrigin: IFRAME_ORIGIN, callbacks: {} } );
		dispatchMessage( { type: GUIDED_WELCOME_CONFIRM_MESSAGE_TYPE } );

		expect( addEventListenerSpy ).not.toHaveBeenCalledWith( 'message', expect.any( Function ) );
		addEventListenerSpy.mockRestore();
	} );
} );
