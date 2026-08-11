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

const USERS = {"kudratovatojinisso@gmail.com": {"h": "491d7734c29c01546992d16dd69106c83eff7abafad0b20a6cab8cbfc42c306c", "a": 1}, "kh.kaumov@avesto.tj": {"h": "05e86bdb34836ae1c42daced04223066784f9d4ef83779d348877763aa6745e1", "a": 1}, "iso@avesto.tj": {"h": "817df3b5738ed0a2ead7a8ee7e3f2e29950501db51db02b0f02d737e6282bd40", "a": 1}, "hrazot-tj@rambler.ru": {"h": "cb37d03ff69e898f4046e2a4603e45d26cd8a5b2154d35b30224b9a8000009cc", "a": 0}, "m.saysharifova@arvis.tj": {"h": "d862e36b8b8f6ddbe345b78638db3fee3fb18cc6863a1378264d3abae5fe117e", "a": 0}, "hr.artel.avesto@gmail.com": {"h": "3996668787864549d20a1d2587b39e74a6704e7bb8218ef87c53332a8563057b", "a": 0}, "hr@dushanbecity.tj": {"h": "a643fa233ce4349d9dfd9ce8e8625bfc74037df2446b948ec452b6035e6ebfaa", "a": 0}, "shahnoza.mizrobova@akia-avesto.tj": {"h": "fac7cb94030ae91b3707aef671cb4b8ad58bd8c38f49231c1792b79c885ae3a6", "a": 0}, "hr.gulistoni.dushanbe@gmail.com": {"h": "2fa6c178b3ad33519ec09490ea12f79db7efa34e2fbf931ef8c3e21dc8b8d886", "a": 0}, "rrahmatulloev@doro.tj": {"h": "b47faff2bdb6a67633ec055d1631e35ee7b12df524cf421283cc422b77a63e1a", "a": 0}, "khalisamo.niyazmamadova@zet-mobile.com": {"h": "44bb0852f2491ee063d402d33cbc006e30f048dcdd5f02c794fbbbc8b4a0b101", "a": 0}, "r.bakhtiyor@nets.tj": {"h": "ea23825fc3d0f3a33fdc4ef733365773285523bc31131eb75bc00412bc746886", "a": 0}, "hrdep.kod@gmail.com": {"h": "0339eff23d6059119aacd63a40b7f7ef6aeaf74581b4c37868a93c4045cf0b90", "a": 0}, "hr.composite.tj@gmail.com": {"h": "39bc8e9a456eb9ef484d95cb3a056970ef04396fead388643ec506147b23019e", "a": 0}, "info@composite.tj": {"h": "7e2d2d7d624f5efc7c830ca96a8a316e43659e32da0d7b6c38d17083edbb7a68", "a": 0}, "hr@marmari.tj": {"h": "8de8ea28d1b9aa83143ad5ca37863eddcf7ac8d1c02158109ea1d63a3632a85b", "a": 0}, "muosirkadr@gmail.com": {"h": "fecc48d95aea4c9aef4ae5dff449420d38a590bddcba4a6227ade7e93e583421", "a": 0}, "hrsiyoma@gmail.com": {"h": "cb3a7de1a50e3c8051d30cb562ae82e0feedaf4589e2a1f7a7c9fb57653814c9", "a": 0}, "azizakhon.b@siyomamall.tj": {"h": "7e3c940feb04f11107f9a11b61bde5f20d7dcaebd778e3bfe2173c872e9c66d6", "a": 0}, "hrcitycard01@gmail.com": {"h": "60d11e1a3d885aa732a55d913534ffddfa36969750b04c8c2bdb5b93b4f59710", "a": 0}, "hr.cityline.avesto@gmail.com": {"h": "57e85b2d7e3ae3ab7b563bfce591e3b46f160e438ed2f7a2c708f7ef87d4da8a", "a": 0}, "s.karimova@cityservice.tj": {"h": "55c832bf14a571fa8e15c3be976575bae03aee9736e5f6db57371a126609d074", "a": 0}, "sh.gadoeva@avesto.tj": {"h": "101b83aedfb05c610d3d02b175cfff085c5bdc1234c5bcb635b56c68c0c6dba8", "a": 0}, "filizzot01@gmail.com": {"h": "42b4fd43257efc60e9b61d9d53cc503e5f93b86bb92183cb120da6a70c55a5c7", "a": 0}, "hr.olucha@gmail.com": {"h": "861046d88346d895aaf78f2d1db231b78bbb395997b91b61851d067fcc1c8761", "a": 0}};

const KEY  = "hr:logins";
const KEEP = 2000;                       // сколько последних записей хранить

/* Ищем адрес и токен хранилища, не завися от того, какие имена дала интеграция:
   KV_REST_API_URL, UPSTASH_REDIS_REST_URL, STORAGE_URL — подойдёт любое. */
function creds() {
  const env = process.env;
  let url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || null;
  let token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || null;
  if (url && token) return { url, token };

  for (const k of Object.keys(env)) {
    const v = env[k];
    if (!v || !/^https:\/\//.test(v) || !/upstash\.io/.test(v)) continue;
    if (!/URL$/.test(k)) continue;
    const base = k.replace(/URL$/, "");
    const tk = Object.keys(env).find(
      (x) => x.startsWith(base) && /TOKEN$/.test(x) && env[x]
    );
    if (tk) return { url: v, token: env[tk] };
  }
  return { url, token };
}

function store() {
  const { url, token } = creds();
  if (!url || !token) return null;
  return async (cmd) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });
    if (!r.ok) throw new Error("storage " + r.status);
    return (await r.json()).result;
  };
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((res) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => { try { res(JSON.parse(s || "{}")) } catch (e) { res({}) } });
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "method" });
    return;
  }

  const body   = await readBody(req);
  const email  = String(body.email || "").trim().toLowerCase();
  const hash   = String(body.hash  || "");
  const action = body.action === "list" ? "list" : "record";

  const u = USERS[email];
  if (!u || u.h !== hash) {                    // чужой не пишет и не читает
    res.status(401).json({ error: "auth" });
    return;
  }

  const redis = store();
  if (!redis) {
    res.status(503).json({ error: "storage_not_configured" });
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
