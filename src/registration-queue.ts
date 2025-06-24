import { ServerRegistration, AngieServerConfig } from './types';

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
    console.log(`RegistrationQueue: Added server "${config.name}" to queue`);
    
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
      }
      console.log(`RegistrationQueue: Updated server ${id} status to ${status}`);
    }
  }

  public async processQueue(processor: (registration: ServerRegistration) => Promise<void>): Promise<void> {
    if (this.isProcessing) {
      console.log('RegistrationQueue: Already processing queue');
      return;
    }

    this.isProcessing = true;
    const pendingRegistrations = this.getPending();

    console.log(`RegistrationQueue: Processing ${pendingRegistrations.length} pending registrations`);

    try {
      for (const registration of pendingRegistrations) {
        try {
          await processor(registration);
          this.updateStatus(registration.id, 'registered');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.updateStatus(registration.id, 'failed', errorMessage);
          console.error(`RegistrationQueue: Failed to process registration ${registration.id}:`, errorMessage);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public clear(): void {
    this.queue = [];
    console.log('RegistrationQueue: Cleared all registrations');
  }

  public remove(id: string): boolean {
    const index = this.queue.findIndex(reg => reg.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`RegistrationQueue: Removed registration ${id}`);
      return true;
    }
    return false;
  }

  private generateId(config: AngieServerConfig): string {
    return `reg_${config.name}_${config.version}_${Date.now()}`;
  }
}
