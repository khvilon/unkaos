import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Анализ Vue.js событий и компонентов', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем анализ Vue.js событий...');
  
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
    await nameInput.fill('Vue тест');
    await page.waitForTimeout(1000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(1000);
    
    // Анализируем Vue компоненты и события
    console.log('🔍 Анализируем Vue компоненты...');
    const vueAnalysis = await page.evaluate(() => {
      // Проверяем наличие Vue
      const hasVue = !!(window as any).Vue || !!(window as any).__VUE__;
      
      // Ищем Vue компоненты через data-v атрибуты
      const vueElements = Array.from(document.querySelectorAll('[data-v-*], [class*="data-v-"]'));
      
      // Анализируем кнопки статусов
      const statusButtons = Array.from(document.querySelectorAll('.statuses-grid button'));
      const buttonInfo = statusButtons.map(button => {
        const element = button as HTMLElement;
        const attributes = Array.from(element.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        }));
        
        // Ищем Vue-специфичные атрибуты
        const vueAttrs = attributes.filter(attr => 
          attr.name.startsWith('@') || 
          attr.name.startsWith('v-') || 
          attr.name.startsWith(':') ||
          attr.name.includes('data-v-')
        );
        
        return {
          textContent: element.textContent?.trim(),
          className: element.className,
          attributes: attributes,
          vueAttributes: vueAttrs,
          hasVueInstance: !!(element as any).__vue__ || !!(element as any).__vueParentComponent
        };
      });
      
      // Ищем родительские элементы с Vue событиями
      const statusGrid = document.querySelector('.statuses-grid');
      const statusGridInfo = statusGrid ? {
        className: statusGrid.className,
        attributes: Array.from(statusGrid.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        })),
        hasVueInstance: !!(statusGrid as any).__vue__ || !!(statusGrid as any).__vueParentComponent,
        innerHTML: statusGrid.innerHTML.substring(0, 1000)
      } : null;
      
      // Проверяем глобальные Vue объекты
      const vueInfo = {
        hasVue: hasVue,
        vueVersion: (window as any).Vue?.version || 'unknown',
        vueDevtools: !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__
      };
      
      return {
        vueInfo,
        vueElementsCount: vueElements.length,
        statusButtons: buttonInfo,
        statusGrid: statusGridInfo
      };
    });
    
    console.log('📊 Vue анализ:', JSON.stringify(vueAnalysis, null, 2));
    
    // Получаем HTML код страницы для анализа
    console.log('📄 Получаем HTML код страницы...');
    const pageHTML = await page.content();
    
    // Ищем Vue события в HTML
    const vueEventMatches = [
      ...pageHTML.matchAll(/@click/g),
      ...pageHTML.matchAll(/v-on:click/g),
      ...pageHTML.matchAll(/@[a-zA-Z-]+/g),
      ...pageHTML.matchAll(/v-on:[a-zA-Z-]+/g)
    ];
    
    console.log('🎯 Найденные Vue события:', vueEventMatches.length);
    
    // Ищем специфичные паттерны для статусов
    const statusRelatedHTML = pageHTML.match(/statuses-grid[\s\S]{0,500}/g);
    if (statusRelatedHTML) {
      console.log('📋 HTML блок со статусами:', statusRelatedHTML[0]);
    }
    
    // Пробуем найти и вызвать Vue события напрямую
    console.log('🎯 Пробуем вызвать Vue события...');
    const vueEventResult = await page.evaluate(() => {
      // Ищем кнопку статуса
      const buttons = Array.from(document.querySelectorAll('.statuses-grid button'));
      const button = buttons.find(btn => btn.textContent?.trim() === 'Новая') as HTMLElement;
      
      if (!button) return { error: 'Button not found' };
      
      // Пробуем найти Vue компонент
      const vueComponent = (button as any).__vue__ || 
                          (button as any).__vueParentComponent ||
                          (button.parentElement as any).__vue__ ||
                          (button.parentElement as any).__vueParentComponent;
      
      if (vueComponent) {
        console.log('Vue компонент найден!');
        
        // Пробуем вызвать методы компонента
        const methods = Object.getOwnPropertyNames(vueComponent).filter(name => 
          typeof vueComponent[name] === 'function' && 
          (name.includes('click') || name.includes('select') || name.includes('add'))
        );
        
        return {
          hasVueComponent: true,
          componentMethods: methods,
          componentData: Object.keys(vueComponent.$data || {}),
          componentProps: Object.keys(vueComponent.$props || {})
        };
      }
      
      return { hasVueComponent: false };
    });
    
    console.log('🎯 Vue компонент результат:', vueEventResult);
    
    // Пробуем эмулировать Vue события
    if (vueEventResult.hasVueComponent) {
      console.log('🎯 Пробуем эмулировать Vue клик...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.statuses-grid button'));
        const button = buttons.find(btn => btn.textContent?.trim() === 'Новая') as HTMLElement;
        
        if (button) {
          // Эмулируем Vue событие
          const vueEvent = new CustomEvent('click', {
            bubbles: true,
            cancelable: true,
            detail: { vueEvent: true }
          });
          
          button.dispatchEvent(vueEvent);
          
          // Также пробуем на родительском элементе
          if (button.parentElement) {
            button.parentElement.dispatchEvent(vueEvent);
          }
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Проверяем результат
      const svgAfterVue = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        return {
          nodesCount: nodesGroup?.children.length || 0,
          nodesHTML: nodesGroup?.innerHTML || ''
        };
      });
      
      console.log('📊 SVG после Vue события:', svgAfterVue);
    }
    
    // Делаем скриншот для анализа
    await page.screenshot({ path: 'debug-vue-analysis.png', fullPage: true });
    console.log('📸 Скриншот Vue анализа: debug-vue-analysis.png');
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Ошибка в анализе Vue:', error);
    throw error;
  }
}); 