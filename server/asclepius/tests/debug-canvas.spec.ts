import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Отладка SVG полотна и статусов', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем отладку SVG полотна...');
  
  // Устанавливаем размер окна браузера для правильного отображения
  await page.setViewportSize({ width: 1920, height: 1080 });
  
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
    
    // Переходим к воркфлоу
    console.log('🔄 Переходим к воркфлоу...');
    await navigateMainMenu(page, 'workflows');
    
    // Нажимаем кнопку создания
    console.log('➕ Нажимаем кнопку "Создать"...');
    await page.click('input[value="Создать"]');
    await page.waitForTimeout(1000);
    
    // Заполняем название воркфлоу
    console.log('📝 Заполняем название воркфлоу...');
    const nameInput = page.locator('.form-input').first();
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Отладочный');
    await page.waitForTimeout(1000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(1000);
    
    // Анализируем структуру страницы ДО добавления статусов
    console.log('🔍 Анализируем структуру ДО добавления статусов...');
    const beforeAnalysis = await page.evaluate(() => {
      const canvasSelectors = [
        'svg', '.workflow-canvas', '.canvas', '.workflow-editor canvas',
        '.simple-workflow-editor svg', '.editor-canvas', '.workflow-diagram'
      ];
      
      const canvasInfo = [];
      canvasSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            canvasInfo.push({
              selector: `${selector}[${index}]`,
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              children: element.children.length,
              innerHTML: element.innerHTML.substring(0, 200) + '...'
            });
          });
        }
      });
      
      return {
        canvasElements: canvasInfo,
        statusButtons: Array.from(document.querySelectorAll('.statuses-grid button')).map(btn => btn.textContent)
      };
    });
    
    console.log('📊 Структура ДО:', beforeAnalysis);
    
    // Делаем скриншот ДО
    await page.screenshot({ path: 'debug-canvas-before.png', fullPage: true });
    console.log('📸 Скриншот ДО: debug-canvas-before.png');
    
    // Добавляем первый статус
    console.log('➕ Добавляем статус "Новая"...');
    const newStatusButton = page.locator('.statuses-grid button:has-text("Новая")');
    await newStatusButton.click();
    await page.waitForTimeout(2000); // Даем больше времени на обработку
    
    // Анализируем структуру страницы ПОСЛЕ добавления первого статуса
    console.log('🔍 Анализируем структуру ПОСЛЕ добавления "Новая"...');
    const afterFirstAnalysis = await page.evaluate(() => {
      const canvasSelectors = [
        'svg', '.workflow-canvas', '.canvas', '.workflow-editor canvas',
        '.simple-workflow-editor svg', '.editor-canvas', '.workflow-diagram'
      ];
      
      const canvasInfo = [];
      canvasSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            canvasInfo.push({
              selector: `${selector}[${index}]`,
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              children: element.children.length,
              innerHTML: element.innerHTML.substring(0, 500) + '...'
            });
          });
        }
      });
      
      // Ищем элементы статусов на холсте
      const statusElements = [];
      const statusSelectors = [
        '[data-status]', '.status-node', '.workflow-node', '.node',
        'circle', 'rect', 'g[data-status]', 'text'
      ];
      
      statusSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            statusElements.push({
              selector: `${selector}[${index}]`,
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              textContent: element.textContent?.trim(),
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              }
            });
          });
        }
      });
      
      return {
        canvasElements: canvasInfo,
        statusElements: statusElements
      };
    });
    
    console.log('📊 Структура ПОСЛЕ первого статуса:', afterFirstAnalysis);
    
    // Делаем скриншот ПОСЛЕ первого статуса
    await page.screenshot({ path: 'debug-canvas-after-first.png', fullPage: true });
    console.log('📸 Скриншот ПОСЛЕ первого: debug-canvas-after-first.png');
    
    // Добавляем второй статус
    console.log('➕ Добавляем статус "В работе"...');
    const workStatusButton = page.locator('.statuses-grid button:has-text("В работе")');
    await workStatusButton.click();
    await page.waitForTimeout(2000);
    
    // Финальный анализ
    console.log('🔍 Финальный анализ структуры...');
    const finalAnalysis = await page.evaluate(() => {
      // Ищем все возможные элементы статусов
      const allElements = document.querySelectorAll('*');
      const statusRelated = [];
      
      allElements.forEach(element => {
        const text = element.textContent?.trim();
        if (text === 'Новая' || text === 'В работе') {
          const rect = element.getBoundingClientRect();
          statusRelated.push({
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            textContent: text,
            parentTagName: element.parentElement?.tagName,
            parentClassName: element.parentElement?.className,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          });
        }
      });
      
      return {
        statusRelatedElements: statusRelated,
        svgElements: Array.from(document.querySelectorAll('svg')).map(svg => ({
          className: svg.className,
          innerHTML: svg.innerHTML.substring(0, 1000)
        }))
      };
    });
    
    console.log('📊 Финальный анализ:', finalAnalysis);
    
    // Делаем финальный скриншот
    await page.screenshot({ path: 'debug-canvas-final.png', fullPage: true });
    console.log('📸 Финальный скриншот: debug-canvas-final.png');
    
    // Ждем 5 секунд для визуального осмотра
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Ошибка в отладке:', error);
    throw error;
  }
}); 