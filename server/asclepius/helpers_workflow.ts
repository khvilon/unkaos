import { Page } from '@playwright/test';

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
  console.log('Creating workflow:', name, 'with statuses:', statuses);

  // Нажимаем кнопку создания в топбаре
  console.log('Clicking create button');
  await page.click('.topbar .btn_input');
  await page.waitForTimeout(1000);
  
  // Заполняем название на вкладке основное
  console.log('Filling workflow name:', name);
  await page.fill('.table_card_fields .string-input', name);
  await page.waitForTimeout(1000);
  
  // Переходим на вкладку схема
  console.log('Switching to Schema tab');
  await page.click('.tabs__header li:has-text("Схема")');
  await page.waitForTimeout(1000);
  
  // Добавляем первый статус
  console.log('Adding first status:', statuses[0]);
  await page.click('.table-statuses tbody tr td span:has-text("' + statuses[0] + '")');
  await page.waitForTimeout(1000);
  console.log('Clicking add status button');
  await page.click('#add-status-to-graph');
  await page.waitForTimeout(2000);

  // Находим первый узел
  console.log('Looking for first node');
  const node1 = page.locator('.conceptG text').filter({ hasText: statuses[0] }).first();
  await node1.waitFor({ state: 'visible', timeout: 5000 });
  const box1 = await node1.boundingBox();
  if (!box1) {
    console.error('First node not found');
    throw new Error('First node not found');
  }
  console.log('First node found at:', box1);
  
  // Перемещаем первый узел
  console.log('Moving first node to position 200,200');
  await page.evaluate(({ selector, text }) => {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      if (node.textContent?.includes(text)) {
        node.parentElement?.setAttribute('transform', 'translate(200,200)');
        break;
      }
    }
  }, { selector: '.conceptG text', text: statuses[0] });
  await page.waitForTimeout(1000);

  // Проверяем что узел переместился
  console.log('Verifying first node position');
  const newBox1 = await node1.boundingBox();
  if (!newBox1) throw new Error('First node lost after move');
  console.log('First node new position:', newBox1);
  
  // Добавляем второй статус
  console.log('Adding second status:', statuses[1]);
  await page.click('.table-statuses tbody tr td span:has-text("' + statuses[1] + '")');
  await page.waitForTimeout(1000);

  // Проверяем позицию первого узла перед добавлением второго
  console.log('Checking first node position before adding second node');
  const beforeAddBox1 = await node1.boundingBox();
  console.log('First node position before adding second:', beforeAddBox1);

  console.log('Clicking add status button');
  await page.click('#add-status-to-graph');

  // Проверяем позицию первого узла сразу после клика
  console.log('Checking first node position immediately after click');
  const afterClickBox1 = await node1.boundingBox();
  console.log('First node position after click:', afterClickBox1);

  await page.waitForTimeout(1000);

  // Проверяем позицию первого узла после паузы
  console.log('Checking first node position after timeout');
  const afterTimeoutBox1 = await node1.boundingBox();
  console.log('First node position after timeout:', afterTimeoutBox1);

  await page.waitForTimeout(1000);

  // Проверяем не сместился ли первый узел
  console.log('Checking if first node moved after adding second node');
  const checkBox1 = await node1.boundingBox();
  console.log('First node position after adding second:', checkBox1);

  // Находим второй узел
  console.log('Looking for second node');
  console.log('Checking all nodes on graph:');
  const allNodes = await page.locator('.conceptG text').all();
  for (const node of allNodes) {
    const text = await node.textContent();
    console.log('Found node with text:', text);
  }
  
  // Используем текст без пробелов для поиска
  const node2 = page.locator(`.conceptG text`).filter({ hasText: statuses[1].replace(' ', '') });
  await node2.waitFor({ state: 'visible', timeout: 5000 });
  const box2 = await node2.boundingBox();
  if (!box2) {
    console.error('Second node not found');
    throw new Error('Second node not found');
  }
  console.log('Second node found at:', box2);
  
  // Перемещаем второй узел
  console.log('Moving second node to position 400,200');
  await page.evaluate(({ selector, text }) => {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      if (node.textContent?.includes(text)) {
        node.parentElement?.setAttribute('transform', 'translate(400,200)');
        break;
      }
    }
  }, { selector: '.conceptG text', text: statuses[1].replace(' ', '') });
  await page.waitForTimeout(1000);

  // Проверяем что второй узел переместился
  console.log('Verifying second node position');
  const newBox2 = await node2.boundingBox();
  if (!newBox2) throw new Error('Second node lost after move');
  console.log('Second node new position:', newBox2);

  // Проверяем позиции обоих узлов перед включением режима переходов
  console.log('Checking both nodes positions before enabling transition mode');
  const preTransitionBox1 = await node1.boundingBox();
  const preTransitionBox2 = await node2.boundingBox();
  console.log('Nodes positions before transition mode:', {
    node1: preTransitionBox1,
    node2: preTransitionBox2
  });

  // Включаем режим создания переходов
  console.log('Enabling transition creation mode');
  await page.click('.workflows-command-panel .boolean-input');
  await page.waitForTimeout(2000);

  // Находим элементы нод
  const node1El = page.locator('.conceptG').filter({ has: page.locator(`text=${statuses[0]}`) });
  const node2El = page.locator('.conceptG').filter({ has: page.locator(`text=${statuses[1].replace(' ', '')}`) });

  // Получаем координаты центров нод
  console.log('Getting current node positions');
  const nodeBox1 = await node1El.boundingBox();
  const nodeBox2 = await node2El.boundingBox();
  if (!nodeBox1 || !nodeBox2) {
    throw new Error('Node elements not found');
  }

  // Создаем связь между узлами
  console.log('Creating link between nodes');
  
  // Кликаем точно в центр первой ноды
  await node1El.click({ position: { x: nodeBox1.width/2, y: nodeBox1.height/2 }, force: true });
  await page.waitForTimeout(500);
  
  // Проверяем появилась ли dragline
  const dragline = page.locator('.link.dragline');
  await dragline.waitFor({ state: 'visible' });
  console.log('Dragline visible');

  // Медленно перетаскиваем ко второй ноде
  await page.mouse.move(
    nodeBox2.x + nodeBox2.width/2,
    nodeBox2.y + nodeBox2.height/2,
    { steps: 50 }
  );
  await page.waitForTimeout(500);
  
  // Отпускаем на второй ноде
  await node2El.click({ position: { x: nodeBox2.width/2, y: nodeBox2.height/2 }, force: true });
  await page.waitForTimeout(1000);

  // Ждем исчезновения dragline
  await dragline.waitFor({ state: 'hidden' });
  console.log('Dragline hidden');

  // Ждем появления постоянной связи
  console.log('Waiting for permanent link');
  await page.locator('.graph path.link:not(.dragline)').waitFor({ state: 'visible' });
  console.log('Permanent link created');
  
  // Сохраняем воркфлоу
  console.log('Saving workflow');
  await page.click('.table_card_footer .btn_input[value="Создать"]');
  
  // Ждем появления названия в таблице слева
  console.log('Waiting for workflow to appear in table');
  await page.locator(`.ktable tbody tr td span:has-text("${name}")`).waitFor({ state: 'visible' });
  console.log('Workflow creation completed');
}
