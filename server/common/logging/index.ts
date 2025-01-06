import pino from 'pino';

const transport = pino.transport({
  targets: [
    // Красивый вывод в консоль для разработки
    {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      },
      level: 'trace' // показываем все логи в консоли
    },
    // Отправка в Loki
    {
      target: 'pino-loki',
      options: {
        host: 'http://loki:3100',
        labels: { app: 'unkaos' },
        
      }
    }
  ]
});

transport.on('ready', () => {
  console.log('Transport is ready');
  // Отправим тестовое сообщение для проверки
  logger.info('Transport initialized successfully');
});

transport.on('connect', () => {
  console.log('Connected to OpenSearch');
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

// Создаем логгер с дополнительными метаданными
const logger = pino({
  level: 'info',
  base: {
    pid: undefined,
    hostname: undefined
  }
}, transport);

export default logger;
