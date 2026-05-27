const cheerio = require("cheerio");
const { fetchHTML } = require("./_browser");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return res.status(200).end();

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

    const title  = $("meta[property='og:title']").attr("content")  || $("h1").first().text().trim() || "";
    const poster = $("meta[property='og:image']").attr("content")  || "";
    const desc   = $("meta[name='description']").attr("content")   || "";

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
};
