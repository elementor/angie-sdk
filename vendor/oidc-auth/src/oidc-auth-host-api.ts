import { createChildLogger } from './oidc-auth-logger';
import { oidcAuthConfig } from './OidcAuthConfig';
import type { AskHostMessageObject } from './oidc-auth-types';

const logger = createChildLogger('oidc-auth:host-api');

const HOST_MESSAGE_TIMEOUT_MS = 10_000;

function isAllowedOrigin(origin: string): boolean {
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
        return false;
    }

    const allowedOrigins = oidcAuthConfig.getAllowedParentOrigins();
    if (!allowedOrigins || allowedOrigins.length === 0) {
        return true;
    }

    return allowedOrigins.includes(origin);
}

export const askHost = async <T>(message: AskHostMessageObject): Promise<T> => {
    return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();
        let settled = false;

        const cleanup = () => {
            settled = true;
            messageChannel.port1.close();
        };

        const timeoutId = setTimeout(() => {
            if (!settled) {
                cleanup();
                reject(new Error(`Host message timeout: ${message.type}`));
            }
        }, HOST_MESSAGE_TIMEOUT_MS);

        messageChannel.port1.onmessage = (event) => {
            clearTimeout(timeoutId);
            cleanup();

            if (event.data.status === 'success') {
                resolve(event.data.payload as T);
                return;
            }

            reject(event.data.payload);
        };

        const urlSearchParams = new URLSearchParams(window.location.search);
        const origin = urlSearchParams.get('origin');
        const hostOrigin = origin || '';

        if (!isAllowedOrigin(hostOrigin)) {
            clearTimeout(timeoutId);
            cleanup();
            reject(new Error('Origin not allowed'));
            return;
        }

        logger.debug('posting message to host', message);

        window.top!.postMessage({
            type: message.type,
            payload: message.payload,
            ...(message.data || {}),
        }, hostOrigin, [messageChannel.port2]);
    });
};
