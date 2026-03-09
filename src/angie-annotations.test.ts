import { describe, expect, it } from '@jest/globals';
import {
	ANGIE_REQUIRED_RESOURCES,
	ANGIE_MODEL_PREFERENCES,
	ANGIE_EXTENDED_TIMEOUT,
	MCP_READONLY,
	AngieToolMeta,
	AngieToolAnnotations,
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

	it('AngieToolMeta interface accepts valid custom metadata', () => {
		const meta: AngieToolMeta = {
			[ANGIE_REQUIRED_RESOURCES]: [{ uri: 'resource://test', whenToUse: 'always' }],
			[ANGIE_MODEL_PREFERENCES]: { intelligencePriority: 0.8 },
			[ANGIE_EXTENDED_TIMEOUT]: { timeoutMs: 60000 },
		};
		expect(meta[ANGIE_REQUIRED_RESOURCES]).toHaveLength(1);
		expect(meta[ANGIE_MODEL_PREFERENCES]?.intelligencePriority).toBe(0.8);
		expect(meta[ANGIE_EXTENDED_TIMEOUT]?.timeoutMs).toBe(60000);
	});

	it('AngieToolAnnotations interface accepts standard MCP annotations', () => {
		const annotations: AngieToolAnnotations = {
			title: 'My Tool',
			readOnlyHint: true,
			destructiveHint: false,
		};
		expect(annotations.title).toBe('My Tool');
		expect(annotations.readOnlyHint).toBe(true);
		expect(annotations.destructiveHint).toBe(false);
	});
});
