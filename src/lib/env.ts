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

/** A required secret that must also meet a minimum length (weak keys fail fast). */
function requiredSecret(name: string, minLength = 32): string {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(
      `Environment variable ${name} must be at least ${minLength} characters`,
    );
  }
  return value;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: process.env.NODE_ENV === "production",

  appName: optional("NEXT_PUBLIC_APP_NAME", "Cleanify"),
  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  mongodbUri: required("MONGODB_URI"),
  mongodbDbName: optional("MONGODB_DB_NAME", "waterTankCleaning"),

  jwtSecret: requiredSecret("JWT_SECRET", 32),
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

  // Object storage for before/after job photos (AWS S3, or any S3-compatible
  // provider such as MinIO). For AWS S3 leave S3_ENDPOINT empty — the SDK
  // derives the host from the region.
  storage: {
    endpoint: optional("S3_ENDPOINT"),
    region: optional("S3_REGION", "us-east-1"),
    bucket: optional("S3_BUCKET"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    // Base URL the saved photos are served from (public bucket or CDN domain).
    publicBaseUrl: optional("S3_PUBLIC_BASE_URL"),
    // Path-style is needed for MinIO / some S3-compatible hosts (AWS: false).
    forcePathStyle: optional("S3_FORCE_PATH_STYLE") === "true",
    presignExpires: Number(optional("S3_PRESIGNED_EXPIRES_SECONDS", "300")),
  },
};
