import dotenv from "dotenv";
import path from "node:path";

// .env.local holds developer overrides; .env is the fallback. dotenv never overwrites a variable already set.
dotenv.config({ path: ".env.local" });
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

required("DATABASE_URL");
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535");
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10) throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 10");
const isProduction = process.env.NODE_ENV === "production";

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
if (isProduction && /change|your-secret/i.test(jwtSecret)) throw new Error("JWT_SECRET is still the example value");

function origin(name: string, fallback: string): string {
  const value = process.env[name] || (isProduction ? required(name) : fallback);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error(`${name} must be an HTTP(S) origin without a path`);
  if (isProduction && url.protocol !== 'https:') throw new Error(`${name} must use HTTPS in production`);
  return url.origin;
}

export const env = {
  isProduction,
  port,
  trustProxy: proxyHops || false,
  jwtSecret,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  /** Where this API is reachable from browsers; used to build upload URLs. */
  publicApiUrl: origin("PUBLIC_API_URL", `http://localhost:${port}`),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || "uploads"),
  corsOrigins: [origin("DASHBOARD_URL", "http://localhost:3002"), origin("STOREFRONT_URL", "http://localhost:3001")],
};
