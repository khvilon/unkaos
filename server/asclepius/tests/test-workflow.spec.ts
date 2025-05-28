import { test } from '@playwright/test';
import { signIn, createWorkflow } from '../helpers';

test('Создание воркфлоу', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем тест создания воркфлоу...');
  
  // Устанавливаем размер окна браузера для правильного отображения
  await page.setViewportSize({ width: 2560, height: 1440 });
  
  try {
    // Логинимся
    const loginUrl = `${baseUrl}/${workspace}/login`;
    console.log('🌐 Переходим на:', loginUrl);
    await page.goto(loginUrl);
    
    console.log('⏳ Ждем появления панели логина...');
    await page.waitForSelector('.login-panel', { timeout: 10000 });
    
    console.log('👤 Логинимся как админ:', adminEmail);
    await signIn(page, adminEmail, adminPassword);
    
    console.log('⏳ Ждем загрузки профиля...');
    await page.waitForSelector('.profile', { timeout: 10000 });
    console.log('⏳ Ждем загрузки главного меню...');
    await page.waitForSelector('.main-menu-list', { timeout: 10000 });
    
    // Переходим к созданию воркфлоу
    console.log('🔄 Переходим к созданию воркфлоу...');
    
    // Ищем ссылку на воркфлоу в меню
    console.log('🔍 Ищем ссылку на воркфлоу...');
    const workflowLink = await page.locator('.main-menu-list a').filter({ hasText: 'Воркфлоу' }).first();
    await workflowLink.click();
    
    // Ждем загрузки страницы воркфлоу
    console.log('⏳ Ждем загрузки страницы воркфлоу...');
    await page.waitForTimeout(1000);
    
    // Создаем воркфлоу
    await createWorkflow(page, 'Тестовый воркфлоу автотест');
    
    console.log('✅ Тест создания воркфлоу завершен успешно');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте создания воркфлоу:', error);
    throw error;
  }
}); 