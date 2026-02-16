# @elementor/angie-sdk

Based on [MCP](https://github.com/modelcontextprotocol/typescript-sdk) version: 1.20.1

**An SDK for extending Angie AI Assistant capabilities.**

This SDK enables you to create custom MCP servers that Angie can discover and use to run your plugin features.

---

## Table of Contents

- [Background](#background)
- [How It Works](#how-it-works)
- [Supported MCP Features](#supported-mcp-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Async Registration](#async-registration)
- [Triggering Angie with Prompts](#triggering-angie-with-prompts)
- [MCP Server Example](#mcp-server-example)
- [Adding Instructions to MCP Servers](#adding-instructions-to-mcp-servers)
- [Registering Tools](#registering-tools)
- [Handling Tool Calls](#handling-tool-calls)
- [Best Practices](#best-practices)
- [Remote SSE and HTTP Streamable MCP servers](#remote-sse-and-http-streamable-mcp-servers)
- [Error Handling](#error-handling)
- [Changelog](#changelog)
- [Demo Plugin](#demo-plugin)
- [Debugging & Testing](#debugging--testing)
- [FAQ](#faq)

---

## Background

Angie is a WordPress AI Assistant that can perform almost any task on a WordPress website.

Angie is fully extensible, so plugin developers can easily integrate their own features, allowing Angie to use and control them.

Angie is built on an MCP-based architecture, enabling you to create custom MCP servers that expose your plugin's capabilities for Angie to access.

To learn about MCP:
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Documentation](https://modelcontextprotocol.io/docs)

The SDK was designed specifically to address these issues:

1. **Run MCP in the Browser**
   The SDK allows you to run an MCP server as a JavaScript module in the browser, so there is no need for creating a PHP-based MCP server or creating an external SSE or HTTPStreamable-based MCP Server.
   
   All logic runs client-side while you can use WP REST or even adminAjax to communicate with your plugin backend.

2. **Register MCP with Angie Without an External Server**
   You can register your MCP directly with Angie using the SDK, even if you don't have an external MCP Gateway. Angie discovers your server through the SDK.

3. **Communicate with MCP on the Current Screen**
   The SDK enables Angie to communicate with your plugin's MCP directly on the current page, so Angie will be able to _see_ and _act_ on the current user's screen.

---

## How It Works
Angie SDK allows you to use the official TypeScript MCP SDK to write your MCP Server.
Then with Angie SDK you can register it and let Angie run your MCP server like other MCP Hosts.

The SDK covers three main abilities:
* Import and use the current supported official MCP SDK
* Register your MCP Server
* Run your MCP server in the browser


```
┌──────────────────────────────┐
│       Angie SDK Flow         │
├──────────────────────────────┤
│                              │
│  Your WordPress Plugin       │
│            │                 │
│            │ enqueue script  │
│            ▼                 │
│  Your MCP Server (JS)        │
│            │                 │
│            │ register server │
│            ▼                 │
│  Angie SDK                   │
│            │                 │
│            ◄─► Browser       │
│            │   Transport     │
│            ▼                 │
│  Angie (iframe)              │
│                              │
└──────────────────────────────┘
```

## Supported MCP Features

**Supported:**
- Tools, Resources, Notifications, Sampling (via backend)

**Not Supported Yet:**
- Prompts (shown in inspector only), OAuth 2.0 external auth, Elicitation

**Not Available:**
- Roots, STDIO transport (browser environment limitations)

📖 **Documentation:**
- [MCP SDK Supported Features](./docs/angie-sdk-supported-features.md)
- [Tool Model Preferences](./docs/model-preferences.md) - Configure preferred AI models for your tools

---

## Installation

```bash
npm install @elementor/angie-sdk
```

---

## Quick Start

### 1. Create Your MCP Server

Create a TypeScript or a Javascript file (e.g., `demo-mcp-server.ts`):

```typescript
import {
  AngieMcpSdk,
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpServer,
} from '@elementor/angie-sdk';

// Define the MCP server
function createSeoMcpServer() {
  const server = new McpServer(
    { name: 'my-seo-server', title: 'SEO', version: '1.0.0' },
    { 
      capabilities: { tools: {} },
      instructions: `Guidelines for when to use this server and its capabilities.`
    }
  );

  // Add your tools, resources, etc.
  server.tool( ... );

  return server;
}

// Register the server with Angie
const server = createSeoMcpServer();
const sdk = new AngieMcpSdk();

await sdk.waitForReady();

sdk.registerServer({
  name: 'my-seo-server',
  version: '1.0.0',
  description: 'SEO tools for Angie',
  server,
});
```

### Async Registration

The `registerServer()` method is asynchronous and returns a Promise.
In most cases, you don't need to `await` it since registration happens in the background.

**Use `await sdk.registerServer(...)` when:**
- You need to ensure registration is complete before proceeding
- You need to catch and handle registration errors explicitly

---

## Triggering Angie with Prompts

The SDK can also trigger Angie with custom prompts - useful for help buttons or deep linking.

```typescript
import { AngieMcpSdk } from '@elementor/angie-sdk';

// Register your MCP server and trigger Angie
const server = createSeoMcpServer();
const sdk = new AngieMcpSdk();

await sdk.waitForReady();

sdk.registerServer({
  name: 'my-seo-server',
  version: '1.0.0',
  description: 'SEO tools for Angie',
  server,
});

// Trigger Angie with a prompt
await sdk.triggerAngie({
  prompt: 'Help me optimize this page for SEO',
  context: { pageType: 'product', source: 'my-plugin' },
  options: {
    timeout: 30000, // Optional: 30 seconds timeout (default: 30000)
    
  }
});

// Or simplified version
await sdk.triggerAngie({
  prompt: 'Help me create a contact page'
});
```

**Options:**
- `timeout`: How long to wait for Angie response (milliseconds)  
- `priority`: Request priority level
- `context`: Additional data to help Angie understand the request

### Hash Parameter Method

```javascript
// Trigger via URL hash - perfect for deep linking
window.location.hash = 'angie-prompt=' + encodeURIComponent('Help me create a contact page');

// Or visit URLs like: https://yoursite.com/wp-admin/edit.php#angie-prompt=Help%20me%20optimize%20SEO
```

**Note:** Always call `await sdk.waitForReady()` before triggering Angie.

---

## MCP Server Example

A typical project structure:

```
your-plugin/
├── plugin.php               # Main WordPress plugin file
├── dist/
│   └── demo-mcp-server.js    # Bundled MCP server JS
├── src/
│   └── demo-mcp-server.ts    # MCP server source
└── ...
```

- **PHP**: Implements REST API endpoints for your tool - if needed.
- **JS/TS**: Registers tools and handles requests using the SDK.

---

## Adding Instructions to MCP Servers

Instructions are guidelines that describe when to use your MCP server and what its capabilities are. They help Angie understand what your server can and cannot do, ensuring appropriate tool selection and proper user expectations.

### Why Add Instructions?

- Guide Angie on when your server is the right choice for a task
- Clarify what capabilities are available
- Set clear boundaries on what cannot be done
- Improve tool selection accuracy

### How to Add Instructions

Provide instructions in the second parameter during server initialization:

```typescript
const server = new McpServer(
  { name: 'content-writer', title: 'Content Writer', version: '1.0.0' },
  {
    instructions: `Guidelines for using the Text Content Management server.

### Capabilities:
- **Generate new content**: Creates blog posts, page content, headlines, product descriptions
- **Edit existing content**: Refines or adjusts text based on specific instructions
- **Content variations**: Creates multiple versions for A/B testing or different audiences

### Limitations:
- **SEO optimization**: Cannot analyze or optimize for specific keywords or search rankings
- **Fact checking**: Cannot verify accuracy against real-world data
- **Plagiarism checking**: Cannot verify content originality`
  }
);
```

### Best Practices

1. **Describe Capabilities Clearly**: Explain what each capability does and when to use it, not just feature names
2. **Define Use Cases**: Help Angie understand when your server is the right choice for a task
3. **Set Clear Boundaries**: Explicitly state what your server cannot do to prevent inappropriate tool calls
4. **Keep Updated**: Refresh instructions when you add or remove tools
5. **Use Action-Oriented Language**: Focus on what users can accomplish with your server

---

## Registering Tools

Each tool must be registered with:
- **name**: Unique string identifier
- **description**: What the tool does and when to use it
- **inputSchema**: JSON schema describing required/optional parameters

Example:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze-page-seo',
      description: 'Analyzes the SEO of a page.',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Page URL' } },
        required: ['url'],
      },
    },
  ],
}));
```

---

## Handling Tool Calls

Implement a handler for `CallToolRequestSchema`:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case 'analyze-page-seo':
      // Call your backend or perform logic
      const { root, nonce } = window.wpApiSettings;
      const response = await fetch(`${root}my-plugin/v1/analyze-seo`, {
        method: 'POST',
        headers: {
          'X-WP-Nonce': nonce,
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(args),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    // Add more cases as needed
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

---

## Best Practices

- **Tool Naming**: Use clear, outcome-focused names (e.g., "analyze-page-seo").
- **Descriptions**: Clearly describe what the tool does, when to use it, and what it returns.
- **Input Schemas**: Define precise input schemas for each tool, prefer using Zod.
- **Error Handling**: Return user-friendly errors in natural language and log details for debugging.
- **Security**: Use nonces for REST API calls and permission checks in your backend.
- **Versioning**: Angie SDK exports the current supported MCP SDK, prefer to use the integrated MCP SDK to ensure supported MCP version features.

---

## Security

**⚠️ Security Responsibility**: When you create MCP tools that interact with your WordPress backend, you become responsible for the security of those operations. Angie acts as a channel for user actions, so it's your responsibility to implement proper security measures.

### Required Security Measures

1. **Permission Checks**: Always verify user permissions on your backend endpoints
2. **Input Validation**: Sanitize and validate all input data
3. **Capability Checks**: Use WordPress capability checks for specific operations

### Example Secure Endpoint

```php
add_action('rest_api_init', function () {
    register_rest_route('my-plugin/v1', '/analyze-seo', [
        'methods' => 'POST',
        'callback' => 'my_analyze_seo_callback',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
        'args' => array(
          'url' => array(
            'validate_callback' => function($param, $request, $key) {
              return filter_var($param, FILTER_VALIDATE_URL);
            },
            'required' => true,
          ),
        ),
    ]);
});
```
## Remote SSE and HTTP Streamable MCP servers

For remote servers, let your Angie users add them via Angie MCP Gateway settings.

### Supported Remote Server Types
- **SSE (Server-Sent Events)**: For real-time streaming responses
- **HTTP Streamable**: For HTTP-based streaming communication

### Configuration
Remote MCP servers can be configured through Angie's settings interface, allowing users to connect to external MCP services without requiring code changes.

---

## Error Handling

- Throw errors in handlers to return error responses to the client.
- Use custom error messages for user-facing errors.
- Log errors internally as needed.

**Example:**
```typescript
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    // Your tool implementation
    const result = await performToolAction(req.params);
    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (err) {
    console.error('Tool error:', err);
    throw new Error('User-friendly error message');
  }
});
```

---

## Changelog
- **v1.0.0**: Initial release

---

## Demo Plugin

**For more examples, see the demo plugin and MCP server in the example folder**

If you have questions or need help, open an issue or contact the Elementor team! 

## Debugging & Testing

- Use browser console logs to verify server registration and tool calls.
- Test REST endpoints directly (e.g., with Postman) before wiring up the MCP server.
- Check Angie's UI for tool discovery and invocation.

### Common Debugging Steps
1. Check browser console for registration errors
2. Verify tool names match between registration and handler
3. Test REST API endpoints independently
4. Ensure proper nonce and permission setup

### Dev Mode for Enhanced Debugging

Angie includes a Dev Mode feature that displays tool execution progress and details directly in the chat interface, making it easier to debug your MCP server integrations and understand how Angie interacts with your tools.

**To enable Dev Mode:**
1. Open Angie in WordPress
2. Click on the User Profile icon
3. Navigate to Tools
4. Toggle "Dev Mode" on

**What Dev Mode shows:**
When enabled, Angie will display in the chat:
- Tool execution history for each user request
- Tool call status (pending, in progress, completed, failed)
- Tool input and output

---

## License

MIT
