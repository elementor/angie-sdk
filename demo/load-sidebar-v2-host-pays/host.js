import { AngieMcpSdk, LAYOUT_SIDEBAR } from '../../dist/index.js';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2({
  host: {
    appId: 'host-pays-demo',
    authMode: 'host_pays',
  },
  container: {
    layout: LAYOUT_SIDEBAR,
    chatToggleButton: {
      enabled: true,
      selector: '#demo-sidebar-toggle',
    },
  },
  iframe: {
    path: 'angie/embedded',
  },
});

console.log('✅ Host-pays sidebar loaded. Check network for authMode + topOrigin in iframe URL query or HOST_READY message.');
