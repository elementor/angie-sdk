import { AngieMcpSdk, LAYOUT_FLOATING_CHAT, getAngieIframe } from '../../dist/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const CONTEXT_SERVER_NAME = 'demo-field-context';

const sdk = new AngieMcpSdk();

let activeTextarea = document.querySelector( 'textarea' );

const getCurrentContext = ( textarea = activeTextarea ) => ( {
	fieldName: textarea?.name ?? '',
	fieldId: textarea?.id ?? '',
	fieldValue: textarea?.value ?? '',
} );

const findTextarea = ( fieldName ) => {
	if ( ! fieldName ) {
		return activeTextarea;
	}

	return document.querySelector( `textarea[name="${ CSS.escape( fieldName ) }"]` ) ||
		document.getElementById( fieldName ) ||
		activeTextarea;
};

const createFieldServer = () => {
	const server = new McpServer(
		{
			name: CONTEXT_SERVER_NAME,
			version: '1.0.0',
			title: 'Field rewrite',
		},
		{
			capabilities: {
				tools: {},
			},
			instructions: 'Use read-textarea to get the focused field, then update-textarea with the rewritten copy.',
		}
	);

	server.registerTool(
		'read-textarea',
		{
			description: 'Read the focused text area name and current value. Call this before rewriting.',
			inputSchema: {
				fieldName: z.string().optional().describe( 'Textarea name, id, or omit to use the focused field' ),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ( { fieldName } = {} ) => {
			const textarea = findTextarea( fieldName );

			if ( ! textarea ) {
				return {
					content: [ { type: 'text', text: 'No text area is focused' } ],
					isError: true,
				};
			}

			return {
				content: [ {
					type: 'text',
					text: JSON.stringify( getCurrentContext( textarea ) ),
				} ],
			};
		}
	);

	server.registerTool(
		'update-textarea',
		{
			description: 'Replace the focused text area with new copy. Pass the full replacement text, not a patch.',
			inputSchema: {
				fieldName: z.string().describe( 'The textarea name from read-textarea' ),
				value: z.string().describe( 'The full replacement text for that field' ),
			},
		},
		async ( { fieldName, value } ) => {
			const textarea = findTextarea( fieldName );

			if ( ! textarea ) {
				return {
					content: [ { type: 'text', text: `No text area named "${ fieldName }"` } ],
					isError: true,
				};
			}

			textarea.value = value;
			textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			activeTextarea = textarea;

			return {
				content: [ { type: 'text', text: `Updated "${ textarea.name }"` } ],
			};
		}
	);

	return server;
};

const buildAiContext = ( textarea ) => ( {
	whatUserSees: {
		screen: 'Right click floating demo',
		fieldName: textarea?.name ?? '',
		fieldValue: textarea?.value ?? '',
	},
	whatUserCanDo: [
		'Make the selected text area longer',
		'Make the selected text area shorter',
	],
} );

const sendFieldContext = ( textarea ) => {
	const iframe = getAngieIframe();
	const contentWindow = iframe?.contentWindow;

	if ( ! iframe || ! contentWindow ) {
		return;
	}

	let origin;

	try {
		origin = new URL( iframe.src ).origin;
	} catch {
		return;
	}

	contentWindow.postMessage(
		{
			type: 'sdk-embedded-config',
			payload: {
				appId: 'demo-right-click-floating',
				configVersion: 2,
				aiContext: buildAiContext( textarea ),
			},
		},
		origin
	);
};

const CHAT_MENU_WIDTH = 360;
const CHAT_MENU_HEIGHT = 480;
const CHAT_MENU_EDGE = 8;

const positionChatAtPointer = ( clientX, clientY ) => {
	const container = document.getElementById( 'angie-sidebar-container' );

	if ( ! container ) {
		return;
	}

	const left = Math.max(
		CHAT_MENU_EDGE,
		Math.min( clientX, window.innerWidth - CHAT_MENU_WIDTH - CHAT_MENU_EDGE )
	);
	const top = Math.max(
		CHAT_MENU_EDGE,
		Math.min( clientY, window.innerHeight - CHAT_MENU_HEIGHT - CHAT_MENU_EDGE )
	);

	container.style.setProperty( 'top', `${ top }px`, 'important' );
	container.style.setProperty( 'left', `${ left }px`, 'important' );
	container.style.setProperty( 'bottom', 'auto', 'important' );
	container.style.setProperty( 'right', 'auto', 'important' );
	container.style.setProperty( 'inset-inline-end', 'auto', 'important' );
	container.style.setProperty( 'width', `${ CHAT_MENU_WIDTH }px`, 'important' );
	container.style.setProperty( 'height', `${ CHAT_MENU_HEIGHT }px`, 'important' );
};

const startNewConversation = () => {
	if ( ! sdk.isAngieReady() ) {
		return;
	}

	sdk.triggerAngie( {
		prompt: '\u200b',
		context: { source: 'demo-field-switch' },
		options: { newChat: true },
	} ).catch( () => {} );
};

const openChatForTextarea = ( textarea, clientX, clientY ) => {
	const switchedField = textarea !== activeTextarea;
	activeTextarea = textarea;
	positionChatAtPointer( clientX, clientY );
	sendFieldContext( textarea );
	window.toggleAngieSidebar?.( true );

	if ( switchedField ) {
		startNewConversation();
	}
};

await sdk.loadSidebarV2( {
	host: {
		appId: 'demo-right-click-floating',
		aiContext: buildAiContext( document.querySelector( 'textarea' ) ),
	},
	container: {
		layout: LAYOUT_FLOATING_CHAT,
		chatToggleButton: { enabled: false },
	},
	widgetConfig: {
		title: 'Rewrite this field',
		subtitle: 'Pick a starter to rewrite this field.',
		suggestions: {
			items: [
				{ label: 'Make it longer', value: 'Make it longer' },
				{ label: 'Make it shorter', value: 'Make it shorter' },
			],
		},
		closeButton: 'close',
		planning: { enabled: false },
		models: { execution: 'gemini-3.1-flash-lite-preview' },
		userProfileMenu: { enabled: false },
		promptLibrary: { enabled: false },
		fileUpload: { enabled: false },
		feedback: { enabled: false },
		commands: { enabled: false },
		testMode: { enabled: false },
		modeSwitcher: { enabled: false, default: 'agent' },
		featuredMcpServer: CONTEXT_SERVER_NAME,
		localServers: { skipLoading: true },
		topBar: { enabled: false },
	},
} );

const CHAT_HIDDEN_CLASS = 'angie-widget-hidden';

const getChatContainer = () => document.getElementById( 'angie-sidebar-container' );

const isChatOpen = () => {
	const container = getChatContainer();
	return Boolean( container && ! container.classList.contains( CHAT_HIDDEN_CLASS ) );
};

document.querySelectorAll( 'textarea' ).forEach( ( textarea ) => {
	textarea.addEventListener( 'contextmenu', ( event ) => {
		event.preventDefault();
		openChatForTextarea( textarea, event.clientX, event.clientY );
	} );
} );

document.addEventListener( 'pointerdown', ( event ) => {
	if ( event.button !== 0 || ! isChatOpen() ) {
		return;
	}

	const container = getChatContainer();

	if ( ! container || container.contains( event.target ) ) {
		return;
	}

	window.toggleAngieSidebar?.( false );
} );

await sdk.waitForReady();
await sdk.registerServer( {
	name: CONTEXT_SERVER_NAME,
	version: '1.0.0',
	description: 'Read and rewrite the focused text area',
	server: createFieldServer(),
	capabilities: {
		tools: {},
	},
} );
