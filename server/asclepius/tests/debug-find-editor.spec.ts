import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Поиск правильного компонента редактора воркфлоу', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем поиск правильного компонента редактора...');
  
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
    await nameInput.fill('Поиск редактора');
    await page.waitForTimeout(1000);
    
    // Сохраняем воркфлоу
    console.log('💾 Сохраняем воркфлоу...');
    const saveButton = page.locator('input[value="Создать"].btn_input');
    await saveButton.click();
    await page.waitForTimeout(3000);
    
    // Ждем появления воркфлоу в таблице и кликаем по нему
    console.log('📋 Ждем появления воркфлоу в таблице...');
    const workflowInTable = page.locator(`.ktable tbody tr:has-text("Поиск редактора")`);
    await workflowInTable.first().waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('🖱️ Кликаем по воркфлоу для редактирования...');
    await workflowInTable.first().click();
    await page.waitForTimeout(3000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(2000);
    
    // Ждем загрузки статусов
    console.log('⏳ Ждем загрузки статусов...');
    await page.waitForSelector('.statuses-grid button', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Ищем все возможные элементы с Vue компонентами
    console.log('🔍 Ищем все Vue компоненты на странице...');
    const allVueComponents = await page.evaluate(() => {
      const results = [];
      
      // Список возможных селекторов для поиска
      const selectors = [
        '.simple-workflow-editor',
        '.workflow-editor',
        '.editor-sidebar',
        '.statuses-grid',
        '.svg-workflow',
        '[class*="workflow"]',
        '[class*="editor"]',
        '[class*="status"]',
        'div[data-v-]', // Vue компоненты часто имеют data-v- атрибуты
        '.rv-container'
      ];
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element, index) => {
            const vueComponent = (element as any).__vueParentComponent;
            if (vueComponent) {
              const ctx = vueComponent.ctx;
              const methods = ctx ? Object.keys(ctx).filter(key => typeof ctx[key] === 'function') : [];
              const data = ctx ? Object.keys(ctx).filter(key => typeof ctx[key] !== 'function') : [];
              
              results.push({
                selector: selector,
                index: index,
                className: element.className,
                id: element.id,
                tagName: element.tagName,
                hasVueComponent: true,
                methodsCount: methods.length,
                dataCount: data.length,
                methods: methods,
                data: data,
                statusMethods: methods.filter(m => 
                  m.toLowerCase().includes('status') ||
                  m.toLowerCase().includes('add') ||
                  m.toLowerCase().includes('workflow')
                ),
                statusData: data.filter(d => 
                  d.toLowerCase().includes('status') ||
                  d.toLowerCase().includes('available') ||
                  d.toLowerCase().includes('workflow')
                )
              });
            }
          });
        } catch (error) {
          // Игнорируем ошибки селекторов
        }
      });
      
      return results;
    });
    
    console.log('📊 Найденные Vue компоненты:');
    allVueComponents.forEach((component, index) => {
      console.log(`\n${index + 1}. Селектор: ${component.selector}[${component.index}]`);
      console.log(`   Класс: ${component.className}`);
      console.log(`   ID: ${component.id}`);
      console.log(`   Тег: ${component.tagName}`);
      console.log(`   Методов: ${component.methodsCount}, Данных: ${component.dataCount}`);
      
      if (component.statusMethods.length > 0) {
        console.log(`   🎯 Методы статусов: ${component.statusMethods.join(', ')}`);
      }
      
      if (component.statusData.length > 0) {
        console.log(`   📋 Данные статусов: ${component.statusData.join(', ')}`);
      }
      
      if (component.methods.length > 0) {
        console.log(`   🔧 Все методы: ${component.methods.slice(0, 10).join(', ')}${component.methods.length > 10 ? '...' : ''}`);
      }
    });
    
    // Ищем компоненты с наибольшим количеством методов
    const componentsWithMethods = allVueComponents.filter(c => c.methodsCount > 0);
    componentsWithMethods.sort((a, b) => b.methodsCount - a.methodsCount);
    
    console.log('\n🏆 Компоненты с наибольшим количеством методов:');
    componentsWithMethods.slice(0, 5).forEach((component, index) => {
      console.log(`${index + 1}. ${component.selector}[${component.index}] - ${component.methodsCount} методов`);
    });
    
    // Ищем компоненты со статусными методами
    const statusComponents = allVueComponents.filter(c => c.statusMethods.length > 0 || c.statusData.length > 0);
    
    console.log('\n🎯 Компоненты со статусными методами/данными:');
    statusComponents.forEach((component, index) => {
      console.log(`${index + 1}. ${component.selector}[${component.index}]`);
      console.log(`   Методы статусов: ${component.statusMethods.join(', ')}`);
      console.log(`   Данные статусов: ${component.statusData.join(', ')}`);
    });
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-find-editor-components.png', fullPage: true });
    console.log('📸 Скриншот: debug-find-editor-components.png');
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Ошибка в поиске компонентов:', error);
    throw error;
  }
}); 