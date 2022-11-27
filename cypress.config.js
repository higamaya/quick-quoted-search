const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "dvbeep",
  chromeWebSecurity: false,
  numTestsKeptInMemory: 100,
  e2e: {
    setupNodeEvents(on, config) {
      require("@cypress/code-coverage/task")(on, config);
      on("file:preprocessor", require("@cypress/code-coverage/use-babelrc"));
      return config;
    },
    env: {
      codeCoverage: {
        exclude: ["cypress/**/*.js"],
      },
    },
  },
});
