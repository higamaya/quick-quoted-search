function reviseUrl(value) {
  return value.replace("chrome-extension://__MSG_@@extension_id__", ".");
}

function scanCSSStyleDeclaration(cssStyleDeclaration) {
  for (const name of cssStyleDeclaration) {
    const value = cssStyleDeclaration.getPropertyValue(name);
    if (value.includes("url")) {
      const newValue = reviseUrl(value);
      cssStyleDeclaration.setProperty(name, newValue);
    }
  }
}

export function convertCssUrl(stylesheets) {
  for (const stylesheet of stylesheets) {
    for (const cssRule of stylesheet.cssRules) {
      if (/^(CSSStyleRule|CSSFontFaceRule)$/.test(cssRule.constructor.name)) {
        scanCSSStyleDeclaration(cssRule.style);
      }
    }
  }
}
