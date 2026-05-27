const cheerio = require("cheerio");
const { fetchHTML } = require("./_browser");

const BASE = "https://pelisjuanita.com";

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return res.status(200).end();

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
};
