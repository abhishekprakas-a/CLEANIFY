/**
 * Typed, validated access to environment variables. Throws at first import if a
 * required value is missing, so misconfiguration fails fast at boot.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: process.env.NODE_ENV === "production",

  appName: optional("NEXT_PUBLIC_APP_NAME", "Water Tank Cleaning Service"),
  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  mongodbUri: required("MONGODB_URI"),
  mongodbDbName: optional("MONGODB_DB_NAME", "waterTankCleaning"),

  jwtSecret: required("JWT_SECRET"),
  jwtAccessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
  authCookieName: optional("AUTH_COOKIE_NAME", "wtcs_token"),
  refreshCookieName: optional("AUTH_REFRESH_COOKIE_NAME", "wtcs_refresh"),
  refreshExpiresInDays: Number(optional("JWT_REFRESH_EXPIRES_IN_DAYS", "7")),
  refreshRememberDays: Number(optional("JWT_REFRESH_REMEMBER_DAYS", "30")),
  passwordResetExpiresMinutes: Number(
    optional("PASSWORD_RESET_EXPIRES_MINUTES", "30"),
  ),

  // Web Push (VAPID). Optional — push is disabled when unset.
  vapidPublicKey: optional("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
  vapidPrivateKey: optional("VAPID_PRIVATE_KEY"),
  vapidSubject: optional("VAPID_SUBJECT", "mailto:admin@watertank.local"),

  // Object storage — Cloudflare R2 (S3-compatible API). Endpoint can be given
  // directly or derived from the account id. Region is always "auto" for R2.
  r2AccountId: optional("R2_ACCOUNT_ID"),
  r2Endpoint: optional("R2_ENDPOINT"),
  r2Region: optional("R2_REGION", "auto"),
  r2Bucket: optional("R2_BUCKET"),
  r2AccessKeyId: optional("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: optional("R2_SECRET_ACCESS_KEY"),
  r2PublicBaseUrl: optional("R2_PUBLIC_BASE_URL"),
  r2PresignedExpiresSeconds: Number(
    optional("R2_PRESIGNED_EXPIRES_SECONDS", "300"),
  ),
};
