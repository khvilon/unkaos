import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Отладка клика по кнопке статуса', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем отладку клика по статусу...');
  
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
    
    // Ждем загрузки редактора воркфлоу
    await page.waitForSelector('[data-testid="simple-workflow-editor"]', { timeout: 10000 });
    console.log('✅ Редактор воркфлоу загружен');
    
    // Заполняем название воркфлоу
    const nameInput = page.locator('[data-testid="workflow-name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Отладочный воркфлоу');
    console.log('✅ Название заполнено');
    
    // Ждем загрузки статусов
    await page.waitForSelector('[data-testid="statuses-grid"]', { timeout: 10000 });
    console.log('✅ Статусы загружены');
    
    // Анализируем состояние ДО клика
    console.log('🔍 Анализируем состояние ДО клика...');
    const beforeClick = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="svg-workflow"]');
      const nodesGroup = document.querySelector('[data-testid="workflow-nodes"]');
      const statusButtons = Array.from(document.querySelectorAll('[data-testid="statuses-grid"] .status-button'));
      
      return {
        svgExists: !!svg,
        nodesGroupExists: !!nodesGroup,
        nodesCount: nodesGroup ? nodesGroup.children.length : 0,
        statusButtonsCount: statusButtons.length,
        statusButtonsText: statusButtons.map(btn => btn.textContent?.trim()),
        svgHTML: svg ? svg.innerHTML.substring(0, 500) : 'No SVG',
        nodesHTML: nodesGroup ? nodesGroup.innerHTML : 'No nodes group'
      };
    });
    console.log('📊 Состояние ДО клика:', JSON.stringify(beforeClick, null, 2));
    
    // Делаем скриншот ДО клика
    await page.screenshot({ path: 'debug-before-status-click.png', fullPage: true });
    console.log('📸 Скриншот ДО клика: debug-before-status-click.png');
    
    // Кликаем по первой кнопке статуса
    const firstStatusButton = page.locator('[data-testid="statuses-grid"] .status-button').first();
    const statusText = await firstStatusButton.textContent();
    console.log(`🖱️ Кликаем по статусу: "${statusText}"`);
    
    await firstStatusButton.click();
    console.log('✅ Клик выполнен');
    
    // Ждем немного для обработки
    await page.waitForTimeout(2000);
    
    // Анализируем состояние ПОСЛЕ клика
    console.log('🔍 Анализируем состояние ПОСЛЕ клика...');
    const afterClick = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="svg-workflow"]');
      const nodesGroup = document.querySelector('[data-testid="workflow-nodes"]');
      const linksGroup = document.querySelector('[data-testid="workflow-links"]');
      const canvasStatuses = Array.from(document.querySelectorAll('[data-testid^="canvas-status-"]'));
      
      return {
        svgExists: !!svg,
        nodesGroupExists: !!nodesGroup,
        linksGroupExists: !!linksGroup,
        nodesCount: nodesGroup ? nodesGroup.children.length : 0,
        canvasStatusesCount: canvasStatuses.length,
        canvasStatusesTestIds: canvasStatuses.map(el => el.getAttribute('data-testid')),
        svgHTML: svg ? svg.innerHTML.substring(0, 1000) : 'No SVG',
        nodesHTML: nodesGroup ? nodesGroup.innerHTML : 'No nodes group',
        linksHTML: linksGroup ? linksGroup.innerHTML : 'No links group'
      };
    });
    console.log('📊 Состояние ПОСЛЕ клика:', JSON.stringify(afterClick, null, 2));
    
    // Делаем скриншот ПОСЛЕ клика
    await page.screenshot({ path: 'debug-after-status-click.png', fullPage: true });
    console.log('📸 Скриншот ПОСЛЕ клика: debug-after-status-click.png');
    
    // Проверяем Vue компонент
    console.log('🔍 Анализируем Vue компонент...');
    const vueAnalysis = await page.evaluate(() => {
      const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
      if (!editor) return { error: 'Editor not found' };
      
      const vueInstance = (editor as any).__vueParentComponent;
      if (!vueInstance) return { error: 'Vue instance not found' };
      
      const ctx = vueInstance.ctx;
      if (!ctx) return { error: 'Vue context not found' };
      
      return {
        hasWdata: !!ctx.wdata,
        workflowNodesCount: ctx.wdata?.workflow_nodes?.length || 0,
        transitionsCount: ctx.wdata?.transitions?.length || 0,
        availableStatusesCount: ctx.availableStatuses?.length || 0,
        issueStatusesCount: ctx.issueStatuses?.length || 0,
        workflowNodes: ctx.wdata?.workflow_nodes?.map((node: any) => ({
          uuid: node.uuid,
          x: node.x,
          y: node.y,
          statusName: node.issue_statuses?.[0]?.name
        })) || [],
        methods: Object.getOwnPropertyNames(ctx).filter(name => typeof ctx[name] === 'function')
      };
    });
    console.log('📊 Vue анализ:', JSON.stringify(vueAnalysis, null, 2));
    
    // Проверяем консольные ошибки
    const errors = await page.evaluate(() => {
      return (window as any).consoleErrors || [];
    });
    console.log('🐛 Консольные ошибки:', errors);
    
    console.log('✅ Отладка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка в отладке:', error);
    throw error;
  }
}); 