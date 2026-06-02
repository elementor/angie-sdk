import { AngieMcpSdk, LAYOUT_SIDEBAR } from '../../dist/index.js';

const root = document.getElementById( 'demo-host-app' );

const readField = ( selector ) => root?.querySelector( selector )?.textContent?.trim() ?? '';

const aiContext = {
	whatUserSees: {
		screen: 'Product editor',
		productName: readField( '[data-field="name"]' ) || 'Wireless Headphones',
		status: root?.dataset.status ?? 'draft',
		price: `$${ root?.dataset.price ?? '79.99' }`,
		sku: root?.dataset.sku ?? 'WH-100',
		description: readField( '[data-field="description"]' ),
	},
	whatUserCanDo: [
		'Edit the product name, description, price, and status',
		'Publish the product when ready (currently draft)',
		'Ask Angie to review the listing before publishing or suggest improvements',
	],
};

const sdk = new AngieMcpSdk();

const toggle = document.getElementById( 'demo-toggle' );

toggle?.addEventListener( 'click', async () => {
	const isOpening = toggle.getAttribute( 'aria-expanded' ) !== 'true';

	if ( ! isOpening ) {
		return;
	}

	await sdk.waitForReady();
	await sdk.triggerAngie( {
		prompt: 'Review this product listing before I publish it. Tell me what looks good and what I should fix.',
	} );
} );

sdk.loadSidebarV2( {
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
					label: 'Review before publish',
					value: 'Review this product listing before I publish it. What looks good, and what should I fix?',
				},
				{
					label: 'Improve description',
					value: 'Suggest a clearer, more compelling product description for this listing.',
				},
			],
		},
		aiContextGuidance: { enabled: true },
		closeButton: 'collapse',
	},
} ).catch( ( error ) => {
	console.error( 'loadSidebarV2 failed:', error );
} );
