import { AngieMcpSdk } from '../../dist/index.js';

const sdk = new AngieMcpSdk();

await sdk.loadSidebar();
window.toggleAngieSidebar?.( true );
