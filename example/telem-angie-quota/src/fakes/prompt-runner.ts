export class PromptRunner {
  private failingSites = new Set<string>();

  failForSite( siteId: string ): void {
    this.failingSites.add( siteId );
  }

  async run( siteId: string ): Promise<{ ok: true } | { ok: false; message: string }> {
    if ( this.failingSites.has( siteId ) ) {
      return { ok: false, message: 'downstream prompt runner unavailable' };
    }
    return { ok: true };
  }
}
