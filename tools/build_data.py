# -*- coding: utf-8 -*-
"""Сборка payload дашборда «HR аналитика» из журнала событий (лист «Данные»).
Одна строка = одно кадровое событие (Дата, Рӯйдод = Қабул/Хориҷ, ЛОИҲА, ...).
Запуск: python3 build_data.py <main.xlsx> <out.json> <REF YYYY-MM-DD> <source-name> [known_cos.json] [merges.json]
События позже REF отбрасываются («по состоянию на REF»)."""
import openpyxl, json, io, re, sys, hashlib, datetime as dt, collections, calendar

SRC, OUT, REF, SRCNAME = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
HIRE, FIRE = "Қабул", "Хориҷ"
PLACEHOLDER_YEAR = 2028
EXCEL0 = dt.date(1899, 12, 30)

TJ = str.maketrans({"ӯ":"у","Ӯ":"у","ғ":"г","Ғ":"г","ҳ":"х","Ҳ":"х",
                    "ӣ":"и","Ӣ":"и","ҷ":"ч","Ҷ":"ч","қ":"к","Қ":"к"})
def fold(s):
    return re.sub(r"\s+", " ", str(s).strip()).translate(TJ).lower() if s else ""

def txt(v):
    if v is None: return None
    if isinstance(v, (dt.datetime, dt.date)): return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and v.is_integer(): v = int(v)
    s = re.sub(r"\s+", " ", str(v).strip())
    return s or None

DATE_RE = re.compile(r"(\d{1,2})\s*[.,\-/]\s*(\d{1,2})\s*[.,\-/]?\s*(\d{4})")
def as_date(v):
    if isinstance(v, bool): return None, "bad"
    if isinstance(v, (int, float)):            # серийное число Excel (ячейка без формата даты)
        if 1 <= v <= 80000:
            v = EXCEL0 + dt.timedelta(days=int(v))
            if v.year >= PLACEHOLDER_YEAR: return None, "placeholder"
            return v.strftime("%Y-%m-%d"), "serial"
        return None, "bad"
    if isinstance(v, dt.datetime):
        if v.hour or v.minute: v = v + dt.timedelta(hours=5)   # UTC → Душанбе
        if v.year >= PLACEHOLDER_YEAR: return None, "placeholder"
        return v.strftime("%Y-%m-%d"), None
    if isinstance(v, dt.date):
        if v.year >= PLACEHOLDER_YEAR: return None, "placeholder"
        return v.strftime("%Y-%m-%d"), None
    if v is None: return None, "empty"
    m = DATE_RE.search(str(v))
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1900 <= y <= 2030:
            last = calendar.monthrange(y, mo)[1]
            if d > last: return dt.date(y, mo, last).strftime("%Y-%m-%d"), "fixday"
            try: return dt.date(y, mo, d).strftime("%Y-%m-%d"), "text"
            except ValueError: return None, "bad"
    return None, "bad"

def days(a, b):
    return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
ws = wb["Данные"]
it = ws.iter_rows(values_only=True)
hdr = list(next(it))
I = {str(h).strip(): i for i, h in enumerate(hdr) if h}
def cell(r, name):
    i = I.get(name)
    return r[i] if i is not None and i < len(r) else None
raw_rows = [r for r in it if any(x is not None and x != "" for x in r)]

spell = collections.Counter()
for r in raw_rows:
    c = txt(cell(r, "ЛОИҲА"))
    if c: spell[c] += 1
canon = {}
for name, cnt in spell.items():
    k = fold(name); cur = canon.get(k)
    if cur is None: canon[k] = name
    else:
        cc, nc = cur.isupper(), name.isupper()
        if cc and not nc: canon[k] = name
        elif nc and not cc: pass
        elif spell[name] > spell[cur]: canon[k] = name
# прежние названия компаний (как на сайте и в доступах HR) имеют приоритет:
# «АКИА» → «Акиа», «НЕРУ/ИМЕЙ» → «Неру Имей»
def fold2(s): return re.sub(r"[^0-9a-zа-яё]", "", fold(s))
KNOWN = {}
if len(sys.argv) > 5:
    for n in json.load(io.open(sys.argv[5], encoding="utf-8")): KNOWN[fold2(n)] = n
for k in list(canon):
    kn = KNOWN.get(fold2(canon[k]))
    if kn: canon[k] = kn
def co_norm(c): return canon.get(fold(c), c) if c else None

groups = collections.OrderedDict(); stat = collections.Counter()
for r in raw_rows:
    stat["строк"] += 1
    ln, fn, mn = txt(cell(r, "НАСАБ")), txt(cell(r, "НОМ")), txt(cell(r, "НОМИ ПАДАР"))
    if not (ln or fn): stat["без имени"] += 1; continue
    d, mark = as_date(cell(r, "Дата"))
    if d and d > REF:
        stat["событий после " + REF + " (отброшено)"] += 1; continue
    bd, _ = as_date(cell(r, "САНАИ ТАВАЛЛУД"))
    key = fold(ln) + "|" + fold(fn) + "|" + fold(mn) + "|" + (bd or "")
    g = groups.setdefault(key, {"ln": ln, "fn": fn, "mn": mn, "bd": bd, "rows": [], "gen": None, "nat": None})
    if not g["bd"] and bd: g["bd"] = bd
    g["gen"] = g["gen"] or txt(cell(r, "ҶИНС"))
    g["nat"] = g["nat"] or txt(cell(r, "МИЛЛАТ"))
    if mark: stat["дата: " + mark] += 1
    g["rows"].append({"d": d, "kind": txt(cell(r, "Рӯйдод")), "co": co_norm(txt(cell(r, "ЛОИҲА"))),
        "pos": txt(cell(r, "ВАЗИФА")), "un": txt(cell(r, "СОХТОР")), "mgr": txt(cell(r, "САРДОРИ БЕВОСИТА")),
        "cat": txt(cell(r, "КАТЕГОРИЯ")), "ctr": txt(cell(r, "ТИП")), "tab": txt(cell(r, "РАҚАМИ ТАБЕЛӢ")),
        "rsn": txt(cell(r, "САБАБИ АЗ КОР РАФТАН"))})

# ---- одноразовые объединения дублей (tools/merges.json) ------------------
# Правило «кто есть кто» не меняется: профиль, ошибочно введённый кадровиками
# под другим написанием, вливается в выбранный. Нет цели в данных — строка молча
# пропускается (значит, источник уже исправлен).
MERGED = 0
if len(sys.argv) > 6:
    M = json.load(io.open(sys.argv[6], encoding="utf-8")).get("merge", {})
    pid = lambda k: hashlib.sha1(k.encode()).hexdigest()[:10]
    by_id = {pid(k): k for k in groups}
    for src, dst in M.items():
        ks, kd = by_id.get(src), by_id.get(dst)
        if not ks or not kd or ks == kd: continue
        gs, gd = groups.pop(ks), groups[kd]
        gd["rows"].extend(gs["rows"])
        gd["rows"].sort(key=lambda x: x["d"] or "9999")
        gd["gen"] = gd["gen"] or gs["gen"]; gd["nat"] = gd["nat"] or gs["nat"]
        MERGED += 1
    stat["объединено дублей"] = MERGED

DICT, DIDX = [], {}
def di(v):
    if not v: return None
    if v not in DIDX: DIDX[v] = len(DICT); DICT.append(v)
    return DIDX[v]

people = []
for key, g in groups.items():
    rows = g["rows"]
    ev = [[x["d"], x["kind"], x["co"], x["pos"], x["rsn"]] for x in rows
          if x["d"] and x["kind"] in (HIRE, FIRE) and x["co"]]
    ev.sort(key=lambda e: (e[0], 0 if e[1] == HIRE else 1))
    seen, cos = set(), []
    for x in rows:
        if x["co"] and x["co"] not in seen: seen.add(x["co"]); cos.append(x["co"])
    cf = {}
    for x in rows:
        if not x["co"]: continue
        slot = cf.setdefault(x["co"], {})
        for k, s in (("u","un"),("m","mgr"),("c","cat"),("t","ctr"),("n","tab"),("p","pos")):
            if x[s]: slot[k] = x[s]
    cosa = [c for c in cos if sum(1 for e in ev if e[2]==c and e[1]==HIRE) > sum(1 for e in ev if e[2]==c and e[1]==FIRE)]
    hires = [e for e in ev if e[1] == HIRE]; fires = [e for e in ev if e[1] == FIRE]
    st = 1 if cosa else (0 if ev else 2)
    hd = hires[-1][0] if hires else None
    fd = fires[-1][0] if (st == 0 and fires) else None
    rsn = fires[-1][4] if fd else None
    ten = round(days(hd, fd or REF) / 365.25, 2) if hd else None
    if ten is not None and ten < 0: ten = 0
    try: age = int(days(g["bd"], REF) / 365.25) if g["bd"] else None
    except ValueError: age = None; g["bd"] = None; stat["дата рождения испорчена"] += 1
    if age is not None and not (0 <= age <= 100):
        age = None; g["bd"] = None; stat["дата рождения испорчена"] += 1
    cur = cosa[-1] if cosa else (cos[-1] if cos else None)
    src = cf.get(cur, {}) if cur else {}
    fio = " ".join(x for x in (g["ln"], g["fn"], g["mn"]) if x)
    people.append({"id": hashlib.sha1(key.encode()).hexdigest()[:10], "fio": fio, "ln": g["ln"],
        "co": cur, "cos": cos, "cosa": cosa, "cat": src.get("c"), "ctr": src.get("t"), "pos": src.get("p"),
        "un": src.get("u"), "mgr": src.get("m"), "tab": src.get("n"), "bd": g["bd"], "age": age,
        "gen": g["gen"], "nat": g["nat"], "st": st, "act": 1 if st == 1 else 0, "hd": hd, "fd": fd,
        "ten": ten, "rsn": rsn, "nrec": len(rows), "nblank": 0 if ev else 1, "ev": ev,
        "cf": {c: {k: di(v) for k, v in d.items() if v} for c, d in cf.items() if d}})

people.sort(key=lambda p: (p["fio"] or "").lower())
payload = {"generated": REF + " 00:00", "source": SRCNAME, "people": people, "cfd": DICT}
io.open(OUT, "w", encoding="utf-8").write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))

for k, v in sorted(stat.items()): print("  %-36s %s" % (k, v))
print("ЛЮДЕЙ:", len(people), "| событий:", sum(len(p["ev"]) for p in people),
      "| компаний:", len({c for p in people for c in p["cos"]}))
print("  работают:", sum(p["st"]==1 for p in people), "| уволены:", sum(p["st"]==0 for p in people),
      "| без дат:", sum(p["st"]==2 for p in people))
for k, v in spell.items():
    if canon[fold(k)] != k: print("  склеено: %s -> %s (%d)" % (k, canon[fold(k)], v))
