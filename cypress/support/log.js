const Types = {
  C: { header: "CALLBACK", method: "info" },
  I: { header: "INFO", method: "info" },
  W: { header: "WARN", method: "warn" },
  E: { header: "ERROR", method: "error" },
};

Cypress.on("command:start", function (command) {
  Cypress.qqs ??= {};
  Cypress.qqs.currentCommand = command;
});

Cypress.on("command:end", function (_command) {
  Cypress.qqs.currentCommand = undefined;
});

export function log(type, message, args) {
  const argArray = [];
  if (args) {
    for (const [key, value] of Object.entries(args)) {
      argArray.push(`\n${key}=`);
      argArray.push(value);
    }
  }
  const typeInfo = Types[type];
  assert.exists(typeInfo);
  console[typeInfo.method]("[TEST]", `[${typeInfo.header}]`, message, ...argArray);
  if (Cypress.qqs?.currentCommand) {
    Cypress.log({ message: `[${typeInfo.header}] ${message}` });
  } else {
    cy.log(`[${typeInfo.header}] ${message}`, ...argArray);
  }
}
