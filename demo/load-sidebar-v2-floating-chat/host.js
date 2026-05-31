import { AngieMcpSdk } from '../../dist/index.js';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2( {
	host: { appId: 'demo' },
	container: { layout: 'floating-chat' },
} );
