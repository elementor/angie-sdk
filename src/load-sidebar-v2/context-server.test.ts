import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MessageChannel } from 'node:worker_threads';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ResourceUpdatedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { appState } from '../config';
import * as browserContextTransportModule from '../browser-context-transport';
import { BrowserContextTransport } from '../browser-context-transport';
import {
	CONTEXT_RESOURCE_URI,
	buildSdkCurrentContext,
	handleInitContextServer,
} from './context-server';
import {
	INIT_CONTEXT_SERVER_MESSAGE_TYPE,
	initHostApiBridge,
	resetHostApiBridgeForTests,
} from './host-api-bridge';

const IFRAME_ORIGIN = 'http://localhost:4000';

const flushAsync = () => new Promise( ( resolve ) => {
	setTimeout( resolve, 0 );
} );

describe( 'load-sidebar-v2/context-server', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		resetHostApiBridgeForTests();
		delete ( window as { angiePlugin?: { available: boolean } } ).angiePlugin;
		global.MessageChannel = MessageChannel as unknown as typeof global.MessageChannel;
	} );

	it( 'should expose general timing fields and merged host aiContext', () => {
		// Arrange
		const host = {
			aiContext: {
				screen: 'Elementor editor',
			},
		};

		// Act
		const context = buildSdkCurrentContext( host );

		// Assert
		expect( context ).toMatchObject( {
			general: {
				data: expect.objectContaining( {
					timezone: expect.any( String ),
					date: expect.stringMatching( /^\d{4}-\d{2}-\d{2}$/ ),
					time: expect.any( String ),
					timezoneOffset: expect.any( Number ),
				} ),
			},
			screen: 'Elementor editor',
		} );
	} );

	it( 'should serve context://current over MessageChannel when plugin is absent', async () => {
		// Arrange
		const channel = new MessageChannel();
		const host = {
			aiContext: {
				customKey: 'from-host',
			},
		};

		await handleInitContextServer(
			channel.port1 as unknown as MessagePort,
			host,
		);

		const client = new Client(
			{ name: 'test-client', version: '1.0.0' },
			{},
		);
		await client.connect( new BrowserContextTransport(
			channel.port2 as unknown as MessagePort,
		) );

		// Act
		const resource = await client.readResource( { uri: CONTEXT_RESOURCE_URI } );
		const firstContent = resource.contents[ 0 ];
		if ( ! ( 'text' in firstContent ) ) {
			throw new Error( 'Expected text resource content' );
		}
		const parsed = JSON.parse( firstContent.text );

		// Assert
		expect( parsed ).toMatchObject( {
			general: {
				data: expect.objectContaining( {
					timezone: expect.any( String ),
				} ),
			},
			customKey: 'from-host',
		} );

		await client.close();
		channel.port1.close();
		channel.port2.close();
	} );

	it( 'should notify the subscriber that context://current is available', async () => {
		// Arrange
		const channel = new MessageChannel();
		await handleInitContextServer( channel.port1 as unknown as MessagePort );

		const client = new Client( { name: 'test-client', version: '1.0.0' }, {} );
		const updatedUris: string[] = [];
		const notified = new Promise< void >( ( resolve ) => {
			client.setNotificationHandler( ResourceUpdatedNotificationSchema, async ( notification ) => {
				updatedUris.push( notification.params.uri );
				resolve();
			} );
		} );
		await client.connect( new BrowserContextTransport( channel.port2 as unknown as MessagePort ) );

		// Act
		await client.subscribeResource( { uri: CONTEXT_RESOURCE_URI } );
		await notified;

		// Assert
		expect( updatedUris ).toEqual( [ CONTEXT_RESOURCE_URI ] );

		await client.close();
		channel.port1.close();
		channel.port2.close();
	} );

	it( 'should not start a server when the Angie plugin is present', async () => {
		// Arrange
		window.angiePlugin = { available: true };
		const transportSpy = jest.spyOn(
			browserContextTransportModule,
			'BrowserContextTransport',
		);
		const channel = new MessageChannel();

		// Act
		await handleInitContextServer( channel.port1 as unknown as MessagePort );

		// Assert
		expect( transportSpy ).not.toHaveBeenCalled();
		transportSpy.mockRestore();
		channel.port1.close();
		channel.port2.close();
	} );

	it( 'should ignore init-context-server from an untrusted origin', async () => {
		// Arrange
		const transportSpy = jest.spyOn(
			browserContextTransportModule,
			'BrowserContextTransport',
		);
		const channel = new MessageChannel();

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: { aiContext: { app: 'elementor' } },
			instance: appState,
		} );

		// Act
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: INIT_CONTEXT_SERVER_MESSAGE_TYPE, resourceName: CONTEXT_RESOURCE_URI },
			origin: 'https://evil.example',
			ports: [ channel.port1 as unknown as MessagePort ],
		} ) );

		await flushAsync();

		// Assert
		expect( transportSpy ).not.toHaveBeenCalled();
		transportSpy.mockRestore();
		channel.port1.close();
		channel.port2.close();
	} );
} );
