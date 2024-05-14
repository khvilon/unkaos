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

  test.beforeEach(async ({ page }) => {
   // await page.setViewportSize({ width: 1920, height: 1080 });
    if (!state) return;
    await page.goto(`/`);
    if (state == 1) await signIn(page, adminEmail, newPass);
    else if (state == 2) await signIn(page, usereMail, newPass);
  });

  test('Регистрация рабочего пространства и смена пароля', async ({ page }) => {
    adminEmail = await getEmailFromTempMail(page);
    state = 1;

    await sendWorkspaceRegister(page, workspace, adminEmail);
    await waitRegisterMail(page);

    const frame = await getIframeBody(page);
    const pass = await frame.locator('strong').innerText();
    const link = await frame.locator('a').getAttribute('href');

    await page.goto(link);
    await signIn(page, adminEmail, pass);
    await changeField(page, 'ФИО', adminName, adminEmail);
    await changeField(page, 'Пароль', newPass, adminEmail);
    await page.waitForSelector('.profile');
    await signOut(page);
  });

  test('Создание пользователя', async ({ page }) => {
    await navigateMainMenu(page, 'workflows');
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
