import { AngieMcpSdk, LAYOUT_SIDEBAR, McpAppDisplayMode, getAngieIframe } from '../../dist/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const CONTEXT_SERVER_NAME = 'demo-css-editor';
const PREVIEW_URI = 'ui://demo-css-editor/preview.html';
const PREVIEW_MIME_TYPE = 'text/html;profile=mcp-app';
const HEADING_SELECTOR = '#demo-heading';

const sdk = new AngieMcpSdk();

const styleEl = document.getElementById( 'angie-custom-css' );
const codeEl = document.getElementById( 'css-code' );
const headingEl = document.querySelector( HEADING_SELECTOR );
const aiButton = document.getElementById( 'css-ai-button' );

const getAppliedCss = () => styleEl.textContent.trim();

const getHeadingText = () => headingEl?.textContent?.trim() ?? '';

let appliedVersion = 1;

const applyCss = ( css ) => {
	styleEl.textContent = css;
	codeEl.textContent = css;
	appliedVersion += 1;
	sendCssContext();

	return css;
};

// The proposal never touches the page. It waits here until the preview card applies it.
const proposals = new Map();
let nextProposalId = 1;

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

const createCssServer = () => {
	const server = new McpServer(
		{
			name: CONTEXT_SERVER_NAME,
			version: '1.0.0',
			title: 'Heading CSS',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
			},
			instructions: [
				'This server styles a single heading on the host page.',
				'The CSS that is currently applied arrives as page context or as an attachment on the user message — there is no tool for reading it.',
				'Call propose-css with the full replacement stylesheet. That renders a preview card in the chat where the user reviews the code.',
				'Do not call apply-css yourself. The user applies the CSS from the preview card.',
			].join( ' ' ),
		}
	);

	server.registerTool(
		'propose-css',
		{
			description: 'Show the user a preview card with proposed CSS for the heading. This does not change the page — the user applies it from the card. Pass the full replacement stylesheet, not a patch.',
			inputSchema: {
				css: z.string().describe( `The full replacement stylesheet. Target ${ HEADING_SELECTOR }.` ),
				summary: z.string().optional().describe( 'A short title for the change, e.g. "Purple gradient heading"' ),
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
		async ( { css, summary } ) => {
			const proposalId = String( nextProposalId++ );

			proposals.set( proposalId, css );

			return {
				content: [ {
					type: 'text',
					text: `Proposed CSS is waiting for the user in preview card ${ proposalId }. Do not apply it yourself.`,
				} ],
				structuredContent: {
					proposalId,
					css,
					summary: summary ?? 'Heading style',
					appliedCss: getAppliedCss(),
					version: appliedVersion,
				},
			};
		}
	);

	server.registerTool(
		'apply-css',
		{
			description: 'Apply CSS to the heading on the page. The preview card calls this when the user approves a proposal.',
			inputSchema: {
				css: z.string().optional().describe( 'The full stylesheet to apply. Omit when passing proposalId.' ),
				proposalId: z.string().optional().describe( 'The proposalId from propose-css, applied instead of css.' ),
			},
		},
		async ( { css, proposalId } ) => {
			const resolved = css ?? ( proposalId ? proposals.get( proposalId ) : undefined );

			if ( ! resolved ) {
				return {
					content: [ { type: 'text', text: 'Pass either css or a known proposalId' } ],
					isError: true,
				};
			}

			applyCss( resolved );

			if ( proposalId ) {
				proposals.delete( proposalId );
			}

			return {
				content: [ { type: 'text', text: `Applied CSS to ${ HEADING_SELECTOR }` } ],
				structuredContent: {
					applied: true,
					version: appliedVersion,
					appliedCss: resolved,
				},
			};
		}
	);

	server.registerResource(
		'css-preview-app',
		PREVIEW_URI,
		{
			title: 'CSS preview card',
			description: 'MCP App that shows proposed CSS with an apply button',
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
		screen: 'CSS MCP app demo',
		selector: HEADING_SELECTOR,
		headingText: getHeadingText(),
		appliedCss: getAppliedCss(),
	},
	whatUserCanDo: [
		'Ask for a new heading style, review the proposed CSS in the preview card, and apply it',
	],
} );

// read-css is deliberately absent: Angie learns the current CSS from page context and
// from the attachment the AI button sends, so the context has to be pushed on every change.
function sendCssContext() {
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
				configVersion: 2,
				aiContext: buildAiContext(),
			},
		},
		origin
	);
}

const askAngieAboutCss = async () => {
	aiButton.disabled = true;

	try {
		await sdk.waitForReady();
		window.toggleAngieSidebar?.( true );

		await sdk.triggerAngie( {
			// Angie holds this until the user sends the message, then attaches it as a
			// context-attachment part. Nothing renders in the composer before that.
			contextAttachment: {
				label: 'Applied CSS',
				content: getAppliedCss(),
			},
			context: { source: 'demo-css-panel', selector: HEADING_SELECTOR },
			options: { newChat: true, timeout: 30000 },
		} );
	} catch ( error ) {
		console.error( 'Could not open Angie with the CSS attached', error );
	} finally {
		aiButton.disabled = false;
	}
};

aiButton.addEventListener( 'click', askAngieAboutCss );

codeEl.textContent = getAppliedCss();

await sdk.loadSidebarV2( {
	host: {
		appId: 'demo-css-mcp-app',
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
	widgetConfig: {
		title: 'Style this heading',
		subtitle: 'Angie proposes CSS. You approve it in the preview card.',
		suggestions: {
			items: [
				{ label: 'Purple gradient', value: 'Give the heading a purple gradient text fill' },
				{ label: 'Soft shadow', value: 'Add a soft text shadow and tighten the letter spacing' },
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
	description: 'Propose CSS for the page heading and apply it once the user approves',
	server: createCssServer(),
	capabilities: {
		tools: {},
		resources: {},
	},
} );
