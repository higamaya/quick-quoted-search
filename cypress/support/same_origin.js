function extractRootDomain(domain) {
  const parts = domain.split(".");
  if (parts.length >= 3) {
    domain = parts[parts.length - 2] + "." + parts[parts.length - 1];
    if (domain.length == 2 + 1 + 2) {
      domain = parts[parts.length - 3] + "." + domain;
    }
  }
  return domain;
}

export function isSameOrigin(lhs, rhs) {
  const base = "http://localhost";
  const urlLhs = new URL(lhs, base);
  const urlRhs = new URL(rhs, base);

  if (urlLhs.hostname == "localhost" && urlRhs.hostname === "localhost") {
    return true;
  } else {
    return (
      urlLhs.protocol === urlRhs.protocol &&
      extractRootDomain(urlLhs.hostname) === extractRootDomain(urlRhs.hostname) &&
      urlLhs.port === urlRhs.port
    );
  }
}
