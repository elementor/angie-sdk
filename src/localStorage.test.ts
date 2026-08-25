import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { appState } from './config';
import { addLocalStorageListener } from './localStorage';
import { HostLocalStorageEventType } from './types';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const emitMessage = ( event: Partial<MessageEvent> ): void => {
	window.dispatchEvent( Object.assign( new Event( 'message' ), event ) );
};

describe( 'localStorage', () => {
	beforeEach( () => {
		window.localStorage.clear();
		jest.clearAllMocks();
		appState.iframe = null;
		appState.iframeUrlObject = null;
	} );

	it( 'should store a value sent by its own iframe', () => {
		const ownWindow = {} as Window;
		appState.iframeUrlObject = new URL( `${ ANGIE_ORIGIN }/angie/embedded` );
		appState.iframe = { contentWindow: ownWindow } as HTMLIFrameElement;

		addLocalStorageListener( appState );
		emitMessage( {
			origin: ANGIE_ORIGIN,
			source: ownWindow,
			data: { type: HostLocalStorageEventType.SET, key: 'angie_test', value: 'yes' },
		} );

		expect( window.localStorage.getItem( 'angie_test' ) ).toBe( 'yes' );
	} );

	it( 'should ignore a message sent by another iframe window', () => {
		appState.iframeUrlObject = new URL( `${ ANGIE_ORIGIN }/angie/embedded` );
		appState.iframe = { contentWindow: {} as Window } as HTMLIFrameElement;

		addLocalStorageListener( appState );
		emitMessage( {
			origin: ANGIE_ORIGIN,
			source: {} as Window,
			data: { type: HostLocalStorageEventType.SET, key: 'angie_test', value: 'yes' },
		} );

		expect( window.localStorage.getItem( 'angie_test' ) ).toBeNull();
	} );
} );
