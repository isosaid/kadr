/**
 * Общее для всех функций в api/: доступ к хранилищу и проверка пользователя.
 *
 * Пользователи бывают двух видов:
 *   1) встроенные — список USERS ниже, синхронизируется с index.html
 *      скриптом tools/sync_users.py;
 *   2) заведённые через форму «Пользователи» — лежат в базе (HASH hr:users).
 * Проверка идёт по хешу sha256(почта|пароль), сам пароль на сервер не попадает.
 */

const USERS = {"kh.kaumov@avesto.tj": {"h": "05e86bdb34836ae1c42daced04223066784f9d4ef83779d348877763aa6745e1", "a": 1, "c": []}, "iso@avesto.tj": {"h": "817df3b5738ed0a2ead7a8ee7e3f2e29950501db51db02b0f02d737e6282bd40", "a": 1, "c": []}, "hrazot-tj@rambler.ru": {"h": "154ec416d7923c72c4c8e2f4b5fb8614233c7a63c0a57dc8bf3849ed31ea6852", "a": 0, "c": ["Азот"]}, "m.saysharifova@arvis.tj": {"h": "4c54392826b0e6d291c33f5d4b346b8d2bb2ceccc7c2c85688a0d0c264f465d7", "a": 0, "c": ["Арвис", "Арвис Зелал"]}, "hr.artel.avesto@gmail.com": {"h": "e3f0b71a03e5dd840c877bcacd0a5043ab2e013df78ce19ca75fa6d262e2a081", "a": 0, "c": ["Артел"]}, "hr@dushanbecity.tj": {"h": "fceb6c8e0a4c4ac6f281bd552ed9592f66d8ff0b8b6d818ddd2e435d059c84fe", "a": 0, "c": ["Душанбе Сити", "ДС Маркет", "ДС Сугурта", "ДС Лизинг"]}, "shahnoza.mizrobova@akia-avesto.tj": {"h": "af2c6f446019190218e582a9bf64ca5f77a5fc64be28028f41aee79cc030d432", "a": 0, "c": ["Акиа"]}, "hr.gulistoni.dushanbe@gmail.com": {"h": "c2dd492f7d386364117d8249d4729583374ef2b47f0eeaf18e7ad9166f946ba6", "a": 0, "c": ["Гулистони Душанбе"]}, "rrahmatulloev@doro.tj": {"h": "24ecbfb109736b6f58de9cc4909f4afcf0c89b458ba37008070aeec57d4bdef3", "a": 0, "c": ["Доро Молия"]}, "khalisamo.niyazmamadova@zet-mobile.com": {"h": "565f40b8d5115e6d069c4ef70c01956b96b9ac46ccf1e5c8ac2618eacde79530", "a": 0, "c": ["Зет мобайл"]}, "r.bakhtiyor@nets.tj": {"h": "324ab6002b40c7edf1620effdadf4d01ffe005c3b6dcdaf75e8c6f96ffacd4f5", "a": 0, "c": ["Нетс"]}, "hrdep.kod@gmail.com": {"h": "5f669430cc0ca372426500c098f6e9e0f31fde7267170514a44aee6c5bdb3c28", "a": 0, "c": ["КОД"]}, "hr.composite.tj@gmail.com": {"h": "f1f65ec0d116d41f85c415feba402fc647d6964f7c7b3ff1baa6aa65e1c04bec", "a": 0, "c": ["Композит"]}, "info@composite.tj": {"h": "69a04f468aff234b9391b1aef520e844264c17350d5a29a377dd4eb977b8dadb", "a": 0, "c": ["Композит"]}, "hr@marmari.tj": {"h": "1905c1d6981144eff5daaaac6a00a43e8c33f8b53e5f52e25b0b0f8161ff5d67", "a": 0, "c": ["Мармарӣ"]}, "muosirkadr@gmail.com": {"h": "fb5b7058abefe18fc2b9801359bb9f17b640c39914dc491be0067864d21150f0", "a": 0, "c": ["Муосир"]}, "hrsiyoma@gmail.com": {"h": "514f7fd36bc052312dab5bb1162b0dfd24d194be9001a0f7f3c247d6a88c5823", "a": 0, "c": ["Сиёма"]}, "azizakhon.b@siyomamall.tj": {"h": "fc6d5ef96499198b65dde3cc114ae21301dd1dd8e9ec5fba47cddaf88b175f9c", "a": 0, "c": ["Сиёма Молл"]}, "hrcitycard01@gmail.com": {"h": "5fac0855ce690d6848038fa2287a593fd2b86b4ab2f1c03e4212b697305b7275", "a": 0, "c": ["Сити кард", "Сити кард Хуҷанд"]}, "hr.cityline.avesto@gmail.com": {"h": "77b863156a76edb1f09b4ed4269e087afe36094f9a6df6a5606a363a22b9eff6", "a": 0, "c": ["Сити лайн"]}, "s.karimova@cityservice.tj": {"h": "4e8cb2a8970b02dcd443074ac7ddf76e6415007d381a44a3d14bb97baa1b8be1", "a": 0, "c": ["Сити сервис"]}, "sh.gadoeva@avesto.tj": {"h": "066bba3f1f6dc40ba4af02878e9121e79ca2a74bbb46004d0511511b5dc68151", "a": 0, "c": ["Неру Имей"]}, "filizzot01@gmail.com": {"h": "42c0a0c3618fd9d99af5a09eb05e0ff74725968c2964eb01f1a55867b1f98c7c", "a": 0, "c": ["Филиззот"]}, "hr.olucha@gmail.com": {"h": "762186e2b48e4bbbe7a00bf05080bc0350f4adc254a289b10a5e1a22c21b81b0", "a": 0, "c": ["Олуча"]}, "clo@anor.mobi": {"h": "46b0d868e07f9e08116a9ce6e89495542c89290d7a73550f1ff4962748579464", "a": 0, "c": ["Анор"]}, "f.saidmuradova@avesto.tj": {"h": "1f50aa853d027c74254c0816dfe3f548b11d705bbc6d68326347826402ec151b", "a": 0, "c": ["Авесто", "Авесто Филиал"]}, "tahmina18@mail.ru": {"h": "18af8b60325e35297d50e32bb37be0bb84449332a692dccc8c8b26632fbf5138", "a": 0, "c": ["Толокор"]}, "nurmatova_a@jura.tj": {"h": "aecfd1bb69014c668685f7fa08ee9db91e8ece55d9dfdab05958855e13d6befe", "a": 0, "c": ["Ҷӯра"]}, "o.irodamoh@payvand.tj": {"h": "1508ca05426acefcb8cb17dc5d898bcbc428cbcce339bcc605d2e833853859a6", "a": 0, "c": ["Пайванд"]}, "avazov327@gmail.com": {"h": "8aab62c0c3b5959afb99923e8e00d0177c8356de84fd8e6426b09cb6c2b79632", "a": 0, "c": ["Адрасмон"]}, "kanzidiyor@gmail.com": {"h": "93a2bd537752ace378aaab4c1e8bd9b7818307e05beac4a3e6ecfe3ccea1e283", "a": 0, "c": ["Канзи Диёр"]}, "info@mindstech.io": {"h": "dd7d66e6923ea9b5aa8a4a609f5d0b56d625f145c5c7807db1cfbde2a7580d59", "a": 0, "c": ["Майндс"]}, "muzafarova.guljon@gmail.com": {"h": "1c624562bb76ab9348b609d269973130390e50b476d663e390c8f552d5f01356", "a": 0, "c": ["Авесто Филиал"]}, "m.davronzoda@avesto.tj": {"h": "0d5a9897605ae638f7eb826c1c962eb34ac4831180f64f63cb31a5baa08604a2", "a": 0, "c": ["Мирт Тоҷ"]}, "bagirov@dcsugurta.tj": {"h": "bae00a388c30fb74613340060f59089fe619380a5d9d621a16cac2554de8d7cd", "a": 0, "c": ["ДС Сугурта"]}, "dcrecruter@gmail.com": {"h": "10dcd4a8ae0443defd053be5eaea83dcec56c71e19f8dcc67f9883671b9f2ddb", "a": 0, "c": ["ДС Лизинг"]}, "hr@dcmarket.tj": {"h": "f688d4bf3abcd217b70cacb52e5e1b671926328b86a7bbeb7e0022935d5de07e", "a": 0, "c": ["ДС Маркет"]}, "chiltan@gmail.com": {"h": "6f234bd26bfcef69037032bd27d80f7ae503523a356782af951b134346c2c6eb", "a": 0, "c": ["Чилтан"]}};   // заполняется скриптом tools/sync_users.py из index.html

const K_USERS = "hr:users";

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

/** Все пользователи из базы: {email: {h, a, c}} */
async function dbUsers(redis) {
  if (!redis) return {};
  let raw;
  try { raw = await redis(["HGETALL", K_USERS]) } catch (e) { return {} }
  const out = {};
  if (Array.isArray(raw)) {
    for (let i = 0; i + 1 < raw.length; i += 2) {
      try { out[raw[i]] = JSON.parse(raw[i + 1]) } catch (e) {}
    }
  } else if (raw && typeof raw === "object") {
    for (const k of Object.keys(raw)) {
      try { out[k] = JSON.parse(raw[k]) } catch (e) {}
    }
  }
  return out;
}

/**
 * Проверка входа. Возвращает {email, a, c, src} или null.
 * Встроенный список имеет приоритет — его нельзя перебить записью в базе.
 */
async function auth(email, hash, redis) {
  email = String(email || "").trim().toLowerCase();
  hash = String(hash || "");
  if (!email || !hash) return null;

  const b = USERS[email];
  if (b) return b.h === hash ? { email, a: !!b.a, c: b.c || [], src: "builtin" } : null;

  const all = await dbUsers(redis);
  const u = all[email];
  if (u && u.h === hash) return { email, a: !!u.a, c: u.c || [], src: "db" };
  return null;
}

module.exports = { USERS, K_USERS, creds, store, readBody, dbUsers, auth };
