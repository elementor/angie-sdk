import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { bootSidebar } from './boot-sidebar';
import { LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from './config';
import { CHAT_WIDGET_HIDDEN_CLASS } from './chat-toggle/constants';
import { resetHostApiBridgeForTests } from './host-api-bridge';
import { resetHostMessageRouterForTests } from './host-message-router';
import { resetChatShellForTests } from './chat-toggle/chat-shell';
import { resetInstancesForTests } from '../instance-registry';

jest.mock( '../openSaaSPage', () => ( { openSaaSPage: jest.fn() } ) );

const ANGIE_ORIGIN = 'https://angie.elementor.com';

type FakeIframe = {
	iframe: HTMLIFrameElement;
	postMessage: jest.Mock;
	contentWindow: Window;
};

const openedIframes: FakeIframe[] = [];

const iframeOf = ( containerId: string ): FakeIframe => {
	const container = document.getElementById( containerId )!;
	const found = openedIframes.find( ( item ) => container.contains( item.iframe ) );

	if ( ! found ) {
		throw new Error( `no iframe was mounted into #${ containerId }` );
	}

	return found;
};

const sentPayload = ( target: FakeIframe, type: string ): unknown =>
	( target.postMessage.mock.calls.find(
		( call: unknown[] ) => ( call[ 0 ] as { type: string } ).type === type,
	)?.[ 0 ] as { payload: unknown } | undefined )?.payload;

const sentTypes = ( target: FakeIframe ): string[] =>
	target.postMessage.mock.calls.map( ( call: unknown[] ) => ( call[ 0 ] as { type: string } ).type );

const emitFromIframe = ( target: FakeIframe, data: unknown ): void => {
	window.dispatchEvent( Object.assign( new Event( 'message' ), {
		origin: ANGIE_ORIGIN,
		source: target.contentWindow,
		data,
	} ) );
};

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
		openedIframes.length = 0;
		resetInstancesForTests();
		resetHostApiBridgeForTests();
		resetHostMessageRouterForTests();
		resetChatShellForTests();

		( require( '../openSaaSPage' ).openSaaSPage as jest.Mock ).mockImplementation(
			async ( props: any ) => {
				const iframe = document.createElement( 'iframe' );
				const postMessage = jest.fn();
				const contentWindow = { postMessage } as unknown as Window;

				Object.defineProperty( iframe, 'contentWindow', { value: contentWindow } );
				iframe.id = props.iframeElementId;
				iframe.setAttribute( 'src', `${ props.origin }/${ props.path }` );
				props.insertCallback?.( iframe );
				openedIframes.push( { iframe, postMessage, contentWindow } );

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

		const sidebarIframe = iframeOf( 'angie-sidebar-container' );
		const chatIframe = iframeOf( 'chat-b' );

		expect( sentPayload( sidebarIframe, 'sdk-widget-config' ) )
			.toEqual( expect.objectContaining( { title: 'Sidebar' } ) );
		expect( sentPayload( chatIframe, 'sdk-widget-config' ) )
			.toEqual( expect.objectContaining( { title: 'Widget B' } ) );

		const sidebarWasActive = document.body.classList.contains( 'angie-sidebar-active' );
		const sidebarMessagesBefore = sentTypes( sidebarIframe ).length;

		emitFromIframe( chatIframe, { type: 'toggleAngieSidebar', payload: { force: true } } );

		expect( document.getElementById( 'chat-b' )!.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) )
			.toBe( false );
		expect( document.body.classList.contains( 'angie-sidebar-active' ) ).toBe( sidebarWasActive );
		expect( sentTypes( sidebarIframe ) ).toHaveLength( sidebarMessagesBefore );
	} );
} );
