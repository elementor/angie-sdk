/**
 * MCP Server for Angie Demo Plugin
 * Demonstrates how to create external MCP tools for the Angie AI assistant using the official MCP SDK
 * and register with Angie using the new Angie MCP SDK
 */

import { AngieMcpSdk } from '@elementor/angie-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Fireworks } from 'fireworks-js';
import { z } from 'zod';

// TypeScript interfaces for window globals
interface WpApiSettings {
	root: string;
	nonce?: string;
}

interface AngieDemo {
	nonce?: string;
}

declare global {
	interface Window {
		wpApiSettings: WpApiSettings;
		angieDemo?: AngieDemo;
	}
}

export type ApiResponse = Record<string, unknown>;

async function makeApiRequest( endpoint: string, data: Record<string, unknown> ): Promise<ApiResponse> {
	const response = await fetch( window.wpApiSettings.root + endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': window.wpApiSettings?.nonce || '',
		},
		body: JSON.stringify( data ),
	} );

	if ( ! response.ok ) {
		throw new Error( `HTTP error! status: ${ response.status }` );
	}

	return await response.json();
}

function createSeoMcpServer() {
	const server = new McpServer(
		{
			name: 'angie-demo-server',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
			},
		}
	);

	server.tool(
		'analyze-page-seo',
		'Analyzes the SEO of the current page including meta tags, headings, and content structure',
		{
			url: z.string().describe( 'The URL of the page to analyze' ),
		},
		async ( { url }: { url: string } ) => {
			const response = await makeApiRequest( 'angie-demo/v1/analyze-page-seo', { url } );
			return {
				content: [ {
					type: 'text',
					text: JSON.stringify( response, null, 2 ),
				} ],
			};
		} );

	server.tool(
		'manage-post-types',
		'Manages post types with Angie',
		{
			postType: z.string().describe( 'The post type to register' ),
			action: z.enum( [ 'register', 'unregister' ] ).describe( 'The action to perform' ),
		},
		async ( { postType, action }: { postType: string, action: string } ) => {
			const response = await makeApiRequest( 'angie-demo/v1/post-types', { postType, action } );
			return {
				content: [ {
					type: 'text',
					text: JSON.stringify( response, null, 2 ),
				} ],
			};
		} );

	server.tool(
		'security-check',
		'Checks the security of current WordPress installation',
		{},
		async () => {
			const response = await makeApiRequest( 'angie-demo/v1/security-check', {} );
			return {
				content: [ {
					type: 'text',
					text: JSON.stringify( response, null, 2 ),
				} ],
			};
		} );

	server.tool( 'run-fireworks',
		'Creates a celebratory fireworks display effect on the current screen. Use this when you want to add visual excitement or celebrate a successful action. The tool will create a full-screen canvas overlay with animated fireworks that automatically stop after 5 seconds.',
		{},
		async () => {
			try {
				// Create canvas element if it doesn't exist
				let canvas = document.getElementById( 'fireworks-canvas' ) as HTMLCanvasElement;
				if ( ! canvas ) {
					canvas = document.createElement( 'canvas' );
					canvas.id = 'fireworks-canvas';
					canvas.style.position = 'fixed';
					canvas.style.top = '0';
					canvas.style.left = '0';
					canvas.style.width = '100%';
					canvas.style.height = '100%';
					canvas.style.zIndex = '9999';
					canvas.style.pointerEvents = 'none';
					document.body.appendChild( canvas );
				}

				// Set canvas size to match window
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;

				// Create fireworks instance
				const fireworks = new Fireworks( canvas );

				// Start fireworks
				fireworks.start();

				// Stop fireworks after 5 seconds
				setTimeout( () => {
					fireworks.stop();
					// Remove canvas after animation
					setTimeout( () => {
						if ( canvas && canvas.parentNode ) {
							canvas.parentNode.removeChild( canvas );
						}
					}, 1000 );
				}, 5000 );

				return {
					content: [ {
						type: 'text',
						text: '🎆 Did you enjoy the fireworks display? It was a demonstration of the ability to run actions on screen.',
					} ],
				};
			} catch ( error ) {
				console.error( 'Error running fireworks:', error );
				return {
					content: [ {
						type: 'text',
						text: 'Failed to start fireworks display. Please try again.',
					} ],
				};
			}
		} );

	return server;
}

const init = async () => {
	try {
		const server = createSeoMcpServer();
		const sdk = new AngieMcpSdk();

		await sdk.registerServer( {
			name: 'angie-demo-server',
			version: '1.0.0',
			description: 'Demo MCP Server for Angie AI assistant',
			server,
		} );

		console.log( 'SEO MCP Server registered with Angie successfully' );
	} catch ( error ) {
		console.error( 'Failed to register SEO MCP Server with Angie:', error );
	}
};

init();
