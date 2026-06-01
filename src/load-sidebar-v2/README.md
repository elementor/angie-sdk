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
| `host` | **Required.** `appId`, optional `aiContext`, `website`, `analytics` sent to the embedded Angie app (see [aiContext](#hostaicontext)) |
| `boot` | `allowInIframe` — skip boot when the host page is itself in an iframe (default `false`) |
| `container` | DOM container id, `layout`, `styleTheme` (`'wordpress'` injects WP admin-bar CSS), resize/persist flags, chat toggle button |
| `iframe` | Angie origin, path (`angie/embedded`), `uiTheme`, `isRTL` |
| `callbacks` | `onClose`, `getExternalHeaders` for auth/API headers |
| `widgetConfig` | Close button behavior (`collapse` vs `close`); layout-specific defaults in [`widget-config.ts`](./widget-config.ts) |

Embedded config uses `configVersion: 2` (`LOAD_SIDEBAR_V2_CONFIG_VERSION`).

### host.aiContext

Object passed in `embedded.aiContext` on `HOST_READY` (and `sdk-embedded-config`). The embedded Angie app injects it into the agent so replies can use your host app state.

Keep it focused on what helps the agent answer screen-level questions:

| Key | Purpose |
|-----|---------|
| `whatUserSees` | What is on the current screen (labels, selection, visible fields) |
| `whatUserCanDo` | Actions the user can take on this screen |

Example: [`demo/load-sidebar-v2-full-config/host.js`](../../demo/load-sidebar-v2-full-config/host.js) reads `#demo-host-app` into `whatUserSees` and lists allowed actions in `whatUserCanDo`.

Enable `widgetConfig.aiContextGuidance: { enabled: true }` so users see that host context is available.

### Custom CSS (toggle + sidebar panel)

| Target | Selector | Notes |
|--------|----------|--------|
| Toggle button | Your selector (e.g. `#my-angie-toggle`) | Host DOM; wire via `container.chatToggleButton.selector` |
| Sidebar panel | `#${container.id}` (default `#angie-sidebar-container`) | SDK injects layout rules in `src/sidebar.css` |
| Panel width / z-index | `:root { --angie-sidebar-width; --angie-sidebar-z-index; }` | Read by SDK when opening/resizing |
| Gap from sidebar | `body.angie-sidebar-active { padding-inline-start: calc(var(--angie-sidebar-width) + 1.5rem) }` | SDK sets padding to width only; add your own gap (see demo CSS) |
| Iframe | `#angie-sidebar-container iframe#angie-iframe` | `id="angie-iframe"` is set by the SDK |

If you use a custom `container.id`, copy or adapt the rules from `sidebar.css` for your id.

Example: [`demo/load-sidebar-v2-full-config/demo-host.css`](../../demo/load-sidebar-v2-full-config/demo-host.css).

## Boot flow

```
loadSidebarV2(options)
  → resolveConfig + shouldBoot
  → initHostApiBridge (postMessage API)
  → ensureSidebarContainer
  → layout strategy (initShell → open iframe → afterOpen)
  → sendEmbeddedConfig / sendWidgetConfig
```

Entry point: [`boot-sidebar.ts`](./boot-sidebar.ts). Layout strategies: [`layouts/index.ts`](./layouts/index.ts).

## Host API bridge

[`host-api-bridge.ts`](./host-api-bridge.ts) listens for messages from the Angie iframe (origin-checked) and responds on a `MessagePort`:

- `GET_EXTERNAL_HEADERS` — `callbacks.getExternalHeaders()`
- `angie/context/get-website-context` — host + document metadata
- `angie/context/get-analytics-context` — screen path + `host.analytics`
- Host localStorage get/set (for embedded persistence)

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

From `@elementor/angie-sdk`: `loadSidebarV2` on `AngieMcpSdk`, plus `LAYOUT_SIDEBAR`, `LAYOUT_FLOATING_CHAT`, `LoadSidebarV2Options`, `ExternalHeadersCallback`.
