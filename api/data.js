/**
 * Полная база сотрудников «HR аналитика» — серверная часть.
 *
 * Выгрузка целиком (10 000+ человек, ~6 МБ JSON) не помещается ни в один запрос,
 * поэтому хранится кусками:
 *   STRING hr:data:meta      {generated, source, count, chunks, size, at, by}
 *   STRING hr:data:c:<N>     кусок JSON-строки, ~350 КБ
 * Страница читает meta, затем куски по одному и склеивает.
 *
 * Куски пишутся во временные ключи hr:data:tmp:<N> и переименовываются только
 * после полной заливки — иначе оборвавшаяся загрузка оставила бы половину базы.
 *
 * Хранилище: Redis через REST (Vercel KV / Upstash), переменные окружения
 * KV_REST_API_URL + KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_*).
 * Читать может любой пользователь, писать — только администратор.
 */

const S = require("./_shared.js");

const K_META = "hr:data:meta";
const K_CHUNK = "hr:data:c:";
const K_TMP = "hr:data:tmp:";
const MAX_CHUNKS = 200;




module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "method" });
    return;
  }

  const body = await S.readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const hash = String(body.hash || "");
  const action = ["meta", "chunk", "begin", "part", "commit", "clear"]
    .includes(body.action) ? body.action : "meta";

  const redis = S.store();
  if (!redis) {
    res.status(503).json({ error: "storage_not_configured" });
    return;
  }

  const u = await S.auth(email, hash, redis);
  if (!u) {
    res.status(401).json({ error: "auth" });
    return;
  }
  const writing = ["begin", "part", "commit", "clear"].includes(action);
  if (writing && !u.a) {
    res.status(403).json({ error: "forbidden" });   // заливать базу может только админ
    return;
  }

  try {
    if (action === "meta") {
      const raw = await redis(["GET", K_META]);
      let meta = null;
      try { meta = raw ? JSON.parse(raw) : null } catch (e) { meta = null }
      res.status(200).json({ ok: true, meta });
      return;
    }

    if (action === "chunk") {
      const i = parseInt(body.i, 10);
      if (!(i >= 0 && i < MAX_CHUNKS)) { res.status(400).json({ error: "bad_index" }); return }
      const s = await redis(["GET", K_CHUNK + i]);
      if (s == null) { res.status(404).json({ error: "no_chunk" }); return }
      res.status(200).json({ ok: true, i, s });
      return;
    }

    if (action === "begin") {
      // чистим прошлую незавершённую заливку
      const keys = [];
      for (let i = 0; i < MAX_CHUNKS; i++) keys.push(K_TMP + i);
      await redis(["DEL"].concat(keys));
      res.status(200).json({ ok: true });
      return;
    }

    if (action === "part") {
      const i = parseInt(body.i, 10);
      const s = typeof body.s === "string" ? body.s : null;
      if (!(i >= 0 && i < MAX_CHUNKS) || s == null) {
        res.status(400).json({ error: "bad_part" }); return;
      }
      await redis(["SET", K_TMP + i, s]);
      res.status(200).json({ ok: true, i });
      return;
    }

    if (action === "commit") {
      const n = parseInt(body.chunks, 10);
      if (!(n > 0 && n <= MAX_CHUNKS)) { res.status(400).json({ error: "bad_chunks" }); return }

      // все куски на месте?
      for (let i = 0; i < n; i++) {
        const ok = await redis(["EXISTS", K_TMP + i]);
        if (!ok) { res.status(400).json({ error: "missing_part_" + i }); return }
      }
      // переносим временные ключи в рабочие
      for (let i = 0; i < n; i++) {
        await redis(["RENAME", K_TMP + i, K_CHUNK + i]);
      }
      // хвост прошлой, более длинной базы убираем
      const tail = [];
      for (let i = n; i < MAX_CHUNKS; i++) tail.push(K_CHUNK + i);
      await redis(["DEL"].concat(tail));

      const meta = {
        generated: String(body.generated || "").slice(0, 40),
        source: String(body.source || "").slice(0, 120),
        count: parseInt(body.count, 10) || 0,
        chunks: n,
        size: parseInt(body.size, 10) || 0,
        at: new Date().toISOString(),
        by: email,
      };
      await redis(["SET", K_META, JSON.stringify(meta)]);
      res.status(200).json({ ok: true, meta });
      return;
    }

    // action === "clear"
    const keys = [K_META];
    for (let i = 0; i < MAX_CHUNKS; i++) { keys.push(K_CHUNK + i); keys.push(K_TMP + i) }
    await redis(["DEL"].concat(keys));
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
