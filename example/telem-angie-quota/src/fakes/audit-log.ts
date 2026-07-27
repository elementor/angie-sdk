import type { AuditEvent } from '../types.js';
import { FakeClock } from './clock.js';

export class AuditLog {
  private events: AuditEvent[] = [];

  constructor( private readonly clock: FakeClock ) {}

  record( type: string, siteId: string, payload?: Record<string, unknown> ): void {
    this.events.push( {
      type,
      siteId,
      at: this.clock.getNow(),
      payload,
    } );
  }

  hasEvent( type: string, siteId: string ): boolean {
    return this.events.some( ( event ) => event.type === type && event.siteId === siteId );
  }

  countEvent( type: string, siteId: string ): number {
    return this.events.filter( ( event ) => event.type === type && event.siteId === siteId ).length;
  }

  all(): AuditEvent[] {
    return [ ...this.events ];
  }

  clear(): void {
    this.events = [];
  }
}
