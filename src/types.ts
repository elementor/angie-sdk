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
  title?: string;
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

export interface AngieMessage<T = unknown> {
  type: string;
  payload: T;
  origin?: string;
  timestamp: number;
}

export interface ClientCreationRequest {
  serverId: string;
  serverName: string;
  serverTitle?: string;
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

export interface AngieTriggerRequest {
  prompt?: string;
  context:{
    source?: string;
  }& Record<string, any>;
  options?: {
    timeout?: number;
  };
}

export interface AngieTriggerResponse {
  success: boolean;
  response?: string;
  error?: string;
  requestId: string;
}


export enum MessageEventType {
  SDK_ANGIE_READY_PING = 'sdk-angie-ready-ping',
  SDK_ANGIE_REFRESH_PING = 'sdk-angie-refresh-ping',
  SDK_ANGIE_ALL_SERVERS_REGISTERED = 'sdk-angie-all-servers-registered',
  SDK_REQUEST_CLIENT_CREATION = 'sdk-request-client-creation',
  SDK_REQUEST_INIT_SERVER = 'sdk-request-init-server',
  SDK_TRIGGER_ANGIE = 'sdk-trigger-angie',
  SDK_TRIGGER_ANGIE_RESPONSE = 'sdk-trigger-angie-response',

  ANGIE_SIDEBAR_RESIZED = 'angie-sidebar-resized',
  ANGIE_SIDEBAR_TOGGLED = 'angie-sidebar-toggled',
  ANGIE_CHAT_TOGGLE = 'angie-chat-toggle',
  ANGIE_STUDIO_TOGGLE = 'angie-studio-toggle',
  ANGIE_NAVIGATE_TO_URL = 'angie/navigate-to-url',
  ANGIE_PAGE_RELOAD = 'angie/page-reload',
  ANGIE_DISABLE_NAVIGATION_PREVENTION = 'angie/disable-navigation-prevention',
  ANGIE_NAVIGATE_AFTER_RESPONSE = 'angie/navigate-after-response',
}


export enum HostLocalStorageEventType {
	SET = 'ANGIE_SET_LOCALSTORAGE',
	GET = 'ANGIE_GET_LOCALSTORAGE',
}

export enum HostEventType {
	RESET_HASH = 'reset-hash',
	HOST_READY = 'host/ready',
	ANGIE_LOADED = 'angie/loaded',
	ANGIE_READY = 'angie/ready',
}
