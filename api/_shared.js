/**
 * Общее для всех функций в api/: доступ к хранилищу и проверка пользователя.
 *
 * Пользователи бывают двух видов:
 *   1) встроенные — список USERS ниже, синхронизируется с index.html
 *      скриптом tools/sync_users.py;
 *   2) заведённые через форму «Пользователи» — лежат в базе (HASH hr:users).
 * Проверка идёт по хешу sha256(почта|пароль), сам пароль на сервер не попадает.
 */

const USERS = {"kh.kaumov@avesto.tj": {"h": "05e86bdb34836ae1c42daced04223066784f9d4ef83779d348877763aa6745e1", "a": 1, "c": []}, "iso@avesto.tj": {"h": "817df3b5738ed0a2ead7a8ee7e3f2e29950501db51db02b0f02d737e6282bd40", "a": 1, "c": []}, "hrazot-tj@rambler.ru": {"h": "154ec416d7923c72c4c8e2f4b5fb8614233c7a63c0a57dc8bf3849ed31ea6852", "a": 0, "c": ["Азот"]}, "m.saysharifova@arvis.tj": {"h": "4c54392826b0e6d291c33f5d4b346b8d2bb2ceccc7c2c85688a0d0c264f465d7", "a": 0, "c": ["Арвис"]}, "hr.artel.avesto@gmail.com": {"h": "d45e27ba5afa25dd073ba45385d1518d65bd0ce40d605df0ebb3267d5d6da9dc", "a": 0, "c": ["Артел"]}, "hr@dushanbecity.tj": {"h": "fceb6c8e0a4c4ac6f281bd552ed9592f66d8ff0b8b6d818ddd2e435d059c84fe", "a": 0, "c": ["Душанбе Сити"]}, "shahnoza.mizrobova@akia-avesto.tj": {"h": "af2c6f446019190218e582a9bf64ca5f77a5fc64be28028f41aee79cc030d432", "a": 0, "c": ["Акиа"]}, "hr.gulistoni.dushanbe@gmail.com": {"h": "2717f934ecf777e67d80a0b38e469329baf8c25336f98b69308943cc65700316", "a": 0, "c": ["Гулистони Душанбе"]}, "rrahmatulloev@doro.tj": {"h": "24ecbfb109736b6f58de9cc4909f4afcf0c89b458ba37008070aeec57d4bdef3", "a": 0, "c": ["Доро Молия"]}, "khalisamo.niyazmamadova@zet-mobile.com": {"h": "565f40b8d5115e6d069c4ef70c01956b96b9ac46ccf1e5c8ac2618eacde79530", "a": 0, "c": ["Зет мобайл"]}, "r.bakhtiyor@nets.tj": {"h": "324ab6002b40c7edf1620effdadf4d01ffe005c3b6dcdaf75e8c6f96ffacd4f5", "a": 0, "c": ["Нетс"]}, "hrdep.kod@gmail.com": {"h": "f35ebeaa25a4ba97821b55025f1da254548cad7e3fe4b3a90e35d74074babd2e", "a": 0, "c": ["КОД"]}, "hr.composite.tj@gmail.com": {"h": "f1f65ec0d116d41f85c415feba402fc647d6964f7c7b3ff1baa6aa65e1c04bec", "a": 0, "c": ["Композит"]}, "info@composite.tj": {"h": "69a04f468aff234b9391b1aef520e844264c17350d5a29a377dd4eb977b8dadb", "a": 0, "c": ["Композит"]}, "hr@marmari.tj": {"h": "3c08e4b2ef17415fea839bf8c2836bfea97c30c02fc9c940e0aaeae66f2ba3c3", "a": 0, "c": ["Мармарӣ"]}, "muosirkadr@gmail.com": {"h": "b88a1301a592d88becbe9f5879284892840ea197d8170a344675b377551b100d", "a": 0, "c": ["Муосир"]}, "hrsiyoma@gmail.com": {"h": "6354349030f18937197873411a80c9a452f3e7719fd8357c94308b5075d2304a", "a": 0, "c": ["Сиёма"]}, "azizakhon.b@siyomamall.tj": {"h": "fc6d5ef96499198b65dde3cc114ae21301dd1dd8e9ec5fba47cddaf88b175f9c", "a": 0, "c": ["Сиёма Молл"]}, "hrcitycard01@gmail.com": {"h": "edc14d2932d6a33369509e6ca16a11a519fd180fd4ba0bc8979bdf008e5cb942", "a": 0, "c": ["Сити кард", "Чилтан"]}, "hr.cityline.avesto@gmail.com": {"h": "77b863156a76edb1f09b4ed4269e087afe36094f9a6df6a5606a363a22b9eff6", "a": 0, "c": ["Сити лайн"]}, "s.karimova@cityservice.tj": {"h": "4e8cb2a8970b02dcd443074ac7ddf76e6415007d381a44a3d14bb97baa1b8be1", "a": 0, "c": ["Сити сервис"]}, "sh.gadoeva@avesto.tj": {"h": "066bba3f1f6dc40ba4af02878e9121e79ca2a74bbb46004d0511511b5dc68151", "a": 0, "c": ["Неру Имей"]}, "filizzot01@gmail.com": {"h": "24e305bf82e1bead80e02689aeb5c6bce42d71eb558ec32038c67195ab7ea940", "a": 0, "c": ["Филиззот"]}, "hr.olucha@gmail.com": {"h": "47c6dc8cb26697b13548c26a6494cf55b951de8400284791f1f527c70b6505cc", "a": 0, "c": ["Олуча"]}, "clo@anor.mobi": {"h": "1637d3b4d867ef1b5f785a353e1dfd980e644f18f721822795ce9d22fcc5c457", "a": 0, "c": ["Анор"]}, "f.saidmuradova@avesto.tj": {"h": "1f50aa853d027c74254c0816dfe3f548b11d705bbc6d68326347826402ec151b", "a": 0, "c": ["Авесто"]}, "tahmina18@mail.ru": {"h": "18af8b60325e35297d50e32bb37be0bb84449332a692dccc8c8b26632fbf5138", "a": 0, "c": ["Толокор"]}, "nurmatova_a@jura.tj": {"h": "aecfd1bb69014c668685f7fa08ee9db91e8ece55d9dfdab05958855e13d6befe", "a": 0, "c": ["Ҷӯра"]}, "o.irodamoh@payvand.tj": {"h": "1508ca05426acefcb8cb17dc5d898bcbc428cbcce339bcc605d2e833853859a6", "a": 0, "c": ["Пайванд"]}, "avazov327@gmail.com": {"h": "8aab62c0c3b5959afb99923e8e00d0177c8356de84fd8e6426b09cb6c2b79632", "a": 0, "c": ["Адрасмон"]}, "kanzidiyor@gmail.com": {"h": "93a2bd537752ace378aaab4c1e8bd9b7818307e05beac4a3e6ecfe3ccea1e283", "a": 0, "c": ["Канзи Диёр"]}, "info@mindstech.io": {"h": "dd7d66e6923ea9b5aa8a4a609f5d0b56d625f145c5c7807db1cfbde2a7580d59", "a": 0, "c": ["Майндс"]}, "muzafarova.guljon@gmail.com": {"h": "1c624562bb76ab9348b609d269973130390e50b476d663e390c8f552d5f01356", "a": 0, "c": ["Авесто Филиал"]}, "m.davronzoda@avesto.tj": {"h": "0d5a9897605ae638f7eb826c1c962eb34ac4831180f64f63cb31a5baa08604a2", "a": 0, "c": ["Мирт Тоҷ"]}, "bagirov@dcsugurta.tj": {"h": "bae00a388c30fb74613340060f59089fe619380a5d9d621a16cac2554de8d7cd", "a": 0, "c": ["ДС Сугурта"]}, "dcrecruter@gmail.com": {"h": "90d9a37b95c617f9482c786da2dcfed7aeacae5f8f5aa9d7fd8145ae46d07d6d", "a": 0, "c": ["Душанбе Сити"]}, "hr@dcmarket.tj": {"h": "f688d4bf3abcd217b70cacb52e5e1b671926328b86a7bbeb7e0022935d5de07e", "a": 0, "c": ["ДС Маркет"]}, "chiltan@gmail.com": {"h": "6f234bd26bfcef69037032bd27d80f7ae503523a356782af951b134346c2c6eb", "a": 0, "c": ["Сити кард", "Чилтан"]}, "hrsyomamall@gmail.com": {"h": "d3716a9bf51fa78e4738d127e4c39b35427a43b137ef6e8c23591c6f2acdd06e", "a": 0, "c": ["Сиёма Молл"]}, "hrzetmobile@gmail.com": {"h": "c794e87d926e0e284a7bbfd061e5caeec07c822c6ad08ffde981a301285e16f4", "a": 0, "c": ["Зет мобайл"]}, "hr.composite2026@gmail.com": {"h": "ec89da1e6d0013ea4e0df71f54f6648349b8162fcf1b27eb8add99972575a006", "a": 0, "c": ["Композит"]}, "hrakia.avesto@gmail.com": {"h": "a15a21028aab6f009d96a4807e3c374ce884c87b7bb733def713e8fb6a081cdc", "a": 0, "c": ["Акиа"]}, "arvishrtj@gmail.com": {"h": "25d30d8ca5bce7cf1b860ec16c9521ecf56f5364105de4fe8c86a8e3d8dace00", "a": 0, "c": ["Арвис"]}, "hrazot.levakant@gmail.com": {"h": "f5d848cd52947e6a547f1dc2477eae2247de4492f190f848e252110fa6910bf0", "a": 0, "c": ["Азот"]}, "hr.networksolution2017@gmail.com": {"h": "183467d3c1aa4572aad7a8c95baa467dddd7c1e083969dd62c02c7a23eb04134", "a": 0, "c": ["Нетс"]}, "azizanurmatova.oq@gmail.com": {"h": "db48f275ce15b498464cb51941cc40dbc65b37287a67d17a2db65236f4ec64a3", "a": 0, "c": ["Ҷӯра"]}, "hr.citylines.avesto@gmail.com": {"h": "fa2276e9f9adbfb993fe52dc61c5119810d01b568952c0b1cfc7843bff806515", "a": 0, "c": ["Сити лайн"]}, "davlatova0072@gmail.com": {"h": "94bb9dade18f7be46aec4a60f5a1a1b54716e2c574454c89f9faaa9f9314bc2b", "a": 0, "c": ["Анор"]}, "obiiroda83@gmail.com": {"h": "dd9130fb7c6f57104a74144527d3c353520b9469c8ca3bed70674bcfdd7ae667", "a": 0, "c": ["Пайванд"]}, "hrdcmarket@gmail.com": {"h": "3bb04aa94f27a3c84745c6d0d45dd3ddfd93dcf5a4a59bd1980a2ee273445e78", "a": 0, "c": ["ДС Маркет"]}, "hrdoropay@gmail.com": {"h": "3f8ca6d778b3254a00a7f62a333b7fb29e13c976b4ad5a1313f78f0dc1f78cfe", "a": 0, "c": ["Доро Молия"]}, "hr-analytics": {"h": "a81d633086dbce08df080155fc20860023fe630297ac571ed4d21b4bf700d6c1", "a": 1, "c": []}, "hr@avesto.tj": {"h": "677989e0e36f6c581970eb35981c89ab0072d971fccb9b60c0d3df1e46f06420", "a": 1, "c": []}, "nusrat@avesto.tj": {"h": "e4393d3702e71e8a27a19f0de0ec0c4783ef88b6591b3393a336ab710d6553e0", "a": 1, "c": []}};   // заполняется скриптом tools/sync_users.py из index.html

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
