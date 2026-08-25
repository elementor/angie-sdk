import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { postMessageToInstance } from './angie-iframe-utils';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const createFakeIframe = ( path: string ) => {
	const iframe = document.createElement( 'iframe' );
	const postMessage = jest.fn();

	iframe.setAttribute( 'src', `${ ANGIE_ORIGIN }${ path }` );
	Object.defineProperty( iframe, 'contentWindow', { value: { postMessage }, writable: true } );
	document.body.appendChild( iframe );

	return { iframe, postMessage };
};

const SIDEBAR_ARGS = { containerId: 'container-a', instanceId: 'aaaaaa', layout: 'sidebar' };
const CHAT_ARGS = { containerId: 'container-b', instanceId: 'bbbbbb', layout: 'floatingChat' };

describe( 'angie-iframe-utils', () => {
	beforeEach( () => {
		resetInstancesForTests();
		document.body.innerHTML = '';
	} );

	it( 'should post only to the iframe owned by the given instance', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		const second = createAngieInstance( CHAT_ARGS );
		const firstIframe = createFakeIframe( '/angie/wp-admin' );
		const secondIframe = createFakeIframe( '/angie/embedded' );
		first.iframe = firstIframe.iframe;
		second.iframe = secondIframe.iframe;

		const sent = postMessageToInstance( second, { type: 'sdk-widget-config' } );

		expect( sent ).toBe( true );
		expect( secondIframe.postMessage ).toHaveBeenCalledWith(
			{ type: 'sdk-widget-config' },
			ANGIE_ORIGIN,
		);
		expect( firstIframe.postMessage ).not.toHaveBeenCalled();
	} );

} );
