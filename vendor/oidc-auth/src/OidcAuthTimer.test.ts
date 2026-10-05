import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';

jest.mock('./oidc-auth-logger', () => ({
    createChildLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
    }),
}));

import { OidcAuthTimer } from './OidcAuthTimer';

describe('OidcAuthTimer', () => {
    let timer: OidcAuthTimer;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
        timer = new OidcAuthTimer();
    });

    afterEach(() => {
        timer.cancel();
        jest.useRealTimers();
    });

    describe('init', () => {
        it('should schedule callback based on expiration minus notification time', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);
            const expiresAt = nowEpoch + 300;
            const notificationTime = 60;

            // Act
            timer.init(expiresAt, notificationTime, callback);

            // Assert - callback should fire at (300 - 60) = 240 seconds
            jest.advanceTimersByTime(239_000);
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1_000);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should use minimum 10 seconds when computed expiration is lower', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);
            const expiresAt = nowEpoch + 5;
            const notificationTime = 60;

            // Act
            timer.init(expiresAt, notificationTime, callback);

            // Assert - should clamp to 10 seconds minimum
            jest.advanceTimersByTime(9_000);
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1_000);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should cancel previous timer when re-initialized', () => {
            // Arrange
            const firstCallback = jest.fn<() => Promise<void>>();
            const secondCallback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);

            // Act
            timer.init(nowEpoch + 100, 0, firstCallback);
            timer.init(nowEpoch + 200, 0, secondCallback);

            // Assert - first callback should never fire
            jest.advanceTimersByTime(100_000);
            expect(firstCallback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100_000);
            expect(secondCallback).toHaveBeenCalledTimes(1);
        });

        it('should mark timer as initialized', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);

            // Act
            timer.init(nowEpoch + 120, 30, callback);

            // Assert
            expect(timer.isInitialized()).toBe(true);
        });
    });

    describe('cancel', () => {
        it('should prevent callback from firing', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);
            timer.init(nowEpoch + 60, 0, callback);

            // Act
            timer.cancel();

            // Assert
            jest.advanceTimersByTime(120_000);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should be safe to call when no timer is active', () => {
            // Act & Assert
            expect(() => timer.cancel()).not.toThrow();
        });

        it('should be safe to call multiple times', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);
            timer.init(nowEpoch + 60, 0, callback);

            // Act & Assert
            expect(() => {
                timer.cancel();
                timer.cancel();
            }).not.toThrow();
        });
    });

    describe('isInitialized', () => {
        it('should return false before init is called', () => {
            // Assert
            expect(timer.isInitialized()).toBe(false);
        });

        it('should return true after init is called', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);

            // Act
            timer.init(nowEpoch + 120, 30, callback);

            // Assert
            expect(timer.isInitialized()).toBe(true);
        });

        it('should remain true after cancel', () => {
            // Arrange
            const callback = jest.fn<() => Promise<void>>();
            const nowEpoch = Math.floor(Date.now() / 1000);
            timer.init(nowEpoch + 120, 30, callback);

            // Act
            timer.cancel();

            // Assert
            expect(timer.isInitialized()).toBe(true);
        });
    });
});
