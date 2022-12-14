export function deepEqual(lhs, rhs, params) {
  params = {
    ignoreFunctions: false,
    ...params,
  };

  if (params.ignoreFunctions && typeof lhs === "function" && typeof rhs === "function") {
    return true;
  }

  if (lhs === rhs) {
    return true;
  }

  if (
    lhs === undefined ||
    rhs === undefined ||
    lhs === null ||
    rhs === null ||
    typeof lhs !== "object" ||
    typeof rhs !== "object"
  ) {
    return false;
  }

  if (Array.isArray(lhs) && Array.isArray(rhs)) {
    if (lhs.length !== rhs.length) {
      return false;
    }
    for (let i = 0; i < lhs.length; i++) {
      if (!deepEqual(lhs[i], rhs[i], params)) {
        return false;
      }
    }
    return true;
  } else if (Array.isArray(lhs) || Array.isArray(rhs)) {
    return false;
  }

  const lhsKeys = Object.keys(lhs).sort();
  const rhsKeys = Object.keys(rhs).sort();
  if (!deepEqual(lhsKeys, rhsKeys, params)) {
    return false;
  }
  for (const key of lhsKeys) {
    if (!deepEqual(lhs[key], rhs[key], params)) {
      return false;
    }
  }
  return true;
}
