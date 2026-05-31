import { AngieMcpSdk } from '../../dist/index.js';

const layout = new URLSearchParams( window.location.search ).get( 'layout' ) ?? 'floating-chat';

const sdk = new AngieMcpSdk();

const container =
	layout === 'sidebar'
		? {
			layout: 'sidebar',
			styleTheme: 'wordpress',
			chatToggleButton: {
				enabled: true,
				selector: '#demo-sidebar-toggle',
			},
		}
		: { layout: 'floating-chat' };

await sdk.loadSidebarV2( {
	host: { appId: 'demo' },
	container,
} );
