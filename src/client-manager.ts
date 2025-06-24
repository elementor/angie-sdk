import { ServerRegistration, ClientCreationRequest, ClientCreationResponse, MessageEventType, AngieMCPTransport } from './types';

const TIMEOUT_MS = 10_000;

export class ClientManager {
  public async requestClientCreation(registration: ServerRegistration): Promise<ClientCreationResponse> {
    const { config } = registration;
    const request: ClientCreationRequest = {
      serverId: registration.id,
      serverName: config.name,
      serverVersion: config.version,
      description: config.description,
      transport: AngieMCPTransport.POST_MESSAGE,
      capabilities: config.capabilities
    };

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
