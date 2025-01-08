import { test } from '@playwright/test';
import { getEmailFromTempMail, getIframeBody, waitRegisterMail, sendWorkspaceRegister, signIn, signOut, navigateMainMenu, changeField, createUser, createProject, createIssueField, createIssueStatus, createWorkflow, createIssueType } from '../helpers';

test.describe('Регресионный тест', () => {
  const startTime = new Date().getTime();
  const workspace = 'test' + startTime;
  const newPass = 'pass' + startTime;
  let adminEmail: string;
  const adminName = 'Марк Захаров';
  const usereMail = 'testuser@unkaos.org';
  const userLogin = 'spetrov';
  const userName = 'Сергей Петров';
  let state = 0;
  const baseUrl = 'https://unkaos.local:3000/'

  test.beforeEach(async ({ page }) => {
   // await page.setViewportSize({ width: 1920, height: 1080 });
   console.log('state', state)
    if (!state) return;
    console.log('login url', baseUrl + workspace + '/login');
    await page.goto(baseUrl + workspace + '/login');
    console.log('waitForSelector', '.login-panel .string-input');
    await page.waitForSelector('.login-panel .string-input');
    if (state == 1) 
      {
        console.log('adminEmail', adminEmail, newPass);
        await signIn(page, adminEmail, newPass);
      }
    else if (state == 2) await signIn(page, usereMail, newPass);
    console.log('waitForSelector', '.profile');
    await page.waitForSelector('.profile');
    console.log('waitForSelector', '.main-menu-list');
    await page.waitForSelector('.main-menu-list');
  });

  test('Регистрация рабочего пространства и смена пароля', async ({ page }) => {
    adminEmail = await getEmailFromTempMail();
    

    await sendWorkspaceRegister(page, workspace, adminEmail);
    await waitRegisterMail(page);

    const activationLink = await getIframeBody(page);
    const pass = await activationLink.locator('strong').innerText();
    const link = await activationLink.getAttribute('href');
    if (!link) throw new Error('Activation link not found');

    await page.goto(link.replace('unkaos.ru', 'unkaos.local:3000'));
    await page.waitForSelector('.login-panel .string-input');
    await page.waitForTimeout(2000);
    await signIn(page, adminEmail, pass);

    await page.waitForSelector('.profile');
    await page.goto('/' + workspace + '/configs/users');
    await page.waitForSelector('.ktable .user');
    await changeField(page, 'ФИО', adminName, adminEmail);
    await changeField(page, 'Пароль', newPass, adminEmail);
    await page.waitForSelector('.profile');
    await page.waitForTimeout(1000);
    await signOut(page);
    await signIn(page, adminEmail, newPass);
    await signOut(page);

    state = 1;
  });

  test('Создание пользователя', async ({ page }) => {
    await navigateMainMenu(page, 'users');
    await page.waitForSelector('.table_card_fields');
    await createUser(page, userName, userLogin, userName);
  });
/*
  test('Создание воркфлоу', async ({ page }) => {
    await navigateMainMenu(page, 'workflows');
    await createWorkflow(page, 'Тестовый', ['Новая', 'В работе']);
  });

  test('Создание типа задачи', async ({ page }) => {
    await navigateMainMenu(page, 'issue_types');
    await createIssueType(page, 'Сторя', 'Простой', ['Приоритет', 'Ответственный']);
  });*/
});
