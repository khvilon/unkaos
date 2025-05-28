import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Отладка взаимодействия с кнопками статусов', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем отладку взаимодействия...');
  
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
    await nameInput.fill('Тест взаимодействия');
    await page.waitForTimeout(1000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(1000);
    
    // Анализируем кнопку статуса перед взаимодействием
    console.log('🔍 Анализируем кнопку "Новая" перед взаимодействием...');
    const buttonAnalysis = await page.evaluate(() => {
      // Ищем кнопку с текстом "Новая" в .statuses-grid
      const buttons = Array.from(document.querySelectorAll('.statuses-grid button'));
      const button = buttons.find(btn => btn.textContent?.trim() === 'Новая') as HTMLElement;
      if (!button) return { error: 'Button not found' };
      
      const rect = button.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(button);
      
      return {
        tagName: button.tagName,
        className: button.className,
        textContent: button.textContent,
        disabled: button.hasAttribute('disabled'),
        visible: rect.width > 0 && rect.height > 0,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        style: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          pointerEvents: computedStyle.pointerEvents,
          opacity: computedStyle.opacity
        },
        eventListeners: button.onclick ? 'has onclick' : 'no onclick'
      };
    });
    
    console.log('📊 Анализ кнопки:', buttonAnalysis);
    
    // Проверяем состояние SVG до клика
    const svgBefore = await page.evaluate(() => {
      const svg = document.querySelector('.svg-workflow');
      const nodesGroup = svg?.querySelector('g.nodes');
      return {
        svgExists: !!svg,
        nodesGroupExists: !!nodesGroup,
        nodesCount: nodesGroup?.children.length || 0,
        nodesHTML: nodesGroup?.innerHTML || ''
      };
    });
    
    console.log('📊 SVG до клика:', svgBefore);
    
    // Делаем скриншот до клика
    await page.screenshot({ path: 'debug-before-click.png', fullPage: true });
    console.log('📸 Скриншот до клика: debug-before-click.png');
    
    // Пробуем разные способы клика
    console.log('🖱️ Способ 1: Обычный click()...');
    const newStatusButton = page.locator('.statuses-grid button:has-text("Новая")');
    await newStatusButton.click();
    await page.waitForTimeout(1000);
    
    // Проверяем результат
    let svgAfter = await page.evaluate(() => {
      const svg = document.querySelector('.svg-workflow');
      const nodesGroup = svg?.querySelector('g.nodes');
      return {
        nodesCount: nodesGroup?.children.length || 0,
        nodesHTML: nodesGroup?.innerHTML || ''
      };
    });
    
    console.log('📊 SVG после обычного клика:', svgAfter);
    
    if (svgAfter.nodesCount === 0) {
      console.log('🖱️ Способ 2: Hover + click...');
      await newStatusButton.hover();
      await page.waitForTimeout(200);
      await newStatusButton.click();
      await page.waitForTimeout(1000);
      
      svgAfter = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        return {
          nodesCount: nodesGroup?.children.length || 0,
          nodesHTML: nodesGroup?.innerHTML || ''
        };
      });
      
      console.log('📊 SVG после hover+click:', svgAfter);
    }
    
    if (svgAfter.nodesCount === 0) {
      console.log('🖱️ Способ 3: Focus + click...');
      await newStatusButton.focus();
      await page.waitForTimeout(200);
      await newStatusButton.click();
      await page.waitForTimeout(1000);
      
      svgAfter = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        return {
          nodesCount: nodesGroup?.children.length || 0,
          nodesHTML: nodesGroup?.innerHTML || ''
        };
      });
      
      console.log('📊 SVG после focus+click:', svgAfter);
    }
    
    if (svgAfter.nodesCount === 0) {
      console.log('🖱️ Способ 4: Dispatch click event...');
      await page.evaluate(() => {
        // Ищем кнопку с текстом "Новая" в .statuses-grid
        const buttons = Array.from(document.querySelectorAll('.statuses-grid button'));
        const button = buttons.find(btn => btn.textContent?.trim() === 'Новая') as HTMLElement;
        if (button) {
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          button.dispatchEvent(event);
        }
      });
      await page.waitForTimeout(1000);
      
      svgAfter = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        return {
          nodesCount: nodesGroup?.children.length || 0,
          nodesHTML: nodesGroup?.innerHTML || ''
        };
      });
      
      console.log('📊 SVG после dispatch event:', svgAfter);
    }
    
    if (svgAfter.nodesCount === 0) {
      console.log('🖱️ Способ 5: Mouse down/up...');
      const buttonBox = await newStatusButton.boundingBox();
      if (buttonBox) {
        await page.mouse.move(buttonBox.x + buttonBox.width/2, buttonBox.y + buttonBox.height/2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(1000);
        
        svgAfter = await page.evaluate(() => {
          const svg = document.querySelector('.svg-workflow');
          const nodesGroup = svg?.querySelector('g.nodes');
          return {
            nodesCount: nodesGroup?.children.length || 0,
            nodesHTML: nodesGroup?.innerHTML || ''
          };
        });
        
        console.log('📊 SVG после mouse down/up:', svgAfter);
      }
    }
    
    if (svgAfter.nodesCount === 0) {
      console.log('🖱️ Способ 6: Double click...');
      await newStatusButton.dblclick();
      await page.waitForTimeout(1000);
      
      svgAfter = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        return {
          nodesCount: nodesGroup?.children.length || 0,
          nodesHTML: nodesGroup?.innerHTML || ''
        };
      });
      
      console.log('📊 SVG после double click:', svgAfter);
    }
    
    // Делаем финальный скриншот
    await page.screenshot({ path: 'debug-after-all-clicks.png', fullPage: true });
    console.log('📸 Финальный скриншот: debug-after-all-clicks.png');
    
    // Проверяем, есть ли JavaScript ошибки
    const jsErrors = await page.evaluate(() => {
      return (window as any).jsErrors || [];
    });
    
    console.log('🐛 JavaScript ошибки:', jsErrors);
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Ошибка в отладке взаимодействия:', error);
    throw error;
  }
}); 