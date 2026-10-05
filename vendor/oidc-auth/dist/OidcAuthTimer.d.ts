export declare class OidcAuthTimer {
    private timerHandle;
    private expiration;
    private initialized;
    private callback;
    constructor();
    init(expiresAt: number, notificationTimeInSeconds: number, callback: () => Promise<void>): void;
    cancel(): void;
    private getEpochTime;
    isInitialized(): boolean;
}
