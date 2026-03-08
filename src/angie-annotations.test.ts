import { describe, expect, it } from '@jest/globals';
import {
	ANGIE_REQUIRED_RESOURCES,
	ANGIE_MODEL_PREFERENCES,
	ANGIE_EXTENDED_TIMEOUT,
	MCP_READONLY,
} from './angie-annotations';

describe('angie-annotations', () => {
	it('ANGIE_REQUIRED_RESOURCES has the correct value', () => {
		expect(ANGIE_REQUIRED_RESOURCES).toBe('angie/requiredResources');
	});

	it('ANGIE_MODEL_PREFERENCES has the correct value', () => {
		expect(ANGIE_MODEL_PREFERENCES).toBe('angie/modelPreferences');
	});

	it('ANGIE_EXTENDED_TIMEOUT has the correct value', () => {
		expect(ANGIE_EXTENDED_TIMEOUT).toBe('angie/extendedTimeout');
	});

	it('MCP_READONLY has the correct value', () => {
		expect(MCP_READONLY).toBe('readOnlyHint');
	});
});
