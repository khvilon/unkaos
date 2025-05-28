import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  timeout: 0,
  use: {
    headless: false,
    browserName: 'chromium', // Используем chromium с каналом chrome
    channel: 'chrome', // Указываем использовать установленный Chrome
    baseURL: 'https://localhost:3000',
    viewport: { width: 1920, height: 1080 }, // Стандартное Full HD разрешение
    ignoreHTTPSErrors: true, // Игнорировать ошибки SSL
    // Дополнительные настройки для стабильности
    actionTimeout: 30000, // Таймаут для действий
    navigationTimeout: 30000, // Таймаут для навигации
    // Настройки для правильного масштабирования
    deviceScaleFactor: 1, // Принудительно устанавливаем масштаб 1:1
  },
  // Настройки для всех проектов
  projects: [
    {
      name: 'chrome',
      use: {
        headless: false,
        browserName: 'chromium',
        channel: 'chrome', // Используем установленный Chrome
        baseURL: 'https://localhost:3000',
        viewport: { width: 1920, height: 1080 }, // Стандартное Full HD разрешение
        ignoreHTTPSErrors: true,
        actionTimeout: 30000,
        navigationTimeout: 30000,
        deviceScaleFactor: 1, // Принудительно устанавливаем масштаб 1:1
        // Дополнительные настройки для Chrome
        launchOptions: {
          args: [
            '--window-size=1920,1080', // Стандартное Full HD разрешение
            '--disable-web-security', // Отключаем веб-безопасность для CORS
            '--disable-features=VizDisplayCompositor', // Улучшает стабильность
            '--force-device-scale-factor=1', // Принудительно устанавливаем масштаб устройства
            '--disable-device-scale-factor-check', // Отключаем проверку масштаба устройства
            '--disable-high-dpi-support', // Отключаем поддержку высокого DPI
            '--disable-extensions', // Отключаем расширения
            '--no-sandbox', // Отключаем sandbox для стабильности
            '--disable-dev-shm-usage' // Отключаем использование /dev/shm
          ]
        }
      }
    }
  ]
};

export default config;
