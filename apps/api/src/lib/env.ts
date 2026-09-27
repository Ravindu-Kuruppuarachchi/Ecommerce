import dotenv from "dotenv";

// .env.local holds developer overrides; .env is the fallback. dotenv never overwrites a variable already set.
dotenv.config({ path: ".env.local" });
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
if (isProduction && /change|your-secret/i.test(jwtSecret)) throw new Error("JWT_SECRET is still the example value");

export const env = {
  isProduction,
  port: Number(process.env.PORT) || 5000,
  jwtSecret,
  corsOrigins: [process.env.DASHBOARD_URL, process.env.STOREFRONT_URL].filter((o): o is string => Boolean(o)),
};
