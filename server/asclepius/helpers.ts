import { Page } from '@playwright/test';

export async function getEmailFromTempMail(page: Page): Promise<string> {
    await page.goto('https://tempmail.lol/');
  
    let email = '';
    const timeout = 15000;
    const interval = 200;
    const startTime = Date.now();
  
    while (!email && Date.now() - startTime < timeout) {
      email = await page.locator('#email_field').inputValue();
      if (email) break;
      await page.waitForTimeout(interval);
    }
  
    if (!email) throw new Error('Email field is empty after waiting');
  
    return email;
}

export async function getIframeBody(page: Page) {
  const frame = await page.frame({ name: 'email_iframe' });
  if (!frame) throw new Error('No frame found');
  await frame.waitForSelector('body');
  return frame.locator('body');
}

export async function waitRegisterMail(page: Page) {
  await page.goto('https://tempmail.lol/');
  await page.waitForSelector('tr[style="cursor: pointer;"]', { timeout: 60000 });
  await page.click('tr[style="cursor: pointer;"]');
}

export async function sendWorkspaceRegister(page: Page, workspace: string, adminEmail: string) {
  await page.goto('https://unkaos.tech/');
  await page.click('a:has-text("Регистрация рабочего пространства")');
  await page.waitForSelector('.register-panel');
  const workspaceInput = page.locator('.register-panel .string.input:has(.label:has-text("Название рабочего пространства")) .string-input');
  await workspaceInput.fill(workspace);

  const emailInput = page.locator('.register-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(adminEmail);

  await page.click('.register-panel .btn_input');
  console.log(`Clicked submit button`);
  await page.waitForSelector('span.workspace-register-ok', { timeout: 10000 });
}

export async function signIn(page: Page, email: string, pass: string) {

  await page.waitForSelector('.login-panel');
  const emailInput = page.locator('.login-panel .string.input:has(.label:has-text("Электронная почта")) .string-input');
  await emailInput.fill(email);
  const passInput = page.locator('.login-panel .string.input:has(.label:has-text("Пароль")) .string-input');
  await passInput.waitFor({ state: 'visible' });
  await passInput.fill(pass);
  await page.click('.login-panel .btn_input');
}



export async function signOut(page: Page) {
  await page.click('.profile-top img');
  await page.click('#profile-menu-exit');
}

export async function navigateMainMenu(page: Page, menu: string) {
  await page.click(`a[href*="/${menu}"]`);
}

export async function changeField(page: Page, key: string, fieldName: string, value: string) {
    await page.click(`span:has-text("${key}")`);
    const field = page.locator(`.label:has-text("${fieldName}")`).locator('..').locator('input.string-input');
    await field.waitFor({ state: 'visible' });
    await field.fill(value);
    await page.click('input[type="button"][value="Сохранить"]');
  }

export async function createUser(page: Page, name: string, login: string, email: string) {
  await page.click('input[type="button"][value="Создать"]');
  await page.fill('.label:has-text("ФИО") ~ input.string-input', name);
  await page.fill('.label:has-text("Логин") ~ input.string-input', login);
  await page.fill('.label:has-text("Адрес почты") ~ input.string-input', email);
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
