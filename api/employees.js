/**
 * Правки по сотрудникам в «HR аналитика» — серверная часть.
 *
 * Зачем: сами данные (10 000+ человек) вшиты в страницу и меняются только при
 * пересборке файла. А добавления, изменения и удаления, сделанные через форму,
 * до сих пор жили лишь в памяти вкладки и пропадали при обновлении страницы.
 * Здесь они складываются в общую базу, поэтому видны всем и не теряются.
 *
 * Хранится НЕ вся база, а только правки поверх встроенной выгрузки:
 *   HASH hr:emp:edits   id -> {op:"upsert"|"delete", p:{...}, e:кто, t:когда}
 *   LIST hr:emp:log     последние операции, для разбора «кто что менял»
 * При загрузке страница накладывает эти правки на встроенные данные.
 *
 * Хранилище: Redis через REST (Vercel KV / Upstash), переменные окружения
 * KV_REST_API_URL + KV_REST_API_TOKEN (или UPSTASH_REDIS_REST_*).
 * Проверка пользователя — по тому же хешу, что считает страница: sha256(email|пароль).
 * Пароли на сервер не передаются.
 */

const S = require("./_shared.js");

const KEY_EDITS = "hr:emp:edits";
const KEY_LOG   = "hr:emp:log";
const LOG_KEEP  = 1000;
const MAX_BYTES = 200 * 1024;      // потолок на одну запись о сотруднике




/* Таджикские буквы приводим к русским аналогам — так же, как это делает страница,
   иначе «Сиёма» из формы и «Сиёма» из данных могут не совпасть. */
const TJ = { "ӯ": "у", "Ӯ": "у", "ғ": "г", "Ғ": "г", "ҳ": "х", "Ҳ": "х",
             "ӣ": "и", "Ӣ": "и", "ҷ": "ч", "Ҷ": "ч", "қ": "к", "Қ": "к" };
function fold(s) {
  return String(s == null ? "" : s).trim().replace(/[ӯӮғҒҳҲӣӢҷҶқҚ]/g, (c) => TJ[c]).toLowerCase();
}

/* Какие компании затрагивает запись о сотруднике */
function personCompanies(p) {
  const out = new Set();
  (p && p.cos || []).forEach((c) => c && out.add(c));
  if (p && p.co) out.add(p.co);
  (p && p.ev || []).forEach((e) => e && e[2] && out.add(e[2]));
  return [...out];
}

/* Не админ правит только свои компании — проверяем на сервере, а не только в форме */
function allowed(u, companies) {
  if (u.a) return true;
  const mine = new Set((u.c || []).map(fold));
  return companies.length > 0 && companies.every((c) => mine.has(fold(c)));
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "method" });
    return;
  }

  const body   = await S.readBody(req);
  const email  = String(body.email || "").trim().toLowerCase();
  const hash   = String(body.hash  || "");
  const action = ["list", "save", "delete"].includes(body.action) ? body.action : "list";

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

  try {
    if (action === "list") {
      const raw = await redis(["HGETALL", KEY_EDITS]);
      const items = [];
      // Upstash отдаёт HGETALL плоским массивом [поле, значение, поле, значение...]
      if (Array.isArray(raw)) {
        for (let i = 1; i < raw.length; i += 2) {
          try { items.push(JSON.parse(raw[i])) } catch (e) { /* битую запись пропускаем */ }
        }
      } else if (raw && typeof raw === "object") {
        for (const k of Object.keys(raw)) {
          try { items.push(JSON.parse(raw[k])) } catch (e) {}
        }
      }
      res.status(200).json({ ok: true, admin: !!u.a, items });
      return;
    }

    const id = String(body.id || "").slice(0, 40);
    if (!id) { res.status(400).json({ error: "no_id" }); return }

    if (action === "delete") {
      // Удалять можно только то, что доступно: сверяемся с присланной записью
      const cos = personCompanies(body.person || {});
      if (!allowed(u, cos)) { res.status(403).json({ error: "forbidden" }); return }

      const entry = { op: "delete", id, e: email, t: new Date().toISOString(),
                      fio: String((body.person || {}).fio || "").slice(0, 120) };
      await redis(["HSET", KEY_EDITS, id, JSON.stringify(entry)]);
      await redis(["LPUSH", KEY_LOG, JSON.stringify(entry)]);
      await redis(["LTRIM", KEY_LOG, 0, LOG_KEEP - 1]);
      res.status(200).json({ ok: true });
      return;
    }

    // action === "save"
    const p = body.person;
    if (!p || typeof p !== "object" || !p.fio) {
      res.status(400).json({ error: "bad_person" }); return;
    }
    const cos = personCompanies(p);
    if (!allowed(u, cos)) { res.status(403).json({ error: "forbidden" }); return }

    const entry = { op: "upsert", id, p, e: email, t: new Date().toISOString() };
    const payload = JSON.stringify(entry);
    if (payload.length > MAX_BYTES) { res.status(413).json({ error: "too_big" }); return }

    await redis(["HSET", KEY_EDITS, id, payload]);
    await redis(["LPUSH", KEY_LOG, JSON.stringify({
      op: "upsert", id, e: email, t: entry.t, fio: String(p.fio).slice(0, 120)
    })]);
    await redis(["LTRIM", KEY_LOG, 0, LOG_KEEP - 1]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
