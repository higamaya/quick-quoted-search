import "@cypress/code-coverage/support";
import "cypress-real-events/support";

import "./commands";
import "./assertions";

import { log } from "./log.js";
import { defaultOptionValues } from "./default_option_values.js";
import { CrxApiMockFactory } from "./chrome_extensions_api_mock.js";
import { convertCssUrl } from "./css_url_converter.js";
import { isSameOrigin } from "./same_origin.js";
import { deepEqual } from "./deep_equal.js";
Cypress.qqs = { log, defaultOptionValues, CrxApiMockFactory, convertCssUrl, isSameOrigin, deepEqual };
