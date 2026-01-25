import pino from 'pino';

const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});

// Wrapper to accept multiple parameters for error logging
// Parameters match the common pattern: logger.error(error, 'message')
export const logger = {
    error: (errorOrMessage: any, message?: string) => {
        if (message && typeof message === 'string') {
            // Called as logger.error(error, 'message')
            pinoLogger.error({ err: errorOrMessage }, message);
        } else {
            // Called as logger.error('message')
            pinoLogger.error(errorOrMessage);
        }
    },
    warn: (errorOrMessage: any, message?: string) => {
        if (message && typeof message === 'string') {
            pinoLogger.warn({ meta: errorOrMessage }, message);
        } else {
            pinoLogger.warn(errorOrMessage);
        }
    },
    info: (errorOrMessage: any, message?: string) => {
        if (message && typeof message === 'string') {
            pinoLogger.info({ meta: errorOrMessage }, message);
        } else {
            pinoLogger.info(errorOrMessage);
        }
    },
    debug: (errorOrMessage: any, message?: string) => {
        if (message && typeof message === 'string') {
            pinoLogger.debug({ meta: errorOrMessage }, message);
        } else {
            pinoLogger.debug(errorOrMessage);
        }
    },
};
