function reviseUrl(value) {
  return value.replace("chrome-extension://__MSG_@@extension_id__", ".");
}

function scanCSSStyleDeclaration(cssStyleDeclaration) {
  for (let i = 0; i < cssStyleDeclaration.length; i++) {
    const name = cssStyleDeclaration.item(i);
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
      switch (cssRule.constructor.name) {
        case "CSSStyleRule":
        case "CSSFontFaceRule":
          scanCSSStyleDeclaration(cssRule.style);
          break;
      }
    }
  }
}
