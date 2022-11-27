const Types = {
  C: { header: "CALLBACK", method: "info" },
  I: { header: "INFO", method: "info" },
  W: { header: "WARN", method: "warn" },
  E: { header: "ERROR", method: "error" },
};

export function log(type, message, params) {
  const paramsArray = [];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      paramsArray.push(`\n${key}=`);
      paramsArray.push(value);
    }
  }
  const typeInfo = Types[type];
  assert.exists(typeInfo);
  console[typeInfo.method]("[TEST]", `[${typeInfo.header}]`, message, ...paramsArray);
  Cypress.log({ message: `[${typeInfo.header}] ${message}` });
}
