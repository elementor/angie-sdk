export const ANGIE_REQUIRED_RESOURCES = 'angie/requiredResources' as const;
export const ANGIE_MODEL_PREFERENCES = 'angie/modelPreferences' as const;
export const ANGIE_EXTENDED_TIMEOUT = 'angie/extendedTimeout' as const;
export const MCP_READONLY = 'readOnlyHint' as const;

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
