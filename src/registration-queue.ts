import { createChildLogger } from './logger';
import { ServerRegistration, AngieServerConfig } from './types';

const queueLogger = createChildLogger( 'registration-queue' );

export class RegistrationQueue {
  private queue: ServerRegistration[] = [];
  private isProcessing = false;

  public add(config: AngieServerConfig): ServerRegistration {
    const registration: ServerRegistration = {
      id: this.generateId( config ),
      config,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.queue.push(registration);
    queueLogger.log(`Added server "${config.name}" to queue`);
    
    return registration;
  }

  public getAll(): ServerRegistration[] {
    return [...this.queue];
  }

  public getPending(): ServerRegistration[] {
    return this.queue.filter(reg => reg.status === 'pending');
  }

  public updateStatus(id: string, status: ServerRegistration['status'], error?: string): void {
    const registration = this.queue.find(reg => reg.id === id);
    if (registration) {
      registration.status = status;
      if (error) {
        registration.error = error;
      } else if (status === 'pending' || status === 'registered') {
        // Clear error when status is updated to pending or registered without an error
        delete registration.error;
      }
      queueLogger.log(`Updated server ${id} status to ${status}`);
    }
  }

  public async processQueue(processor: (registration: ServerRegistration) => Promise<void>): Promise<void> {
    if (this.isProcessing) {
      queueLogger.log('Already processing queue');
      return;
    }

    this.isProcessing = true;
    const pendingRegistrations = this.getPending();

    queueLogger.log(`Processing ${pendingRegistrations.length} pending registrations`);

    try {
      for (const registration of pendingRegistrations) {
        try {
          await processor(registration);
          this.updateStatus(registration.id, 'registered');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.updateStatus(registration.id, 'failed', errorMessage);
          queueLogger.error(`Failed to process registration ${registration.id}:`, errorMessage);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public clear(): void {
    this.queue = [];
    queueLogger.log('Cleared all registrations');
  }

  public resetAllToPending(): boolean {
    if (this.isProcessing) {
      queueLogger.log('Cannot reset to pending - processing in progress');
      return false;
    }

    const registeredCount = this.queue.filter(reg => reg.status === 'registered').length;
    const failedCount = this.queue.filter(reg => reg.status === 'failed').length;
    
    this.queue.forEach(registration => {
      if (registration.status !== 'pending') {
        registration.status = 'pending';
        // Clear any error messages when resetting to pending
        delete registration.error;
      }
    });

    queueLogger.log(`Reset ${registeredCount + failedCount} registrations to pending`);
    return true;
  }

  public remove(id: string): boolean {
    const index = this.queue.findIndex(reg => reg.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      queueLogger.log(`Removed registration ${id}`);
      return true;
    }
    return false;
  }

  private generateId(config: AngieServerConfig): string {
    return `reg_${config.name}_${config.version}_${Date.now()}`;
  }
}
