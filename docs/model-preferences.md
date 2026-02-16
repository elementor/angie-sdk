# Tool Model Preferences

Angie allows MCP tools to specify their preferred AI models using the `angie/modelPreferences` annotation. This ensures tools can request specific models optimized for their functionality (e.g., code generation tools preferring Claude Sonnet).

## How It Works

When a tool is selected, Angie uses its preferred model for both planning and execution, overriding user preferences when specified.

## Annotation Schema

**File**: `packages/elementor-ai-common/src/angie-annotations.ts`

```typescript
export const ANGIE_MODEL_PREFERENCES = 'angie/modelPreferences' as const;

export interface AngieModelPreferences {
  hints?: Array<{ name: string }>;
  costPriority?: number;           // 0-1 (future use)
  speedPriority?: number;          // 0-1 (future use)
  intelligencePriority?: number;   // 0-1 (future use)
}
```

## Usage Example

```typescript
import { ANGIE_MODEL_PREFERENCES } from '~elementor-ai-common/angie-annotations';

server.tool(
  'generate-custom-css',
  'Generates CSS code based on design requirements',
  { /* input schema */ },
  {
    [ANGIE_MODEL_PREFERENCES]: {
      hints: [
        { name: 'claude-sonnet' },  // First choice
        { name: 'gpt-4.1' }         // Fallback
      ],
      intelligencePriority: 0.9     // Optional: for future use
    }
  },
  async (args) => {
    // Tool handler implementation
  }
);
```

## Model Selection Priority

Angie resolves the model to use in this order:

1. **User preference (Internal users only)** - `executionModel` if provided and different from default (`gpt-4o`)
2. **Tool annotation** - `angie/modelPreferences.hints[0]` if user preference is default or not provided
3. **System defaults** - Falls back to default model if neither is available

## Implementation Details

The backend (`elementor-ai-api/src/angie/angie.service.ts`) extracts model preferences from tool annotations:

## Best Practices

- **Use for specialized tasks**: Apply model preferences when your tool requires specific model capabilities (e.g., code generation, creative writing)
- **Provide fallbacks**: List multiple model hints in order of preference
- **Test with different models**: Verify your tool works with fallback models
- **Document requirements**: Explain in your tool description why specific models are preferred

## Notes

- Based on [MCP Sampling specification](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)
- First hint is the most preferred, subsequent hints are fallbacks
- Fully typed with TypeScript - no `any` types used
- Backward compatible with existing model selection behavior

