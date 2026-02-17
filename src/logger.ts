import { createLogger, type Logger, type LogLevel } from '@elementor/angie-logger';

const getLogLevel = (): LogLevel => {
	if ( process.env.NODE_ENV === 'production' ) {
		return 'error';
	}
	return 'debug';
};

const logger: Logger = createLogger( 'angie-sdk', { 
	color: '#00BCD4',
	logLevel: getLogLevel()
} );

export const createChildLogger = ( context: string | { instanceId: string } ): Logger => logger.extend( context );

export default logger;
