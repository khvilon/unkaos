import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: false,
    browserName: 'chromium', // Can be 'chromium', 'firefox', or 'webkit'
    baseURL: 'https://unkaos.tech',
    viewport: { width: 1920, height: 1080 },
  },
};

export default config;
