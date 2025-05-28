import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Отладка Vuex store и загрузки статусов', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем отладку Vuex store...');
  
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
    
    // Анализируем Vuex store
    console.log('🔍 Анализируем Vuex store...');
    const storeAnalysis = await page.evaluate(() => {
      // Ищем Vue приложение
      const app = document.querySelector('#app');
      if (!app) return { error: 'App not found' };
      
      const vueApp = (app as any).__vue_app__;
      if (!vueApp) return { error: 'Vue app not found' };
      
      // Ищем store
      const store = vueApp.config.globalProperties.$store;
      if (!store) return { error: 'Store not found' };
      
      return {
        hasStore: true,
        stateKeys: Object.keys(store.state),
        hasIssueStatuses: !!store.state.issue_statuses,
        issueStatusesState: store.state.issue_statuses,
        getters: Object.keys(store.getters),
        hasGetIssueStatuses: !!store.getters.get_issue_statuses,
        getIssueStatusesValue: store.getters.get_issue_statuses,
        actions: Object.keys(store._actions),
        hasGetIssueStatusesAction: !!store._actions.get_issue_statuses
      };
    });
    console.log('📊 Store анализ:', JSON.stringify(storeAnalysis, null, 2));
    
    // Анализируем Vue компонент
    console.log('🔍 Анализируем Vue компонент...');
    const componentAnalysis = await page.evaluate(() => {
      const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
      if (!editor) return { error: 'Editor not found' };
      
      const vueInstance = (editor as any).__vueParentComponent;
      if (!vueInstance) return { error: 'Vue instance not found' };
      
      const ctx = vueInstance.ctx;
      if (!ctx) return { error: 'Vue context not found' };
      
      return {
        hasContext: true,
        hasStore: !!ctx.$store,
        hasWdata: !!ctx.wdata,
        wdataKeys: ctx.wdata ? Object.keys(ctx.wdata) : [],
        issueStatuses: ctx.issueStatuses,
        availableStatuses: ctx.availableStatuses,
        computedKeys: Object.getOwnPropertyNames(ctx).filter(key => 
          typeof ctx[key] === 'object' && ctx[key] && ctx[key].__v_isRef
        ),
        methods: Object.getOwnPropertyNames(ctx).filter(key => 
          typeof ctx[key] === 'function'
        )
      };
    });
    console.log('📊 Component анализ:', JSON.stringify(componentAnalysis, null, 2));
    
    // Пытаемся вручную вызвать загрузку статусов
    console.log('🔄 Пытаемся вручную загрузить статусы...');
    const manualLoad = await page.evaluate(() => {
      const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
      if (!editor) return { error: 'Editor not found' };
      
      const vueInstance = (editor as any).__vueParentComponent;
      if (!vueInstance) return { error: 'Vue instance not found' };
      
      const ctx = vueInstance.ctx;
      if (!ctx || !ctx.$store) return { error: 'Store not found' };
      
      try {
        // Пытаемся вызвать action
        ctx.$store.dispatch('get_issue_statuses');
        return { success: true, message: 'Action dispatched' };
      } catch (error: any) {
        return { error: 'Failed to dispatch action', details: error.message };
      }
    });
    console.log('📊 Manual load result:', JSON.stringify(manualLoad, null, 2));
    
    // Ждем немного и проверяем снова
    await page.waitForTimeout(3000);
    
    console.log('🔍 Проверяем статусы после ручной загрузки...');
    const afterManualLoad = await page.evaluate(() => {
      const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
      if (!editor) return { error: 'Editor not found' };
      
      const vueInstance = (editor as any).__vueParentComponent;
      if (!vueInstance) return { error: 'Vue instance not found' };
      
      const ctx = vueInstance.ctx;
      if (!ctx) return { error: 'Vue context not found' };
      
      return {
        issueStatusesLength: ctx.issueStatuses?.length || 0,
        availableStatusesLength: ctx.availableStatuses?.length || 0,
        issueStatuses: ctx.issueStatuses,
        availableStatuses: ctx.availableStatuses
      };
    });
    console.log('📊 After manual load:', JSON.stringify(afterManualLoad, null, 2));
    
    // Проверяем сетевые запросы
    console.log('🌐 Отслеживаем сетевые запросы...');
    page.on('response', response => {
      if (response.url().includes('issue_statuses') || response.url().includes('statuses')) {
        console.log(`📡 Network: ${response.status()} ${response.url()}`);
      }
    });
    
    // Пытаемся еще раз загрузить
    await page.evaluate(() => {
      const editor = document.querySelector('[data-testid="simple-workflow-editor"]');
      if (editor) {
        const vueInstance = (editor as any).__vueParentComponent;
        if (vueInstance && vueInstance.ctx && vueInstance.ctx.$store) {
          vueInstance.ctx.$store.dispatch('get_issue_statuses');
        }
      }
    });
    
    await page.waitForTimeout(5000);
    
    console.log('✅ Отладка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка в отладке:', error);
    throw error;
  }
}); 