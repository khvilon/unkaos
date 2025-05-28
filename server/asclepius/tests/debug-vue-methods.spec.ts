import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Исследование методов Vue компонента после сохранения', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем исследование Vue методов...');
  
  // Перехватываем консольные сообщения браузера
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('Vue')) {
      console.log(`🌐 Vue console:`, msg.text());
    }
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
    await nameInput.fill('Исследование методов');
    await page.waitForTimeout(1000);
    
    // Сохраняем воркфлоу
    console.log('💾 Сохраняем воркфлоу...');
    const saveButton = page.locator('input[value="Создать"].btn_input');
    await saveButton.click();
    await page.waitForTimeout(3000);
    
    // Ждем появления воркфлоу в таблице и кликаем по нему
    console.log('📋 Ждем появления воркфлоу в таблице...');
    const workflowInTable = page.locator(`.ktable tbody tr:has-text("Исследование методов")`);
    await workflowInTable.first().waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('🖱️ Кликаем по воркфлоу для редактирования...');
    await workflowInTable.first().click();
    await page.waitForTimeout(3000); // Увеличиваем время ожидания
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(2000);
    
    // Ждем загрузки статусов
    console.log('⏳ Ждем загрузки статусов...');
    await page.waitForSelector('.statuses-grid button', { timeout: 10000 });
    await page.waitForTimeout(3000); // Дополнительное время для инициализации
    
    // Исследуем Vue компонент
    console.log('🔍 Исследуем Vue компонент...');
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
      
      // Получаем все ключи контекста
      const allKeys = Object.keys(ctx);
      const methods = [];
      const data = [];
      const computed = [];
      
      for (const key of allKeys) {
        const value = ctx[key];
        const type = typeof value;
        
        if (type === 'function') {
          methods.push({
            name: key,
            toString: value.toString().substring(0, 100) + '...'
          });
        } else if (type === 'object' && value !== null) {
          if (Array.isArray(value)) {
            data.push({
              name: key,
              type: 'array',
              length: value.length,
              sample: value.slice(0, 3)
            });
          } else {
            data.push({
              name: key,
              type: 'object',
              keys: Object.keys(value).slice(0, 5)
            });
          }
        } else {
          data.push({
            name: key,
            type: type,
            value: type === 'string' ? value.substring(0, 50) : value
          });
        }
      }
      
      // Специально ищем методы, связанные со статусами
      const statusMethods = methods.filter(m => 
        m.name.toLowerCase().includes('status') ||
        m.name.toLowerCase().includes('add') ||
        m.name.toLowerCase().includes('workflow') ||
        m.name.toLowerCase().includes('node') ||
        m.name.toLowerCase().includes('drag') ||
        m.name.toLowerCase().includes('click')
      );
      
      // Ищем данные, связанные со статусами
      const statusData = data.filter(d => 
        d.name.toLowerCase().includes('status') ||
        d.name.toLowerCase().includes('available') ||
        d.name.toLowerCase().includes('issue') ||
        d.name.toLowerCase().includes('workflow')
      );
      
      return {
        hasVueComponent: true,
        hasContext: true,
        totalKeys: allKeys.length,
        methodsCount: methods.length,
        dataCount: data.length,
        allMethods: methods,
        allData: data,
        statusMethods: statusMethods,
        statusData: statusData
      };
    });
    
    console.log('📊 Полный анализ Vue компонента:');
    console.log('Общая информация:', {
      hasVueComponent: vueAnalysis.hasVueComponent,
      hasContext: vueAnalysis.hasContext,
      totalKeys: vueAnalysis.totalKeys,
      methodsCount: vueAnalysis.methodsCount,
      dataCount: vueAnalysis.dataCount
    });
    
    console.log('\n🔧 Все методы Vue компонента:');
    vueAnalysis.allMethods?.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name}: ${method.toString}`);
    });
    
    console.log('\n📊 Все данные Vue компонента:');
    vueAnalysis.allData?.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.type}):`, item);
    });
    
    console.log('\n🎯 Методы, связанные со статусами:');
    vueAnalysis.statusMethods?.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name}: ${method.toString}`);
    });
    
    console.log('\n📋 Данные, связанные со статусами:');
    vueAnalysis.statusData?.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.type}):`, item);
    });
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-vue-methods-analysis.png', fullPage: true });
    console.log('📸 Скриншот: debug-vue-methods-analysis.png');
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Ошибка в исследовании Vue методов:', error);
    throw error;
  }
}); 