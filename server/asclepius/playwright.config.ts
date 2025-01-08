import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  timeout: 0,
  use: {
    headless: false,
    browserName: 'chromium', // Can be 'chromium', 'firefox', or 'webkit'
    baseURL: 'https://unkaos.local:3000',
    //viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true, // Игнорировать ошибки SSL
  },
};

export default config;
