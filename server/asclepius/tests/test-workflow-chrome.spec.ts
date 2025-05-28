import { test, chromium } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Тест создания воркфлоу в настоящем Chrome', async () => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем тест создания воркфлоу в Chrome...');
  
  // Запускаем настоящий Chrome с правильными настройками
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // Используем установленный Chrome
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--allow-running-insecure-content',
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      '--disable-device-scale-factor-limit'
    ]
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  try {
    // Логинимся
    const loginUrl = `${baseUrl}/${workspace}/login`;
    console.log('🌐 Переходим на:', loginUrl);
    await page.goto(loginUrl);
    
    // Устанавливаем правильный масштаб страницы
    await page.evaluate(() => {
      document.body.style.zoom = '1';
      document.body.style.transform = 'scale(1)';
      document.body.style.transformOrigin = 'top left';
    });
    
    console.log('⏳ Ждем появления панели логина...');
    await page.waitForSelector('.login-panel', { timeout: 10000 });
    
    console.log('👤 Логинимся как админ:', adminEmail);
    await signIn(page, adminEmail, adminPassword);
    
    console.log('⏳ Ждем загрузки профиля...');
    await page.waitForSelector('.profile', { timeout: 10000 });
    console.log('⏳ Ждем загрузки главного меню...');
    await page.waitForSelector('.main-menu-list', { timeout: 10000 });
    
    // Переходим к воркфлоу
    console.log('🔄 Переходим к воркфлоу...');
    await navigateMainMenu(page, 'workflows');
    
    // Ждем загрузки редактора воркфлоу
    await page.waitForSelector('[data-testid="simple-workflow-editor"]', { timeout: 10000 });
    console.log('✅ Редактор воркфлоу загружен');
    
    // Заполняем название воркфлоу
    const nameInput = page.locator('[data-testid="workflow-name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Ручной тест Chrome');
    console.log('✅ Название заполнено');
    
    // Ждем появления кнопок статусов
    await page.waitForSelector('[data-testid="statuses-grid"]', { timeout: 10000 });
    console.log('✅ Статусы загружены');
    
    console.log('🛑 ПАУЗА ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ');
    console.log('Попробуйте вручную кликнуть по кнопкам статусов и посмотрите:');
    console.log('1. Добавляются ли статусы на SVG холст справа');
    console.log('2. Есть ли ошибки в консоли браузера (F12)');
    console.log('3. Работает ли функция addStatusToWorkflow');
    console.log('Нажмите любую клавишу в терминале через 60 секунд...');
    
    // Пауза на 60 секунд для ручного тестирования
    await page.waitForTimeout(60000);
    
    console.log('✅ Тест завершен');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
    throw error;
  } finally {
    await browser.close();
  }
}); 