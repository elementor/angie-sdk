# loadSidebarV2

Embeds the Angie assistant in a host page (SaaS app, WordPress frontend, or any site) via an iframe and a small host-side shell. Use `AngieMcpSdk.loadSidebarV2()` from the public package API.

## Quick start

```typescript
import { AngieMcpSdk, LAYOUT_FLOATING_CHAT } from '@elementor/angie-sdk';

const sdk = new AngieMcpSdk();

await sdk.loadSidebarV2({
  host: { appId: 'my-app' },
  container: { layout: LAYOUT_FLOATING_CHAT },
});
```

**Sidebar layout** (dock-style panel, resizable, open state persisted):

```typescript
await sdk.loadSidebarV2({
  host: { appId: 'my-app' },
  container: {
    layout: 'sidebar',
    styleTheme: 'wordpress',
    chatToggleButton: {
      enabled: true,
      selector: '#my-toggle',
    },
  },
});
```

Local demos:

- [`demo/load-sidebar-v2-sidebar/`](../../demo/load-sidebar-v2-sidebar/) — minimal sidebar
- [`demo/load-sidebar-v2-floating-chat/`](../../demo/load-sidebar-v2-floating-chat/) — minimal floating chat
- [`demo/load-sidebar-v2-full-config/`](../../demo/load-sidebar-v2-full-config/) — full example (`aiContext`, custom CSS)
- [`demo/load-sidebar-v2-widget-config/`](../../demo/load-sidebar-v2-widget-config/) — `widgetConfig` presets (help center, visitor widget, sandbox)
- [`demo/trigger-angie-prompt/`](../../demo/trigger-angie-prompt/) — `triggerAngie()` and `#angie-prompt=` deep links

## Layouts

| Layout | Constant | Typical use |
|--------|----------|-------------|
| Sidebar | `LAYOUT_SIDEBAR` (`'sidebar'`) | Fixed side panel, resize, persist open/closed |
| Floating chat | `LAYOUT_FLOATING_CHAT` (`'floatingChat'`) | Bottom-corner widget with optional injected toggle button |

Each layout applies [presets](./presets/) (defaults for `persistOpenState`, `resizable`, `chatToggleButton`, etc.). Override any field via `container` options.

## Configuration

`LoadSidebarV2Options` (see [`config.ts`](./config.ts)):

| Section | Purpose |
|---------|---------|
| `host` | **Required.** `appId`, optional `instanceId` (see [multiple instances](#multiple-instances-on-one-page)), `aiContext`, `website`, `analytics` sent to the embedded Angie app (see [aiContext](#hostaicontext)) |
| `boot` | `allowInIframe` — skip boot when the host page is itself in an iframe (default `false`) |
| `container` | DOM container id, `layout`, `styleTheme` (`'wordpress'` injects WP admin-bar CSS), resize/persist flags, chat toggle button |
| `iframe` | Angie origin, path (`angie/embedded`), `uiTheme`, `isRTL` |
| `callbacks` | `onClose`, `getExternalHeaders` for auth/API headers |
| `widgetConfig` | Embedded UI copy, feature toggles, MCP focus, close behavior — see [widgetConfig guide](./widget-config.md) |

Embedded config uses `configVersion: 2` (`LOAD_SIDEBAR_V2_CONFIG_VERSION`).

### host.aiContext

Object passed in `embedded.aiContext` on `HOST_READY` (and `sdk-embedded-config`). The embedded Angie app injects it into the agent so replies can use your host app state.

Keep it focused on what helps the agent answer screen-level questions:

| Key | Purpose |
|-----|---------|
| `whatUserSees` | What is on the current screen (labels, selection, visible fields) |
| `whatUserCanDo` | Actions the user can take on this screen |

Example: [`demo/load-sidebar-v2-full-config/host.js`](../../demo/load-sidebar-v2-full-config/host.js) reads `#demo-host-app` into `whatUserSees` and lists allowed actions in `whatUserCanDo`.

Full `widgetConfig` reference: [widget-config.md](./widget-config.md).

## Multiple instances on one page

You can run more than one Angie instance on the same page. Each one keeps its own
iframe, its own config and its own messages.

Two rules:

1. **Give every extra instance its own `container.id`.** The default is
   `angie-sidebar-container` for every layout, so two instances that do not set it would
   share one `<div>`. Booting the second one throws an error that names the id.
2. **Only one instance may use the `sidebar` layout.** That layout paints through
   page-wide CSS (`body.angie-sidebar-active` and `#angie-sidebar-container`), so a
   second sidebar would have no styling and would share the first one's open state.
   Booting a second sidebar throws. Extra instances must use `floatingChat`.

```js
const sidebarSdk = new AngieMcpSdk();
await sidebarSdk.loadSidebarV2( {
	host: { appId: 'my-app', instanceId: 'my-app-sidebar' },
	container: { layout: LAYOUT_SIDEBAR },
} );

const chatSdk = new AngieMcpSdk();
await chatSdk.loadSidebarV2( {
	host: { appId: 'my-app-help', instanceId: 'my-app-help' },
	container: { id: 'angie-help-container', layout: LAYOUT_FLOATING_CHAT },
} );
```

Working example: [`demo/load-sidebar-v2-multi-instance`](../../demo/load-sidebar-v2-multi-instance/).

### Registering MCP servers

You can boot instances in parallel. Register servers on each SDK only after that
instance is ready:

```js
await Promise.all( [
	sidebarSdk.loadSidebarV2( {
		host: { appId: 'my-app', instanceId: 'my-app-sidebar' },
		container: { layout: LAYOUT_SIDEBAR },
	} ),
	chatSdk.loadSidebarV2( {
		host: { appId: 'my-app-help', instanceId: 'my-app-help' },
		container: { id: 'angie-help-container', layout: LAYOUT_FLOATING_CHAT },
	} ),
] );

await sidebarSdk.waitForReady();
await chatSdk.waitForReady();

await sidebarSdk.registerServer( { name: 'wordpress-tools', /* ... */ } );
await chatSdk.registerServer( { name: 'help-center', /* ... */ } );
```

`waitForReady()` waits for the iframe boot, Angie availability, and any servers already
queued on that SDK. Each instance routes MCP registrations to its own iframe, so give
every instance a distinct `host.instanceId` when more than one registers servers on the
same page.

### host.instanceId

Optional. Names the instance. When you leave it out, the SDK generates a new id on every
page load.

The id names the instance's iframe (`angie-iframe-<instanceId>`), appears as the
`instanceId` query parameter in the iframe URL, and routes MCP server registrations back
to the right instance. Pass a stable id when you want those to stay the same across page
loads, for example to target the iframe from your own CSS or end-to-end tests.

Legacy globals (`window.toggleAngieSidebar`, `getAngieIframe()`, and similar helpers)
still target the first booted instance. Hold the `AngieMcpSdk` object if you need a
specific instance.

### Custom CSS (toggle + sidebar panel)

| Target | Selector | Notes |
|--------|----------|--------|
| Toggle button | Your selector (e.g. `#my-angie-toggle`) | Host DOM; wire via `container.chatToggleButton.selector` |
| Sidebar panel | `#${container.id}` (default `#angie-sidebar-container`) | SDK injects layout rules in `src/sidebar.css` |
| Panel width / z-index | `:root { --angie-sidebar-width; --angie-sidebar-z-index; }` | Read by SDK when opening/resizing |
| Gap from sidebar | `body.angie-sidebar-active { padding-inline-start: calc(var(--angie-sidebar-width) + 1.5rem) }` | SDK sets padding to width only; add your own gap (see demo CSS) |
| Iframe | `#${container.id} iframe#angie-iframe` for the first instance; `#${container.id} iframe#angie-iframe-<instanceId>` for later ones | First instance keeps legacy `angie-iframe`; others use `angie-iframe-<host.instanceId>` |

If a second instance reuses the default floating-chat toggle selector (`#angie-widget-toggle`), the SDK auto-suffixes it to `#angie-widget-toggle-<instanceId>` so toggles do not collide.

If you use a custom `container.id`, copy or adapt the rules from `sidebar.css` for your id.

Example: [`demo/load-sidebar-v2-full-config/demo-host.css`](../../demo/load-sidebar-v2-full-config/demo-host.css).

## Boot flow

```
loadSidebarV2(options)
  → resolveConfig + shouldBoot
  → boot guards (unique container.id / instanceId, one sidebar layout)
  → createAngieInstance + registerSdkInstance + startSdkMessageRouting (buffers MCP until iframe exists)
  → initHostApiBridge (postMessage API + V2 localStorage)
  → ensureSidebarContainer
  → layout strategy (initShell → open iframe → afterOpen)
  → sendEmbeddedConfig / sendWidgetConfig
```

Entry point: [`boot-sidebar.ts`](./boot-sidebar.ts). Layout strategies: [`layouts/index.ts`](./layouts/index.ts).

V1 `loadSidebar()` does not use this boot path. Its host localStorage bridge lives in [`localStorage.ts`](../localStorage.ts) instead of the bridge below.

## Prompt deep links

`loadSidebarV2()` watches the URL hash for `angie-prompt` (plus optional `angie-new-chat=true`), on
load and on every later `hashchange`:

```
https://example.com/pricing#angie-prompt=Which%20plan%20fits%20me%3F
https://example.com/pricing#angie-prompt=Help&angie-instance=my-app-help
```

When more than one `AngieMcpSdk` is on the page, add `angie-instance=<host.instanceId>` so only that SDK handles the hash.

It waits for Angie, sends the prompt, then clears the hash. Hosts need no hash code of their own.
Full reference: [Hash Parameter Method](../../README.md#hash-parameter-method).

## Host API bridge

[`host-api-bridge.ts`](./host-api-bridge.ts) listens for messages from the Angie iframe (origin-checked) and responds on a `MessagePort`:

- `GET_EXTERNAL_HEADERS` — `callbacks.getExternalHeaders()`
- `angie/context/get-website-context` — host + document metadata
- `angie/context/get-analytics-context` — screen path + `host.analytics`
- Host localStorage get/set (for embedded persistence on **loadSidebarV2** only; V1 uses [`localStorage.ts`](../localStorage.ts))

## Module map

| File / folder | Role |
|---------------|------|
| `boot-sidebar.ts` | Orchestration |
| `resolve-config.ts` | Merge options, env, presets |
| `open-embedded-iframe.ts` | Open iframe via shared `iframe.ts` |
| `embedded-handshake.ts` | Post-open config messages |
| `shell.ts`, `sidebar-toggle.ts` | Sidebar layout DOM/state |
| `chat-toggle/` | Floating chat shell and toggle UI |
| `presets/` | Per-layout defaults |
| `inject-style-theme.ts` | Optional WordPress theme CSS |

## Tests

Jest specs live next to modules (`*.test.ts`). Run the package test script from the repo root.

## Exports

From `@elementor/angie-sdk`: `loadSidebarV2` on `AngieMcpSdk`, plus `LAYOUT_SIDEBAR`, `LAYOUT_FLOATING_CHAT`, `LoadSidebarV2Options`, `WidgetConfig`, `ExternalHeadersCallback`.
