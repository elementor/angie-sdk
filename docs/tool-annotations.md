# Angie Tool Annotations

Angie exposes a set of annotation constants and interfaces that MCP tool authors can use to attach metadata to their tools. These are exported directly from `@elementor/angie-sdk`.

## Annotations vs `_meta`

The MCP protocol distinguishes between two types of tool metadata:

| Location | Purpose | Interface |
|---|---|---|
| `annotations` | **Standard MCP annotations** — recognized by the MCP protocol | `AngieToolAnnotations` |
| `_meta` | **Custom Angie metadata** — vendor-specific extensions | `AngieToolMeta` |

### Standard Annotations (`annotations`)

| Field | Type | Purpose |
|---|---|---|
| `title` | `string` | Human-readable title for the tool |
| `readOnlyHint` | `boolean` | Mark a tool as read-only |
| `destructiveHint` | `boolean` | Mark a tool as potentially destructive |

### Custom Angie Metadata (`_meta`)

| Constant | Value | Purpose |
|---|---|---|
| `ANGIE_REQUIRED_RESOURCES` | `'angie/requiredResources'` | Declare resources the tool needs |
| `ANGIE_MODEL_PREFERENCES` | `'angie/modelPreferences'` | Request a specific AI model |
| `ANGIE_EXTENDED_TIMEOUT` | `'angie/extendedTimeout'` | Request a longer execution timeout |

---

## Tool Registration API

Use `server.registerTool()` to register tools with the MCP server:

```typescript
server.registerTool(
  'tool-name',
  {
    description: 'Tool description',
    inputSchema: { /* zod schema */ },
    annotations: { /* standard MCP annotations */ },
    _meta: { /* custom Angie metadata */ },
  },
  async (args) => { /* handler */ }
);
```

---

## `ANGIE_REQUIRED_RESOURCES`

Declare which resources the tool expects Angie to fetch and provide before execution.

```typescript
interface AngieRequiredResource {
  uri: string;           // Resource URI to fetch
  whenToUse: string;     // Human-readable description of when this resource is needed
  params?: Record<string, string>; // Optional URI template parameters
}
```

**Example:**

```typescript
import { ANGIE_REQUIRED_RESOURCES, AngieToolMeta } from '@elementor/angie-sdk';

server.registerTool(
  'update-page-styles',
  {
    description: 'Updates the CSS styles for the current page',
    inputSchema: { /* ... */ },
    _meta: {
      [ANGIE_REQUIRED_RESOURCES]: [
        {
          uri: 'elementor://page/styles',
          whenToUse: 'Always — needed to read current page styles before updating',
        }
      ]
    } as AngieToolMeta,
  },
  async (args) => { /* handler */ }
);
```

---

## `ANGIE_MODEL_PREFERENCES`

Request a specific AI model for planning and execution of this tool. When the tool is selected, Angie uses this preference to override the default model.

```typescript
interface AngieModelPreferences {
  hints?: Array<{ name: string }>; // Ordered list of preferred model names
  costPriority?: number;           // 0–1 (future use)
  speedPriority?: number;          // 0–1 (future use)
  intelligencePriority?: number;   // 0–1 (future use)
}
```

### Model Selection Priority

Angie resolves the model in this order:

1. **User preference (internal users only)** — `executionModel` if provided and different from the system default
2. **Tool annotation** — `angie/modelPreferences.hints[0]` if user preference is default or absent
3. **System default** — falls back if neither is available

**Example:**

```typescript
import { ANGIE_MODEL_PREFERENCES, AngieToolMeta } from '@elementor/angie-sdk';

server.registerTool(
  'generate-custom-css',
  {
    description: 'Generates CSS code based on design requirements',
    inputSchema: { /* ... */ },
    _meta: {
      [ANGIE_MODEL_PREFERENCES]: {
        hints: [
          { name: 'claude-sonnet' }, // First choice
          { name: 'gpt-4.1' }        // Fallback
        ],
        intelligencePriority: 0.9    // Optional: for future use
      }
    } as AngieToolMeta,
  },
  async (args) => { /* handler */ }
);
```

> Based on the [MCP Sampling specification](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling). First hint is the most preferred; subsequent hints are fallbacks.

---

## `ANGIE_EXTENDED_TIMEOUT`

Request a longer execution timeout for tools that perform heavy or slow operations (e.g., large DOM mutations, external API calls).

```typescript
interface AngieExtendedTimeout {
  timeoutMs: number; // Timeout in milliseconds
}
```

**Example:**

```typescript
import { ANGIE_EXTENDED_TIMEOUT, AngieToolMeta } from '@elementor/angie-sdk';

server.registerTool(
  'bulk-update-elements',
  {
    description: 'Updates all elements on the page in one operation',
    inputSchema: { /* ... */ },
    _meta: {
      [ANGIE_EXTENDED_TIMEOUT]: {
        timeoutMs: 60000 // 60 seconds
      }
    } as AngieToolMeta,
  },
  async (args) => { /* handler */ }
);
```

---

## `readOnlyHint` (Standard MCP Annotation)

Mark a tool as read-only. Angie uses this hint to understand that the tool does not mutate any state, which can affect planning and user confirmation flows.

**Example:**

```typescript
server.registerTool(
  'get-page-structure',
  {
    description: 'Returns the structure of the current page',
    inputSchema: { /* ... */ },
    annotations: {
      readOnlyHint: true
    },
  },
  async (args) => { /* handler */ }
);
```

---

## Using Multiple Annotations Together

Standard annotations and custom Angie metadata can be combined on a single tool:

```typescript
import {
  ANGIE_REQUIRED_RESOURCES,
  ANGIE_MODEL_PREFERENCES,
  ANGIE_EXTENDED_TIMEOUT,
  AngieToolMeta,
} from '@elementor/angie-sdk';

server.registerTool(
  'analyze-page-layout',
  {
    description: 'Analyzes the current page layout and returns suggestions',
    inputSchema: { /* ... */ },
    annotations: {
      readOnlyHint: true,
    },
    _meta: {
      [ANGIE_EXTENDED_TIMEOUT]: { timeoutMs: 30000 },
      [ANGIE_REQUIRED_RESOURCES]: [
        {
          uri: 'elementor://page/layout',
          whenToUse: 'Always — needed to read the page structure',
        }
      ],
      [ANGIE_MODEL_PREFERENCES]: {
        hints: [{ name: 'claude-sonnet' }],
        intelligencePriority: 0.9
      }
    } as AngieToolMeta,
  },
  async (args) => { /* handler */ }
);
```

