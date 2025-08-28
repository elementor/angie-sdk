import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

// Backward compatibility
export enum AngieMCPTransport {
  POST_MESSAGE = 'postMessage',
}

export enum AngieLocalServerTransport  {
  POST_MESSAGE = 'postMessage',
}

export enum AngieRemoteServerTransport {
  STREAMABLE_HTTP = 'streamableHttp',
  SSE = 'sse',
}

export enum AngieServerType {
  LOCAL = 'local',
  REMOTE = 'remote',
}

export type AngieBaseServerConfig = {
  name: string;
  version: string;
  description: string;
  capabilities?: ServerCapabilities;
  type?: AngieServerType;
}

export type AngieLocalServerConfig = AngieBaseServerConfig & {
  server: Server | McpServer;
  transport?: AngieLocalServerTransport;
  type?: AngieServerType.LOCAL;
}

export type AngieRemoteServerConfig = AngieBaseServerConfig & {
  url: string;
  transport?: AngieRemoteServerTransport;
  type?: AngieServerType.REMOTE;
}

export type AngieServerConfig = AngieLocalServerConfig  | AngieRemoteServerConfig;

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
  transport?: AngieLocalServerTransport | AngieRemoteServerTransport;
  capabilities?: ServerCapabilities;
  instanceId?: string;
  // Remote server support
  remote?: {
    url: string;
  };
}

export interface ClientCreationResponse {
  success: boolean;
  clientId?: string;
  error?: string;
}

export enum MessageEventType {
  SDK_ANGIE_READY_PING = 'sdk-angie-ready-ping',
  SDK_ANGIE_REFRESH_PING = 'sdk-angie-refresh-ping',
  SDK_REQUEST_CLIENT_CREATION = 'sdk-request-client-creation',
  SDK_REQUEST_INIT_SERVER = 'sdk-request-init-server',
}