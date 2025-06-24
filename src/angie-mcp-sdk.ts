import { AngieServerConfig, MessageEventType, ServerRegistration } from './types';
import { AngieDetector } from './angie-detector';
import { RegistrationQueue } from './registration-queue';
import { ClientManager } from './client-manager';
import { BrowserContextTransport } from './browser-context-transport';

export class AngieMcpSdk {
  private angieDetector: AngieDetector;
  private registrationQueue: RegistrationQueue;
  private clientManager: ClientManager;
  private isInitialized = false;

  constructor() {
    this.angieDetector = new AngieDetector();
    this.registrationQueue = new RegistrationQueue();
    this.clientManager = new ClientManager();
    
    this.setupAngieReadyHandler();
    this.setupServerInitHandler();
  }

  private setupAngieReadyHandler(): void {
    this.angieDetector.waitForReady().then((result) => {
      if (result.isReady) {
        this.handleAngieReady();
      } else {
        console.warn('AngieMcpSdk: Angie not detected - servers will remain queued');
      }
    }).catch((error) => {
      console.error('AngieMcpSdk: Error waiting for Angie:', error);
    });
  }

  private async handleAngieReady(): Promise<void> {
    console.log('AngieMcpSdk: Angie is ready, processing queued registrations');
    
    try {
      await this.registrationQueue.processQueue(async (registration) => {
        await this.processRegistration(registration);
      });
      
      this.isInitialized = true;
      console.log('AngieMcpSdk: Initialization complete');
    } catch (error) {
      console.error('AngieMcpSdk: Error processing registration queue:', error);
    }
  }

  private async processRegistration(registration: ServerRegistration): Promise<void> {
    console.log(`AngieMcpSdk: Processing registration for server "${registration.config.name}"`);
    
    try {
      await this.clientManager.requestClientCreation(registration);
      console.log(`AngieMcpSdk: Successfully registered server "${registration.config.name}"`);
    } catch (error) {
      console.error(`AngieMcpSdk: Failed to register server "${registration.config.name}":`, error);
      throw error;
    }
  }

  public async registerServer(config: AngieServerConfig): Promise<void> {
    if (!config.server) {
      throw new Error('Server instance is required');
    }

    if (!config.name) {
      throw new Error('Server name is required');
    }

    if (!config.description) {
      throw new Error('Server description is required');
    }

    console.log(`AngieMcpSdk: Registering server "${config.name}"`);

    const registration = this.registrationQueue.add(config);

    if (this.angieDetector.isReady()) {
      try {
        await this.processRegistration(registration);
        this.registrationQueue.updateStatus(registration.id, 'registered');
        console.log(`AngieMcpSdk: Server "${config.name}" registered successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.registrationQueue.updateStatus(registration.id, 'failed', errorMessage);
        throw error;
      }
    } else {
      console.log(`AngieMcpSdk: Server "${config.name}" queued until Angie is ready`);
    }
  }

  public getRegistrations(): ServerRegistration[] {
    return this.registrationQueue.getAll();
  }

  public getPendingRegistrations(): ServerRegistration[] {
    return this.registrationQueue.getPending();
  }

  public isAngieReady(): boolean {
    return this.angieDetector.isReady();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async waitForReady(): Promise<void> {
    const result = await this.angieDetector.waitForReady();
    if (!result.isReady) {
      throw new Error('Angie is not available');
    }
    
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  public destroy(): void {
    this.registrationQueue.clear();
    console.log('AngieMcpSdk: SDK destroyed');
  }

  private setupServerInitHandler(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === MessageEventType.SDK_REQUEST_INIT_SERVER) {
        this.handleServerInitRequest(event);
      }
    });
  }

  private handleServerInitRequest(event: MessageEvent): void {
    const { clientId, serverId } = event.data.payload || {};
    
    if (!clientId || !serverId) {
      console.error('AngieMcpSdk: Invalid server init request - missing clientId or serverId');
      return;
    }

    console.log(`AngieMcpSdk: Handling server init request for clientId: ${clientId}, serverId: ${serverId}`);

    try {
      // Find the registration by serverId
      const registration = this.registrationQueue.getAll().find(reg => reg.id === serverId);
      
      if (!registration) {
        console.error(`AngieMcpSdk: No registration found for serverId: ${serverId}`);
        return;
      }

      // Get the port from the message event
      const port = event.ports[0];
      if (!port) {
        console.error('AngieMcpSdk: No port provided in server init request');
        return;
      }

      // Connect the server using the provided port
      const server = registration.config.server;
      const serverTransport = new BrowserContextTransport(port);
      server.connect(serverTransport);
      
      console.log(`AngieMcpSdk: Server "${registration.config.name}" initialized successfully`);
    } catch (error) {
      console.error(`AngieMcpSdk: Error initializing server for clientId ${clientId}:`, error);
    }
  }
}
