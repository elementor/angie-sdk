export const ANGIE_REQUIRED_RESOURCES = 'angie/requiredResources' as const;
export const ANGIE_MODEL_PREFERENCES = 'angie/modelPreferences' as const;
export const ANGIE_EXTENDED_TIMEOUT = 'angie/extendedTimeout' as const;
export const MCP_READONLY = 'readOnlyHint' as const;

export enum McpAppDisplayMode {
	Inline = 'inline',
	EndOfTurn = 'end-of-turn',
}

export interface AngieRequiredResource {
	uri: string;
	whenToUse: string;
	params?: Record<string, string>;
}

export interface AngieModelPreferences {
	hints?: Array<{ name: string }>;
	costPriority?: number;
	speedPriority?: number;
	intelligencePriority?: number;
}

export interface AngieExtendedTimeout {
	timeoutMs: number;
}

export interface AngieToolUiMeta {
	resourceUri?: string;
	displayMode?: McpAppDisplayMode;
}

/**
 * Custom Angie metadata to be placed in the `_meta` field of a tool.
 * These are vendor-specific extensions and should NOT be placed in `annotations`.
 * 
 * @example
 * server.registerTool('my-tool', {
 *   description: 'My tool description',
 *   inputSchema: { ... },
 *   annotations: { readOnlyHint: true }, // Standard MCP annotations
 *   _meta: {
 *     [ANGIE_REQUIRED_RESOURCES]: [{ uri: 'resource://...', whenToUse: '...' }],
 *     [ANGIE_MODEL_PREFERENCES]: { intelligencePriority: 0.8 },
 *     ui: { displayMode: McpAppDisplayMode.Inline },
 *   }
 * }, handler);
 */
export interface AngieToolMeta {
	[ANGIE_REQUIRED_RESOURCES]?: AngieRequiredResource[];
	[ANGIE_MODEL_PREFERENCES]?: AngieModelPreferences;
	[ANGIE_EXTENDED_TIMEOUT]?: AngieExtendedTimeout;
	ui?: AngieToolUiMeta;
}

/**
 * Standard MCP tool annotations.
 * Use these in the `annotations` field of a tool.
 */
export interface AngieToolAnnotations {
	title?: string;
	destructiveHint?: boolean;
	readOnlyHint?: boolean;
}
