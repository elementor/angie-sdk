import { AngieMcpSdk, LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from '../../dist/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const sidebarSdk = new AngieMcpSdk();
const chatSdk = new AngieMcpSdk();
const chatSdk2 = new AngieMcpSdk();

const createDemoServer = ( { name, version, title, instructions, tools } ) => {
	const server = new McpServer(
		{
			name,
			version,
			title,
		},
		{
			capabilities: {
				tools: {},
			},
			instructions,
		}
	);

	for ( const tool of tools ) {
		server.registerTool(
			tool.name,
			{
				description: tool.description,
				...( tool.inputSchema ? { inputSchema: tool.inputSchema } : {} ),
				annotations: {
					readOnlyHint: true,
				},
			},
			tool.handler
		);
	}

	return server;
};

const bootAndRegister = ( sdk, instanceId, loadOptions, serverMeta, tools ) => {
	const server = createDemoServer( {
		name: serverMeta.name,
		version: serverMeta.version,
		title: serverMeta.title,
		instructions: serverMeta.instructions,
		tools,
	} );

	return sdk.loadSidebarV2( {
		...loadOptions,
		host: { appId: instanceId, instanceId },
		widgetConfig: {
			...loadOptions.widgetConfig,
			featuredMcpServer: serverMeta.name,
			localServers: { skipLoading: true },
		},
	} )
		.then( () => sdk.waitForReady() )
		.then( () => sdk.registerServer( {
			name: serverMeta.name,
			version: serverMeta.version,
			description: serverMeta.description,
			server,
			capabilities: {
				tools: {},
			},
		} ) );
};

// Boot concurrently so one instance may register servers while another iframe is still starting.
await Promise.all( [
	bootAndRegister(
		sidebarSdk,
		'demo-sidebar',
		{
			container: {
				layout: LAYOUT_SIDEBAR,
				chatToggleButton: { enabled: true, selector: '#sidebar-toggle' },
			},
			widgetConfig: { title: 'Sidebar instance' },
		},
		{
			name: 'demo-wordpress-tools',
			version: '1.0.0',
			title: 'WordPress tools',
			description: 'WordPress post listing (demo)',
			instructions: 'Use list-wordpress-posts to fetch recent post titles.',
		},
		[
			{
				name: 'list-wordpress-posts',
				description: 'List recent WordPress post titles.',
				handler: async () => ( {
					content: [ {
						type: 'text',
						text: '[demo-wordpress-tools] demo-sidebar — Summer sale, New product launch, Team update',
					} ],
				} ),
			},
		]
	),
	bootAndRegister(
		chatSdk,
		'demo-chat',
		{
			container: { id: 'angie-chat-container', layout: LAYOUT_FLOATING_CHAT },
			widgetConfig: { title: 'Chat A instance' },
		},
		{
			name: 'demo-help-center',
			version: '1.0.0',
			title: 'Help Center',
			description: 'Help article search (demo)',
			instructions: 'Use search-help-articles to find help content.',
		},
		[
			{
				name: 'search-help-articles',
				description: 'Search help center articles by query.',
				inputSchema: {
					query: z.string().describe( 'Search query for help articles' ),
				},
				handler: async ( { query } ) => ( {
					content: [ {
						type: 'text',
						text: `[demo-help-center] demo-chat — Articles matching "${ query }": Getting started, Billing FAQ`,
					} ],
				} ),
			},
		]
	),
	bootAndRegister(
		chatSdk2,
		'demo-chat-2',
		{
			container: { id: 'angie-chat-container-2', layout: LAYOUT_FLOATING_CHAT },
			widgetConfig: { title: 'Chat B instance' },
		},
		{
			name: 'demo-billing',
			version: '1.0.0',
			title: 'Billing',
			description: 'Invoice status lookup (demo)',
			instructions: 'Use get-invoice-status to check an invoice.',
		},
		[
			{
				name: 'get-invoice-status',
				description: 'Look up the status of an invoice by ID.',
				inputSchema: {
					invoiceId: z.string().describe( 'Invoice ID to look up' ),
				},
				handler: async ( { invoiceId } ) => ( {
					content: [ {
						type: 'text',
						text: `[demo-billing] demo-chat-2 — Invoice ${ invoiceId }: Paid`,
					} ],
				} ),
			},
		]
	),
] );

const iframes = () => [ ...document.querySelectorAll( 'iframe[src*="angie/"]' ) ].map(
	( frame ) => ( {
		elementId: frame.id,
		container: frame.closest( 'div[id]' )?.id,
		urlInstanceId: new URL( frame.src ).searchParams.get( 'instanceId' ),
	} ),
);

const toggles = () => [ ...document.querySelectorAll( '[id^="angie-widget-toggle"], #sidebar-toggle' ) ]
	.map( ( button ) => ( { id: button.id, expanded: button.getAttribute( 'aria-expanded' ) } ) );

const openContainers = () => [ ...document.querySelectorAll( 'div[id^="angie-"]' ) ]
	.filter( ( element ) => element.querySelector( 'iframe' ) )
	.map( ( element ) => ( {
		container: element.id,
		open: ! element.classList.contains( 'angie-widget-hidden' ),
	} ) );

const styleTags = () => [ ...document.querySelectorAll( 'style[id]' ) ].map( ( tag ) => tag.id );

const storage = () => Object.fromEntries(
	Object.keys( localStorage )
		.filter( ( key ) => key.startsWith( 'angie' ) )
		.map( ( key ) => [ key, localStorage.getItem( key ) ] ),
);

window.angieDemo = {
	AngieMcpSdk,
	LAYOUT_FLOATING_CHAT,
	LAYOUT_SIDEBAR,
	sidebarSdk,
	chatSdk,
	chatSdk2,
	iframes,
	toggles,
	openContainers,
	styleTags,
	storage,
};
