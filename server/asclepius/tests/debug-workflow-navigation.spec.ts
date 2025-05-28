import { test } from '@playwright/test';
import { signIn } from '../helpers';

test('Отладка навигации к воркфлоу', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем отладку навигации к воркфлоу...');
  
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
    
    // Анализируем главное меню
    console.log('🔍 Анализируем главное меню...');
    const menuAnalysis = await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('.main-menu-list a'));
      return menuItems.map(item => ({
        text: item.textContent?.trim(),
        href: item.getAttribute('href'),
        fullHref: (item as HTMLAnchorElement).href
      }));
    });
    console.log('📊 Menu items:', JSON.stringify(menuAnalysis, null, 2));
    
    // Ищем ссылку на воркфлоу
    const workflowLinks = menuAnalysis.filter(item => 
      item.text?.toLowerCase().includes('воркфлоу') || 
      item.href?.includes('workflow')
    );
    console.log('🔗 Workflow links:', JSON.stringify(workflowLinks, null, 2));
    
    if (workflowLinks.length > 0) {
      const workflowLink = workflowLinks[0];
      console.log(`🔄 Кликаем по ссылке воркфлоу: ${workflowLink.text} (${workflowLink.href})`);
      await page.click(`a[href="${workflowLink.href}"]`);
      
      // Ждем загрузки страницы
      await page.waitForTimeout(3000);
      
      // Анализируем загруженную страницу
      console.log('🔍 Анализируем страницу воркфлоу...');
      const pageAnalysis = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasSimpleEditor: !!document.querySelector('[data-testid="simple-workflow-editor"]'),
          hasWorkflowTable: !!document.querySelector('.workflow-table-card'),
          hasKTable: !!document.querySelector('.ktable'),
          hasCreateButton: !!document.querySelector('input[value="Создать"]'),
          hasPlusButton: !!document.querySelector('.btn_input[value="+"]'),
          allButtons: Array.from(document.querySelectorAll('input[type="button"]')).map(btn => (btn as HTMLInputElement).value),
          tableContent: document.querySelector('.ktable')?.textContent?.substring(0, 200) || 'No table',
          mainContent: document.querySelector('.main-content')?.innerHTML?.substring(0, 500) || 'No main content'
        };
      });
      console.log('📊 Page analysis:', JSON.stringify(pageAnalysis, null, 2));
      
      // Если есть кнопка плюс, показываем паузу для ручного тестирования
      if (pageAnalysis.hasPlusButton) {
        console.log('🛑 НАЙДЕНА КНОПКА ПЛЮС!');
        console.log('Сейчас будет пауза 30 секунд для ручного тестирования:');
        console.log('1. Попробуйте кликнуть по плюсу');
        console.log('2. Посмотрите, как открывается редактор');
        console.log('3. Попробуйте добавить статусы');
        await page.waitForTimeout(30000);
      } else if (pageAnalysis.hasCreateButton) {
        console.log('🛑 НАЙДЕНА КНОПКА "СОЗДАТЬ"');
        console.log('Сейчас будет пауза 30 секунд для ручного тестирования:');
        console.log('1. Попробуйте кликнуть по "Создать"');
        console.log('2. Посмотрите, как открывается редактор');
        console.log('3. Попробуйте добавить статусы');
        await page.waitForTimeout(30000);
      } else {
        console.log('❌ Не найдены кнопки для создания воркфлоу');
      }
    } else {
      console.log('❌ Не найдена ссылка на воркфлоу в меню');
    }
    
    console.log('✅ Отладка навигации завершена');
    
  } catch (error) {
    console.error('❌ Ошибка в отладке навигации:', error);
    throw error;
  }
}); 