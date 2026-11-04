import { env } from "./lib/env"; // first: loads and checks environment variables
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { HttpError } from "./lib/http";
import { authRouter } from "./routes/auth";
import { analyticsRouter } from "./routes/analytics";
import { customersRouter } from "./routes/customers";
import { discountsRouter } from "./routes/discounts";
import { inventoryRouter } from "./routes/inventory";
import { financeRouter } from "./routes/finance";
import { ordersRouter } from "./routes/orders";
import { platformRouter } from "./routes/platform";
import { productsRouter } from "./routes/products";
import { shippingRouter } from "./routes/shipping";
import { storefrontRouter } from "./routes/storefront";
import { myStoreRouter, publicStoreRouter, templatesRouter } from "./routes/stores";
import { uploadsRouter } from "./routes/uploads";

const app = express();

// Behind one reverse proxy in production, so req.ip is the client, not the proxy.
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.isProduction ? env.corsOrigins : [...env.corsOrigins, "http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

// Uploaded images are embedded by the storefront and dashboard on other origins.
app.use(
  "/uploads",
  helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
  express.static(env.uploadDir, { immutable: true, maxAge: "365d", index: false, dotfiles: "deny" }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/stores/me", myStoreRouter); // before /:slug; "me" is a reserved store slug
app.use("/api/stores", publicStoreRouter);
app.use("/api/stores", storefrontRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/shipping", shippingRouter);
app.use("/api/discounts", discountsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/platform", platformRouter);
app.use("/api", financeRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details !== undefined && { details: err.details }) });
  }
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "That file is too large" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

export default app;
