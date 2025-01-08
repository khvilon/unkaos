import { Page } from '@playwright/test';

interface Email {
    id: number;
    from: string;
    subject: string;
    date: string;
    body: string;
}

let currentEmail: string = '';
let currentDomain: string = '';

async function getEmails(): Promise<Email[]> {
  console.log(`Getting emails`);
  const response = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${currentEmail}&domain=${currentDomain}`);
  const emails = await response.json();
  console.log(`Emails count: ${emails.length}`);
  return emails;
}

async function readEmail(id: number): Promise<Email> {
  console.log(`Reading email`);
  const response = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${currentEmail}&domain=${currentDomain}&id=${id}`);
  const email = await response.json();
  console.log(`Email subject: ${email.subject}`);
  return email;
}

export async function getEmailFromTempMail(): Promise<string> {
  console.log(`Getting email from temp mail`);
  const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox');
  const [email] = await response.json();
  const [login, domain] = email.split('@');
  currentEmail = login;
  currentDomain = domain;
  console.log(`Current email: ${currentEmail}@${currentDomain}`);
  return email;
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

    // Читаем первое письмо
    const email = await readEmail(emails[0].id);
    
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
    }, email.body);

    if (!activationData) {
        throw new Error('Could not find activation link or password in email');
    }

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
  await page.goto('https://unkaos.local:3000/');
  
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
  await fillLocator(page, '.login-panel .string.input:has(.label:has-text("Электронная почта")) .string-input', email);
  await fillLocator(page, '.login-panel .string.input:has(.label:has-text("Пароль")) .string-input', pass);

  await page.click('.login-panel .btn_input');
  console.log(`Clicked login button`);
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
  await page.click('input[type="button"][value="Создать"]');
  await changeField(page, "ФИО", name);
  await changeField(page, "Логин", login);
  await changeField(page, "Адрес почты", email);
  await page.click('input[type="button"][value="Сохранить"]');
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

export async function moveStatusNode(page: Page, name: string, x: number, y: number) {
  const element = page.locator('.svg-workflow').locator(`text="${name}"`).locator('..');
  const boundingBox = await element.boundingBox();
  if (!boundingBox) throw new Error('Element not found');
  const originX = boundingBox.x + boundingBox.width / 2;
  const originY = boundingBox.y + boundingBox.height / 2;

  await page.mouse.move(originX, originY);
  await page.mouse.down();
  await page.mouse.move(originX + x, originY + y);
  await page.mouse.up();
}

export async function createWorkflow(page: Page, name: string, statuses: string[]) {
  await page.click('input[type="button"][value="Создать"]');
  await page.fill('.label:has-text("Название") ~ input.string-input', name);
  await page.click('li:has-text("Схема")');
  await page.click('tbody span:has-text("Новая")');
  await page.click('input[type="button"][value="Использовать статус"]');
  await moveStatusNode(page, 'Новая', 500, 500);
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
