import crypto from "node:crypto";

type MonitorJwtPayload = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  scope: "monitor:ingest";
};

function getSecret() {
  const secret = process.env.MONITOR_JWT_SECRET;
  if (!secret) {
    throw new Error("MONITOR_JWT_SECRET is not configured");
  }
  return secret;
}

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url");
}

function signPart(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest();
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createMonitorJwt(userId: string, tokenId: string, expiresInSeconds = 60 * 60 * 24 * 30) {
  const iat = Math.floor(Date.now() / 1000);
  const payload: MonitorJwtPayload = {
    sub: userId,
    jti: tokenId,
    iat,
    exp: iat + expiresInSeconds,
    scope: "monitor:ingest",
  };

  const header = { alg: "HS256", typ: "JWT" } as const;
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = toBase64Url(signPart(unsigned, getSecret()));
  return `${unsigned}.${signature}`;
}

export function verifyMonitorJwt(token: string): MonitorJwtPayload | null {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signPart(unsigned, getSecret());
  const providedSignature = fromBase64Url(encodedSignature);
  if (
    expectedSignature.length !== providedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, providedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as MonitorJwtPayload;
    if (!payload?.sub || !payload?.jti || payload.scope !== "monitor:ingest") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

