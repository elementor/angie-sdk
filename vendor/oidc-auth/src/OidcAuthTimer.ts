import { MIN_TOKEN_EXPIRING_NOTIFICATION_SECONDS } from './oidc-auth-consts';
import { createChildLogger } from './oidc-auth-logger';

const logger = createChildLogger('oidc-auth:OidcAuthTimer');

export class OidcAuthTimer {
    private timerHandle: ReturnType<typeof setTimeout> | null = null;
    private expiration: number | null = null;
    private initialized = false;
    private callback: () => void = () => { };

    constructor() {
        this.timerHandle = null;
    }

    public init(expiresAt: number, notificationTimeInSeconds: number, callback: () => Promise<void>): void {
        const nowInSeconds = this.getEpochTime();
        const expiresIn = expiresAt - nowInSeconds;
        const expiration = Math.max(expiresIn - notificationTimeInSeconds, MIN_TOKEN_EXPIRING_NOTIFICATION_SECONDS);

        this.cancel();

        this.expiration = expiration;
        this.callback = callback;

        logger.debug("OIDC: timer - using expiration", expiration, expiresIn, notificationTimeInSeconds, expiresAt, expiresIn - notificationTimeInSeconds);
        this.timerHandle = setTimeout(this.callback, expiration * 1000);
        this.initialized = true;
    }

    cancel(): void {
        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
        this.expiration = null;
    }

    private getEpochTime(): number {
        return Math.floor(Date.now() / 1000);
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}