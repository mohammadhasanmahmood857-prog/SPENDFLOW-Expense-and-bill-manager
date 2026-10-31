const fallbackOrigin = "https://spendflow.local";
const configuredOrigin = (() => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin;
    return new URL(siteUrl).origin;
  } catch {
    return new URL(fallbackOrigin).origin;
  }
})();
const allowedLocalHosts = new Set([
  "spendflow.local",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

function normalizeSafePath(pathname: string) {
  if (!pathname || pathname.startsWith("//") || pathname.includes("\\")) return "/dashboard";
  return pathname;
}

export function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/dashboard";
  const candidate = value.trim();
  if (!candidate) return "/dashboard";

  if (candidate.startsWith("/")) {
    try {
      const url = new URL(candidate, configuredOrigin);
      if (url.origin !== configuredOrigin) return "/dashboard";
      return normalizeSafePath(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return "/dashboard";
    }
  }

  if (!/^https?:\/\//i.test(candidate)) return "/dashboard";

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isConfiguredOrigin = url.origin === configuredOrigin;
    const isLocal = allowedLocalHosts.has(hostname) || hostname.endsWith(".localhost");
    if (!isConfiguredOrigin && !isLocal) return "/dashboard";
    return normalizeSafePath(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return "/dashboard";
  }
}
