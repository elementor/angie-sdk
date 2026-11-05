export type FeatureStatus = 'supported' | 'partial' | 'unsupported';

export type FeatureRow = {
  name: string;
  status: FeatureStatus;
  notes: string;
};

export const PACKAGE_VERSION = '1.9.0';

export const FEATURE_MATRIX: FeatureRow[] = [
  { name: 'Tools', status: 'supported', notes: 'Primary integration method for plugin capabilities.' },
  { name: 'Resources', status: 'supported', notes: 'Including subscriptions and custom URI schemes.' },
  { name: 'Sampling', status: 'supported', notes: 'LLM calls inside tools are routed through Angie backend.' },
  { name: 'Notifications', status: 'supported', notes: 'Server-to-client communication.' },
  { name: 'Server instructions', status: 'supported', notes: 'Guides Angie when selecting tools.' },
  { name: 'Prompts', status: 'unsupported', notes: 'Visible in inspector only; not wired in Angie yet.' },
  { name: 'OAuth 2.0', status: 'unsupported', notes: 'Use Angie sign-in and host context instead.' },
  { name: 'Elicitation', status: 'unsupported', notes: 'Design tools with upfront parameters.' },
  { name: 'Roots', status: 'unsupported', notes: 'Not available in the browser MCP host.' },
  { name: 'STDIO transport', status: 'unsupported', notes: 'Browser runs in-process MCP, not STDIO.' },
];

export type DemoLink = {
  title: string;
  description: string;
  path: string;
  featured?: boolean;
};

export const LOCAL_DEMOS: DemoLink[] = [
  {
    title: 'triggerAngie — prompt trigger',
    description: 'Open Angie with a pre-filled prompt via SDK or hash deep link.',
    path: 'demo/trigger-angie-prompt/',
    featured: true,
  },
  {
    title: 'loadSidebarV2 — full example',
    description: 'Product editor UI, aiContext, custom CSS, and triggerAngie.',
    path: 'demo/load-sidebar-v2-full-config/',
    featured: true,
  },
  {
    title: 'widgetConfig presets',
    description: 'Customize embedded UI copy, features, and MCP focus.',
    path: 'demo/load-sidebar-v2-widget-config/',
    featured: true,
  },
  {
    title: 'Sidebar layout',
    description: 'Minimal sidebar with a host toggle button.',
    path: 'demo/load-sidebar-v2-sidebar/',
  },
  {
    title: 'Floating chat',
    description: 'Minimal floating chat widget layout.',
    path: 'demo/load-sidebar-v2-floating-chat/',
  },
  {
    title: 'Right-click rewrite',
    description: 'Rewrite selected text with a host MCP server.',
    path: 'demo/load-sidebar-v2-right-click-floating/',
  },
  {
    title: 'CSS + MCP app preview',
    description: 'Review proposed CSS in a card before applying.',
    path: 'demo/load-sidebar-v2-css-mcp-app/',
  },
  {
    title: 'Multi-instance',
    description: 'Sidebar plus two floating chats on one page.',
    path: 'demo/load-sidebar-v2-multi-instance/',
  },
  {
    title: 'loadSidebar (v1)',
    description: 'Legacy sidebar embedding API.',
    path: 'demo/load-sidebar-v1-demo/',
  },
];

export const QUICK_START_SNIPPET = `import { AngieMcpSdk } from '@elementor/angie-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({ name: 'my-plugin', version: '1.0.0' });

server.tool(
  'hello',
  'Say hello to the current user',
  { name: z.string().optional() },
  async ({ name }) => ({
    content: [{ type: 'text', text: \`Hello, \${name ?? 'there'}!\` }],
  }),
);

const sdk = new AngieMcpSdk({ server });
await sdk.register();`;

export const EMBED_SNIPPET = `import { loadSidebarV2 } from '@elementor/angie-sdk';

await loadSidebarV2({
  layout: 'sidebar',
  widgetConfig: {
    title: 'My app assistant',
    subtitle: 'Ask about this screen.',
  },
  aiContext: {
    page: 'product-editor',
    productId: '42',
  },
});`;

export const FLOW_STEPS = [
  {
    title: 'Write an MCP server',
    body: 'Use the official TypeScript MCP SDK in your plugin or host app bundle.',
  },
  {
    title: 'Register with AngieMcpSdk',
    body: 'Angie discovers your server on the current page — no external gateway required.',
  },
  {
    title: 'Run in the browser',
    body: 'Tools execute client-side; call your REST or admin-ajax backend as needed.',
  },
  {
    title: 'Embed Angie UI',
    body: 'Use loadSidebarV2 for sidebar or floating chat with widgetConfig and aiContext.',
  },
];

export const RESOURCE_SCHEMES = [
  { scheme: 'context://', purpose: 'Dynamic user context', example: 'context://current' },
  { scheme: 'elementor://', purpose: 'Elementor data', example: 'elementor://page-context' },
  { scheme: 'wp://', purpose: 'WordPress entities', example: 'wp://posts/{id}' },
  { scheme: 'config://', purpose: 'Site configuration', example: 'config://site-settings' },
];

export const LINKS = {
  github: 'https://github.com/elementor/angie-sdk',
  npm: 'https://www.npmjs.com/package/@elementor/angie-sdk',
  mcpSpec: 'https://modelcontextprotocol.io/',
  loadSidebarDocs:
    'https://github.com/elementor/angie-sdk/blob/master/src/load-sidebar-v2/README.md',
  featuresDoc:
    'https://github.com/elementor/angie-sdk/blob/master/docs/angie-sdk-supported-features.md',
};
