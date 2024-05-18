// https://docs.cypress.io/api/introduction/api.html



function sendWorkspaceRegister(workspace: string, adminEmail: string) {
  cy.visit('https://unkaos.tech/');
  cy.contains('a', 'Регистрация рабочего пространства').click();
  cy.get('.register-panel').should('be.visible');
  cy.get('input.string-input').eq(0).type(workspace);
  cy.get('input.string-input').eq(1).type(adminEmail);
  cy.get('.btn_input').should('be.visible').click();

  cy.contains('span.workspace-register-ok', 'Заявка зарегистрирована', { timeout: 10000 }).should('be.visible')
}

function signIn(email: string, pass: string) {
  cy.get('.login-panel', { timeout: 5000 }).should('be.visible');
  cy.get('input.string-input').eq(0).type(email);
  cy.get('input.string-input').eq(1).type(pass);
  cy.get('input.btn_input').click();
}

function signOut() {
  cy.get('.profile-top img').click();
  cy.get('#profile-menu-exit').should('be.visible').click();
}

function navigateMainMenu(page: string) {
  cy.get(`a[href*="/${page}"]`).click();
}

function changeField(key: string,fieldName: string, value: string) {
  cy.contains('span', key).click();
  cy.contains('.label', fieldName).siblings('input.string-input').clear().type(value);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function createUser(name: string, login: string, email: string) {
  cy.get('input[type="button"][value="Создать"]').click();
  cy.contains('.label', 'ФИО').siblings('input.string-input').clear().type(name);
  cy.contains('.label', 'Логин').siblings('input.string-input').clear().type(login);
  cy.contains('.label', 'Адрес почты').siblings('input.string-input').clear().type(email);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function createProject(name: string, code: string, description: string, owner: string) {
  cy.get('input[type="button"][value="Создать"]').click();
  cy.contains('.label', 'Название').siblings('input.string-input').clear().type(name);
  cy.contains('.label', 'Код').siblings('input.string-input').clear().type(code);
  cy.contains('.label', 'Описание').siblings('textarea').clear().type(description);
  cy.contains('.label', 'Владелец').parents('.user-input').find('.vs__search').clear().type(`${owner}{enter}`);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function createIssueField(name: string, type: string) {
  cy.get('input[type="button"][value="Создать"]').click();
  cy.contains('.label', 'Название').siblings('input.string-input').clear().type(name);
  cy.contains('.label', 'Тип').parents('.select-input').find('.vs__search').clear().type(`${type}{downarrow}{enter}`);
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function check(checkbox: any, check: boolean) {
  if(check) checkbox.check({force: true});
  else checkbox.uncheck({force: true});
}

function createIssueStatus(name: string, isStart: boolean, isEnd: boolean) {
  cy.get('input[type="button"][value="Создать"]').click();
  cy.contains('.label', 'Название').siblings('input.string-input').clear().type(name);
  check(cy.contains('.label', 'Начальный').siblings('input[type="checkbox"]'), isStart);
  check(cy.contains('.label', 'Конечный').siblings('input[type="checkbox"]'), isEnd);
  cy.get('input[type="button"][value="Сохранить"]').click();
}


function moveStatusNode(name: string, x: number, y: number) {
  cy.get('.svg-workflow').contains('tspan', name).parents('.conceptG').then($circle => {
      const rect = $circle[0].getBoundingClientRect();
      const origin = {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
      };

      const relativeX = origin.x + x;
      const relativeY = origin.y + y;

      // Log to verify the coordinates
      console.log('Target coordinates:', relativeX, relativeY);

      // Find the element to be moved, initiate the drag
      cy.get('.svg-workflow').trigger('mousedown', origin.x + 50, origin.y + 50, { force: true, which: 1 });

      
      cy.get('.svg-workflow').trigger('mousemove', 600, 600, { force: true, which: 1 });
      // Perform the move
      cy.get('.svg-workflow').trigger('mouseup', 700, 700, { force: true, which: 1 });
  });
}


function createWorkflow(name: string, statuses: Array<string>) {
  cy.get('input[type="button"][value="Создать"]', { timeout: 10000 }).click();
  cy.contains('.label', 'Название').siblings('input.string-input').clear().type(name);
  cy.contains('li', 'Схема').click();

  cy.get('tbody').contains('span', 'Новая').click();
  cy.get('input[type="button"][value="Использовать статус"]').click();
  moveStatusNode('Новая', 500, 500);
  
  cy.get('input[type="button"][value="Сохранить"]').click();
}

function createIssueType(name: string, workflow: string, fields: Array<string>){
  cy.get('input[type="button"][value="Создать"]').click();
  cy.contains('.label', 'Название').siblings('input.string-input').clear().type(name);
  cy.contains('.label', 'Воркфлоу').parents('.select-input').find('.vs__search').clear().type(`${workflow}{downarrow}{enter}`);
  cy.contains('.label', 'Поля').parents('.select-input').find('.vs__search').clear().type(`${fields[0]}{downarrow}{enter}`);
  for(let i = 0; i < fields.length; i++){
    cy.contains('.label', 'Поля').parents('.select-input').find('.vs__search').clear().type(`${fields[i]}{downarrow}{enter}`);
  }
  cy.get('input[type="button"][value="Сохранить"]').click();
}






describe('Регресионный тест', () => {
  const startTime = new Date().getTime();
  const workspace: string = 'test' + startTime;

  const newPass: string = 'pass' + startTime;

  let adminEmail: string;
  const adminName = 'Марк Захаров'

  const usereMail: string = 'testuser@unkaos.org';
  const userLogin: string = 'spetrov'
  const userName =  'Сергей Петров'

  let state: number = 0;

  before(() => {
    

  });

  beforeEach(() => {
    cy.viewport(1920, 1080);
    if(!state) return;
    cy.visit('https://unkaos.tech/' + workspace + '/login');
    if(state == 1) signIn(adminEmail, newPass);
    else if(state == 2) signIn(usereMail, newPass);
  });

  it('Регистрация рабочего пространства и смена пароля', () => {
    cy.getEmailFromTempMail().then((tempEmail: any) => {
      adminEmail = tempEmail;
      state = 1;

      sendWorkspaceRegister(workspace, adminEmail);

      cy.waitRegisterMail();
      
      cy.getIframeBody().find('strong').then(($str: any) => {
      
        let pass = $str.text();
        cy.getIframeBody().find('a').then(($a: any) => {
          let link = $a.attr('href');
          cy.visit(link);
          signIn(adminEmail, pass);
          cy.get('.profile', { timeout: 10000 }).should('be.visible');
          changeField(adminEmail, 'Пароль', newPass);
          signOut();
          //signIn(adminEmail, newPass);
          
        });
      });  
    });
  });
/*
  it('Смена имени, создание пользователя', () => {
    navigateMainMenu('users');
    changeField(adminEmail, 'ФИО', adminName);
    createUser(userName, userLogin, usereMail);
  });

  it('Изменение и создание проекта', () => {
    navigateMainMenu('projects');
    changeField('BS', 'Название', 'Проект 1');
    //createProject('Проект 2', 'SBS', 'טוב', 'Администратор');
    createProject('Проект 2', 'SBS', 'טוב', userName);
  });

  it('Создание поля', () => {
    navigateMainMenu('fields');
    createIssueField('Завершение (план)', 'Дата');
  });

  it('Создание статуса задачи', () => {
    navigateMainMenu('issue_statuses');
    createIssueStatus('На проверке', false, false);
  });*/

  it('Создание воркфлоу', () => {
    navigateMainMenu('workflows');
    createWorkflow('Тестовый', ['Новая', 'В работе']);
  });

  it('Создание типа задачи', () => {
    navigateMainMenu('issue_types');
    createIssueType('Сторя', 'Простой',['Приоритет', 'Ответственный']);
  });


  /*
  it('Большой сквозной сценарий', () => {
    changeField(adminEmail, 'Пароль', newPass);
    signOut();
    signIn(adminEmail, newPass);
    changeField(adminEmail, 'ФИО', adminName);
    createUser(userName, userLogin, usereMail);

    //navigateMainMenu('projects');
    //changeField('BS', 'Название', 'Проект 1');
    //createProject('Проект 2', 'SBS', 'טוב', 'Администратор');
    //createProject('Проект 2', 'SBS', 'טוב', userName);

    //navigateMainMenu('fields');
    //createIssueField('Завершение (план)', 'Дата');
  });
  */
});


