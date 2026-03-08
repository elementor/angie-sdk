# Angie Tool Annotations

Angie exposes a set of annotation constants and interfaces that MCP tool authors can use to attach Angie-specific metadata to their tools. These are exported directly from `@elementor/angie-sdk`.

## Available Annotations

| Constant | Value | Purpose |
|---|---|---|
| `ANGIE_REQUIRED_RESOURCES` | `'angie/requiredResources'` | Declare resources the tool needs |
| `ANGIE_MODEL_PREFERENCES` | `'angie/modelPreferences'` | Request a specific AI model |
| `ANGIE_EXTENDED_TIMEOUT` | `'angie/extendedTimeout'` | Request a longer execution timeout |
| `MCP_READONLY` | `'readOnlyHint'` | Mark a tool as read-only |

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
import { ANGIE_REQUIRED_RESOURCES, ToolAnnotations } from '@elementor/angie-sdk';

server.tool(
  'update-page-styles',
  'Updates the CSS styles for the current page',
  { /* input schema */ },
  {
    [ANGIE_REQUIRED_RESOURCES]: [
      {
        uri: 'elementor://page/styles',
        whenToUse: 'Always — needed to read current page styles before updating',
      }
    ]
  } as ToolAnnotations,
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
import { ANGIE_MODEL_PREFERENCES, ToolAnnotations } from '@elementor/angie-sdk';

server.tool(
  'generate-custom-css',
  'Generates CSS code based on design requirements',
  { /* input schema */ },
  {
    [ANGIE_MODEL_PREFERENCES]: {
      hints: [
        { name: 'claude-sonnet' }, // First choice
        { name: 'gpt-4.1' }        // Fallback
      ],
      intelligencePriority: 0.9    // Optional: for future use
    }
  } as ToolAnnotations,
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
import { ANGIE_EXTENDED_TIMEOUT, ToolAnnotations } from '@elementor/angie-sdk';

server.tool(
  'bulk-update-elements',
  'Updates all elements on the page in one operation',
  { /* input schema */ },
  {
    [ANGIE_EXTENDED_TIMEOUT]: {
      timeoutMs: 60000 // 60 seconds
    }
  } as ToolAnnotations,
  async (args) => { /* handler */ }
);
```

---

## `MCP_READONLY`

Mark a tool as read-only. Angie uses this hint to understand that the tool does not mutate any state, which can affect planning and user confirmation flows.

**Example:**

```typescript
import { MCP_READONLY, ToolAnnotations } from '@elementor/angie-sdk';

server.tool(
  'get-page-structure',
  'Returns the structure of the current page',
  { /* input schema */ },
  {
    [MCP_READONLY]: true
  } as ToolAnnotations,
  async (args) => { /* handler */ }
);
```

---

## Using Multiple Annotations Together

All annotations can be combined on a single tool:

```typescript
import {
  ANGIE_REQUIRED_RESOURCES,
  ANGIE_MODEL_PREFERENCES,
  ANGIE_EXTENDED_TIMEOUT,
  MCP_READONLY,
  ToolAnnotations,
} from '@elementor/angie-sdk';

server.tool(
  'analyze-page-layout',
  'Analyzes the current page layout and returns suggestions',
  { /* input schema */ },
  {
    [MCP_READONLY]: true,
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
  } as ToolAnnotations,
  async (args) => { /* handler */ }
);
```
