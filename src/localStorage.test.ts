import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { addLocalStorageListener } from './localStorage';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';
import { HostLocalStorageEventType } from './types';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const emitMessage = ( event: Partial<MessageEvent> ): void => {
	window.dispatchEvent( Object.assign( new Event( 'message' ), event ) );
};

describe( 'localStorage', () => {
	beforeEach( () => {
		resetInstancesForTests();
		window.localStorage.clear();
		jest.clearAllMocks();
	} );

	it( 'should store a value sent by its own iframe', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const ownWindow = {} as Window;
		instance.iframeUrlObject = new URL( `${ ANGIE_ORIGIN }/angie/embedded` );
		instance.iframe = { contentWindow: ownWindow } as HTMLIFrameElement;

		addLocalStorageListener( instance );
		emitMessage( {
			origin: ANGIE_ORIGIN,
			source: ownWindow,
			data: { type: HostLocalStorageEventType.SET, key: 'angie_test', value: 'yes' },
		} );

		expect( window.localStorage.getItem( 'angie_test' ) ).toBe( 'yes' );
	} );

	it( 'should ignore a message sent by another instance iframe', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		instance.iframeUrlObject = new URL( `${ ANGIE_ORIGIN }/angie/embedded` );
		instance.iframe = { contentWindow: {} as Window } as HTMLIFrameElement;

		addLocalStorageListener( instance );
		emitMessage( {
			origin: ANGIE_ORIGIN,
			source: {} as Window,
			data: { type: HostLocalStorageEventType.SET, key: 'angie_test', value: 'yes' },
		} );

		expect( window.localStorage.getItem( 'angie_test' ) ).toBeNull();
	} );
} );
