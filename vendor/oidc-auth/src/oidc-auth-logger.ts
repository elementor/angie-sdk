import { createLogger } from '@elementor/angie-logger';

export const logger = createLogger( 'oidc-auth', { color: 'green' } );

export const createChildLogger = ( context: string ) => logger.extend( context );
