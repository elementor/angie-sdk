import { beforeEach, describe, expect, it } from '@jest/globals';
import { appState } from './config';
import {
	createAngieInstance,
	resetInstancesForTests,
	shouldInstanceHandle,
} from './instance-registry';

const SIDEBAR_ARGS = { containerId: 'container-a', instanceId: 'aaaaaa', layout: 'sidebar' as const };
const CHAT_ARGS = { containerId: 'container-b', instanceId: 'bbbbbb', layout: 'floatingChat' as const };

describe( 'instance-registry', () => {
	beforeEach( () => {
		resetInstancesForTests();
	} );

	it( 'should reuse the shared appState object for the first instance', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );

		expect( instance ).toBe( appState );
	} );

} );

describe( 'instance-registry host-to-host routing', () => {
	const fakeIframe = () => ( { contentWindow: {} } as HTMLIFrameElement );

	beforeEach( () => {
		resetInstancesForTests();
	} );

	it( 'should skip a message addressed to another instance that owns an iframe', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		const second = createAngieInstance( CHAT_ARGS );
		first.iframe = fakeIframe();
		second.iframe = fakeIframe();

		expect( shouldInstanceHandle( first, 'bbbbbb' ) ).toBe( false );
	} );

	it( 'should let the first iframe owner answer for an instance that owns no iframe', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		createAngieInstance( CHAT_ARGS );
		first.iframe = fakeIframe();

		expect( shouldInstanceHandle( first, 'bbbbbb' ) ).toBe( true );
		expect( shouldInstanceHandle( first, 'unknown-editor-id' ) ).toBe( true );
	} );

	it( 'should not let a later iframe owner answer for an unknown instance', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		const second = createAngieInstance( CHAT_ARGS );
		first.iframe = fakeIframe();
		second.iframe = fakeIframe();

		expect( shouldInstanceHandle( second, 'unknown-editor-id' ) ).toBe( false );
	} );
} );
