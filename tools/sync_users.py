# -*- coding: utf-8 -*-
"""Синхронизация списка пользователей: index.html -> api/logins.js и api/employees.js

Страница и серверная функция должны знать одних и тех же пользователей.
Раньше список правился в двух местах руками, и они разъехались: новый админ
появился на странице, но не в функции — его входы сервер отклонял как чужие,
и в общем журнале их не было.

Запуск (из корня репозитория):  python3 tools/sync_users.py
"""

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")
FUNC = os.path.join(ROOT, "api", "logins.js")
EMPL = os.path.join(ROOT, "api", "employees.js")


def main():
    page = io.open(PAGE, encoding="utf-8").read()
    m = re.search(r"var USERS=(\{.*?\});", page, re.S)
    if not m:
        sys.exit("Не нашёл список пользователей в index.html")
    users = json.loads(m.group(1))

    # журналу входов нужны только хеш и роль; правкам — ещё и список компаний,
    # чтобы сервер сам проверял, свою ли компанию правит пользователь
    slim = {k: {"h": v["h"], "a": v.get("a", 0)} for k, v in users.items()}
    full = {k: {"h": v["h"], "a": v.get("a", 0), "c": v.get("c", [])} for k, v in users.items()}

    print("Пользователей на странице: %d (админов %d)"
          % (len(slim), sum(1 for v in slim.values() if v["a"])))

    for path, data in ((FUNC, slim), (EMPL, full)):
        name = os.path.relpath(path, ROOT)
        if not os.path.exists(path):
            print("  %s — файла нет, пропускаю" % name)
            continue
        src = io.open(path, encoding="utf-8").read()
        m2 = re.search(r"const USERS = (\{.*?\});", src, re.S)
        if not m2:
            sys.exit("Не нашёл список пользователей в %s" % name)
        try:
            was = json.loads(m2.group(1))
        except ValueError:
            was = {}

        line = "const USERS = " + json.dumps(data, ensure_ascii=False) + ";"
        src = src[: m2.start()] + line + src[m2.end():]
        io.open(path, "w", encoding="utf-8").write(src)

        added   = [k for k in data if k not in was]
        removed = [k for k in was if k not in data]
        changed = [k for k in data if k in was and data[k] != was[k]]
        print("  %s: было %d" % (name, len(was)))
        for label, lst in (("добавлено", added), ("удалено", removed), ("изменено", changed)):
            if lst:
                print("     %s: %s" % (label, ", ".join(lst)))
        if not (added or removed or changed):
            print("     расхождений не было")


if __name__ == "__main__":
    main()
