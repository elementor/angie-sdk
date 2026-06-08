# widgetConfig

Customize the embedded Angie chat UI — copy, starter prompts, feature toggles, close behavior, and which local MCP server Angie should prefer on first open.

`widgetConfig` is sent to the Angie iframe as a `postMessage` with type `sdk-widget-config` after the host opens the embedded app. It works with both APIs:

| API | When config is sent |
|-----|---------------------|
| `AngieMcpSdk.loadSidebar()` | Immediately after `openIframe()` if `widgetConfig` is provided |
| `AngieMcpSdk.loadSidebarV2()` | After iframe open via `sendWidgetConfig()` in the v2 boot flow |

Type definition: [`WidgetConfig`](../angie-mcp-sdk.ts) (exported from `@elementor/angie-sdk`).

## Quick start

```typescript
import { AngieMcpSdk, LAYOUT_SIDEBAR } from '@elementor/angie-sdk';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2({
  host: { appId: 'my-app' },
  container: { layout: LAYOUT_SIDEBAR },
  widgetConfig: {
    title: 'Need help?',
    subtitle: 'Ask questions about this screen.',
    suggestions: {
      items: [
        { label: 'What can I do here?', value: 'What actions are available on this screen?' },
      ],
    },
    closeButton: 'collapse',
    aiContextGuidance: { enabled: true },
  },
});
```

Live demo: [`demo/load-sidebar-v2-widget-config/`](../../demo/load-sidebar-v2-widget-config/).

## Layout defaults

`loadSidebarV2` merges your options with layout-specific defaults in [`widget-config.ts`](./widget-config.ts):

| Layout | Default `closeButton` | Notes |
|--------|----------------------|--------|
| `sidebar` | `'collapse'` | Hides the panel; host toggle can reopen it |
| `floatingChat` | `'close'` | Dismisses the floating widget |

Your values override these defaults. Example: pass `closeButton: 'close'` on a sidebar layout if you want full dismiss instead of collapse.

`loadSidebar()` has no layout presets — only fields you pass are sent.

## Field reference

All fields are optional. Omitted fields use Angie embedded-app defaults.

### Copy and prompts

| Field | Type | Purpose |
|-------|------|---------|
| `title` | `string` | Main heading in the empty chat state |
| `subtitle` | `string` | Supporting line under the title |
| `suggestions` | `{ items: { label: string; value: string }[] }` | Starter prompt chips. `label` is shown in the UI; `value` is the prompt sent when clicked |

`suggestions.items` is the same shape used in production Elementor hosts (`window.angieConfig.prompts` mapped to `suggestions.items`).

### Feature toggles

Each toggle uses `{ enabled: boolean }`.

| Field | Typical host use |
|-------|------------------|
| `promptLibrary` | Hide built-in prompt library when the host supplies its own `suggestions` |
| `fileUpload` | Disable attachments in locked-down or read-only embeds |
| `feedback` | Turn off thumbs up/down when you handle feedback elsewhere |
| `commands` | Hide slash commands |
| `testMode` | Hide internal test tooling in production embeds |
| `betaBanner` | Hide beta messaging in stable product surfaces |
| `aiContextGuidance` | Show users that `host.aiContext` is available — pair with `host.aiContext` in `loadSidebarV2` |
| `userProfileMenu` | Hide account/profile menu when the host owns auth UI |

### Mode and MCP

| Field | Type | Purpose |
|-------|------|---------|
| `modeSwitcher` | `{ enabled?: boolean; default?: 'agent' \| 'plan' \| 'ask' }` | Show or hide Agent / Plan / Ask switcher; set the initial mode |
| `featuredMcpServer` | `string` | Name of a **host-registered** local MCP server Angie should surface first (must match `registerServer({ name })`) |
| `localServers` | `{ skipLoading?: boolean }` | When `skipLoading: true`, Angie does not auto-load host local servers — use when you register servers yourself after `waitForReady()` |

### Close behavior

| Field | Type | Values |
|-------|------|--------|
| `closeButton` | `'collapse' \| 'close'` | `collapse` — hide panel, keep session; `close` — dismiss widget |

## Patterns from production hosts

These mirror [`ai-remote-integration`](https://github.com/elementor/elementor-ai/tree/main/editor-saas-services/packages/ai-remote-integration) (Elementor my.elementor sidebar and visitor floating widget).

### Help center sidebar (my.elementor)

Focused help surface: custom copy, starter prompts, help-center MCP featured, most Angie chrome disabled.

```typescript
const HELP_CENTER_SERVER = 'help-center';

const widgetConfig: WidgetConfig = {
  title: 'Need Help with Elementor?',
  subtitle: 'Ask questions, learn how features work, and get help with your Elementor websites or products.',
  suggestions: {
    items: [
      { label: 'How to back up your website', value: 'How to create a backup of my website before making major changes or updates.' },
      { label: 'What is Elementor One?', value: 'What is Elementor One?' },
    ],
  },
  promptLibrary: { enabled: false },
  fileUpload: { enabled: false },
  feedback: { enabled: false },
  featuredMcpServer: HELP_CENTER_SERVER,
  modeSwitcher: { enabled: false, default: 'agent' },
  closeButton: 'collapse',
  betaBanner: { enabled: false },
  aiContextGuidance: { enabled: false },
  localServers: { skipLoading: true },
  userProfileMenu: { enabled: false },
};

await sdk.loadSidebarV2({
  host: { appId: 'my-elementor' },
  container: { layout: 'sidebar' /* ... */ },
  widgetConfig,
});

await sdk.waitForReady();
sdk.registerServer({ name: HELP_CENTER_SERVER, /* ... */ });
```

`localServers.skipLoading: true` avoids a race: register your MCP servers after `waitForReady()`, then Angie uses `featuredMcpServer` to prioritize the right one.

### Visitor floating search widget

Minimal floating chat: search MCP featured, ask mode, close dismisses the widget.

```typescript
const SEARCH_SERVER = 'wp-search';

const widgetConfig: WidgetConfig = {
  promptLibrary: { enabled: false },
  fileUpload: { enabled: false },
  feedback: { enabled: false },
  featuredMcpServer: SEARCH_SERVER,
  modeSwitcher: { enabled: false, default: 'ask' },
  closeButton: 'close',
  // Optional host-provided copy:
  title: window.angieConfig?.title,
  subtitle: window.angieConfig?.subtitle,
  suggestions: window.angieConfig?.prompts?.length
    ? { items: window.angieConfig.prompts }
    : undefined,
};

await sdk.loadSidebarV2({
  host: { appId: 'visitor-widget' },
  container: { layout: LAYOUT_FLOATING_CHAT },
  widgetConfig,
});
```

### Runtime overrides via `window.angieConfig`

Hosts can inject copy from PHP or a build step without recompiling the integration bundle:

```html
<script>
  window.angieConfig = {
    title: 'Search this site',
    subtitle: 'Ask anything about our docs and pages.',
    prompts: [
      { label: 'Pricing', value: 'What are your pricing plans?' },
    ],
  };
</script>
```

Read `window.angieConfig` inside a `buildWidgetConfig()` helper and merge with your defaults (see demo [`host.js`](../../demo/load-sidebar-v2-widget-config/host.js)).

## Pairing with `host.aiContext`

When the host passes screen context via `loadSidebarV2({ host: { aiContext } })`, enable the guidance affordance:

```typescript
widgetConfig: {
  aiContextGuidance: { enabled: true },
}
```

Example with full host context: [`demo/load-sidebar-v2-full-config/host.js`](../../demo/load-sidebar-v2-full-config/host.js).

## loadSidebar (v1) vs loadSidebarV2

| | `loadSidebar()` | `loadSidebarV2()` |
|--|-----------------|-------------------|
| Config location | Top-level `widgetConfig` on `AngieMcpSdkOptions` | `widgetConfig` on `LoadSidebarV2Options` |
| Layout defaults | None | `closeButton` preset per layout |
| Send timing | Right after iframe open | After v2 boot + `sendEmbeddedConfig` |

v1 example:

```typescript
await sdk.loadSidebar({
  origin: 'https://angie.elementor.com',
  path: 'angie/embedded',
  widgetConfig: { title: 'Angie', closeButton: 'close' },
});
```

## Module map

| File | Role |
|------|------|
| [`angie-mcp-sdk.ts`](../angie-mcp-sdk.ts) | `WidgetConfig` type; v1 send path |
| [`widget-config.ts`](./widget-config.ts) | Layout default merge for v2 |
| [`embedded-handshake.ts`](./embedded-handshake.ts) | `sendWidgetConfig()` → `sdk-widget-config` |
| [`boot-sidebar.ts`](./boot-sidebar.ts) | Calls `sendWidgetConfig` when resolved config includes `widgetConfig` |
