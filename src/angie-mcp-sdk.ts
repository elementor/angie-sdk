import type { Logger } from '@elementor/angie-logger';
import { AngieDetector } from './angie-detector';
import { BrowserContextTransport } from './browser-context-transport';
import { ClientManager } from './client-manager';
import { createChildLogger } from './logger';
import { openIframe } from './iframe';
import { initAngieSidebar } from './sidebar';
import { RegistrationQueue } from './registration-queue';
import { AngieLocalServerConfig, AngieLocalServerTransport, AngieRemoteServerConfig, AngieServerConfig, AngieServerType, MessageEventType, ServerRegistration, AngieTriggerRequest, AngieTriggerResponse } from './types';

export type AngieMcpSdkOptions = {
  origin?: string;
  uiTheme?: string;
  isRTL?: boolean;
};

export class AngieMcpSdk {
  private angieDetector: AngieDetector;
  private clientManager: ClientManager;
  private logger: Logger;
  private registrationQueue: RegistrationQueue;
  private isInitialized = false;
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 8);
    this.logger = createChildLogger({ instanceId: this.instanceId });
    this.logger.log('Constructor called - initializing SDK');
    this.angieDetector = new AngieDetector();
    this.registrationQueue = new RegistrationQueue();
    this.clientManager = new ClientManager();
    this.logger.log('Setting up event handlers');
    this.setupAngieReadyHandler();
    this.setupServerInitHandler();
    this.setupReRegistrationHandler();
    this.logger.log('SDK initialization complete');
  }

  public async loadSidebar( options?: AngieMcpSdkOptions ): Promise<void> {
    initAngieSidebar();
    await openIframe({
      origin: options?.origin || 'https://angie.elementor.com',
      uiTheme: options?.uiTheme || 'light',
      isRTL: options?.isRTL || false,
      ...options,
    });
    this.setupPromptHashDetection();
  }

  // listen to MessageEventType.SDK_ANGIE_READY_PING

  private setupReRegistrationHandler(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === MessageEventType.SDK_ANGIE_REFRESH_PING) {
        this.logger.log('Angie refresh ping received');
        
        // Use the safe reset method that checks for concurrent processing
        const resetSuccessful = this.registrationQueue.resetAllToPending();
        
        if (resetSuccessful) {
          const pendingCount = this.registrationQueue.getPending().length;
          this.logger.log(`Successfully reset ${pendingCount} registrations, processing queue`);
          this.handleAngieReady();
        } else {
          this.logger.log('Skipping queue reset - processing already in progress');
        }
      }
    });
  }

  private setupAngieReadyHandler(): void {
    this.angieDetector.waitForReady().then((result) => {
      if (result.isReady) {
        this.handleAngieReady();
      } else {
        this.logger.warn('Angie not detected - servers will remain queued');
      }
    }).catch((error) => {
      this.logger.error('Error waiting for Angie:', error);
    });
  }

  private async handleAngieReady(): Promise<void> {
    this.logger.log('Angie is ready, processing queued registrations');
    
    try {
      await this.registrationQueue.processQueue(async (registration) => {
        this.logger.log(`processQueue callback called for "${registration.config.name}"`);
        await this.processRegistration(registration);
      });
      
      this.isInitialized = true;
      this.logger.log('Initialization complete');
    } catch (error) {
      this.logger.error('Error processing registration queue:', error);
    }
  }

  private async processRegistration(registration: ServerRegistration): Promise<void> {
    this.logger.log(`Processing registration for server "${registration.config.name}" (ID: ${registration.id})`);
    
    try {
      this.logger.log(`Calling clientManager.requestClientCreation for "${registration.config.name}"`);
      // Include instance ID in the registration so server init can be routed back to the correct instance
      const registrationWithInstance = {
        ...registration,
        instanceId: this.instanceId
      };
      await this.clientManager.requestClientCreation(registrationWithInstance);
      this.logger.log(`Successfully registered server "${registration.config.name}"`);
    } catch (error) {
      this.logger.error(`Failed to register server "${registration.config.name}":`, error);
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

  private isLocalServerConfig(config: AngieServerConfig): config is AngieLocalServerConfig {
    return config.type === AngieServerType.LOCAL || (!config.type && 'server' in config);
  }

  private isRemoteServerConfig(config: AngieServerConfig): config is AngieRemoteServerConfig {
    return config.type === AngieServerType.REMOTE && 'url' in config;
  }

  public async registerServer(config: AngieServerConfig): Promise<void> {
    if (!config.type) {
      this.logger.warn('For a local server, please use registerLocalServer instead of registerServer');
      this.registerLocalServer(config as AngieLocalServerConfig);
      return;
    }

    this.logger.log(`registerServer called for "${config.name}"`);
    
    if (!config.name) {
      throw new Error('Server name is required');
    }

    if (!config.description) {
      throw new Error('Server description is required');
    }

    // Check if it's a local server config and validate server instance
    if (this.isLocalServerConfig(config) && !config.server) {
      throw new Error('Server instance is required for local servers');
    }

    this.logger.log(`Registering server "${config.name}"`);

    const registration = this.registrationQueue.add(config);
    this.logger.log(`Added registration to queue: ${registration.id}`);

    if (this.angieDetector.isReady()) {
      try {
        await this.processRegistration(registration);
        this.registrationQueue.updateStatus(registration.id, 'registered');
        this.logger.log(`Server "${config.name}" registered successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.registrationQueue.updateStatus(registration.id, 'failed', errorMessage);
        throw error;
      }
    } else {
      this.logger.log(`Server "${config.name}" queued until Angie is ready`);
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

  /**
   * Triggers Angie with a specified prompt and optional context
   * @param request - The trigger request containing prompt and optional context
   * @returns Promise resolving to Angie's response
   */
  public async triggerAngie(request: AngieTriggerRequest): Promise<AngieTriggerResponse> {
    if (!this.isAngieReady()) {
      throw new Error('Angie is not ready. Please wait for Angie to be available before triggering.');
    }

    const requestId = this.generateRequestId();
    const timeout = request.options?.timeout || 30000;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Angie trigger request timed out'));
      }, timeout);

      const responseHandler = (event: MessageEvent) => {
        if (event.data?.type === MessageEventType.SDK_TRIGGER_ANGIE_RESPONSE && 
            event.data?.payload?.requestId === requestId) {
          clearTimeout(timeoutId);
          window.removeEventListener('message', responseHandler);
          resolve(event.data.payload as AngieTriggerResponse);
        }
      };

      window.addEventListener('message', responseHandler);

      // Send the trigger request
      const message = {
        type: MessageEventType.SDK_TRIGGER_ANGIE,
        payload: {
          requestId,
          prompt: request.prompt,
          options: request.options,
          context: {
            pageUrl: window.location.href,
            pageTitle: document.title,
            ...request.context
          }
        },
        timestamp: Date.now()
      };

      this.logger.log(`Triggering Angie with prompt (Request ID: ${requestId})`);
      window.postMessage(message, window.location.origin);
    });
  }

  
  public destroy(): void {
    this.registrationQueue.clear();
    this.logger.log('SDK destroyed');
  }

  private setupServerInitHandler(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === MessageEventType.SDK_REQUEST_INIT_SERVER) {
        this.logger.log('Server init request received');
        this.handleServerInitRequest(event);
      }
    });
  }

  private handleServerInitRequest(event: MessageEvent): void {
    const { clientId, serverId, instanceId } = event.data.payload || {};
    
    if (!clientId || !serverId) {
      this.logger.error('Invalid server init request - missing clientId or serverId');
      return;
    }

    this.logger.log(`Server init request received - Request instanceId: ${instanceId}, This instanceId: ${this.instanceId}`);

    // Check if this request is for this instance
    if (instanceId && instanceId !== this.instanceId) {
      this.logger.log(`Ignoring server init request for different instance. Request instanceId: ${instanceId}, this instanceId: ${this.instanceId}`);
      return;
    }

    this.logger.log(`Handling server init request for clientId: ${clientId}, serverId: ${serverId}`);

    try {
      // Find the registration by serverId
      const registration = this.registrationQueue.getAll().find(reg => reg.id === serverId);
      
      if (!registration) {
        this.logger.error(`No registration found for serverId: ${serverId}`);
        return;
      }

      // For remote servers, Angie host connects directly. No local server connect is needed.
      if ('type' in registration.config && registration.config.type === 'remote') {
        this.logger.log('Remote server registration detected; skipping local connect');
        return;
      }

      // Get the port from the message event
      const port = event.ports[0];
      if (!port) {
        this.logger.error('No port provided in server init request');
        return;
      }

      // Connect the server using the provided port
      const server = (registration.config as AngieLocalServerConfig).server;
      const serverTransport = new BrowserContextTransport(port);
      server.connect(serverTransport);
      
      this.logger.log(`Server "${registration.config.name}" initialized successfully`);
    } catch (error) {
      this.logger.error(`Error initializing server for clientId ${clientId}:`, error);
    }
  }

  private generateRequestId(): string {
    return `${this.instanceId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private async handlePromptHash(): Promise<void> {
    const hash = window.location.hash;

    if (!hash.startsWith('#angie-prompt=')) {
      return;
    }

    try {
      const promptEncoded = hash.replace('#angie-prompt=', '');
      const prompt = decodeURIComponent(promptEncoded);

      if (!prompt) {
        this.logger.warn('Empty prompt detected in hash');
        return;
      }

      this.logger.log('Detected prompt in hash:', prompt);

      await this.waitForReady();

      const response = await this.triggerAngie({
        prompt,
        context: {
          source: 'hash-parameter',
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log('Triggered successfully from hash:', response);

      window.location.hash = '';
    } catch (error) {
      this.logger.error('Failed to trigger from hash:', error);
    }
  }

  private setupPromptHashDetection(): void {
    this.handlePromptHash();
    window.addEventListener('hashchange', () => this.handlePromptHash());
  }
}
