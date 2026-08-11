# -*- coding: utf-8 -*-
"""Синхронизация списка пользователей: index.html -> api/logins.js

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


def main():
    page = io.open(PAGE, encoding="utf-8").read()
    m = re.search(r"var USERS=(\{.*?\});", page, re.S)
    if not m:
        sys.exit("Не нашёл список пользователей в index.html")
    users = json.loads(m.group(1))

    # функции нужны только хеш и признак админа: компании она не проверяет
    slim = {k: {"h": v["h"], "a": v.get("a", 0)} for k, v in users.items()}

    func = io.open(FUNC, encoding="utf-8").read()
    m2 = re.search(r"const USERS = (\{.*?\});", func, re.S)
    if not m2:
        sys.exit("Не нашёл список пользователей в api/logins.js")
    was = json.loads(m2.group(1))

    new_line = "const USERS = " + json.dumps(slim, ensure_ascii=False) + ";"
    func = func[: m2.start()] + new_line + func[m2.end():]
    io.open(FUNC, "w", encoding="utf-8").write(func)

    added   = [k for k in slim if k not in was]
    removed = [k for k in was if k not in slim]
    changed = [k for k in slim if k in was and slim[k] != was[k]]

    print("Пользователей на странице: %d (админов %d)"
          % (len(slim), sum(1 for v in slim.values() if v["a"])))
    print("Было в функции: %d" % len(was))
    for label, lst in (("добавлено", added), ("удалено", removed), ("изменено", changed)):
        if lst:
            print("  %s: %s" % (label, ", ".join(lst)))
    if not (added or removed or changed):
        print("  расхождений не было")


if __name__ == "__main__":
    main()
