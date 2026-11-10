import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { isAngiePluginAvailable } from '../angie-plugin-detection';
import { ANGIE_SDK_VERSION } from '../version';
import { BrowserContextTransport } from '../browser-context-transport';
import type { HostConfig } from './config';

export const CONTEXT_RESOURCE_URI = 'context://current';

const CONTEXT_SERVER_NAME = 'angie-sdk-context-server';

export const buildSdkCurrentContext = (
	host?: HostConfig,
): Record<string, unknown> => {
	const now = new Date();
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const date = now.toISOString().split( 'T' )[ 0 ];
	const time = now.toISOString().split( 'T' )[ 1 ];
	const timezoneOffset = -now.getTimezoneOffset();

	return {
		general: {
			data: {
				date,
				time,
				timezone,
				timezoneOffset,
			},
		},
		...host?.aiContext,
	};
};

export const handleInitContextServer = async (
	port: MessagePort,
	host?: HostConfig,
): Promise<void> => {
	if ( isAngiePluginAvailable() ) {
		return;
	}

	const server = new McpServer(
		{
			name: CONTEXT_SERVER_NAME,
			version: ANGIE_SDK_VERSION,
		},
		{
			capabilities: {
				resources: {
					subscribe: true,
				},
			},
		},
	);

	server.resource(
		'current-context',
		CONTEXT_RESOURCE_URI,
		{
			title: 'Angie Current Context',
		},
		async ( uri ) => ( {
			contents: [ {
				uri: uri.href,
				mimeType: 'application/json',
				text: JSON.stringify( buildSdkCurrentContext( host ) ),
			} ],
		} ),
	);

	server.server.setRequestHandler( SubscribeRequestSchema, async () => {
		void server.server.sendResourceUpdated( { uri: CONTEXT_RESOURCE_URI } );
		return {};
	} );
	server.server.setRequestHandler( UnsubscribeRequestSchema, async () => ( {} ) );

	await server.connect( new BrowserContextTransport( port ) );
};
