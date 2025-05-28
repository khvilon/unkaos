import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Детальная отладка вызова Vue функции', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем детальную отладку Vue функции...');
  
  // Перехватываем консольные сообщения браузера
  page.on('console', msg => {
    console.log(`🌐 Browser console [${msg.type()}]:`, msg.text());
  });
  
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
    await nameInput.fill('Отладка Vue');
    await page.waitForTimeout(1000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(2000);
    
    // Детальный анализ Vue компонента
    console.log('🔍 Детальный анализ Vue компонента...');
    const vueAnalysis = await page.evaluate(() => {
      const editorElement = document.querySelector('.simple-workflow-editor');
      const vueComponent = (editorElement as any).__vueParentComponent;
      
      if (!vueComponent) {
        return { error: 'Vue component not found' };
      }
      
      const ctx = vueComponent.ctx;
      if (!ctx) {
        return { error: 'Vue context not found' };
      }
      
      // Анализируем все доступные свойства и методы
      const allKeys = Object.keys(ctx);
      const methods = allKeys.filter(key => typeof ctx[key] === 'function');
      const data = allKeys.filter(key => typeof ctx[key] !== 'function');
      
      // Специально ищем статусы
      const statusRelatedKeys = allKeys.filter(key => 
        key.toLowerCase().includes('status') || 
        key.toLowerCase().includes('available') ||
        key.toLowerCase().includes('issue')
      );
      
      // Проверяем availableStatuses
      const availableStatuses = ctx.availableStatuses || [];
      const issueStatuses = ctx.issueStatuses || [];
      
      return {
        hasVueComponent: true,
        hasContext: true,
        allKeysCount: allKeys.length,
        methodsCount: methods.length,
        dataCount: data.length,
        methods: methods,
        statusRelatedKeys: statusRelatedKeys,
        availableStatusesCount: availableStatuses.length,
        issueStatusesCount: issueStatuses.length,
        availableStatuses: availableStatuses.map((s: any) => ({ name: s.name, uuid: s.uuid })),
        issueStatuses: issueStatuses.map((s: any) => ({ name: s.name, uuid: s.uuid })),
        hasAddStatusToWorkflow: typeof ctx.addStatusToWorkflow === 'function'
      };
    });
    
    console.log('📊 Детальный анализ Vue:', JSON.stringify(vueAnalysis, null, 2));
    
    if (vueAnalysis.error) {
      console.error('❌ Ошибка анализа Vue:', vueAnalysis.error);
      return;
    }
    
    if (!vueAnalysis.hasAddStatusToWorkflow) {
      console.error('❌ Функция addStatusToWorkflow не найдена!');
      console.log('Доступные методы:', vueAnalysis.methods);
      return;
    }
    
    if (vueAnalysis.availableStatusesCount === 0) {
      console.error('❌ Доступные статусы не найдены!');
      console.log('Issue statuses count:', vueAnalysis.issueStatusesCount);
      return;
    }
    
    // Пробуем добавить статус "Новая"
    console.log('🎯 Пробуем добавить статус "Новая"...');
    const addResult = await page.evaluate(() => {
      const editorElement = document.querySelector('.simple-workflow-editor');
      const vueComponent = (editorElement as any).__vueParentComponent;
      const ctx = vueComponent.ctx;
      
      // Ищем статус "Новая"
      const availableStatuses = ctx.availableStatuses || [];
      const targetStatus = availableStatuses.find((s: any) => s.name === 'Новая');
      
      if (!targetStatus) {
        return { 
          error: 'Status "Новая" not found',
          availableNames: availableStatuses.map((s: any) => s.name)
        };
      }
      
      console.log('Найден статус:', targetStatus);
      console.log('Вызываем addStatusToWorkflow с UUID:', targetStatus.uuid);
      
      try {
        // Вызываем функцию
        const result = ctx.addStatusToWorkflow(targetStatus.uuid);
        console.log('Результат вызова addStatusToWorkflow:', result);
        
        return { 
          success: true, 
          statusName: targetStatus.name,
          statusUuid: targetStatus.uuid,
          functionResult: result
        };
      } catch (error) {
        console.error('Ошибка при вызове addStatusToWorkflow:', error);
        return { 
          error: 'Function call failed',
          errorMessage: error.message
        };
      }
    });
    
    console.log('📊 Результат добавления статуса:', addResult);
    
    if (addResult.success) {
      console.log('✅ Функция вызвана успешно, ждем обновления DOM...');
      await page.waitForTimeout(2000);
      
      // Проверяем результат
      const svgCheck = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        const nodeElements = nodesGroup?.querySelectorAll('.conceptG');
        
        return {
          svgExists: !!svg,
          nodesGroupExists: !!nodesGroup,
          nodesCount: nodeElements?.length || 0,
          nodesHTML: nodesGroup?.innerHTML || '',
          nodeTexts: nodeElements ? Array.from(nodeElements).map(node => {
            const textElement = node.querySelector('text');
            return textElement?.textContent?.trim() || '';
          }) : []
        };
      });
      
      console.log('📊 SVG после вызова функции:', svgCheck);
      
      if (svgCheck.nodesCount > 0) {
        console.log('🎉 Статус успешно добавлен на холст!');
      } else {
        console.log('⚠️ Функция вызвана, но статус не появился на холсте');
      }
    } else {
      console.error('❌ Не удалось вызвать функцию:', addResult.error);
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-vue-function-call.png', fullPage: true });
    console.log('📸 Скриншот: debug-vue-function-call.png');
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Ошибка в отладке Vue функции:', error);
    throw error;
  }
}); 