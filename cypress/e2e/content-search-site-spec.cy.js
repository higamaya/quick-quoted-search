describe("Content scripts on search engine site", function () {
  // Note: It is expected that the image of the buttons within Popup Icon does
  // not show in this test. The reason is that the image path cannot be resolved
  // because CSS and JS are injected into the external sites by brute force way.

  Cypress.on("uncaught:exception", function (_err, _runnable) {
    // Ignores errors originated from search engine sites, not from the extension.
    return false;
  });

  function visitAndSetup(url) {
    return cy.visitAndSetup(url, { convertCssUrl: false, clickIFrame: false }).then(function (win) {
      cy.readFile("dist/content_bundle.css").then(function (content) {
        win.document.head.appendChild(win.document.createElement("style")).innerHTML = content;
      });
      cy.readFile("dist/content_bundle.js").then(function (content) {
        win.document.head.appendChild(win.document.createElement("script")).innerHTML = content;
      });

      // Prevent tests from overwriting the clipboard and interfering with other work.
      win.navigator.clipboard.writeText = () => {};

      return cy.wrap(win);
    });
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.CONTENT);

    cy.grantClipboardPermissions();
  });

  describe("Auto Enter", function () {
    function visitSearchSiteAndSetup() {
      visitAndSetup.call(this, "https://www.yahoo.co.jp/");
      cy.window().its("navigator.clipboard").thenSpy("writeText").as("spy_clipboard_writeText");
      cy.get("input[name=p]").type("foo").selectText().should("be.selected").mouseUpLeft();
      cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").as("quoteButton");
    }

    context("when the extension's options are { Auto Enter: On, Auto Copy: On }", function () {
      it("should press `Enter` key, and should copy the selected text to the clipboard", function () {
        // --- preparation ---
        visitSearchSiteAndSetup.call(this);
        // --- conditions ---
        cy.setOptions({ autoEnter: true, autoCopy: true });
        // --- actions ---
        cy.get("@quoteButton").click();
        // --- results ---
        cy.url().should("match", /^https:\/\/search\.yahoo\.co\.jp\/search\?p=%22foo%22$/);
        cy.get("@spy_clipboard_writeText").should("have.been.calledOnceWithExactly", "foo");
      });
    });

    context("when the extension's options are { Auto Enter: On, Auto Copy: Off }", function () {
      it("should press `Enter` key, and should NOT copy the selected text to the clipboard", function () {
        // --- preparation ---
        visitSearchSiteAndSetup.call(this);
        // --- conditions ---
        cy.setOptions({ autoEnter: true, autoCopy: false });
        // --- actions ---
        cy.get("@quoteButton").click();
        // --- results ---
        cy.url().should("match", /^https:\/\/search\.yahoo\.co\.jp\/search\?p=%22foo%22$/);
        cy.defer(function () {
          cy.get("@spy_clipboard_writeText").should("have.not.been.called");
        });
      });
    });

    context("when the extension's options are { Auto Enter: Off, Auto Copy: On }", function () {
      it("should NOT press `Enter` key, and should NOT copy the selected text to the clipboard", function () {
        // --- preparation ---
        visitSearchSiteAndSetup.call(this);
        // --- conditions ---
        cy.setOptions({ autoEnter: false, autoCopy: true });
        // --- actions ---
        cy.get("@quoteButton").click();
        // --- results ---
        cy.url().should("equal", "https://www.yahoo.co.jp/");
        cy.get("input[name=p]").should("have.value", '"foo"').and("be.selected", 1, 4);
        cy.defer(function () {
          cy.get("@spy_clipboard_writeText").should("have.not.been.called");
        });
      });
    });
  });

  describe(
    "Auto Enter on all supported search engine sites (Note: This test is flaky due to focus-related matter. So rerun it if failed.)",
    { retries: 2 },
    function () {
      const SEARCH_ENGINES = [
        {
          name: "Google - Top page",
          url: "https://www.google.com/",
          inputPattern: "input[name=q]",
          searchPhrase: "foo",
          resultUrlPattern: /^https:\/\/www\.google\.com\/search\?q=%22foo%22(&.+)?$/,
        },
        {
          name: "Google - Search result page",
          url: "https://www.google.com/search?q=foo",
          inputPattern: "input[name=q]",
          searchPhrase: "bar",
          resultUrlPattern: /^https:\/\/www\.google\.com\/search\?q=%22bar%22(&.+)?$/,
        },
        {
          name: "Google Scholar - Top page",
          url: "https://scholar.google.com/",
          inputPattern: "input[name=q]",
          searchPhrase: "foo",
          resultUrlPattern: /^https:\/\/scholar\.google\.com\/scholar\?(.+=.+&)*q=%22foo%22(&.+)?$/,
        },
        {
          name: "Google Scholar - Search result page",
          url: "https://scholar.google.com/scholar?q=foo",
          inputPattern: "input[name=q]",
          searchPhrase: "bar",
          resultUrlPattern: /^https:\/\/scholar\.google\.com\/scholar\?(.+=.+&)*q=%22bar%22(&.+)?$/,
          skipOnCi: true, // Skip this test on CI because reCAPTCHA interferes with it.
        },
        {
          name: "Bing - Top page",
          url: "https://www.bing.com/",
          inputPattern: "input[name=q]",
          searchPhrase: "foo",
          resultUrlPattern: /^https:\/\/www\.bing\.com\/search\?q=%22foo%22(&.+)?$/,
        },
        {
          name: "Bing - Search result page",
          url: "https://www.bing.com/search?q=foo",
          inputPattern: "input[name=q]",
          searchPhrase: "bar",
          resultUrlPattern: /^https:\/\/www\.bing\.com\/search\?q=%22bar%22(&.+)?$/,
          skipOnCi: true, // Skip this test on CI because it fails due to unexpected redirection
        },
        {
          name: "Yahoo - Top page",
          url: "https://www.yahoo.com/",
          inputPattern: "input[name=p]",
          searchPhrase: "foo",
          resultUrlPattern: /^https:\/\/search\.yahoo\.com\/search\?p=%22foo%22(&.+)?$/,
        },
        {
          name: "Yahoo - Search result page",
          url: "https://search.yahoo.com/search?p=foo",
          inputPattern: "input[name=p]",
          searchPhrase: "bar",
          resultUrlPattern: /^https:\/\/search\.yahoo\.com\/search(;.+=.+)*\?p=%22bar%22(&.+)?$/,
        },
        {
          name: "Yahoo Japan - Top page",
          url: "https://www.yahoo.co.jp/",
          inputPattern: "input[name=p]",
          searchPhrase: "foo",
          resultUrlPattern: /^https:\/\/search\.yahoo\.co\.jp\/search\?p=%22foo%22$/,
        },
        {
          name: "Yahoo Japan - Search result page",
          url: "https://search.yahoo.co.jp/search?p=foo",
          inputPattern: "input[name=p]",
          searchPhrase: "bar",
          resultUrlPattern: /^https:\/\/search\.yahoo\.co\.jp\/search\?p=%22bar%22(&.+)?$/,
        },
        {
          name: "DuckDuckGo - Top page",
          url: "https://duckduckgo.com/",
          inputPattern: "input[name=q]",
          searchPhrase: "foo",
          resultUrlPattern: /^https:\/\/duckduckgo\.com\/\?q=%22foo%22(&.+)?$/,
        },
        {
          name: "DuckDuckGo - Search result page",
          url: "https://duckduckgo.com/?q=foo",
          inputPattern: "input[name=q]",
          searchPhrase: "bar",
          resultUrlPattern: /^https:\/\/duckduckgo\.com\/\?q=%22bar%22(&.+)?$/,
        },
      ];
      for (const { name, url, inputPattern, searchPhrase, resultUrlPattern, skipOnCi } of SEARCH_ENGINES) {
        context(`on ${name}`, function () {
          it("should press `Enter` key and show search results", function () {
            // --- preparation ---
            if (Cypress.env("test_search_site") !== "on") {
              Cypress.qqs.log("I", "Skip the test case because `test_search_site` is not `on`");
              this.skip();
            }
            if (skipOnCi && Cypress.env("test_on") === "ci") {
              Cypress.qqs.log("I", "Skip the test case because it does not work as expected in CI");
              this.skip();
            }
            // --- conditions ---
            visitAndSetup.call(this, url);
            // --- actions ---
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.get(inputPattern)
              .first()
              .focus()
              .wait(100)
              .selectText()
              .type(searchPhrase)
              .should("have.value", searchPhrase)
              .selectText()
              .should("be.selected")
              .mouseUpLeft();
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            cy.url().should("match", resultUrlPattern);
          });
        });
      }
    }
  );
});
