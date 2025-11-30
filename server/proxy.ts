import express from "express";
import type { Request, Response } from "express";
import { parseRSS } from "../src/lib/parseRSS";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => res.send("RSS proxy running"));

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/**
 * POST /api/parse-rss
 * body: { url: "https://example.com/feed.xml" }
 * Returns JSON: { success: true, data: [...] }
 */
app.post("/api/parse-rss", async (req: Request, res: Response) => {
  try {
    const url = new URL(req.body?.url).toString();
    const result = await parseRSS(url);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(result);
  } catch (err: any) {
    console.error("parse-rss error:", err);
    res.status(400).send(String(err.message ?? err));
  }
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () =>
  console.log(`RSS proxy listening on http://localhost:${PORT}`)
);
