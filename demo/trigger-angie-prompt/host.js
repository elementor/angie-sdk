import { AngieMcpSdk, LAYOUT_SIDEBAR } from '../../dist/index.js';

const DEFAULT_PROMPT = 'Help me improve the headline on this page for conversions.';
const CONTEXT_ATTACHMENT = {
	label: 'Current page headline',
	content: 'Build faster with Angie',
};

const sdk = new AngieMcpSdk();
const statusEl = document.getElementById( 'demo-status' );
const promptInput = document.getElementById( 'demo-prompt-input' );

const setStatus = ( message, type = 'idle' ) => {
	if ( ! statusEl ) {
		return;
	}

	statusEl.textContent = message;
	statusEl.classList.remove( 'is-success', 'is-error' );

	if ( type === 'success' ) {
		statusEl.classList.add( 'is-success' );
	}

	if ( type === 'error' ) {
		statusEl.classList.add( 'is-error' );
	}
};

const getPrompt = () => promptInput?.value?.trim() || DEFAULT_PROMPT;

const triggerWithPrompt = async ( { newChat = false, prompt = getPrompt() } = {} ) => {
	try {
		setStatus( 'Waiting for Angie…' );
		await sdk.waitForReady();

		const response = await sdk.triggerAngie( {
			prompt,
			contextAttachment: CONTEXT_ATTACHMENT,
			options: {
				newChat,
				timeout: 30000,
			},
		} );

		if ( response.success ) {
			setStatus( `Angie opened with your prompt. Request ID: ${ response.requestId }`, 'success' );
			return;
		}

		setStatus( response.error || 'Angie trigger failed.', 'error' );
	} catch ( error ) {
		setStatus( error instanceof Error ? error.message : 'Unknown error', 'error' );
	}
};

document.getElementById( 'demo-trigger-fill' )?.addEventListener( 'click', () => {
	void triggerWithPrompt();
} );

document.getElementById( 'demo-trigger-new-chat' )?.addEventListener( 'click', () => {
	void triggerWithPrompt( { newChat: true } );
} );

document.querySelectorAll( '[data-prompt-chip]' ).forEach( ( chip ) => {
	chip.addEventListener( 'click', () => {
		const prompt = chip.getAttribute( 'data-prompt-chip' );

		if ( promptInput && prompt ) {
			promptInput.value = prompt;
		}

		void triggerWithPrompt();
	} );
} );

// 3. Inject context on the fly — the field value rides the next message
// under `context.consumer`, so Angie doesn't need a "read current value" tool.
const fieldInput = document.getElementById( 'demo-field-input' );

const injectFieldContext = async () => {
	try {
		setStatus( 'Waiting for Angie…' );
		await sdk.waitForReady();

		const value = fieldInput?.value?.trim() || '';
		const response = await sdk.triggerAngie( {
			options: { newChat: true, timeout: 30000 },
			context: {
				source: 'demo-field-context',
				selectedField: { name: 'headline', value },
			},
		} );

		if ( response.success ) {
			setStatus( 'Angie opened with the field in context. Ask it about the headline — no read tool needed.', 'success' );
			return;
		}

		setStatus( response.error || 'Angie trigger failed.', 'error' );
	} catch ( error ) {
		setStatus( error instanceof Error ? error.message : 'Unknown error', 'error' );
	}
};

document.getElementById( 'demo-inject-context' )?.addEventListener( 'click', () => {
	void injectFieldContext();
} );

// 4. Conversation starters at trigger time — set the new chat's starters
// from the host, per entry point, instead of only at loadSidebar.
const TEXT_EDITING_STARTERS = {
	items: [
		{ label: 'Make it longer', value: 'Make this text longer.' },
		{ label: 'Make it shorter', value: 'Make this text shorter.' },
		{ label: 'Fix grammar', value: 'Fix the grammar in this text.' },
	],
};

const triggerWithStarters = async () => {
	try {
		setStatus( 'Waiting for Angie…' );
		await sdk.waitForReady();

		const response = await sdk.triggerAngie( {
			options: { newChat: true, timeout: 30000 },
			suggestions: TEXT_EDITING_STARTERS,
		} );

		if ( response.success ) {
			setStatus( 'New chat opened with custom conversation starters.', 'success' );
			return;
		}

		setStatus( response.error || 'Angie trigger failed.', 'error' );
	} catch ( error ) {
		setStatus( error instanceof Error ? error.message : 'Unknown error', 'error' );
	}
};

document.getElementById( 'demo-trigger-starters' )?.addEventListener( 'click', () => {
	void triggerWithStarters();
} );

sdk.loadSidebarV2( {
	host: {
		appId: 'demo-trigger-angie-prompt',
	},
	container: {
		layout: LAYOUT_SIDEBAR,
		styleTheme: 'wordpress',
		persistOpenState: true,
		chatToggleButton: {
			enabled: true,
			selector: '#demo-toggle',
		},
	},
	iframe: {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
	},
	widgetConfig: {
		title: 'Angie',
		subtitle: 'Prompt trigger demo',
		suggestions: {
			items: [
				{
					label: 'Improve headline',
					value: 'Suggest three stronger headlines for this page.',
				},
				{
					label: 'SEO check',
					value: 'Review this page for basic SEO issues and quick wins.',
				},
			],
		},
	},
} ).then( () => {
	setStatus( 'Angie sidebar loaded. Use the controls or hash links below.' );
} ).catch( ( error ) => {
	setStatus( error instanceof Error ? error.message : 'Failed to load Angie', 'error' );
} );
