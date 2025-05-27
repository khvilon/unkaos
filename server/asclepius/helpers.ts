import { Page } from '@playwright/test';

const baseUrl = 'https://localhost';

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

export async function getIframeBody(page: Page) {
    // Ждем появления писем
    let emails: Email[] = [];
    const timeout = 60000;
    const interval = 2000;
    const startTime = Date.now();

    while (emails.length === 0 && Date.now() - startTime < timeout) {
        emails = await getEmails();
        if (emails.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, interval));
    }

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
    // Ждем появления писем
    let emails: Email[] = [];
    const timeout = 60000;
    const interval = 2000;
    const startTime = Date.now();

    while (emails.length === 0 && Date.now() - startTime < timeout) {
        emails = await getEmails();
        if (emails.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (emails.length === 0) {
        throw new Error('No registration email received after timeout');
    }
}

export async function sendWorkspaceRegister(page: Page, workspace: string, adminEmail: string) {
  console.log('Navigating to homepage...');
  await page.goto(baseUrl);
  
  console.log('Clicking registration link...');
  await page.click('a:has-text("Регистрация рабочего пространства")');
  
  console.log('Waiting for register panel...');
  await page.waitForSelector('.register-panel');
  
  console.log('Filling workspace name:', workspace);
  const workspaceInput = page.locator('.register-panel .string.input:has(.label:has-text("Название рабочего пространства")) .string-input');
  await workspaceInput.fill(workspace);

  console.log('Filling email:', adminEmail);
  const emailInput = page.locator('.register-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(adminEmail);

  console.log('Clicking submit button...');
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
    
    // Заполняем email
    const emailInput = page.locator('.login-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);
    
    // Заполняем пароль
    const passwordInput = page.locator('.login-panel .string.input:has(.label:has-text("Пароль")) .string-input');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(pass);

    // Нажимаем кнопку входа и ждем навигации
    const loginButton = page.locator('.login-panel .btn_input');
    await loginButton.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log(`Clicking login button and waiting for navigation...`);
    
    // Ждем навигацию после клика
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
      loginButton.click()
    ]);
    
    console.log(`Navigation completed, current URL: ${page.url()}`);
    
    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
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
  await page.click(`a[href*="/${menu}"]`);
}

export async function changeField(page: Page, fieldName: string, value: string, key: string = '') {
    if(key) await page.click(`span:has-text("${key}")`, { timeout: 5000 });
    const field = page.locator(`.label:has-text("${fieldName}")`).locator('..').locator('input.string-input');
    await field.waitFor({ state: 'visible' });
    await field.fill(value);
    if(key) await page.click('input[type="button"][value="Сохранить"]');
}

export async function createUser(page: Page, name: string, login: string, email: string) {
  console.log(`Creating user`, name, login, email);
  
  try {
    // Нажимаем кнопку "Создать"
    console.log('Clicking "Создать" button...');
    await page.click('input[type="button"][value="Создать"]');
    
    // Заполняем поля
    console.log('Filling ФИО field...');
    await changeField(page, "ФИО", name);
    
    console.log('Filling Логин field...');
    await changeField(page, "Логин", login);
    
    console.log('Filling Адрес почты field...');
    await changeField(page, "Адрес почты", email);
    
    // Нажимаем кнопку "Создать" для сохранения
    console.log('Clicking final "Создать" button...');
    await page.click('input[type="button"][value="Создать"]');
    
    // Ждем немного для обработки
    await page.waitForTimeout(2000);
    
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
    await page.waitForSelector('.ktable', { timeout: 10000 });
    
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
    
    if (userByLoginCount === 0 && userByEmailCount === 0) {
      // Попробуем найти любые строки в таблице
      const allRows = await page.locator('.ktable .user, .ktable tr, .ktable .row').all();
      console.log(`Total rows in table: ${allRows.length}`);
      
      for (let i = 0; i < Math.min(allRows.length, 5); i++) {
        const rowText = await allRows[i].textContent();
        console.log(`Row ${i}: ${rowText}`);
      }
      
      throw new Error(`User with login "${login}" or email "${email}" not found in table after creation`);
    }
    
    // Ждем появления пользователя (по логину или email)
    if (userByLoginCount > 0) {
      await userByLoginLocator.waitFor({ state: 'visible', timeout: 10000 });
      console.log(`User with login "${login}" created successfully`);
    } else {
      await userByEmailLocator.waitFor({ state: 'visible', timeout: 10000 });
      console.log(`User with email "${email}" created successfully`);
    }
    
  } catch (error) {
    console.error(`Failed to create user:`, error);
    throw error;
  }
}

export async function createProject(page: Page, name: string, code: string, description: string, owner: string) {
  await page.click('input[type="button"][value="Создать"]');
  await page.fill('.label:has-text("Название") ~ input.string-input', name);
  await page.fill('.label:has-text("Код") ~ input.string-input', code);
  await page.fill('.label:has-text("Описание") ~ textarea', description);
  await page.fill('.label:has-text("Владелец") ~ .vs__search', `${owner}{enter}`);
  await page.click('input[type="button"][value="Сохранить"]');
}

export async function createIssueField(page: Page, name: string, type: string) {
  await page.click('input[type="button"][value="Создать"]');
  await page.fill('.label:has-text("Название") ~ input.string-input', name);
  await page.fill('.label:has-text("Тип") ~ .vs__search', `${type}{downarrow}{enter}`);
  await page.click('input[type="button"][value="Сохранить"]');
}

export async function check(checkbox: any, check: boolean) {
  if (check) {
    await checkbox.check({ force: true });
  } else {
    await checkbox.uncheck({ force: true });
  }
}

export async function createIssueStatus(page: Page, name: string, isStart: boolean, isEnd: boolean) {
  await page.click('input[type="button"][value="Создать"]');
  await page.fill('.label:has-text("Название") ~ input.string-input', name);
  await check(page.locator('.label:has-text("Начальный") ~ input[type="checkbox"]'), isStart);
  await check(page.locator('.label:has-text("Конечный") ~ input[type="checkbox"]'), isEnd);
  await page.click('input[type="button"][value="Сохранить"]');
}

export async function createIssueType(page: Page, name: string, workflow: string, fields: string[]) {
  await page.click('input[type="button"][value="Создать"]');
  await page.fill('.label:has-text("Название") ~ input.string-input', name);
  await page.fill('.label:has-text("Воркфлоу") ~ .vs__search', `${workflow}{downarrow}{enter}`);
  for (const field of fields) {
    await page.fill('.label:has-text("Поля") ~ .vs__search', `${field}{downarrow}{enter}`);
  }
  await page.click('input[type="button"][value="Сохранить"]');
}
