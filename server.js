const express = require("express");
const cheerio = require("cheerio");
const cors = require("cors");
const path = require("path");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = "https://pelisjuanita.com";

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── Browser helper ────────────────────────────────────────────────────────────

async function fetchHTML(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "es-ES,es;q=0.9" },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500);
    return await page.content();
  } finally {
    await browser.close();
  }
}

// ── GET /api/search?q=titulo ──────────────────────────────────────────────────

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Falta el parámetro q" });

  try {
    const url = `${BASE}/movies/search?s=${encodeURIComponent(q)}`;
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    const results = [];

    $("a[href*='/movies/pelicula/'], a[href*='/series/ver-serie/']").each((_, el) => {
      const link = $(el).attr("href") || "";
      const title =
        $(el).find("h2").first().text().trim() ||
        $(el).attr("aria-label") ||
        $(el).text().trim();
      const imgTag = $(el).find("img");
      const img = imgTag.attr("src") || imgTag.attr("data-src") || "";
      const yearMatch = $(el).text().match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : "";
      const type = link.includes("/series/") ? "serie" : "pelicula";
      const absoluteLink = link.startsWith("http") ? link : `${BASE}${link}`;

      if (title && link) {
        results.push({ title, link: absoluteLink, img, year, type });
      }
    });

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/servers?url=... ──────────────────────────────────────────────────

app.get("/api/servers", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Falta el parámetro url" });

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    const servers = [];

    $("div.row-download").each((_, el) => {
      let embedUrl = $(el).attr("data-url") || "";

      if (!embedUrl) {
        const onclick = $(el).attr("onclick") || "";
        const match = onclick.match(/['"]([^'"]+)['"]/);
        if (match) embedUrl = match[1];
      }

      const tipo   = $(el).attr("data-tipo") || "";
      const idioma = $(el).attr("data-idioma") || "";
      const spans  = $(el).find("span").map((_, s) => $(s).text().trim()).get();
      const name   = spans.join(" ").trim() || `${tipo} ${idioma}`.trim() || "Servidor";

      if (embedUrl && tipo === "stream") {
        servers.push({ name, url: embedUrl, idioma });
      }
    });

    if (servers.length === 0) {
      const src = $("iframe#if-video").attr("src") || $("iframe").first().attr("src") || "";
      if (src) servers.push({ name: "Servidor 1", url: src, idioma: "?" });
    }

    const title    = $("meta[property='og:title']").attr("content")  || $("h1").first().text().trim() || "";
    const poster   = $("meta[property='og:image']").attr("content")  || "";
    const desc     = $("meta[name='description']").attr("content")   || "";
    const episodes = [];

    $("ul.ul-temporada a.episodio-item").each((_, el) => {
      const epLink  = $(el).attr("href") || "";
      const epTitle = $(el).find("h2.list-title").text().replace(/\s+/g, " ").trim();
      const epDesc  = $(el).find("p.list-sinopsis").text().trim();
      const epInfo  = $(el).find("span.episodio-info").text().trim();
      if (epLink) episodes.push({ link: epLink, title: epTitle, desc: epDesc, info: epInfo });
    });

    res.json({ title, poster, desc, servers, episodes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
