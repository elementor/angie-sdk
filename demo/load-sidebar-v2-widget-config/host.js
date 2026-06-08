import { AngieMcpSdk, LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from '../../dist/index.js';

const PRESET_PARAM = new URLSearchParams( window.location.search ).get( 'preset' ) || 'helpCenter';

const HELP_CENTER_SERVER = 'demo-help-center';
const SEARCH_SERVER = 'demo-wp-search';

const readAngieConfig = () => window.angieConfig || {};

const buildHelpCenterWidgetConfig = () => {
	const cfg = readAngieConfig();
	const title = cfg.title?.trim() || 'Need help with your store?';
	const subtitle =
		cfg.subtitle?.trim() ||
		'Ask questions, learn how features work, and get help with products and orders.';
	const prompts =
		cfg.prompts?.length > 0
			? cfg.prompts
			: [
					{
						label: 'Review my listing',
						value: 'Review this product listing before I publish. What should I improve?',
					},
					{
						label: 'Pricing tips',
						value: 'What pricing strategy fits this product category?',
					},
					{
						label: 'SEO checklist',
						value: 'Give me a short SEO checklist for this product page.',
					},
				];

	return {
		title,
		subtitle,
		suggestions: { items: prompts },
		promptLibrary: { enabled: false },
		fileUpload: { enabled: false },
		feedback: { enabled: false },
		featuredMcpServer: HELP_CENTER_SERVER,
		modeSwitcher: { enabled: false, default: 'agent' },
		closeButton: 'collapse',
		betaBanner: { enabled: false },
		aiContextGuidance: { enabled: true },
		localServers: { skipLoading: true },
		userProfileMenu: { enabled: false },
	};
};

const buildVisitorWidgetConfig = () => {
	const cfg = readAngieConfig();
	const config = {
		promptLibrary: { enabled: false },
		fileUpload: { enabled: false },
		feedback: { enabled: false },
		featuredMcpServer: SEARCH_SERVER,
		modeSwitcher: { enabled: false, default: 'ask' },
		closeButton: 'close',
	};

	if ( cfg.title ) {
		config.title = cfg.title;
	} else {
		config.title = 'Search this demo site';
	}

	if ( cfg.subtitle ) {
		config.subtitle = cfg.subtitle;
	} else {
		config.subtitle = 'Ask about pages, products, and docs on this site.';
	}

	if ( cfg.prompts?.length > 0 ) {
		config.suggestions = { items: cfg.prompts };
	} else {
		config.suggestions = {
			items: [
				{ label: 'Find products', value: 'What products do you sell?' },
				{ label: 'Shipping', value: 'What are your shipping options?' },
			],
		};
	}

	return config;
};

const buildSandboxWidgetConfig = () => ( {
	title: 'Widget config sandbox',
	subtitle: 'Most Angie features enabled for exploration.',
	suggestions: {
		items: [
			{ label: 'Try agent mode', value: 'What can you help me with on this demo page?' },
			{ label: 'Try plan mode', value: 'Plan a small marketing campaign for this product.' },
		],
	},
	promptLibrary: { enabled: true },
	fileUpload: { enabled: true },
	feedback: { enabled: true },
	modeSwitcher: { enabled: true, default: 'agent' },
	closeButton: 'collapse',
	betaBanner: { enabled: true },
	aiContextGuidance: { enabled: true },
	userProfileMenu: { enabled: true },
} );

const PRESETS = {
	helpCenter: {
		label: 'Help center sidebar',
		description: 'my.elementor-style: custom copy, featured MCP, minimal chrome.',
		layout: LAYOUT_SIDEBAR,
		buildWidgetConfig: buildHelpCenterWidgetConfig,
		loadOptions: {
			container: {
				layout: LAYOUT_SIDEBAR,
				styleTheme: 'wordpress',
				persistOpenState: true,
				resizable: true,
				chatToggleButton: {
					enabled: true,
					selector: '#demo-toggle',
				},
			},
		},
	},
	visitor: {
		label: 'Visitor floating search',
		description: 'angie-for-visitors-style: floating chat, ask mode, close dismisses.',
		layout: LAYOUT_FLOATING_CHAT,
		buildWidgetConfig: buildVisitorWidgetConfig,
		loadOptions: {
			container: { layout: LAYOUT_FLOATING_CHAT },
		},
	},
	sandbox: {
		label: 'Feature sandbox',
		description: 'Sidebar with most widget toggles enabled.',
		layout: LAYOUT_SIDEBAR,
		buildWidgetConfig: buildSandboxWidgetConfig,
		loadOptions: {
			container: {
				layout: LAYOUT_SIDEBAR,
				persistOpenState: true,
				resizable: true,
				chatToggleButton: {
					enabled: true,
					selector: '#demo-toggle',
				},
			},
		},
	},
};

const preset = PRESETS[ PRESET_PARAM ] || PRESETS.helpCenter;
const widgetConfig = preset.buildWidgetConfig();

const configJsonEl = document.getElementById( 'demo-config-json' );
const presetLabelEl = document.getElementById( 'demo-preset-label' );
const presetDescEl = document.getElementById( 'demo-preset-desc' );

if ( configJsonEl ) {
	configJsonEl.textContent = JSON.stringify( widgetConfig, null, 2 );
}

if ( presetLabelEl ) {
	presetLabelEl.textContent = preset.label;
}

if ( presetDescEl ) {
	presetDescEl.textContent = preset.description;
}

document.querySelectorAll( '[data-preset-link]' ).forEach( ( link ) => {
	const name = link.getAttribute( 'data-preset-link' );
	link.classList.toggle( 'is-active', name === PRESET_PARAM || ( ! PRESETS[ PRESET_PARAM ] && name === 'helpCenter' ) );
} );

const sdk = new AngieMcpSdk();

const toggle = document.getElementById( 'demo-toggle' );

if ( preset.layout === LAYOUT_FLOATING_CHAT && toggle ) {
	toggle.style.display = 'none';
}

toggle?.addEventListener( 'click', async () => {
	if ( toggle.getAttribute( 'aria-expanded' ) !== 'true' ) {
		await sdk.waitForReady();
	}
} );

sdk.loadSidebarV2( {
	host: {
		appId: `demo-widget-config-${ PRESET_PARAM }`,
		aiContext: {
			whatUserSees: {
				screen: 'Widget config demo',
				preset: preset.label,
				layout: preset.layout,
			},
			whatUserCanDo: [
				'Switch presets via the links on this page (reloads with ?preset=)',
				'Override copy via window.angieConfig in the console, then reload',
				'Open Angie and try the starter suggestions',
			],
		},
	},
	iframe: {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
		isRTL: false,
	},
	...preset.loadOptions,
	widgetConfig,
} ).catch( ( error ) => {
	console.error( 'loadSidebarV2 failed:', error );
} );
