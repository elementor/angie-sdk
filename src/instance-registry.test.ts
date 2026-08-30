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

	it( 'should not let another instance answer for a registered instance still booting', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		createAngieInstance( CHAT_ARGS );
		first.iframe = fakeIframe();

		expect( shouldInstanceHandle( first, 'bbbbbb' ) ).toBe( false );
		expect( shouldInstanceHandle( first, 'unknown-editor-id' ) ).toBe( true );
	} );

	it( 'should let exactly one iframe owner handle an unaddressed message', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		const second = createAngieInstance( CHAT_ARGS );
		first.iframe = fakeIframe();
		second.iframe = fakeIframe();

		expect( shouldInstanceHandle( first, undefined ) ).toBe( true );
		expect( shouldInstanceHandle( second, undefined ) ).toBe( false );
	} );

	it( 'should handle messages addressed to its own instanceId', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );

		expect( shouldInstanceHandle( first, 'aaaaaa' ) ).toBe( true );
	} );

	it( 'should let appState handle unaddressed messages when the registry is empty (V1 loadSidebar)', () => {
		appState.instanceId = 'v1-id';
		appState.iframe = fakeIframe();

		expect( shouldInstanceHandle( appState, undefined ) ).toBe( true );
	} );

	it( 'should match addressed messages to appState.instanceId when the registry is empty (V1 loadSidebar)', () => {
		appState.instanceId = 'v1-id';
		appState.iframe = fakeIframe();

		expect( shouldInstanceHandle( appState, 'v1-id' ) ).toBe( true );
	} );

	it( 'should not let a later iframe owner answer for an unknown instance', () => {
		const first = createAngieInstance( SIDEBAR_ARGS );
		const second = createAngieInstance( CHAT_ARGS );
		first.iframe = fakeIframe();
		second.iframe = fakeIframe();

		expect( shouldInstanceHandle( second, 'unknown-editor-id' ) ).toBe( false );
	} );
} );
