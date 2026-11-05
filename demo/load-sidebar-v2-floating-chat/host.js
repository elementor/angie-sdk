import { AngieMcpSdk, LAYOUT_FLOATING_CHAT } from '../../dist/index.js';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2( {
	container: { layout: LAYOUT_FLOATING_CHAT },
} );
