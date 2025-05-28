import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Отладка создания воркфлоу - сравнение способов', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем отладку создания воркфлоу...');
  
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
    
    // Ждем полной загрузки страницы
    console.log('⏳ Ждем полной загрузки страницы воркфлоу...');
    await page.waitForTimeout(3000); // Пауза для полной инициализации
    
    // Анализируем текущую страницу
    console.log('🔍 Анализируем страницу воркфлоу...');
    const pageAnalysis = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasSimpleEditor: !!document.querySelector('[data-testid="simple-workflow-editor"]'),
        hasWorkflowTable: !!document.querySelector('.workflow-table-card'),
        hasCreateButton: !!document.querySelector('input[value="Создать"]'),
        hasPlusButton: !!document.querySelector('.btn_input[value="+"]'),
        allButtons: Array.from(document.querySelectorAll('input[type="button"]')).map(btn => (btn as HTMLInputElement).value),
        bodyClasses: document.body.className,
        mainContent: document.querySelector('.main-content')?.innerHTML?.substring(0, 500) || 'No main content'
      };
    });
    console.log('📊 Page analysis:', JSON.stringify(pageAnalysis, null, 2));
    
    // Если есть кнопка плюс, кликаем по ней
    if (pageAnalysis.hasPlusButton) {
      console.log('➕ Кликаем по кнопке плюс...');
      await page.click('.btn_input[value="+"]');
      
      // Ждем загрузки редактора
      await page.waitForSelector('[data-testid="simple-workflow-editor"]', { timeout: 10000 });
      console.log('✅ Редактор загружен после клика по плюсу');
      
      // Анализируем состояние после клика по плюсу
      const afterPlusClick = await page.evaluate(() => {
        const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
        if (!editor) return { error: 'Editor not found' };
        
        const vueInstance = (editor as any).__vueParentComponent;
        if (!vueInstance) return { error: 'Vue instance not found' };
        
        const ctx = vueInstance.ctx;
        if (!ctx) return { error: 'Vue context not found' };
        
        return {
          url: window.location.href,
          hasWdata: !!ctx.wdata,
          wdataKeys: ctx.wdata ? Object.keys(ctx.wdata) : [],
          workflowNodesCount: ctx.wdata?.workflow_nodes?.length || 0,
          transitionsCount: ctx.wdata?.transitions?.length || 0,
          issueStatusesLength: ctx.issueStatuses?.length || 0,
          availableStatusesLength: ctx.availableStatuses?.length || 0,
          wdataContent: ctx.wdata
        };
      });
      console.log('📊 After plus click:', JSON.stringify(afterPlusClick, null, 2));
      
      // Пауза для ручного тестирования
      console.log('🛑 ПАУЗА ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ ПОСЛЕ КЛИКА ПО ПЛЮСУ');
      console.log('Попробуйте кликнуть по статусам и посмотрите, работает ли добавление');
      await page.waitForTimeout(30000);
      
    } else if (pageAnalysis.hasCreateButton) {
      console.log('🔘 Кликаем по кнопке "Создать"...');
      await page.click('input[value="Создать"]');
      
      // Ждем загрузки редактора
      await page.waitForSelector('[data-testid="simple-workflow-editor"]', { timeout: 10000 });
      console.log('✅ Редактор загружен после клика по "Создать"');
      
      // Анализируем состояние после клика по "Создать"
      const afterCreateClick = await page.evaluate(() => {
        const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
        if (!editor) return { error: 'Editor not found' };
        
        const vueInstance = (editor as any).__vueParentComponent;
        if (!vueInstance) return { error: 'Vue instance not found' };
        
        const ctx = vueInstance.ctx;
        if (!ctx) return { error: 'Vue context not found' };
        
        return {
          url: window.location.href,
          hasWdata: !!ctx.wdata,
          wdataKeys: ctx.wdata ? Object.keys(ctx.wdata) : [],
          workflowNodesCount: ctx.wdata?.workflow_nodes?.length || 0,
          transitionsCount: ctx.wdata?.transitions?.length || 0,
          issueStatusesLength: ctx.issueStatuses?.length || 0,
          availableStatusesLength: ctx.availableStatuses?.length || 0,
          wdataContent: ctx.wdata
        };
      });
      console.log('📊 After create click:', JSON.stringify(afterCreateClick, null, 2));
      
      // Пауза для ручного тестирования
      console.log('🛑 ПАУЗА ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ ПОСЛЕ КЛИКА ПО "СОЗДАТЬ"');
      console.log('Попробуйте кликнуть по статусам и посмотрите, работает ли добавление');
      await page.waitForTimeout(30000);
      
    } else {
      console.log('❌ Не найдена кнопка для создания воркфлоу');
    }
    
    console.log('✅ Отладка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка в отладке:', error);
    throw error;
  }
}); 