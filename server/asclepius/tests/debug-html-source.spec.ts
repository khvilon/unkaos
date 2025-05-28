import { test } from '@playwright/test';
import { signIn, navigateMainMenu } from '../helpers';

test('Анализ HTML кода страницы', async ({ page }) => {
  // Используем данные из предыдущего успешного теста
  const workspace = 'test1748390267055';
  const adminEmail = 'teelfioj@guerrillamailblock.com';
  const adminPassword = 'pass1748390267055';
  const baseUrl = 'https://localhost:3000';
  
  console.log('🚀 Начинаем анализ HTML кода...');
  
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
    await nameInput.fill('HTML анализ');
    await page.waitForTimeout(1000);
    
    // Включаем режим перетаскивания статусов
    console.log('🔄 Включаем режим перетаскивания статусов...');
    const dragModeRadio = page.locator('input[type="radio"][value="false"]');
    await dragModeRadio.check();
    await page.waitForTimeout(1000);
    
    // Получаем HTML код страницы
    console.log('📄 Получаем HTML код страницы...');
    const pageHTML = await page.content();
    
    // Ищем блок со статусами
    const statusGridMatch = pageHTML.match(/class="statuses-grid"[\s\S]*?<\/div>/);
    if (statusGridMatch) {
      console.log('📋 HTML блок statuses-grid:');
      console.log(statusGridMatch[0]);
    }
    
    // Ищем Vue события
    const vueEvents = [];
    
    // Ищем @click события
    const clickEvents = pageHTML.match(/@click[^"]*"[^"]*"/g);
    if (clickEvents) {
      console.log('🎯 Найденные @click события:', clickEvents);
      vueEvents.push(...clickEvents);
    }
    
    // Ищем v-on события
    const vonEvents = pageHTML.match(/v-on:[^"]*"[^"]*"/g);
    if (vonEvents) {
      console.log('🎯 Найденные v-on события:', vonEvents);
      vueEvents.push(...vonEvents);
    }
    
    // Ищем data-v атрибуты
    const dataVAttrs = pageHTML.match(/data-v-[a-f0-9]+/g);
    if (dataVAttrs) {
      console.log('🎯 Найденные data-v атрибуты:', [...new Set(dataVAttrs)]);
    }
    
    // Ищем Vue директивы
    const vueDirectives = pageHTML.match(/v-[a-z-]+=/g);
    if (vueDirectives) {
      console.log('🎯 Найденные Vue директивы:', [...new Set(vueDirectives)]);
    }
    
    // Анализируем кнопки статусов в HTML
    const buttonMatches = pageHTML.match(/<button[^>]*class="[^"]*status-button[^"]*"[^>]*>[\s\S]*?<\/button>/g);
    if (buttonMatches) {
      console.log('🔘 Найденные кнопки статусов:');
      buttonMatches.forEach((button, index) => {
        console.log(`Кнопка ${index + 1}:`, button);
      });
    }
    
    // Проверяем Vue компоненты через JavaScript
    console.log('🔍 Проверяем Vue компоненты...');
    const vueInfo = await page.evaluate(() => {
      // Проверяем наличие Vue
      const hasVue = !!(window as any).Vue || !!(window as any).__VUE__;
      
      // Ищем все элементы с data-v атрибутами
      const allElements = Array.from(document.querySelectorAll('*'));
      const vueElements = allElements.filter(el => {
        return Array.from(el.attributes).some(attr => attr.name.startsWith('data-v-'));
      });
      
      // Анализируем кнопки статусов
      const statusButtons = Array.from(document.querySelectorAll('.statuses-grid button'));
      const buttonInfo = statusButtons.map(button => {
        const element = button as HTMLElement;
        const outerHTML = element.outerHTML;
        
        return {
          textContent: element.textContent?.trim(),
          outerHTML: outerHTML,
          hasDataV: outerHTML.includes('data-v-'),
          hasVueEvents: outerHTML.includes('@') || outerHTML.includes('v-on:')
        };
      });
      
      return {
        hasVue,
        vueElementsCount: vueElements.length,
        statusButtons: buttonInfo
      };
    });
    
    console.log('📊 Vue информация:', JSON.stringify(vueInfo, null, 2));
    
    // Если нашли Vue события, пробуем их эмулировать
    if (vueEvents.length > 0) {
      console.log('🎯 Найдены Vue события, пробуем эмулировать...');
      
      // Пробуем вызвать Vue события через $emit
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.statuses-grid button'));
        const button = buttons.find(btn => btn.textContent?.trim() === 'Новая') as HTMLElement;
        
        if (button) {
          // Пробуем найти Vue компонент через различные способы
          let vueComponent = null;
          
          // Способ 1: через __vue__
          vueComponent = (button as any).__vue__;
          
          // Способ 2: через родительский элемент
          if (!vueComponent && button.parentElement) {
            vueComponent = (button.parentElement as any).__vue__;
          }
          
          // Способ 3: через ближайший элемент с data-v
          if (!vueComponent) {
            let current = button.parentElement;
            while (current && !vueComponent) {
              vueComponent = (current as any).__vue__;
              current = current.parentElement;
            }
          }
          
          if (vueComponent && vueComponent.$emit) {
            console.log('Найден Vue компонент, пробуем $emit');
            vueComponent.$emit('click', { target: button });
            vueComponent.$emit('statusClick', 'Новая');
            vueComponent.$emit('addStatus', 'Новая');
          }
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Проверяем результат
      const svgAfter = await page.evaluate(() => {
        const svg = document.querySelector('.svg-workflow');
        const nodesGroup = svg?.querySelector('g.nodes');
        return {
          nodesCount: nodesGroup?.children.length || 0,
          nodesHTML: nodesGroup?.innerHTML || ''
        };
      });
      
      console.log('📊 SVG после Vue $emit:', svgAfter);
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-html-analysis.png', fullPage: true });
    console.log('📸 Скриншот HTML анализа: debug-html-analysis.png');
    
    // Ждем для визуального осмотра
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Ошибка в анализе HTML:', error);
    throw error;
  }
}); 