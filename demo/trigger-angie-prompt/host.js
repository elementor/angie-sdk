import { AngieMcpSdk, LAYOUT_SIDEBAR } from '../../dist/index.js';

const DEFAULT_PROMPT = 'Help me improve the headline on this page for conversions.';
const HASH_PARAM_PROMPT = 'angie-prompt';
const HASH_PARAM_NEW_CHAT = 'angie-new-chat';

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

const parseHashParams = ( hash ) => {
	const paramString = hash.startsWith( '#' ) ? hash.substring( 1 ) : hash;
	return new URLSearchParams( paramString );
};

const readPromptFromHash = ( hash ) => {
	if ( ! hash.includes( `${ HASH_PARAM_PROMPT }=` ) ) {
		return null;
	}

	const params = parseHashParams( hash );
	const prompt = params.get( HASH_PARAM_PROMPT ) || '';

	if ( ! prompt ) {
		return null;
	}

	return {
		prompt,
		newChat: params.get( HASH_PARAM_NEW_CHAT ) === 'true',
	};
};

const clearPromptHash = () => {
	if ( ! window.location.hash ) {
		return;
	}

	const scrollY = window.scrollY;
	history.replaceState( null, '', `${ window.location.pathname }${ window.location.search }` );
	window.scrollTo( 0, scrollY );
};

const consumeHashOnLoad = () => {
	const hashPrompt = readPromptFromHash( window.location.hash );

	if ( ! hashPrompt ) {
		return null;
	}

	const scrollY = window.scrollY;
	clearPromptHash();
	window.scrollTo( 0, scrollY );

	return hashPrompt;
};

const pendingHashPrompt = consumeHashOnLoad();

const triggerWithPrompt = async ( { newChat = false, prompt = getPrompt() } = {} ) => {
	try {
		setStatus( 'Waiting for Angie…' );
		await sdk.waitForReady();

		const response = await sdk.triggerAngie( {
			prompt,
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

document.querySelectorAll( '.demo-hash-link--in-page' ).forEach( ( link ) => {
	link.addEventListener( 'click', ( event ) => {
		event.preventDefault();
		const hash = link.getAttribute( 'href' );
		const hashPrompt = hash ? readPromptFromHash( hash ) : null;

		if ( ! hashPrompt ) {
			setStatus( 'Hash link is missing a prompt.', 'error' );
			return;
		}

		if ( promptInput ) {
			promptInput.value = hashPrompt.prompt;
		}

		void triggerWithPrompt( hashPrompt );
	} );
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

	if ( pendingHashPrompt ) {
		if ( promptInput ) {
			promptInput.value = pendingHashPrompt.prompt;
		}

		void triggerWithPrompt( pendingHashPrompt );
	}
} ).catch( ( error ) => {
	setStatus( error instanceof Error ? error.message : 'Failed to load Angie', 'error' );
} );
