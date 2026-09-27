import express, { Router } from "express";
import { asyncHandler, HttpError } from "../lib/http";
import { detectImageType, saveImage } from "../lib/storage";
import { merchant } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";

export const uploadsRouter = Router();

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Upload one image as the raw request body. Responds with its public URL. */
uploadsRouter.post(
  "/",
  ...merchant,
  rateLimit({ windowMs: 60_000, max: 30 }),
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  asyncHandler(async (req, res) => {
    const data = req.body;
    if (!Buffer.isBuffer(data) || data.length === 0) throw new HttpError(400, "Send the image file as the request body");
    const ext = detectImageType(data);
    if (!ext) throw new HttpError(415, "Upload a PNG, JPEG, WebP or GIF image");
    res.status(201).json({ url: await saveImage(req.store!.id, data, ext) });
  }),
);
