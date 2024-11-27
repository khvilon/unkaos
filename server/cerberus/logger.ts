import pino from 'pino';

// Перехватываем все console.log и process.stdout.write
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

process.stdout.write = function(chunk: any, ...args: any[]) {
    // Всегда пишем в оригинальный stdout
    return originalStdoutWrite(chunk, ...args);
};

process.stderr.write = function(chunk: any, ...args: any[]) {
    // Всегда пишем в оригинальный stderr
    return originalStderrWrite(chunk, ...args);
};

console.log = function(...args: any[]) {
    return originalStdoutWrite(args.join(' ') + '\n');
};

console.error = function(...args: any[]) {
    return originalStderrWrite(args.join(' ') + '\n');
};

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label: string) => {
            return { level: label };
        }
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
});
