import { ServerRegistration, ClientCreationRequest, ClientCreationResponse, MessageEventType, AngieLocalServerTransport } from './types';

const TIMEOUT_MS = 15_000;

export class ClientManager {
  public async requestClientCreation(registration: ServerRegistration & { instanceId?: string }): Promise<ClientCreationResponse> {
    const { config } = registration;
    const request: ClientCreationRequest = {
      serverId: registration.id,
      serverName: config.name,
      serverTitle: config.title,
      serverVersion: config.version,
      description: config.description,
      transport: config.transport || AngieLocalServerTransport.POST_MESSAGE,
      capabilities: config.capabilities,
      instanceId: registration.instanceId
    };

    if ('type' in config && config.type === 'remote') {
      request.remote = {
        url: config.url,
      };
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Client creation request timed out after ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        resolve(event.data as ClientCreationResponse);
      };

      const message = {
        type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
        payload: request,
        timestamp: Date.now()
      };

      window.postMessage(message, window.location.origin, [channel.port2]);
    });
  }
}
