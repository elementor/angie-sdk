import { AngieLocalServerConfig, AngieLocalServerTransport, AngieRemoteServerConfig, AngieServerConfig, AngieServerType, MessageEventType, ServerRegistration } from './types';
import { AngieDetector } from './angie-detector';
import { RegistrationQueue } from './registration-queue';
import { ClientManager } from './client-manager';
import { BrowserContextTransport } from './browser-context-transport';

export class AngieMcpSdk {
  private angieDetector: AngieDetector;
  private registrationQueue: RegistrationQueue;
  private clientManager: ClientManager;
  private isInitialized = false;
  private instanceId: string;

  constructor() {
    // Generate unique instance ID to track multiple instances
    this.instanceId = Math.random().toString(36).substring(2, 8);
    console.log(`AngieMcpSdk: Constructor called - initializing SDK (Instance: ${this.instanceId})`);
    this.angieDetector = new AngieDetector();
    this.registrationQueue = new RegistrationQueue();
    this.clientManager = new ClientManager();
    
    console.log(`AngieMcpSdk: Setting up event handlers (Instance: ${this.instanceId})`);
    this.setupAngieReadyHandler();
    this.setupServerInitHandler();
    this.setupReRegistrationHandler();
    console.log(`AngieMcpSdk: SDK initialization complete (Instance: ${this.instanceId})`);
  }

  // listen to MessageEventType.SDK_ANGIE_READY_PING

  private setupReRegistrationHandler(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === MessageEventType.SDK_ANGIE_REFRESH_PING) {
        console.log(`AngieMcpSdk: Angie refresh ping received (Instance: ${this.instanceId})`);
        
        // Use the safe reset method that checks for concurrent processing
        const resetSuccessful = this.registrationQueue.resetAllToPending();
        
        if (resetSuccessful) {
          const pendingCount = this.registrationQueue.getPending().length;
          console.log(`AngieMcpSdk: Successfully reset ${pendingCount} registrations, processing queue (Instance: ${this.instanceId})`);
          this.handleAngieReady();
        } else {
          console.log(`AngieMcpSdk: Skipping queue reset - processing already in progress (Instance: ${this.instanceId})`);
        }
      }
    });
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
    console.log(`AngieMcpSdk: Angie is ready, processing queued registrations (Instance: ${this.instanceId})`);
    
    try {
      await this.registrationQueue.processQueue(async (registration) => {
        console.log(`AngieMcpSdk: processQueue callback called for "${registration.config.name}" (Instance: ${this.instanceId})`);
        await this.processRegistration(registration);
      });
      
      this.isInitialized = true;
      console.log(`AngieMcpSdk: Initialization complete (Instance: ${this.instanceId})`);
    } catch (error) {
      console.error(`AngieMcpSdk: Error processing registration queue (Instance: ${this.instanceId}):`, error);
    }
  }

  private async processRegistration(registration: ServerRegistration): Promise<void> {
    console.log(`AngieMcpSdk: Processing registration for server "${registration.config.name}" (ID: ${registration.id}) (Instance: ${this.instanceId})`);
    
    try {
      console.log(`AngieMcpSdk: Calling clientManager.requestClientCreation for "${registration.config.name}" (Instance: ${this.instanceId})`);
      // Include instance ID in the registration so server init can be routed back to the correct instance
      const registrationWithInstance = {
        ...registration,
        instanceId: this.instanceId
      };
      await this.clientManager.requestClientCreation(registrationWithInstance);
      console.log(`AngieMcpSdk: Successfully registered server "${registration.config.name}" (Instance: ${this.instanceId})`);
    } catch (error) {
      console.error(`AngieMcpSdk: Failed to register server "${registration.config.name}" (Instance: ${this.instanceId}):`, error);
      throw error;
    }
  }

  public registerLocalServer(config: AngieLocalServerConfig): Promise<void> {
    config.type = AngieServerType.LOCAL;
    config.transport = AngieLocalServerTransport.POST_MESSAGE;
    return this.registerServer(config);
  }

  public registerRemoteServer(config: AngieRemoteServerConfig): Promise<void> {
    config.type = AngieServerType.REMOTE;
    return this.registerServer(config);
  }

  public async registerServer(config: AngieServerConfig): Promise<void> {
    if (!config.type) {
      console.warn(`AngieMcpSdk: for a local server, please use registerLocalServer instead of registerServer`);
      this.registerLocalServer(config as AngieLocalServerConfig);
      return;
    }

    console.log(`AngieMcpSdk: registerServer called for "${config.name}" (Instance: ${this.instanceId})`);
    
    if (!config.name) {
      throw new Error('Server name is required');
    }

    if (!config.description) {
      throw new Error('Server description is required');
    }

    if (('type' in config && config.type === 'local' && !(config as any).server) ||
        (!('type' in config) && !(config as any).server)) {
      throw new Error('Server instance is required');
    }

    console.log(`AngieMcpSdk: Registering server "${config.name}" (Instance: ${this.instanceId})`);

    const registration = this.registrationQueue.add(config);
    console.log(`AngieMcpSdk: Added registration to queue: ${registration.id} (Instance: ${this.instanceId})`);

    if (this.angieDetector.isReady()) {
      try {
        await this.processRegistration(registration);
        this.registrationQueue.updateStatus(registration.id, 'registered');
        console.log(`AngieMcpSdk: Server "${config.name}" registered successfully (Instance: ${this.instanceId})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.registrationQueue.updateStatus(registration.id, 'failed', errorMessage);
        throw error;
      }
    } else {
      console.log(`AngieMcpSdk: Server "${config.name}" queued until Angie is ready (Instance: ${this.instanceId})`);
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
    console.log(`AngieMcpSdk: SDK destroyed (Instance: ${this.instanceId})`);
  }

  private setupServerInitHandler(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === MessageEventType.SDK_REQUEST_INIT_SERVER) {
        console.log(`AngieMcpSdk: Server init request received (Instance: ${this.instanceId})`);
        this.handleServerInitRequest(event);
      }
    });
  }

  private handleServerInitRequest(event: MessageEvent): void {
    const { clientId, serverId, instanceId } = event.data.payload || {};
    
    if (!clientId || !serverId) {
      console.error(`AngieMcpSdk: Invalid server init request - missing clientId or serverId (Instance: ${this.instanceId})`);
      return;
    }

    console.log(`AngieMcpSdk: Server init request received - Request instanceId: ${instanceId}, This instanceId: ${this.instanceId} (Instance: ${this.instanceId})`);

    // Check if this request is for this instance
    if (instanceId && instanceId !== this.instanceId) {
      console.log(`AngieMcpSdk: Ignoring server init request for different instance. Request instanceId: ${instanceId}, this instanceId: ${this.instanceId}`);
      return;
    }

    console.log(`AngieMcpSdk: Handling server init request for clientId: ${clientId}, serverId: ${serverId} (Instance: ${this.instanceId})`);

    try {
      // Find the registration by serverId
      const registration = this.registrationQueue.getAll().find(reg => reg.id === serverId);
      
      if (!registration) {
        console.error(`AngieMcpSdk: No registration found for serverId: ${serverId} (Instance: ${this.instanceId})`);
        return;
      }

      // For remote servers, Angie host connects directly. No local server connect is needed.
      if ('type' in registration.config && registration.config.type === 'remote') {
        console.log(`AngieMcpSdk: Remote server registration detected; skipping local connect (Instance: ${this.instanceId})`);
        return;
      }

      // Get the port from the message event
      const port = event.ports[0];
      if (!port) {
        console.error(`AngieMcpSdk: No port provided in server init request (Instance: ${this.instanceId})`);
        return;
      }

      // Connect the server using the provided port
      const server = (registration.config as AngieLocalServerConfig).server;
      const serverTransport = new BrowserContextTransport(port);
      server.connect(serverTransport);
      
      console.log(`AngieMcpSdk: Server "${registration.config.name}" initialized successfully (Instance: ${this.instanceId})`);
    } catch (error) {
      console.error(`AngieMcpSdk: Error initializing server for clientId ${clientId} (Instance: ${this.instanceId}):`, error);
    }
  }
}
