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

async function generateEmail(): Promise<string> {
    const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox');
    const [email] = await response.json();
    const [login, domain] = email.split('@');
    currentEmail = login;
    currentDomain = domain;
    return email;
}

async function getEmails(): Promise<Email[]> {
    const response = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${currentEmail}&domain=${currentDomain}`);
    return response.json();
}

async function readEmail(id: number): Promise<Email> {
    const response = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${currentEmail}&domain=${currentDomain}&id=${id}`);
    return response.json();
}

export async function getEmailFromTempMail(page: Page): Promise<string> {
    const email = await generateEmail();
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
    
    // Создаем временный iframe с содержимым письма
    await page.evaluate((html) => {
        const iframe = document.createElement('iframe');
        iframe.name = 'email_iframe';
        iframe.srcdoc = html;
        document.body.appendChild(iframe);
    }, email.body);

    const frame = await page.frame({ name: 'email_iframe' });
    if (!frame) throw new Error('No frame found');
    await frame.waitForSelector('body');
    
    // Ищем ссылку активации по тексту
    const activationLink = frame.locator('a:has-text("активировать")').first();
    await activationLink.waitFor({ state: 'visible' });
    
    return activationLink;
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
  
  // Добавляем проверку на ошибки
  const errorLabel = page.locator('.register-err-label');
  const exists = await errorLabel.isVisible();
  if (exists) {
    const errorText = await errorLabel.innerText();
    console.error('Registration error:', errorText);
  }

  console.log('Waiting for success message...');
  await page.waitForSelector('span.workspace-register-ok', { timeout: 10000 });
  console.log('Success message found!');
}

export async function signIn(page: Page, email: string, pass: string) {

  await page.waitForSelector('.login-panel');
  const emailInput = page.locator('.login-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
  await emailInput.fill(email);
  const passInput = page.locator('.login-panel .string.input:has(.label:has-text("Пароль")) .string-input');
  await passInput.waitFor({ state: 'visible' });
  await passInput.fill(pass);
  await page.click('.login-panel .btn_input');
  console.log(`Clicked login button`);
}

export async function signOut(page: Page) {
  await page.click('.profile-top img');
  await page.click('#profile-menu-exit');
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
