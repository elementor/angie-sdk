export class FeatureFlags {
  private flags = new Map<string, boolean>();

  set( flag: string, enabled: boolean ): void {
    this.flags.set( flag, enabled );
  }

  isEnabled( flag: string ): boolean {
    return this.flags.get( flag ) ?? true;
  }
}
