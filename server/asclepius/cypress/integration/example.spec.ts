// https://docs.cypress.io/api/introduction/api.html

describe('My First Test', () => {
  it('visits the app root url', () => {
    cy.visit('https://unkaos.tech')
    cy.contains('h1', 'You did it!')
  })
})
