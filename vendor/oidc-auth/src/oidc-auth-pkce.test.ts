import { beforeEach, describe, expect, it } from '@jest/globals';
import {
	loadOidcCallbackHandoff,
	OIDC_CALLBACK_HANDOFF_STORAGE_KEY,
	storeOidcCallbackHandoff,
} from './oidc-auth-pkce';

describe('oidc-auth callback handoff', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it('should persist callback handoff in sessionStorage for the same top-level tab', () => {
		const handoff = {
			topOrigin: 'https://customer.example',
			topWpUrl: 'https://customer.example/wp-admin/',
		};
		storeOidcCallbackHandoff(handoff);

		expect(sessionStorage.getItem(OIDC_CALLBACK_HANDOFF_STORAGE_KEY)).toBeTruthy();
		expect(loadOidcCallbackHandoff()).toEqual(handoff);
	});
});
