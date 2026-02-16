import { createChildLogger } from './logger';
import { AngieDetectionResult, MessageEventType } from './types';

const detectorLogger = createChildLogger('angie-detector');

export class AngieDetector {
  private isAngieReady = false;
  private readyPromise: Promise<AngieDetectionResult>;
  private readyResolve?: (result: AngieDetectionResult) => void;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    if (typeof window === 'undefined') {
      return;
    }

    const maxAttempts = 500;
    let attempts = 0;

    const ping = () => {
      if (this.isAngieReady || attempts >= maxAttempts) {
        if (!this.isAngieReady && attempts >= maxAttempts) {
          this.handleDetectionTimeout();
        }
        return;
      }

      const channel = new MessageChannel();

      const cleanup = () => {
        channel.port1.close();
        channel.port2.close();
      };

      channel.port1.onmessage = (event) => {
        this.handleAngieReady(event.data);
        cleanup();
      };

      const message = {
        type: MessageEventType.SDK_ANGIE_READY_PING,
        timestamp: Date.now(),
      };

      window.postMessage(message, window.location.origin, [channel.port2]);
      attempts++;
      setTimeout(ping, 500);
    };

    ping();
  }

  private handleAngieReady(data: any): void {
    this.isAngieReady = true;
    const result: AngieDetectionResult = {
      isReady: true,
      version: data.version,
      capabilities: data.capabilities,
    };
    if (this.readyResolve) {
      this.readyResolve(result);
    }
  }

  private handleDetectionTimeout(): void {
    const result: AngieDetectionResult = {
      isReady: false,
    };
    if (this.readyResolve) {
      this.readyResolve(result);
    }
    detectorLogger.warn('Detection timeout - Angie may not be available');
  }

  public isReady(): boolean {
    return this.isAngieReady;
  }

  public async waitForReady(): Promise<AngieDetectionResult> {
    return this.readyPromise;
  }
}
