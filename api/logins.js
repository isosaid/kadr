/**
 * Журнал входов в «HR аналитика» — серверная часть.
 *
 * Хранилище: Redis через REST (Vercel KV / Upstash). Нужны переменные окружения:
 *   KV_REST_API_URL + KV_REST_API_TOKEN   (создаются автоматически при подключении
 *   хранилища в Vercel: Storage → Create → Upstash Redis)
 * Поддерживаются и имена UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 *
 * Проверка пользователя — по тому же хешу, что считает страница: sha256(email|пароль).
 * Пароли на сервер не передаются.
 */

const S = require("./_shared.js");

const KEY  = "hr:logins";
const KEEP = 2000;                       // сколько последних записей хранить

/* Ищем адрес и токен хранилища, не завися от того, какие имена дала интеграция:
   KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_URL — подойдёт любое. */



module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "method" });
    return;
  }

  const body   = await S.readBody(req);
  const email  = String(body.email || "").trim().toLowerCase();
  const hash   = String(body.hash  || "");
  const action = body.action === "list" ? "list" : "record";

  const redis = S.store();
  if (!redis) {
    res.status(503).json({ error: "storage_not_configured" });
    return;
  }

  const u = await S.auth(email, hash, redis);    // чужой не пишет и не читает
  if (!u) {
    res.status(401).json({ error: "auth" });
    return;
  }

  try {
    if (action === "record") {
      const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      const entry = {
        e: email,
        a: u.a ? 1 : 0,
        t: new Date().toISOString(),
        d: String(body.device || "").slice(0, 60),
        i: ip.slice(0, 45),
      };
      await redis(["LPUSH", KEY, JSON.stringify(entry)]);
      await redis(["LTRIM", KEY, 0, KEEP - 1]);
      res.status(200).json({ ok: true });
      return;
    }

    const raw = await redis(["LRANGE", KEY, 0, KEEP - 1]);
    let items = (raw || []).map((s) => { try { return JSON.parse(s) } catch (e) { return null } })
                           .filter(Boolean);
    if (!u.a) items = items.filter((x) => x.e === email);   // не админ видит только себя
    res.status(200).json({ ok: true, admin: !!u.a, items });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
