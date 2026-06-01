import { AngieMcpSdk, LAYOUT_SIDEBAR } from '../../dist/index.js';

const root = document.getElementById( 'demo-host-app' );

const aiContext = {
	whatUserSees: {
		screen: 'Product editor',
		productName: root?.querySelector( '[data-field="name"]' )?.textContent?.trim() ?? 'Wireless Headphones',
		status: root?.dataset.status ?? 'draft',
		price: `$${ root?.dataset.price ?? '79.99' }`,
		sku: root?.dataset.sku ?? 'WH-100',
		description: root?.querySelector( '[data-field="description"]' )?.textContent?.trim() ?? '',
	},
	whatUserCanDo: [
		'Edit the product name, description, price, and status',
		'Publish the product when ready (currently draft)',
		'Ask Angie to improve the description or suggest a publish checklist',
	],
};

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2( {
	host: {
		appId: 'demo-full-config',
		aiContext,
	},
	boot: {
		allowInIframe: false,
	},
	container: {
		// Default id angie-sidebar-container — matches SDK sidebar.css; override in demo-host.css
		layout: LAYOUT_SIDEBAR,
		styleTheme: 'wordpress',
		persistOpenState: true,
		resizable: true,
		chatToggleButton: {
			enabled: true,
			selector: '#demo-toggle',
		},
	},
	iframe: {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
		isRTL: false,
	},
	callbacks: {
		onClose: () => console.log( 'onClose' ),
		getExternalHeaders: async () => ( {
			'X-Demo-App-Id': 'demo-full-config',
		} ),
	},
	widgetConfig: {
		title: 'Angie',
		subtitle: 'Acme Store Builder',
		suggestions: {
			items: [
				{
					label: 'What am I looking at?',
					value: 'What do I see on this screen?',
				},
				{
					label: 'What can I do here?',
					value: 'What can I do on this screen?',
				},
			],
		},
		aiContextGuidance: { enabled: true },
		closeButton: 'collapse',
	},
} );

const toggle = document.getElementById( 'demo-toggle' );

toggle?.addEventListener( 'click', async () => {
	const isOpening = toggle.getAttribute( 'aria-expanded' ) !== 'true';

	if ( ! isOpening ) {
		return;
	}

	await sdk.triggerAngie( {
		prompt: 'Help me optimize this page for SEO',
	} );
}, true );
