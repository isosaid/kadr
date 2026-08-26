/**
 * Пользователи «HR аналитика» — заведение, изменение и удаление.
 *
 * Хранятся в базе: HASH hr:users   почта -> {h, a, c:[компании], at, by}
 *   h — sha256(почта|пароль), считается на странице; сам пароль сюда не приходит
 *   a — 1 у администратора
 *   c — список компаний, которые видит обычный пользователь
 *
 * Встроенный список (api/_shared.js) остаётся как есть: такие учётки видны
 * в общем перечне, но правятся только через файл — чтобы нельзя было
 * случайно снести администратора и потерять доступ ко всему.
 *
 * Действия: login (для всех), list / save / delete (только администратор).
 */

const S = require("./_shared.js");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "method" }); return }

  const body = await S.readBody(req);
  const action = ["login", "list", "save", "delete"].includes(body.action) ? body.action : "login";
  const redis = S.store();

  if (!redis) { res.status(503).json({ error: "storage_not_configured" }); return }

  const me = await S.auth(body.email, body.hash, redis);
  if (!me) { res.status(401).json({ error: "auth" }); return }

  try {
    if (action === "login") {
      // страница узнаёт роль и компании пользователя, которого нет в файле
      res.status(200).json({ ok: true, admin: me.a, companies: me.c, src: me.src });
      return;
    }

    if (!me.a) { res.status(403).json({ error: "forbidden" }); return }

    if (action === "list") {
      const db = await S.dbUsers(redis);
      const items = [];
      for (const k of Object.keys(S.USERS)) {
        items.push({ email: k, a: !!S.USERS[k].a, c: S.USERS[k].c || [], src: "builtin" });
      }
      for (const k of Object.keys(db)) {
        if (S.USERS[k]) continue;                  // встроенные не дублируем
        items.push({ email: k, a: !!db[k].a, c: db[k].c || [],
                     at: db[k].at, by: db[k].by, src: "db" });
      }
      items.sort((x, y) => (y.a - x.a) || x.email.localeCompare(y.email));
      res.status(200).json({ ok: true, items });
      return;
    }

    // логином может быть и почта, и короткое имя вроде «admin»
    const email = String(body.user && body.user.email || "").trim().toLowerCase();
    if (email.length < 3 || email.length > 64 || /\s/.test(email)) {
      res.status(400).json({ error: "bad_login" }); return;
    }
    if (S.USERS[email]) {
      // встроенную учётку через форму не трогаем — только через файл
      res.status(409).json({ error: "builtin" }); return;
    }

    if (action === "delete") {
      if (email === me.email) { res.status(400).json({ error: "self" }); return }
      await redis(["HDEL", S.K_USERS, email]);
      res.status(200).json({ ok: true });
      return;
    }

    // action === "save"
    const u = body.user || {};
    const isAdmin = !!u.a;
    const companies = Array.isArray(u.c) ? u.c.filter(Boolean).slice(0, 60) : [];
    if (!isAdmin && !companies.length) {
      res.status(400).json({ error: "no_companies" }); return;   // иначе он не увидит ничего
    }

    const db = await S.dbUsers(redis);
    const was = db[email];
    let h = String(u.h || "");
    if (!h) {
      if (!was) { res.status(400).json({ error: "no_password" }); return }
      h = was.h;                                   // пароль не меняли — оставляем прежний
    }
    if (!/^[0-9a-f]{64}$/.test(h)) { res.status(400).json({ error: "bad_hash" }); return }

    const rec = { h, a: isAdmin ? 1 : 0, c: isAdmin ? [] : companies,
                  at: new Date().toISOString(), by: me.email };
    await redis(["HSET", S.K_USERS, email, JSON.stringify(rec)]);
    res.status(200).json({ ok: true, created: !was });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
