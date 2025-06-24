import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

export enum AngieMCPTransport {
  POST_MESSAGE = 'postMessage',
}

export interface AngieServerConfig {
  name: string;
  version: string;
  description: string;
  server: Server | McpServer;
  capabilities?: ServerCapabilities;
}

export interface ServerRegistration {
  id: string;
  config: AngieServerConfig;
  timestamp: number;
  status: 'pending' | 'registered' | 'failed';
  error?: string;
}

export interface AngieDetectionResult {
  isReady: boolean;
  version?: string;
  capabilities?: string[];
}

export interface AngieMessage {
  type: string;
  payload: any;
  origin?: string;
  timestamp: number;
}

export interface ClientCreationRequest {
  serverId: string;
  serverName: string;
  description: string;
  serverVersion: string;
  transport: string;
  capabilities?: ServerCapabilities;
}

export interface ClientCreationResponse {
  success: boolean;
  clientId?: string;
  error?: string;
}

export enum MessageEventType {
  SDK_ANGIE_READY_PING = 'sdk-angie-ready-ping',
  SDK_REQUEST_CLIENT_CREATION = 'sdk-request-client-creation',
  SDK_REQUEST_INIT_SERVER = 'sdk-request-init-server',
}