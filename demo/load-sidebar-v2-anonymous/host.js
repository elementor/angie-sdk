import { AngieMcpSdk, LAYOUT_SIDEBAR } from '../../dist/index.js';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2({
  host: {
    appId: 'anonymous-demo',
    authMode: 'anonymous',
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

console.log('✅ Anonymous sidebar loaded. Check network for authMode + topOrigin in iframe URL query or HOST_READY message.');
