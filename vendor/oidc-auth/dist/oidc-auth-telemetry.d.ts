export type TelemetryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
export type OidcAuthTelemetryContext = {
    level?: TelemetryLevel;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
};
export interface OidcAuthTelemetry {
    message(message: string | object, context?: OidcAuthTelemetryContext): void;
    error(error: Error | string | object, context?: OidcAuthTelemetryContext): void;
}
