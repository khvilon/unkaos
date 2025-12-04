"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
// Определяем уровни логирования в зависимости от окружения
const isDev = process.env.NODE_ENV === 'dev';
const transport = pino_1.default.transport({
    targets: [
        {
            target: 'pino-pretty',
            level: isDev ? 'debug' : 'info',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        },
        {
            target: 'pino-loki',
            level: isDev ? 'debug' : 'info',
            options: {
                host: 'http://loki:3100',
                labels: { app: 'unkaos' },
                batching: true,
                interval: 5
            }
        }
    ]
});
transport.on('ready', () => {
    console.log('Transport is ready');
});
transport.on('connect', () => {
    console.log('Connected to Loki');
});
transport.on('error', (err) => {
    console.error('Transport error:', err);
    if (err.response) {
        console.error('Response details:', {
            status: err.response.statusCode,
            headers: err.response.headers,
            body: err.response.body
        });
    }
});
// Создаем функцию для инициализации логгера с именем сервиса
function createLogger(serviceName) {
    const logger = (0, pino_1.default)({
        level: isDev ? 'debug' : 'info',
        base: {
            pid: undefined,
            hostname: undefined,
            service: serviceName,
            env: process.env.NODE_ENV
        }
    }, transport);
    // Отправим тестовое сообщение после создания логгера
    if (isDev) {
        logger.info('Logger initialized successfully', { service: serviceName });
    }
    return logger;
}
// Экспортируем функцию создания логгера по умолчанию
exports.default = createLogger;
