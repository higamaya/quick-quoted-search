/**
 * @file Configures the extension.
 * A webpack loader (val-loader) executes this script at build-time, then this
 * script generates configuration dynamically referring the loader context.
 */

module.exports = (_options, loaderContext) => {
  const isProduction = loaderContext.mode === "production";
  const config = {
    logEnabled: !isProduction,
    privateOptionEnabled: !isProduction,
    isMac: false, // Overwritten when the extension starts.
  };
  return {
    cacheable: true,
    code: `module.exports = { config: ${JSON.stringify(config)} };`,
  };
};

// For unit tests on which val-loader is not available.
module.exports.config = {
  logEnabled: true,
  privateOptionEnabled: true,
  isMac: false,
};
