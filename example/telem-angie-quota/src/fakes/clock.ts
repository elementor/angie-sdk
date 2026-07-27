export class FakeClock {
  private now: Date;

  constructor( iso: string ) {
    this.now = new Date( iso );
  }

  getNow(): Date {
    return new Date( this.now );
  }

  set( iso: string ): void {
    this.now = new Date( iso );
  }

  advanceTo( iso: string ): void {
    const next = new Date( iso );
    if ( next.getTime() < this.now.getTime() ) {
      throw new Error( `Clock cannot move backwards: ${ iso }` );
    }
    this.now = next;
  }
}

export function endOfMonth( date: Date ): Date {
  return new Date( Date.UTC( date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999 ) );
}

export function startOfMonth( date: Date ): Date {
  return new Date( Date.UTC( date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0 ) );
}
