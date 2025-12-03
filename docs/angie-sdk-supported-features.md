# MCP SDK Supported & Unsupported Features

This document covers Angie's MCP feature support and **Angie-specific conventions**. For standard MCP SDK usage, see [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

Based on MCP SDK version: **1.20.1**

---

## Table of Contents

- [Feature Support Matrix](#feature-support-matrix)
- [Angie-Specific Annotations](#angie-specific-annotations)
- [Angie Internal Resources](#angie-internal-resources)
- [Sampling via Backend](#sampling-via-backend)

---

## Feature Support Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Tools | ✅ Supported | Primary integration method |
| Resources | ✅ Supported | Including subscriptions |
| Sampling | ✅ Supported | Routed through backend (see [Sampling](#sampling-via-backend)) |
| Notifications | ✅ Supported | Server-to-client communication |
| Server Instructions | ✅ Supported | AI guidance for tool selection |
| Prompts | ❌ Not Supported Yet | Shown in inspector only |
| OAuth 2.0 Auth | ❌ Not Supported Yet |  |
| Elicitation | ❌ Not Supported Yet | Design tools with upfront params |
| Roots | ❌ Not Available | Browser environment limitation |
| STDIO Transport | ❌ Not Available | Browser environment limitation |

---

## Angie-Specific Annotations

These annotations are **Angie-specific** and extend standard MCP tool annotations.

### `angie/requiredResources` - Tool-Resource Dependencies

Declare which resources a tool needs before execution. Angie will fetch these resources automatically before calling the tool.

```typescript
server.tool('update-element', 'Update an Elementor element', {
  elementId: z.string(),
  changes: z.object({ /* ... */ }),
}, {
  'angie/requiredResources': [
    { uri: 'elementor://page-context', description: 'Current page structure' },
    { uri: 'elementor://selected-element', description: 'Currently selected element' }
  ]
}, handler);
```

**How it works:**
1. LLM selects a tool with `angie/requiredResources`
2. Backend extracts unfetched resource URIs
3. Frontend fetches resources via MCP client
4. Resources injected into conversation context
5. LLM re-plans with resource data available

### `confirmationMessage` - Consent Flow Integration

When using the official MCP `destructiveHint` annotation, Angie supports a `confirmationMessage` parameter for user confirmation dialogs:

```typescript
server.tool('delete-post', 'Permanently delete a WordPress post', {
  postId: z.number(),
  confirmationMessage: z.string().optional().describe(
    'Explain what will be deleted and impact. Example: "Delete post \'My Article\' permanently. This cannot be undone."'
  ),
}, {
  title: 'Delete Post',
  destructiveHint: true,
}, handler);
```

**Behavior:**
- `destructiveHint: true` (official MCP) → triggers Angie's consent dialog
- `confirmationMessage` (Angie-specific) → LLM generates this explaining the impact

---

## Angie Internal Resources

MCP allows custom URI schemes for resources. Here are Angie's internal resource URI schemes:

| Scheme | Purpose | Example |
|--------|---------|---------|
| `context://` | Dynamic user context | `context://current` |
| `elementor://` | Elementor-specific data | `elementor://page-context`, `elementor://selected-element` |
| `wp://` | WordPress data | `wp://posts/{id}`, `wp://media/{id}` |
| `config://` | Configuration/settings | `config://site-settings` |

### URI Prefixing

When resources from multiple servers are aggregated, Angie prefixes URIs:

```
{serverName}__{resource.uri}
```

Example: `elementor-editor__elementor://page-context`

This allows Angie to route resource reads to the correct MCP server.

---

## Sampling via Backend

Sampling (LLM calls within MCP tools) works differently in Angie - requests are **proxied through Angie's backend**, not direct MCP client-to-LLM.

### Usage Pattern

```typescript
import { SamplingMessageSchema } from '@modelcontextprotocol/sdk/types.js';

const result = await server.request({
  method: 'sampling/createMessage',
  params: {
    messages: [{ role: 'user', content: { type: 'text', text: prompt } }],
    maxTokens: 1000,
    modelPreferences: {
      hints: [{ name: 'elementor-css' }]
    },
    metadata: {
      // Model-specific fields
    }
  }
}, SamplingMessageSchema);
```

### Available Model Hints

| Model Hint | Use Case |
|------------|----------|
| `elementor-css` | CSS generation |
| `elementor-motion-effects` | Animation generation |
| `elementor-code-generation` | General code generation |
| `elementor-generate-text` | Text content generation |
| `openai` | General purpose |

### How It Works

Sampling requests are routed through Angie's backend, which handles model selection and API calls. Each model hint maps to specific capabilities.

---

## Related Documentation

- [Angie SDK README](./README.md) - SDK installation, usage, and best practices
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official MCP documentation
