import { AngieMcpSdk } from '../../dist/index.js';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2( {
	host: { appId: 'demo' },
	container: {
		layout: 'sidebar',
		styleTheme: 'wordpress',
		chatToggleButton: {
			enabled: true,
			selector: '#demo-sidebar-toggle',
		},
	},
} );
