import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Поиск Vue 3 компонента', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем поиск Vue 3 компонента...');
  
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
    await nameInput.fill('Vue3 тест');
    await page.waitForTimeout(1000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(2000);
    
    // Ищем Vue 3 компонент различными способами
    console.log('🔍 Ищем Vue 3 компонент...');
    const vueSearchResult = await page.evaluate(() => {
      const results = {
        vue2Methods: {},
        vue3Methods: {},
        globalVue: {},
        devtools: {},
        elementMethods: {}
      };
      
      // Проверяем Vue 2 методы
      const editorElement = document.querySelector('.simple-workflow-editor');
      if (editorElement) {
        results.vue2Methods = {
          hasVue: !!(editorElement as any).__vue__,
          hasVueParentComponent: !!(editorElement as any).__vueParentComponent,
          hasVueApp: !!(editorElement as any).__vueApp
        };
      }
      
      // Проверяем Vue 3 методы
      if (editorElement) {
        results.vue3Methods = {
          hasVueInstance: !!(editorElement as any).__vueParentComponent,
          hasVueApp: !!(editorElement as any)._vueParentComponent,
          hasVueCtx: !!(editorElement as any).__vueParentComponent?.ctx,
          hasVueProxy: !!(editorElement as any).__vueParentComponent?.proxy
        };
      }
      
      // Проверяем глобальные Vue объекты
      results.globalVue = {
        hasWindowVue: !!(window as any).Vue,
        hasVueDevtools: !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__,
        hasVueApp: !!(window as any).__VUE__,
        hasVueApps: !!(window as any).__VUE_APPS__
      };
      
      // Проверяем devtools
      const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
      if (devtools) {
        results.devtools = {
          hasApps: !!devtools.apps,
          appsCount: devtools.apps?.length || 0,
          hasVueVersion: !!devtools.Vue
        };
      }
      
      // Проверяем различные свойства элементов
      const buttons = Array.from(document.querySelectorAll('.statuses-grid button'));
      if (buttons.length > 0) {
        const firstButton = buttons[0] as any;
        results.elementMethods = {
          buttonKeys: Object.keys(firstButton).filter(key => key.includes('vue') || key.includes('Vue')),
          parentKeys: firstButton.parentElement ? Object.keys(firstButton.parentElement).filter((key: string) => key.includes('vue') || key.includes('Vue')) : [],
          hasClickHandler: !!firstButton.onclick,
          hasEventListeners: !!firstButton.addEventListener
        };
      }
      
      return results;
    });
    
    console.log('📊 Результат поиска Vue компонента:', JSON.stringify(vueSearchResult, null, 2));
    
    // Пробуем найти Vue приложение через devtools
    const vueAppResult = await page.evaluate(() => {
      const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
      if (devtools && devtools.apps && devtools.apps.length > 0) {
        const app = devtools.apps[0];
        
        // Пробуем найти компонент SimpleWorkflowEditor
        const findComponent = (component: any, name: string): any => {
          if (!component) return null;
          
          if (component.type?.name === name || component.type?.__name === name) {
            return component;
          }
          
          // Ищем в дочерних компонентах
          if (component.children) {
            for (const child of component.children) {
              const found = findComponent(child, name);
              if (found) return found;
            }
          }
          
          return null;
        };
        
        const workflowEditor = findComponent(app._instance, 'SimpleWorkflowEditor');
        
        return {
          hasApp: true,
          appVersion: app.version,
          hasWorkflowEditor: !!workflowEditor,
          workflowEditorMethods: workflowEditor ? Object.keys(workflowEditor.ctx || {}).filter((key: string) => 
            key.includes('Status') || key.includes('add') || key.includes('click')
          ) : []
        };
      }
      
      return { hasApp: false };
    });
    
    console.log('📊 Результат поиска Vue приложения:', vueAppResult);
    
    // Если нашли Vue приложение, пробуем вызвать функцию
    if (vueAppResult.hasApp && vueAppResult.hasWorkflowEditor) {
      console.log('🎯 Найдено Vue приложение с SimpleWorkflowEditor, пробуем добавить статус...');
      
      const addStatusResult = await page.evaluate(() => {
        const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
        const app = devtools.apps[0];
        
        const findComponent = (component: any, name: string): any => {
          if (!component) return null;
          if (component.type?.name === name || component.type?.__name === name) return component;
          if (component.children) {
            for (const child of component.children) {
              const found = findComponent(child, name);
              if (found) return found;
            }
          }
          return null;
        };
        
        const workflowEditor = findComponent(app._instance, 'SimpleWorkflowEditor');
        
        if (workflowEditor && workflowEditor.ctx) {
          const ctx = workflowEditor.ctx;
          
          // Проверяем доступные методы и данные
          const availableMethods = Object.keys(ctx).filter(key => typeof ctx[key] === 'function');
          const availableData = Object.keys(ctx).filter(key => typeof ctx[key] !== 'function');
          
          // Пробуем найти статусы
          const statuses = ctx.availableStatuses || ctx.issueStatuses || [];
          const targetStatus = statuses.find((s: any) => s.name === 'Новая');
          
          if (targetStatus && ctx.addStatusToWorkflow) {
            ctx.addStatusToWorkflow(targetStatus.uuid);
            return { 
              success: true, 
              statusAdded: targetStatus.name,
              availableMethods,
              availableData
            };
          }
          
          return { 
            success: false, 
            reason: 'addStatusToWorkflow not found or no target status',
            availableMethods,
            availableData,
            statusesCount: statuses.length
          };
        }
        
        return { success: false, reason: 'WorkflowEditor context not found' };
      });
      
      console.log('📊 Результат добавления статуса:', addStatusResult);
      
      if (addStatusResult.success) {
        await page.waitForTimeout(1000);
        
        // Проверяем результат
        const svgCheck = await page.evaluate(() => {
          const svg = document.querySelector('.svg-workflow');
          const nodesGroup = svg?.querySelector('g.nodes');
          return {
            nodesCount: nodesGroup?.children.length || 0,
            nodesHTML: nodesGroup?.innerHTML || ''
          };
        });
        
        console.log('📊 SVG после добавления через Vue:', svgCheck);
      }
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-vue3-search.png', fullPage: true });
    console.log('📸 Скриншот Vue3 поиска: debug-vue3-search.png');
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Ошибка в поиске Vue3:', error);
    throw error;
  }
}); 