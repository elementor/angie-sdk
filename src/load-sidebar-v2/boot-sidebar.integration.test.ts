import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { bootSidebar } from './boot-sidebar';
import { LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from './config';
import { CHAT_WIDGET_HIDDEN_CLASS } from './chat-toggle/constants';
import { resetHostApiBridgeForTests } from './host-api-bridge';
import { resetHostMessageRouterForTests } from './host-message-router';
import { resetChatShellForTests } from './chat-toggle/chat-shell';
import { getInstanceByContainerId, resetInstancesForTests } from '../instance-registry';

jest.mock( '../openSaaSPage', () => ( { openSaaSPage: jest.fn() } ) );

const ANGIE_ORIGIN = 'https://angie.elementor.com';

describe( 'load-sidebar-v2/boot-sidebar integration', () => {
	beforeAll( () => {
		Object.defineProperty( window, 'matchMedia', {
			writable: true,
			value: jest.fn().mockImplementation( ( query: unknown ) => ( {
				matches: false,
				media: String( query ),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			} ) ),
		} );
		Object.defineProperty( window, 'screen', { writable: true, value: { availWidth: 1280 } } );
	} );

	beforeEach( () => {
		jest.clearAllMocks();
		document.body.innerHTML = '';
		document.head.innerHTML = '';
		document.body.className = '';
		resetInstancesForTests();
		resetHostApiBridgeForTests();
		resetHostMessageRouterForTests();
		resetChatShellForTests();

		( require( '../openSaaSPage' ).openSaaSPage as jest.Mock ).mockImplementation(
			async ( props: any ) => {
				const iframe = document.createElement( 'iframe' );
				const postMessage = jest.fn();

				Object.defineProperty( iframe, 'contentWindow', { value: { postMessage } } );
				iframe.id = props.iframeElementId;
				iframe.setAttribute( 'src', `${ props.origin }/${ props.path }` );
				props.insertCallback?.( iframe );

				return { iframe, iframeUrlObject: new URL( ANGIE_ORIGIN ) };
			},
		);
	} );

	it( 'should run a sidebar and a floating chat side by side', async () => {
		await bootSidebar( {
			container: { layout: LAYOUT_SIDEBAR },
			host: { appId: 'app-sidebar', instanceId: 'sidebar1' },
			widgetConfig: { title: 'Sidebar' },
		} );
		await bootSidebar( {
			container: {
				id: 'chat-b',
				layout: LAYOUT_FLOATING_CHAT,
				chatToggleButton: { enabled: true, selector: '#toggle-chat-b' },
			},
			host: { appId: 'app-b', instanceId: 'bbbbbb' },
			widgetConfig: { title: 'Widget B' },
		} );

		const sidebarInstance = getInstanceByContainerId( 'angie-sidebar-container' );
		const chatInstance = getInstanceByContainerId( 'chat-b' );
		const sidebarPostMessage = sidebarInstance!.iframe!.contentWindow!.postMessage as jest.Mock;
		const chatPostMessage = chatInstance!.iframe!.contentWindow!.postMessage as jest.Mock;

		expect( sidebarPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( {
				type: 'sdk-widget-config',
				payload: expect.objectContaining( { title: 'Sidebar' } ),
			} ),
			ANGIE_ORIGIN,
		);
		expect( chatPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( {
				type: 'sdk-widget-config',
				payload: expect.objectContaining( { title: 'Widget B' } ),
			} ),
			ANGIE_ORIGIN,
		);

		const sidebarWasActive = document.body.classList.contains( 'angie-sidebar-active' );
		const sidebarMessagesBefore = sidebarPostMessage.mock.calls.length;

		window.dispatchEvent( new MessageEvent( 'message', {
			origin: ANGIE_ORIGIN,
			source: chatInstance!.iframe!.contentWindow!,
			data: { type: 'toggleAngieSidebar', payload: { force: true } },
		} ) );

		expect( document.getElementById( 'chat-b' )!.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) )
			.toBe( false );
		expect( document.body.classList.contains( 'angie-sidebar-active' ) ).toBe( sidebarWasActive );
		expect( sidebarPostMessage.mock.calls ).toHaveLength( sidebarMessagesBefore );
	} );
} );
