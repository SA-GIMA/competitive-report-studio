import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface UrlSafetyOptions {
  allowPrivate?: boolean;
}

export async function assertSafeHttpUrl(rawUrl: string, options: UrlSafetyOptions = {}) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL 格式无效。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("URL 仅允许 http 或 https 协议。");
  }

  if (options.allowPrivate) {
    return url;
  }

  const host = url.hostname.toLowerCase();
  if (isBlockedHostName(host)) {
    throw new Error("URL 不能指向本机、内网或链路本地地址。");
  }

  const literalIp = normalizeIpLiteral(host);
  if (literalIp && isPrivateAddress(literalIp)) {
    throw new Error("URL 不能指向本机、内网或链路本地地址。");
  }

  if (!literalIp) {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (addresses.some((entry) => isPrivateAddress(entry.address))) {
      throw new Error("URL 解析到了本机、内网或链路本地地址。");
    }
  }

  return url;
}

const isBlockedHostName = (host: string) =>
  host === "localhost" ||
  host === "localhost.localdomain" ||
  host.endsWith(".localhost") ||
  host.endsWith(".local");

const normalizeIpLiteral = (host: string) => {
  const unwrapped = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  return isIP(unwrapped) ? unwrapped : "";
};

const isPrivateAddress = (address: string) => {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.") ||
      /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  const parts = address.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168 ||
    first >= 224
  );
};
