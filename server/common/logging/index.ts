import pino from 'pino';

// Определяем уровни логирования в зависимости от окружения
const isDev = process.env.NODE_ENV === 'dev';

const transport = pino.transport({
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

transport.on('error', (err: any) => {
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
export function createLogger(serviceName: string) {
  const logger = pino({
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
export default createLogger;
