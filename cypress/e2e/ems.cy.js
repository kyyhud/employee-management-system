describe("Employee Management System", () => {
  const loginEmail = "admin@email.com";
  const loginPassword = "admin@123";

  it("displays the login page", () => {
    cy.visit("/");

    cy.contains("Admin Login").should("be.visible");
    cy.get('input[name="emailId"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
  });

  it("shows an error for invalid credentials", () => {
    cy.visit("/");

    cy.get('input[name="emailId"]').type("invalid@example.com");
    cy.get('input[name="password"]').type("wrongpassword");
    cy.get('button[type="submit"]').click();

    cy.contains("Invalid email or password").should("be.visible");
  });

  it("logs in with valid credentials", () => {
    cy.visit("/");

    cy.get('input[name="emailId"]').type(loginEmail);
    cy.get('input[name="password"]').type(loginPassword);
    cy.get('button[type="submit"]').click();

    cy.contains("Employee Directory").should("be.visible");
  });

  it("adds a new employee", () => {
    const uniqueEmail = `cypress.${Date.now()}@company.com`;

    cy.visit("/");

    cy.get('input[name="emailId"]').type(loginEmail);
    cy.get('input[name="password"]').type(loginPassword);
    cy.get('button[type="submit"]').click();

    cy.get('a[href="/addEmployee"]').click();

    cy.get('input[name="name"]').type("Cypress Test Employee");
    cy.get('input[name="emailId"]').type(uniqueEmail);
    cy.get('input[name="position"]').type("Test Analyst");
    cy.get('input[name="department"]').type("Quality Assurance");
    cy.get('input[name="contact"]').type("314-555-0199");
    cy.get('input[name="location"]').type("St. Louis, MO");
    cy.get('input[name="joinDate"]').type("2026-07-14");

    cy.contains("button", "Add Employee").click();

    cy.contains("Employee added successfully").should("be.visible");
  });
});
