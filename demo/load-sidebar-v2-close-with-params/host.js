import { AngieMcpSdk, LAYOUT_SIDEBAR, McpAppDisplayMode } from '../../dist/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const CONTEXT_SERVER_NAME = 'demo-close-with-params';
const PREVIEW_URI = 'ui://demo-close-with-params/preview.html';
const PREVIEW_MIME_TYPE = 'text/html;profile=mcp-app';

const sdk = new AngieMcpSdk();

const paramsDisplay = document.getElementById( 'params-display' );

const displayReceivedParams = ( params ) => {
	paramsDisplay.className = '';
	const pre = document.createElement( 'pre' );
	pre.textContent = JSON.stringify( params, null, 2 );
	paramsDisplay.textContent = '';
	paramsDisplay.appendChild( pre );
};

let previewHtmlPromise;

const loadPreviewHtml = () => {
	if ( ! previewHtmlPromise ) {
		previewHtmlPromise = fetch( new URL( './preview-app.html', import.meta.url ) )
			.then( ( response ) => {
				if ( ! response.ok ) {
					throw new Error( `Failed to load preview app: ${ response.status }` );
				}

				return response.text();
			} )
			.catch( ( error ) => {
				previewHtmlPromise = undefined;
				throw error;
			} );
	}

	return previewHtmlPromise;
};

const createCloseWithParamsServer = () => {
	const server = new McpServer(
		{
			name: CONTEXT_SERVER_NAME,
			version: '1.0.0',
			title: 'Close with params demo',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
			},
			instructions: [
				'This server helps complete tasks and close Angie with params.',
				'When the user asks to finish a task or close, call the finish-task tool.',
				'The tool shows a preview card where the user can close Angie and pass params to the host.',
			].join( ' ' ),
		}
	);

	server.registerTool(
		'finish-task',
		{
			description: 'Finish the task and let the user close Angie with params. This shows a preview card with a button to close Angie.',
			inputSchema: {
				orderId: z.string().optional().describe( 'Sample order ID to pass back to host' ),
				reason: z.string().optional().describe( 'Reason for finishing, e.g. "user-finished"' ),
			},
			annotations: {
				readOnlyHint: true,
			},
			_meta: {
				ui: {
					resourceUri: PREVIEW_URI,
					displayMode: McpAppDisplayMode.Inline,
				},
			},
		},
		async ( { orderId, reason } ) => {
			const params = {
				reason: reason || 'user-finished',
				orderId: orderId || '123',
				timestamp: new Date().toISOString(),
			};

			return {
				content: [ {
					type: 'text',
					text: 'Task completion card is waiting for the user. They can close Angie from there.',
				} ],
				structuredContent: {
					params,
					message: 'Click the button below to close Angie and return these params to the host.',
				},
			};
		}
	);

	server.registerTool(
		'close-angie',
		{
			description: 'Close Angie and pass params to the host. Called by the preview card button.',
			inputSchema: {
				params: z.record( z.unknown() ).describe( 'Params to pass to the host' ),
			},
		},
		async ( { params } ) => {
			window.parent.postMessage(
				{
					type: 'angie/close-with-params',
					params,
				},
				ANGIE_ORIGIN
			);

			return {
				content: [ {
					type: 'text',
					text: 'Sent close-with-params message to host',
				} ],
			};
		}
	);

	server.registerResource(
		'close-with-params-preview-app',
		PREVIEW_URI,
		{
			title: 'Close with params preview',
			description: 'MCP App that shows params and closes Angie',
			mimeType: PREVIEW_MIME_TYPE,
		},
		async () => ( {
			contents: [ {
				uri: PREVIEW_URI,
				mimeType: PREVIEW_MIME_TYPE,
				text: await loadPreviewHtml(),
			} ],
		} )
	);

	return server;
};

const buildAiContext = () => ( {
	whatUserSees: {
		screen: 'closeAngieWithParams demo',
		task: 'A demo task that can be completed',
	},
	whatUserCanDo: [
		'Ask to finish the task or close Angie with params',
	],
} );

await sdk.loadSidebarV2( {
	host: {
		appId: 'demo-close-with-params',
		aiContext: buildAiContext(),
	},
	container: {
		layout: LAYOUT_SIDEBAR,
		chatToggleButton: {
			enabled: true,
			selector: '#demo-sidebar-toggle',
		},
	},
	iframe: {
		origin: ANGIE_ORIGIN,
		path: 'angie/embedded',
		uiTheme: 'light',
	},
	callbacks: {
		onCloseWithParams: ( params ) => {
			console.log( 'Received params from Angie:', params );
			displayReceivedParams( params );
		},
	},
	widgetConfig: {
		title: 'Close with params demo',
		subtitle: 'Ask me to finish the task',
		suggestions: {
			items: [
				{ label: 'Finish task', value: 'Finish the task with order 456' },
				{ label: 'Complete', value: 'Mark this as complete and close' },
			],
		},
		featuredMcpServer: CONTEXT_SERVER_NAME,
		localServers: { skipLoading: true },
		planning: { enabled: false },
		promptLibrary: { enabled: false },
		fileUpload: { enabled: false },
		commands: { enabled: false },
		topBar: { enabled: false },
		modeSwitcher: { enabled: false },
	},
} );

await sdk.waitForReady();
await sdk.registerServer( {
	name: CONTEXT_SERVER_NAME,
	version: '1.0.0',
	description: 'Demo server that shows how to close Angie with params',
	server: createCloseWithParamsServer(),
	capabilities: {
		tools: {},
		resources: {},
	},
} );
