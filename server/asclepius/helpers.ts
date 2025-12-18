import { Page } from '@playwright/test';

const baseUrl = 'https://unkaos.local';

interface Email {
    mail_id: string;
    mail_from: string;
    mail_subject: string;
    mail_excerpt: string;
    mail_timestamp: string;
    mail_read: number;
    mail_date: string;
}

interface EmailResponse {
    list: Email[];
    count: number;
    email: string;
    ts: number;
}

interface EmailContent {
    mail_id: string;
    mail_from: string;
    mail_subject: string;
    mail_body: string;
    mail_timestamp: string;
    mail_date: string;
}

interface EmailAddressResponse {
    email_addr: string;
    email_timestamp: number;
}

// Конфигурация для Guerrilla Mail API
const GUERRILLA_CONFIG = {
    baseUrl: 'https://api.guerrillamail.com/ajax.php',
    userAgent: 'Unkaos-Tests-Bot/1.0',
    ip: '127.0.0.1'
};

let currentEmail: string = '';
let currentSession: string = '';

async function makeGuerrillaRequest(func: string, params: { [key: string]: string } = {}): Promise<any> {
    const url = new URL(GUERRILLA_CONFIG.baseUrl);
    
    // Добавляем обязательные параметры
    url.searchParams.append('f', func);
    url.searchParams.append('ip', GUERRILLA_CONFIG.ip);
    url.searchParams.append('agent', GUERRILLA_CONFIG.userAgent);
    
    // Добавляем дополнительные параметры
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            url.searchParams.append(key, params[key]);
        }
    }

    console.log(`Making Guerrilla Mail API request: ${func}`);
    
    const headers: { [key: string]: string } = {
        'User-Agent': GUERRILLA_CONFIG.userAgent
    };
    
    // Добавляем сессию если есть
    if (currentSession) {
        headers['Cookie'] = `PHPSESSID=${currentSession}`;
    }
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`Guerrilla Mail API request failed: ${response.status} ${response.statusText}`);
    }

    // Проверяем и сохраняем новую сессию
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
        const sessionMatch = setCookieHeader.match(/PHPSESSID=([^;]+)/);
        if (sessionMatch) {
            currentSession = sessionMatch[1];
            console.log(`Updated session: ${currentSession}`);
        }
    }

    const data = await response.json();
    console.log(`Guerrilla Mail API response:`, data);
    return data;
}

async function getEmails(): Promise<Email[]> {
    if (!currentEmail) {
        console.log('No current email set');
        return [];
    }

    console.log(`Getting emails for: ${currentEmail}`);
    try {
        const response: EmailResponse = await makeGuerrillaRequest('check_email', { seq: '0' });
        console.log(`Emails count: ${response.list?.length || 0}`);
        return response.list || [];
    } catch (error) {
        console.error('Error getting emails:', error);
        return [];
    }
}

async function readEmail(mailId: string): Promise<EmailContent> {
    console.log(`Reading email with id: ${mailId}`);
    try {
        const response: EmailContent = await makeGuerrillaRequest('fetch_email', { 
            email_id: mailId
        });
        console.log(`Email subject: ${response.mail_subject}`);
        return response;
    } catch (error) {
        console.error('Error reading email:', error);
        throw error;
    }
}

export async function getEmailFromTempMail(): Promise<string> {
    console.log(`Getting email from Guerrilla Mail`);
    try {
        const response: EmailAddressResponse = await makeGuerrillaRequest('get_email_address', { 
            lang: 'en'
        });
        
        currentEmail = response.email_addr;
        console.log(`Current email: ${currentEmail}`);
        return currentEmail;
    } catch (error) {
        console.error('Error creating temp email:', error);
        throw new Error('Failed to create temporary email');
    }
}

// Агрессивная проверка почты с адаптивным интервалом
async function waitForEmailsAggressive(): Promise<Email[]> {
    let emails: Email[] = [];
    const timeout = 60000;
    const startTime = Date.now();
    
    // Адаптивный интервал: начинаем с 200мс, постепенно увеличиваем
    let interval = 200;
    let checkCount = 0;
    
    console.log('🔄 Агрессивная проверка почты...');

    while (emails.length === 0 && Date.now() - startTime < timeout) {
        emails = await getEmails();
        checkCount++;
        
        if (emails.length > 0) {
            console.log(`📧 Письмо получено после ${checkCount} проверок за ${Date.now() - startTime}мс!`);
            break;
        }
        
        // Адаптивный интервал: первые 10 проверок - 200мс, потом увеличиваем
        if (checkCount > 10) {
            interval = Math.min(1000, interval + 100); // Максимум 1 секунда
        }
        
        if (checkCount % 5 === 0) {
            console.log(`📬 Проверка ${checkCount}, интервал ${interval}мс...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return emails;
}

export async function getIframeBody(page: Page) {
    // Используем агрессивную проверку почты
    console.log('🔄 Начинаем агрессивную проверку почты...');
    const emails = await waitForEmailsAggressive();

    if (emails.length === 0) {
        throw new Error('No emails received after timeout');
    }

    // Ищем письмо от Unkaos (не приветственное от Guerrilla Mail)
    const unkaosEmail = emails.find(email => 
        email.mail_from.includes('unkaos.ru') || 
        email.mail_subject.includes('Подтверждение регистрации')
    );

    if (!unkaosEmail) {
        console.log('Available emails:', emails.map(e => ({ from: e.mail_from, subject: e.mail_subject })));
        throw new Error('No Unkaos registration email found');
    }

    console.log(`Found Unkaos email from: ${unkaosEmail.mail_from}, subject: ${unkaosEmail.mail_subject}`);

    // Читаем письмо от Unkaos
    const email = await readEmail(unkaosEmail.mail_id);
    
    // Создаем временный div для парсинга HTML
    const activationData = await page.evaluate((html) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        
        // Ищем ссылку активации (она содержит /register/ в href)
        const link = div.querySelector('a[href*="/register/"]');
        if (!link) return null;
        
        // Ищем пароль (в теге strong)
        const password = div.querySelector('strong');
        if (!password) return null;
        
        return {
            href: link.getAttribute('href'),
            password: password.textContent
        };
    }, email.mail_body);

    if (!activationData) {
        console.log('Email body for debugging:', email.mail_body);
        throw new Error('Could not find activation link or password in email');
    }

    console.log(`Extracted password: ${activationData.password}`);
    console.log(`Extracted link: ${activationData.href}`);

    return {
        getAttribute: (attr: string) => attr === 'href' ? activationData.href : null,
        locator: () => ({
            innerText: async () => activationData.password
        })
    };
}

export async function waitRegisterMail(page: Page) {
    // Используем агрессивную проверку почты
    console.log('📬 Ждем письмо активации (агрессивная проверка)...');
    const emails = await waitForEmailsAggressive();

    if (emails.length === 0) {
        throw new Error('No registration email received after timeout');
    }
    
    console.log(`📧 Получено ${emails.length} писем!`);
}

export async function sendWorkspaceRegister(page: Page, workspace: string, adminEmail: string) {
  console.log('🌐 Переходим на главную страницу...');
  await page.goto(baseUrl);
  
  console.log('🔗 Нажимаем ссылку регистрации...');
  await page.click('a:has-text("Регистрация рабочего пространства")');
  
  console.log('⏳ Ждем панель регистрации...');
  await page.waitForSelector('.register-panel', { timeout: 5000 }); // Уменьшаем таймаут
  
  console.log('🏢 Заполняем название workspace:', workspace);
  const workspaceInput = page.locator('.register-panel .string.input:has(.label:has-text("Название рабочего пространства")) .string-input');
  await workspaceInput.waitFor({ state: 'visible', timeout: 5000 }); // Уменьшаем таймаут
  await workspaceInput.fill(workspace);

  console.log('📧 Заполняем email:', adminEmail);
  const emailInput = page.locator('.register-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
  await emailInput.waitFor({ state: 'visible', timeout: 5000 }); // Уменьшаем таймаут
  await emailInput.fill(adminEmail);

  console.log('🚀 Нажимаем кнопку отправки...');
  await page.click('.register-panel .btn_input');
  
  // Проверяем возможные ошибки
  const workspaceExistsError = page.locator('.register-err-label:has-text("Пространство с таким названием существует")');
  const registrationError = page.locator('.register-err-label:has-text("Не удалось создать заявку на регистрацию")');
  
  const hasWorkspaceError = await workspaceExistsError.isVisible();
  const hasRegistrationError = await registrationError.isVisible();
  
  if (hasWorkspaceError) {
    throw new Error('Workspace already exists');
  }
  
  if (hasRegistrationError) {
    throw new Error('Failed to create registration request');
  }

  console.log('Waiting for success message...');
  await page.waitForSelector('span.workspace-register-ok', { timeout: 10000 });
  console.log('Success message found!');
}

async function fillLocator(page: Page, locator: string, value: string) {
  const input = page.locator(locator);
  await input.waitFor({ state: 'visible' });
  await input.fill(value);
}

// Функция для установки масштаба страницы
async function setPageZoom(page: Page, zoomLevel: number = 0.9) {
  try {
    await page.evaluate((zoom) => {
      // Используем CSS transform вместо zoom для лучшей совместимости
      document.body.style.transform = `scale(${zoom})`;
      document.body.style.transformOrigin = 'top left';
      document.body.style.width = `${100 / zoom}%`;
      document.body.style.height = `${100 / zoom}%`;
    }, zoomLevel);
    console.log(`Page transform scale set to ${zoomLevel}`);
  } catch (error) {
    console.log('Failed to set page transform, continuing...');
  }
}

// Функция для скроллинга к элементу перед взаимодействием
async function scrollToElement(page: Page, locator: any) {
  try {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // Небольшая пауза после скроллинга
  } catch (error) {
    console.log('Scroll to element failed, continuing...');
  }
}

export async function signIn(page: Page, email: string, pass: string) {
  console.log(`Starting sign in`, email, pass);
  
  try {
    // Отслеживаем JavaScript ошибки
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Отслеживаем сетевые запросы
    page.on('response', response => {
      if (response.url().includes('/login') || response.url().includes('/auth')) {
        console.log(`Network response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Заполняем email быстро
    console.log('📧 Заполняем email...');
    const emailInput = page.locator('.login-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 }); // Уменьшаем таймаут
    await scrollToElement(page, emailInput);
    await emailInput.fill(email);
    
    // Заполняем пароль быстро
    console.log('🔑 Заполняем пароль...');
    const passwordInput = page.locator('.login-panel .string.input:has(.label:has-text("Пароль")) .string-input');
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 }); // Уменьшаем таймаут
    await scrollToElement(page, passwordInput);
    await passwordInput.fill(pass);

    // Нажимаем кнопку входа и ждем навигации
    const loginButton = page.locator('.login-panel .btn_input');
    await loginButton.waitFor({ state: 'visible', timeout: 5000 }); // Уменьшаем таймаут
    await scrollToElement(page, loginButton);
    
    console.log(`🚀 Нажимаем кнопку входа...`);
    
    // Ждем навигацию после клика
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        loginButton.click()
      ]);
    } catch (e) {
      // Навигация могла уже завершиться или не произойти
      console.log('Navigation timeout, checking page state...');
      await page.waitForTimeout(2000);
    }
    
    console.log(`✅ Навигация завершена, URL: ${page.url()}`);
    
    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Проверяем наличие ошибок на странице
    const errorSelectors = [
      '.error', 
      '.login-err-label', 
      '.alert-danger', 
      '.register-err-label',
      '.err-label',
      '.error-message',
      '.login-error'
    ];
    
    for (const selector of errorSelectors) {
      const errorElements = await page.locator(selector).all();
      if (errorElements.length > 0) {
        for (const errorEl of errorElements) {
          const errorText = await errorEl.textContent();
          if (errorText && errorText.trim()) {
            console.error(`Login error (${selector}): ${errorText}`);
          }
        }
      }
    }
    
    // Проверяем, есть ли еще панель логина (значит логин не прошел)
    const loginPanelVisible = await page.locator('.login-panel').isVisible();
    console.log(`Login panel still visible: ${loginPanelVisible}`);
    
    if (loginPanelVisible) {
      // Делаем скриншот для отладки
      await page.screenshot({ path: 'debug-login-failed.png', fullPage: true });
      console.log('📸 Скриншот ошибки логина сохранен: debug-login-failed.png');
      
      throw new Error('Login failed - panel still visible');
    }
    
    // Ждем появления профиля или главного меню
    console.log('Waiting for profile or main menu...');
    await Promise.race([
      page.waitForSelector('.profile', { timeout: 10000 }),
      page.waitForSelector('.main-menu-list', { timeout: 10000 })
    ]);
    
    // Исправляем позиционирование интерфейса
    console.log('Fixing interface positioning...');
    await fixInterfacePositioning(page);
    await page.waitForTimeout(1000); // Даем время на применение стилей
    
    console.log(`Login completed successfully`);
    
  } catch (error) {
    console.error(`Login failed:`, error);
    throw error;
  }
}

export async function signOut(page: Page) {
  console.log(`Starting sign out`);
  const profile = page.locator('.profile-top img');
  await profile.waitFor({ state: 'visible' });
  await profile.click();
  const exit = page.locator('#profile-menu-exit');
  await exit.waitFor({ state: 'visible' });
  await exit.click();
  console.log(`Clicked exit button`);
}

export async function navigateMainMenu(page: Page, menu: string) {
  // Для configs-сущностей используем полный путь
  const configEntities = ['workflows', 'sprints', 'automations'];
  if (configEntities.includes(menu)) {
    await page.click(`a[href*="/configs/${menu}"]`);
  } else {
    await page.click(`a[href*="/${menu}"]`);
  }
  
  // Ждем загрузки страницы
  await page.waitForTimeout(1000); // Уменьшено с 2000мс

  // Закрываем боковое меню: в UI оно закрывается по mouseout (а не по Escape),
  // и если курсор "залип" на меню, оно может перехватывать клики по контенту.
  try {
    await page.mouse.move(320, 40);
    await page.waitForTimeout(250);
  } catch (e) {
    // ignore
  }
  
  // Применяем исправление позиционирования после навигации
  console.log('Fixing interface positioning after navigation...');
  await fixInterfacePositioning(page);
  await page.waitForTimeout(500); // Уменьшено с 1000мс
}

export async function changeField(page: Page, fieldName: string, value: string, key: string = '') {
    if(key) {
        const keyElement = page.locator(`span:has-text("${key}")`);
        await scrollToElement(page, keyElement);
        await keyElement.click({ timeout: 5000 });
    }
    
    // Пробуем разные селекторы для поля ввода
    // Структура: <div class="string input"><div class="label">...</div><input class="string-input">
    const selectors = [
        `.string.input:has(.label:text-is("${fieldName}")) input.string-input`,
        `.string.input:has(.label:has-text("${fieldName}")) input.string-input`,
        `.input:has(.label:text-is("${fieldName}")) input`,
        `.input:has(.label:has-text("${fieldName}")) input`,
    ];
    
    let field = null;
    for (const selector of selectors) {
        const candidate = page.locator(selector);
        try {
            await candidate.first().waitFor({ state: 'visible', timeout: 2000 });
            field = candidate.first();
            console.log(`Found field "${fieldName}" with selector: ${selector}`);
            break;
        } catch (e) {
            // Пробуем следующий селектор
        }
    }
    
    if (!field) {
        // Fallback: ищем input рядом с label
        const label = page.locator(`.label:has-text("${fieldName}")`);
        field = label.locator('..').locator('input').first();
    }
    
    await field.waitFor({ state: 'visible', timeout: 10000 });
    await scrollToElement(page, field);
    await field.fill(value);
    
    if(key) {
        const saveButton = page.locator('input[type="button"][value="Сохранить"]');
        await scrollToElement(page, saveButton);
        await saveButton.click();
    }
}

export async function createUser(page: Page, name: string, login: string, email: string) {
  console.log(`Creating user`, name, login, email);
  
  try {
    // Исправляем позиционирование интерфейса
    await fixInterfacePositioning(page);
    await page.waitForTimeout(500); // Уменьшено с 1000мс
    
    // Кликаем по кнопке плюс для создания пользователя
    console.log('Clicking plus button...');
    await page.waitForSelector('.btn_input.bx-plus-circle', { timeout: 5000 });
    await page.click('.btn_input.bx-plus-circle');
    
    // Ждем появления полей формы
    console.log('Waiting for form fields...');
    await page.waitForSelector('.string-input', { timeout: 5000 });
    await page.waitForTimeout(500); // Уменьшено с 2000мс
    
    // Заполняем поля
    console.log('Filling ФИО field...');
  await changeField(page, "ФИО", name);
    
    console.log('Filling Логин field...');
  await changeField(page, "Логин", login);
    
    console.log('Filling Адрес почты field...');
  await changeField(page, "Адрес почты", email);
    
    // Нажимаем кнопку "Создать" для сохранения
    console.log('Clicking final "Создать" button...');
    const finalCreateButton = page.locator('input[type="button"][value="Создать"]');
    await scrollToElement(page, finalCreateButton);
    await finalCreateButton.click();
    
    // Ждем немного для обработки
    await page.waitForTimeout(1000); // Уменьшено с 2000мс
    
    // Проверяем наличие ошибок
    const errorElements = await page.locator('.error, .err-label, .alert-danger').all();
    if (errorElements.length > 0) {
      for (const errorEl of errorElements) {
        const errorText = await errorEl.textContent();
        if (errorText && errorText.trim()) {
          console.error(`User creation error: ${errorText}`);
        }
      }
    }
    
    // Проверяем, что мы вернулись к списку пользователей
    console.log('Waiting for user table...');
    await page.waitForSelector('.ktable', { timeout: 5000 }); // Уменьшено с 10000мс
    
    // Делаем скриншот для отладки
    await page.screenshot({ path: 'debug-user-creation.png', fullPage: true });
    console.log('📸 Скриншот создания пользователя сохранен: debug-user-creation.png');
    
    // Проверяем содержимое таблицы
    const tableContent = await page.locator('.ktable').textContent();
    console.log('Table content:', tableContent);
    
    // Ищем пользователя по логину (более надежно чем по ФИО)
    console.log(`Looking for user with login: "${login}"`);
    const userByLoginLocator = page.locator(`.ktable :text("${login}")`);
    const userByLoginCount = await userByLoginLocator.count();
    console.log(`Found ${userByLoginCount} elements with login "${login}"`);
    
    // Также попробуем найти по email
    console.log(`Looking for user with email: "${email}"`);
    const userByEmailLocator = page.locator(`.ktable :text("${email}")`);
    const userByEmailCount = await userByEmailLocator.count();
    console.log(`Found ${userByEmailCount} elements with email "${email}"`);
    
  } catch (error) {
    console.error(`User creation failed:`, error);
    throw error;
  }
}

// Функция для исправления позиционирования интерфейса
async function fixInterfacePositioning(page: Page) {
  try {
    await page.evaluate(() => {
      // Ищем основной контент, который сдвинут за пределы экрана
      const mainContentSelectors = [
        '.table_card', '.workflow-table-card', '.panel',
        '.main-content', '.content', '.page-content', '.workspace',
        '.main-container', '.app-content', '.page-container'
      ];
      
      mainContentSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          
          // Если элемент находится за пределами экрана справа
          if (rect.x >= window.innerWidth) {
            console.log(`Fixing position for ${selector}: x=${rect.x} -> x=220`);
            
            // Исправляем позиционирование
            (element as HTMLElement).style.position = 'fixed';
            (element as HTMLElement).style.left = '220px'; // После бокового меню
            (element as HTMLElement).style.top = '60px';   // Под хедером
            (element as HTMLElement).style.width = 'calc(100vw - 240px)'; // Ширина экрана минус меню
            (element as HTMLElement).style.height = 'calc(100vh - 80px)';  // Высота экрана минус хедер
            (element as HTMLElement).style.zIndex = '1000';
            (element as HTMLElement).style.backgroundColor = 'var(--background-color, #1a1a1a)';
          }
        });
      });
      
      // Также проверяем элементы редактора воркфлоу
      const workflowEditorSelectors = [
        '.simple-workflow-editor', '.editor-sidebar', '.workflow-editor'
      ];
      
      workflowEditorSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          
          if (rect.x >= window.innerWidth) {
            console.log(`Fixing workflow editor position for ${selector}: x=${rect.x}`);
            
            (element as HTMLElement).style.position = 'fixed';
            (element as HTMLElement).style.left = '220px';
            (element as HTMLElement).style.top = '60px';
            (element as HTMLElement).style.width = 'calc(100vw - 240px)';
            (element as HTMLElement).style.height = 'calc(100vh - 80px)';
            (element as HTMLElement).style.zIndex = '1001';
          }
        });
      });
      
      console.log('Interface positioning fixed');
    });
  } catch (error) {
    console.log('Failed to fix interface positioning, continuing...');
  }
}

export async function createWorkflow(page: Page, workflowName: string): Promise<void> {
  console.log(`Создание воркфлоу: ${workflowName}`);
  
  // Ждем полной загрузки страницы воркфлоу
  console.log('⏳ Ждем полной загрузки страницы воркфлоу...');
  await page.waitForTimeout(1000); // Уменьшено с 2000мс
  
  // Ждем появления кнопки плюс и кликаем по ней
  console.log('⏳ Ждем появления кнопки плюс...');
  await page.waitForSelector('.btn_input.bx-plus-circle', { timeout: 5000 }); // Уменьшено с 10000мс
  
  console.log('➕ Кликаем по кнопке плюс...');
  await page.click('.btn_input.bx-plus-circle');
  
  // Ждем загрузки редактора
  console.log('⏳ Ждем загрузки редактора воркфлоу...');
  await page.waitForSelector('[data-testid="simple-workflow-editor"]', { timeout: 5000 }); // Уменьшено с 10000мс
  console.log('✅ Редактор воркфлоу загружен');
  
  // Ждем полной инициализации Vue компонента
  console.log('⏳ Ждем инициализации Vue компонента...');
  await page.waitForTimeout(1000); // Уменьшено с 2000мс
  
  // Заполняем название воркфлоу
  const nameInput = page.locator('[data-testid="workflow-name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill(workflowName);
  console.log(`Заполнено название: ${workflowName}`);
  
  // Ждем появления кнопок статусов в DOM
  await page.waitForSelector('[data-testid="statuses-grid"]', { timeout: 5000 }); // Уменьшено с 10000мс
  
  // Ждем загрузки статусов в Vue компонент
  console.log('⏳ Ждем загрузки статусов...');
  await page.waitForFunction(() => {
    const statusItems = document.querySelectorAll('[data-testid="statuses-grid"] .status-item');
    return statusItems.length > 0;
  }, { timeout: 10000 });
  
  // Получаем список доступных статусов
  const statusButtons = page.locator('[data-testid="statuses-grid"] .status-item');
  const statusCount = await statusButtons.count();
  console.log(`Найдено статусов в DOM: ${statusCount}`);
  
  if (statusCount === 0) {
    throw new Error('Статусы не найдены в DOM');
  }
  
  // Добавляем первые 3 статуса на холст
  const statusesToAdd = Math.min(3, statusCount);
  const addedStatuses: string[] = [];
  
  for (let i = 0; i < statusesToAdd; i++) {
    const statusButton = statusButtons.nth(i);
    const statusText = await statusButton.textContent();
    
    if (statusText) {
      console.log(`Кликаем по статусу: ${statusText}`);
      await statusButton.click();
      
      // Ждем обновления DOM
      await page.waitForTimeout(500); // Уменьшено с 1000мс
      
      const statusSlug = statusText.toLowerCase().replace(/\s+/g, '-');
      addedStatuses.push(statusSlug);
      
      console.log(`✅ Клик по статусу ${statusText} выполнен`);
    }
  }
  
  console.log(`Добавлено статусов: ${addedStatuses.length}`);
  
  // Переключаемся в режим создания переходов
  console.log('Переключение в режим создания переходов');
  const transitionModeBtn = page.locator('button[title="Связи (C)"], button.tool-btn:has(.bx-share-alt)');
  if (await transitionModeBtn.count() > 0) {
    await transitionModeBtn.first().click();
    await page.waitForTimeout(500);
  } else {
    console.log('⚠️ Кнопка режима переходов не найдена, пропускаем');
  }
  
  // Создаем переходы между статусами (drag & drop)
  if (addedStatuses.length >= 2) {
    for (let i = 0; i < addedStatuses.length - 1; i++) {
      const fromStatus = `[data-testid="canvas-status-${addedStatuses[i]}"]`;
      const toStatus = `[data-testid="canvas-status-${addedStatuses[i + 1]}"]`;
      
      console.log(`Попытка создания перехода: ${addedStatuses[i]} -> ${addedStatuses[i + 1]}`);
      
      try {
        // Проверяем, что элементы статусов существуют на холсте
        const fromExists = await page.locator(fromStatus).count();
        const toExists = await page.locator(toStatus).count();
        
        if (fromExists > 0 && toExists > 0) {
          // Получаем элементы статусов
          const fromElement = page.locator(fromStatus);
          const toElement = page.locator(toStatus);
          
          // Выполняем drag & drop
          await fromElement.dragTo(toElement);
          
          // Ждем создания перехода
          await page.waitForTimeout(300); // Уменьшено с 500мс
          
          console.log(`✅ Переход создан: ${addedStatuses[i]} -> ${addedStatuses[i + 1]}`);
        } else {
          console.warn(`⚠️ Статусы не найдены на холсте: from=${fromExists}, to=${toExists}`);
        }
      } catch (error) {
        console.warn(`⚠️ Не удалось создать переход ${addedStatuses[i]} -> ${addedStatuses[i + 1]}:`, error);
      }
    }
  }
  
  // Сохраняем воркфлоу
  console.log('Сохранение воркфлоу');
  await page.locator('[data-testid="save-workflow"]').click();
  
  // Ждем сохранения
  await page.waitForTimeout(1000); // Уменьшено с 2000мс
  
  console.log(`✅ Воркфлоу "${workflowName}" создан успешно`);
}

export async function createStatus(page: Page, name: string, isInitial: boolean = false, isFinal: boolean = false) {
  console.log(`Creating status`, name, `initial: ${isInitial}, final: ${isFinal}`);
  
  try {
    // Исправляем позиционирование интерфейса
    await fixInterfacePositioning(page);
    await page.waitForTimeout(500);
    
    // Кликаем по кнопке плюс для создания статуса
    console.log('Clicking plus button...');
    await page.waitForSelector('.btn_input.bx-plus-circle', { timeout: 5000 });
    await page.click('.btn_input.bx-plus-circle');
    
    // Ждем появления полей формы
    console.log('Waiting for form fields...');
    await page.waitForSelector('.string-input', { timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Заполняем название статуса
    console.log('Filling Название field...');
    await changeField(page, "Название", name);
    
    // Устанавливаем чекбоксы если нужно
    if (isInitial) {
      console.log('Setting Начальный checkbox...');
      // Используем клик с force: true так как checkbox может быть скрыт кастомным стилем
      const initialCheckboxContainer = page.locator('.boolean-input:has(.label:has-text("Начальный"))');
      if (await initialCheckboxContainer.count() > 0) {
        await initialCheckboxContainer.click({ force: true });
      } else {
        const initialCheckbox = page.locator('.label:has-text("Начальный")').locator('..').locator('input[type="checkbox"]');
        await initialCheckbox.click({ force: true });
      }
    }
    
    if (isFinal) {
      console.log('Setting Конечный checkbox...');
      // Используем клик с force: true так как checkbox может быть скрыт кастомным стилем
      const finalCheckboxContainer = page.locator('.boolean-input:has(.label:has-text("Конечный"))');
      if (await finalCheckboxContainer.count() > 0) {
        await finalCheckboxContainer.click({ force: true });
      } else {
        const finalCheckbox = page.locator('.label:has-text("Конечный")').locator('..').locator('input[type="checkbox"]');
        await finalCheckbox.click({ force: true });
      }
    }
    
    // Нажимаем кнопку "Создать" для сохранения
    console.log('Clicking final "Создать" button...');
    const finalCreateButton = page.locator('input[type="button"][value="Создать"]');
    await scrollToElement(page, finalCreateButton);
    await finalCreateButton.click();
    
    // Ждем немного для обработки
    await page.waitForTimeout(1000);
    
    // Проверяем наличие ошибок
    const errorElements = await page.locator('.error, .err-label, .alert-danger').all();
    if (errorElements.length > 0) {
      for (const errorEl of errorElements) {
        const errorText = await errorEl.textContent();
        if (errorText && errorText.trim()) {
          console.error(`Status creation error: ${errorText}`);
        }
      }
    }
    
    // Проверяем, что мы вернулись к списку статусов
    console.log('Waiting for status table...');
    await page.waitForSelector('.ktable', { timeout: 5000 });
    
    // Делаем скриншот для отладки
    await page.screenshot({ path: 'debug-status-creation.png', fullPage: true });
    console.log('📸 Скриншот создания статуса сохранен: debug-status-creation.png');
    
    // Проверяем содержимое таблицы
    const tableContent = await page.locator('.ktable').textContent();
    console.log('Table content:', tableContent);
    
    // Ищем статус по названию
    console.log(`Looking for status with name: "${name}"`);
    const statusByNameLocator = page.locator(`.ktable :text("${name}")`);
    const statusByNameCount = await statusByNameLocator.count();
    console.log(`Found ${statusByNameCount} elements with name "${name}"`);
    
  } catch (error) {
    console.error(`Status creation failed:`, error);
    throw error;
  }
}

export interface FieldConfig {
  name: string;
  typeCode: string; // String, Text, Numeric, Boolean, Date, Time, Timestamp, User, Select
  availableValues?: { name: string; color?: string }[];
}

export async function createField(page: Page, config: FieldConfig): Promise<void> {
  console.log(`Creating field: ${config.name} (type: ${config.typeCode})`);
  
  try {
    await fixInterfacePositioning(page);
    await page.waitForTimeout(500);
    
    // Закрываем меню если открыто
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Кликаем по кнопке плюс для создания поля
    console.log('Clicking plus button...');
    await page.waitForSelector('.btn_input.bx-plus-circle', { timeout: 5000 });
    await page.click('.btn_input.bx-plus-circle');
    
    // Ждем появления полей формы
    console.log('Waiting for form fields...');
    await page.waitForSelector('.table_card_fields', { timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Заполняем название поля
    console.log('Filling Название field...');
    await changeField(page, "Название", config.name);
    
    // Выбираем тип поля
    console.log(`Selecting type: ${config.typeCode}...`);
    
    // Находим select-input с лейблом "Тип"
    const typeSelectInput = page.locator('.select-input:has(.label:text("Тип"))');
    if (await typeSelectInput.count() > 0) {
      console.log('✅ Найден контейнер типа');
      // Кликаем на выпадающий список
      const dropdown = typeSelectInput.locator('.vs__dropdown-toggle');
      if (await dropdown.count() > 0) {
        await dropdown.click();
        await page.waitForTimeout(500);
        
        // Ждём появления меню
        await page.waitForSelector('.vs__dropdown-menu', { timeout: 5000 });
        
        // Находим и кликаем по нужному типу в выпадающем списке
        const typeOption = page.locator(`.vs__dropdown-menu .vs__dropdown-option:has-text("${config.typeCode}")`);
        if (await typeOption.count() > 0) {
          await typeOption.first().click();
          await page.waitForTimeout(500);
          console.log(`✅ Тип "${config.typeCode}" выбран`);
        } else {
          console.log(`⚠️ Тип "${config.typeCode}" не найден в списке`);
        }
      }
    } else {
      // Альтернативный поиск - ищем по точному тексту лейбла
      const altContainer = page.locator('.input:has(.label:text-is("Тип"))');
      if (await altContainer.count() > 0) {
        console.log('✅ Найден альтернативный контейнер типа');
        const dropdown = altContainer.locator('.vs__dropdown-toggle, .v-select');
        if (await dropdown.count() > 0) {
          await dropdown.first().click();
          await page.waitForTimeout(500);
          
          const typeOption = page.locator(`.vs__dropdown-menu .vs__dropdown-option:has-text("${config.typeCode}")`);
          if (await typeOption.count() > 0) {
            await typeOption.first().click();
            await page.waitForTimeout(500);
            console.log(`✅ Тип "${config.typeCode}" выбран`);
          }
        }
      } else {
        console.log('⚠️ Контейнер типа не найден');
      }
    }
    
    // Если тип Select (Значение из списка) - добавляем значения списка
    if ((config.typeCode === 'Select' || config.typeCode === 'Значение из списка') && config.availableValues && config.availableValues.length > 0) {
      console.log('Adding available values for Select field...');
      
      // Ждём появления TagInput (он появляется когда выбран тип Select)
      console.log('Waiting for TagInput to appear...');
      const tagInputContainer = page.locator('.tag-input');
      try {
          await tagInputContainer.first().waitFor({ state: 'visible', timeout: 5000 });
          console.log('✅ TagInput appeared');
      } catch (e) {
          console.error('⚠️ TagInput did not appear within timeout');
      }
      
      const tagInputCount = await tagInputContainer.count();
      console.log(`TagInput containers found: ${tagInputCount}`);
      
      for (const val of config.availableValues) {
        console.log(`Adding value: ${val.name}`);
        
        // Находим input для добавления тега внутри tag-input
        const tagSearchInput = page.locator('.tag-input input.vs__search, .tag-input .vs__search');
        if (await tagSearchInput.count() > 0) {
          // Кликаем на input чтобы активировать его
          await tagSearchInput.first().click();
          await page.waitForTimeout(200);
          
          // Вводим текст
          await page.keyboard.type(val.name);
          await page.waitForTimeout(200);
          
          // Нажимаем Enter для добавления
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
          
          console.log(`✅ Value "${val.name}" added`);
          
          // Если указан цвет - кликаем по чипсе и выбираем цвет
          if (val.color) {
            console.log(`Setting color for value ${val.name}: ${val.color}`);
            
            // Ищем чип с нужным текстом
            const chip = page.locator(`.tag-input .select-input-selected:has-text("${val.name}"), .tag-input .vs__selected:has-text("${val.name}")`);
            if (await chip.count() > 0) {
              await chip.first().click();
              await page.waitForTimeout(500);
              
              // Ждём появления модального окна редактирования тега
              const modal = page.locator('.edit-tag-modal, .modal:visible');
              if (await modal.count() > 0) {
                // Ищем поле цвета в модальном окне
                const colorInput = page.locator('input[type="color"]');
                if (await colorInput.count() > 0) {
                  await colorInput.fill(val.color);
                  await page.waitForTimeout(300);
                  console.log(`✅ Color set to ${val.color}`);
                }
                
                // Закрываем модальное окно - ищем кнопку сохранения
                const saveBtn = page.locator('.edit-tag-modal button:has-text("Сохранить"), .modal button:has-text("ОК"), .modal button:has-text("OK"), .modal .btn:has-text("Сохранить")');
                if (await saveBtn.count() > 0) {
                  await saveBtn.first().click();
                  await page.waitForTimeout(300);
                } else {
                  // Закрываем по Escape
                  await page.keyboard.press('Escape');
                  await page.waitForTimeout(200);
                }
              }
            }
          }
        } else {
          console.log('⚠️ TagInput search field not found');
        }
      }
    }
    
    // Нажимаем кнопку "Создать" для сохранения
    console.log('Clicking "Создать" button...');
    const createButton = page.locator('input[type="button"][value="Создать"]');
    await scrollToElement(page, createButton);
    await createButton.click();
    
    // Ждем сохранения
    await page.waitForTimeout(1000);
    
    console.log(`✅ Поле "${config.name}" создано`);
    
  } catch (error) {
    console.error(`Field creation failed:`, error);
    throw error;
  }
}

export async function createProject(page: Page, name: string, prefix: string, description?: string): Promise<void> {
  console.log(`Creating project: ${name} (${prefix})`);
  
  try {
    await fixInterfacePositioning(page);
    await page.waitForTimeout(500);
    
    // Кликаем по кнопке плюс
    console.log('Clicking plus button...');
    await page.waitForSelector('.btn_input.bx-plus-circle', { timeout: 5000 });
    await page.click('.btn_input.bx-plus-circle');
    
    // Ждем появления формы
    console.log('Waiting for form fields...');
    await page.waitForSelector('.table_card_fields', { timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Заполняем поля
    console.log('Filling fields...');
    await changeField(page, "Название", name);
    
    // Скроллим вниз чтобы увидеть поле "Код"
    const formContainer = page.locator('.table_card_fields');
    await formContainer.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(300);
    
    await changeField(page, "Код", prefix);
    
    if (description) {
      await changeField(page, "Описание", description);
    }

    // Выбираем владельца (обязательное поле)
    const ownerContainer = page.locator('.user-input:has(.label:text-is("Владелец"))');
    const ownerSelect = ownerContainer.locator('.vs__dropdown-toggle');
    if (await ownerSelect.count() > 0) {
      console.log('Selecting owner...');
      await ownerSelect.click();
      // Ждём появления опций (в новых воркспейсах загрузка users может быть не мгновенной)
      const firstOption = page.locator('.vs__dropdown-option').first();
      await firstOption.waitFor({ state: 'visible', timeout: 10000 });
      await firstOption.click();
      // Проверяем что значение реально выбрано, иначе KButton не выполнит action из-за stop=true
      await ownerContainer.locator('.vs__selected').first().waitFor({ state: 'visible', timeout: 5000 });
    } else {
      console.warn('⚠️ Owner select not found');
    }
    
    // Нажимаем кнопку "Создать"
    console.log('Clicking "Создать" button...');
    const createButton = page.locator('input[type="button"][value="Создать"]');
    await scrollToElement(page, createButton);
    await createButton.click();
    
    // Ждем сохранения и обновления таблицы
    await page.waitForTimeout(1000);
    await page.waitForSelector('.ktable', { timeout: 5000 });
    // Дожидаемся появления строки проекта в таблице (иначе тест падает на проверке сразу после helper)
    await page.locator('.ktable').locator(`:text("${name}")`).first().waitFor({ state: 'visible', timeout: 10000 });
    
    console.log(`✅ Проект "${name}" создан`);
    
  } catch (error) {
    console.error(`Project creation failed:`, error);
    try {
      await page.screenshot({ path: 'debug-project-creation.png', fullPage: true });
      console.log('📸 Скриншот создания проекта сохранен: debug-project-creation.png');
    } catch (e) {
      // ignore
    }
    throw error;
  }
}

export interface IssueConfig {
  summary: string;
  description?: string;
  project?: string;
  type?: string;
  priority?: string; // Для нашего кастомного поля
  customFields?: { [key: string]: string };
}

export async function createIssue(page: Page, config: IssueConfig): Promise<void> {
  console.log(`Creating issue: ${config.summary}`);
  
  try {
    await fixInterfacePositioning(page);
    
    // Кликаем по кнопке создания задачи в сайдбаре
    console.log('Clicking create issue button in sidebar...');
    const createBtn = page.locator('a.new-issue-button');
    await createBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createBtn.click();
    
    // Ждем навигации на страницу создания задачи
    await page.waitForURL(/.*\/issue/, { timeout: 10000 });
    
    // Ждем загрузки страницы и появления основных полей
    console.log('Waiting for issue create form...');
    await page.waitForSelector('#issue_top_panel', { timeout: 10000 });
    await page.waitForSelector('.issue-name-input input', { timeout: 10000 });
    
    // Заполняем Название (Summary)
    console.log('Filling summary...');
    const summaryInput = page.locator('.issue-name-input input');
    await summaryInput.fill(config.summary);
    
    // Выбор Проекта
    if (config.project) {
      console.log(`Selecting project: ${config.project}`);
      const projectSelect = page.locator('.issue-project-input .vs__dropdown-toggle');
      if (await projectSelect.count() > 0) {
        await projectSelect.click();
        await page.waitForTimeout(300);
        
        // Ищем опцию в выпадающем списке
        const option = page.locator(`.vs__dropdown-option:has-text("${config.project}")`);
        if (await option.count() > 0) {
           await option.first().click();
        } else {
           console.log(`⚠️ Project "${config.project}" not found in list`);
        }
        await page.waitForTimeout(500); // Ждем подгрузки типов
      }
    }
    
    // Выбор Типа
    if (config.type) {
      console.log(`Selecting type: ${config.type}`);
      // Тип находится в #issue_card
      const typeSelect = page.locator('.issue-type-input .vs__dropdown-toggle');
      await typeSelect.waitFor({ state: 'visible' });
      
      if (await typeSelect.count() > 0) {
        await typeSelect.click();
        await page.waitForTimeout(300);
        
        const option = page.locator(`.vs__dropdown-option:has-text("${config.type}")`);
         if (await option.count() > 0) {
           await option.first().click();
        } else {
           console.log(`⚠️ Type "${config.type}" not found in list`);
        }
        await page.waitForTimeout(500); // Ждем подгрузки полей
      }
    }
    
    // Заполнение кастомных полей
    if (config.priority) {
      console.log(`Setting custom priority: ${config.priority}`);
      // Ищем наше поле "Тестовый приоритет" - это SelectInput с лейблом
      // Т.к. это динамическое поле, оно рендерится через component :is
      
      // Ищем контейнер с лейблом
      const priorityContainer = page.locator('.select-input:has(.label:text-is("Тестовый приоритет"))');
      if (await priorityContainer.count() > 0) {
        const dropdown = priorityContainer.locator('.vs__dropdown-toggle');
        await dropdown.click();
        await page.waitForTimeout(300);
        const option = page.locator(`.vs__dropdown-option:has-text("${config.priority}")`);
        if (await option.count() > 0) {
          await option.first().click();
        } else {
          console.warn(`Priority option "${config.priority}" not found`);
          await page.keyboard.press('Escape');
        }
      } else {
          console.log('⚠️ Custom field "Тестовый приоритет" not found');
      }
    }
    
    // Заполнение описания
    if (config.description) {
        console.log('Filling description...');
        const descriptionInput = page.locator('#issue_description_textarea');
        if (await descriptionInput.count() > 0) {
            await descriptionInput.fill(config.description);
        }
    }
    
    // Нажимаем Создать
    console.log('Clicking Create...');
    const saveBtn = page.locator('#save_issue_btn input[type="button"]');
    await saveBtn.click();
    
    // Ждем сохранения - URL изменится с /issue?t=... на /issue/PROJECT-123 или /issue/название
    // Проверяем что URL изменился и не содержит ?t=
    await page.waitForTimeout(2000);
    
    // Ожидаем появления карточки задачи или редиректа
    try {
      await page.waitForSelector('.issue-card-content, .issue-name-input', { timeout: 10000 });
    } catch (e) {
      console.warn('Карточка задачи не появилась, проверяем URL...');
    }
    
    const currentUrl = page.url();
    if (currentUrl.includes('/issue?t=')) {
      console.warn('⚠️ URL все еще содержит ?t=, возможно задача не создана');
    } else if (currentUrl.includes('/issue/')) {
      console.log(`✅ Задача "${config.summary}" создана, URL: ${currentUrl}`);
    } else {
      console.warn(`⚠️ Неожиданный URL после создания: ${currentUrl}`);
    }
    
  } catch (error) {
    console.error(`Issue creation failed:`, error);
    throw error;
  }
}

export async function logWork(page: Page, hours: string, comment: string) {
  console.log(`Logging work: ${hours}h, comment: ${comment}`);
  
  // Находим поле ввода времени (оно открывает модалку)
  // Ищем NumericInput с лейблом "Затраченное время" или id spent_time
  const spentTimeInput = page.locator('.issue-spent-time-input input');
  
  if (await spentTimeInput.count() > 0) {
    await spentTimeInput.click();
    await page.waitForTimeout(500);
    
    // Ждем модалку
    const modal = page.locator('.time-entry-modal');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Вводим время
    const durationInput = modal.locator('.numeric-input:has(.label:has-text("Время, ч")) input');
    await durationInput.fill(hours);
    
    // Вводим комментарий
    const commentInput = modal.locator('.string-input:has(.label:has-text("Комментарий")) input');
    await commentInput.fill(comment);
    
    // Сохраняем
    const saveBtn = modal.locator('#time-entry-ok-btn');
    await saveBtn.click();
    
    // Ждем закрытия модалки
    await modal.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(1000); // Ждем сохранения
    
    console.log('✅ Work logged');
  } else {
    console.warn('⚠️ Spent time input not found');
    throw new Error('Spent time input not found');
  }
}

export async function addDashboardGadget(page: Page, gadgetName: string) {
  console.log(`Adding gadget: ${gadgetName}`);
  
  // Если модалка осталась с прошлого шага — закрываем
  const existingModalContainer = page.locator('.gadget-types-modal-container');
  if (await existingModalContainer.count() > 0) {
    try {
      await page.keyboard.press('Escape');
      await existingModalContainer.first().waitFor({ state: 'hidden', timeout: 2000 });
    } catch (e) {
      // ignore
    }
  }

  // Кнопка добавления гаджета
  const addBtn = page.locator('.add-gadget-btn');
  await addBtn.click();
  
  // Ждем модалку выбора типов
  const modal = page.locator('.gadget-types-modal');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  
  // Выбираем гаджет (фаззи-матч: ё/е и частичные совпадения)
  const cells = modal.locator('.gadget-types-cell');
  let gadgetCell = cells.filter({ hasText: gadgetName }).first();

  if (await gadgetCell.count() === 0) {
    const normalized = gadgetName.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
    gadgetCell = cells.filter({ hasText: normalized }).first();
  }

  if (await gadgetCell.count() === 0) {
    // Частичный матч по ключевым словам для стабильности (например, "Отчёт по времени")
    const g = gadgetName.toLowerCase();
    if (g.includes('отч') || g.includes('timereport') || g.includes('time report')) {
      gadgetCell = cells.filter({ hasText: /Отч[её]т/i }).first();
    } else if (g.includes('burndown')) {
      gadgetCell = cells.filter({ hasText: /сгора/i }).first();
    } else if (g.includes('issuetable') || g.includes('таблиц')) {
      gadgetCell = cells.filter({ hasText: /таблиц/i }).first();
    }
  }

  if (await gadgetCell.count() > 0) {
    await gadgetCell.first().click();
    // Ждем закрытия модалки после добавления, чтобы она не перехватывала клики
    await page.locator('.gadget-types-modal-container').waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(500); // Даем время на отрисовку гаджета
    console.log('✅ Gadget added');
  } else {
    console.warn(`⚠️ Gadget type "${gadgetName}" not found`);
    // Закрываем модалку
    const cancelBtn = page.locator('.gadget-types-modal input[type="button"][value="Отменить"], .gadget-types-modal .btn:has-text("Отменить")');
    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.locator('.gadget-types-modal-container').waitFor({ state: 'hidden', timeout: 5000 });
  }
}

export async function createAutomation(page: Page, name: string, workflowName: string) {
  console.log(`Creating automation: ${name}`);
  
  await navigateMainMenu(page, 'automations');
  await page.waitForSelector('.table_card, .ktable', { timeout: 10000 });
  
  // Кликаем плюс
  const plusBtn = page.locator('.bx-plus-circle');
  await plusBtn.waitFor({state: 'visible'});
  await plusBtn.click();
  
  await page.waitForTimeout(500);
  
  // Заполняем имя
  await changeField(page, 'Название', name);
  
  // Выбираем воркфлоу
  const wfSelect = page.locator('.select-input:has(.label:has-text("Воркфлоу")) .vs__dropdown-toggle');
  if (await wfSelect.count() > 0) {
    await wfSelect.click();
    await page.waitForTimeout(300);
    const option = page.locator(`.vs__dropdown-option:has-text("${workflowName}")`);
    if (await option.count() > 0) {
      await option.first().click();
    } else {
      // Выбираем первый попавшийся если нет нужного
      await page.locator('.vs__dropdown-option').first().click();
    }
  }
  
  // Сохраняем
  const saveBtn = page.locator('input[type="button"][value="Сохранить"]');
  await saveBtn.click();
  await page.waitForTimeout(1000);
  
  console.log('✅ Automation created');
}