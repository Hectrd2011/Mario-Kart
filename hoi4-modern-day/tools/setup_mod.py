#!/usr/bin/env python3
"""One-step setup: build the 2024 map from your own copy of HOI4 and
install the mod.

    python3 tools/setup_mod.py                 # find HOI4 automatically
    python3 tools/setup_mod.py --game "D:/SteamLibrary/steamapps/common/Hearts of Iron IV"
    python3 tools/setup_mod.py --no-install    # build only

Needs Python 3.9+, Pillow and numpy (pip install pillow numpy).
Nothing is downloaded: it only reads your game files.
"""
import argparse
import os
import platform
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.join(os.path.dirname(HERE), "ModernDay2024")
GAME_SUBDIR = os.path.join("steamapps", "common", "Hearts of Iron IV")


def steam_roots():
    home = os.path.expanduser("~")
    roots = []
    if platform.system() == "Windows":
        for env in ("ProgramFiles(x86)", "ProgramFiles"):
            if os.environ.get(env):
                roots.append(os.path.join(os.environ[env], "Steam"))
        try:
            import winreg
            for hive, key in ((winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam"),
                              (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam")):
                try:
                    with winreg.OpenKey(hive, key) as k:
                        for name in ("SteamPath", "InstallPath"):
                            try:
                                roots.append(winreg.QueryValueEx(k, name)[0])
                            except OSError:
                                pass
                except OSError:
                    pass
        except ImportError:
            pass
    elif platform.system() == "Darwin":
        roots.append(os.path.join(home, "Library", "Application Support", "Steam"))
    else:
        roots += [os.path.join(home, ".steam", "steam"), os.path.join(home, ".local", "share", "Steam"),
                  os.path.join(home, ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam")]
    # other Steam libraries
    libs = []
    for r in roots:
        vdf = os.path.join(r, "steamapps", "libraryfolders.vdf")
        libs.append(r)
        if os.path.exists(vdf):
            for m in re.findall(r'"path"\s+"([^"]+)"', open(vdf, encoding="utf-8", errors="ignore").read()):
                libs.append(m.replace("\\\\", "\\"))
    return libs


def find_game(explicit):
    cands = [explicit] if explicit else []
    cands += [os.environ.get("HOI4_DIR", "")]
    cands += [os.path.join(r, GAME_SUBDIR) for r in steam_roots()]
    if platform.system() == "Darwin":
        cands.append(os.path.join(os.path.expanduser("~"), "Library", "Application Support", "Steam", GAME_SUBDIR,
                                  "hoi4.app", "Contents", "Resources"))
    for c in cands:
        if c and os.path.isdir(os.path.join(c, "history", "states")) and os.path.isdir(os.path.join(c, "map")):
            return os.path.abspath(c)
    return None


def documents_mod_dir():
    home = os.path.expanduser("~")
    cands = []
    if platform.system() == "Windows":
        if os.environ.get("OneDrive"):
            cands.append(os.path.join(os.environ["OneDrive"], "Documents"))
        cands.append(os.path.join(home, "Documents"))
    elif platform.system() == "Darwin":
        cands.append(os.path.join(home, "Documents"))
    else:
        cands += [os.path.join(home, ".local", "share"), os.path.join(home, "Documents")]
    for d in cands:
        p = os.path.join(d, "Paradox Interactive", "Hearts of Iron IV")
        if os.path.isdir(p):
            return os.path.join(p, "mod")
    return os.path.join(cands[0], "Paradox Interactive", "Hearts of Iron IV", "mod")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", help="your Hearts of Iron IV install folder")
    ap.add_argument("--no-install", action="store_true", help="build only, don't copy into the mod folder")
    args = ap.parse_args()

    for mod in ("PIL", "numpy"):
        try:
            __import__(mod)
        except ImportError:
            print("Missing Python packages. Run:\n    python -m pip install pillow numpy\nand try again.")
            return 1

    game = find_game(args.game)
    if not game:
        print("Could not find Hearts of Iron IV. Run again with --game \"<your HOI4 folder>\"\n"
              "(in Steam: right-click the game > Manage > Browse local files).")
        return 1
    print(f"Hearts of Iron IV found at: {game}")
    print("Building the 2024 map (this takes a minute)...")
    env = dict(os.environ, HOI4_DIR=game)
    r = subprocess.run([sys.executable, os.path.join(HERE, "build.py"), "--no-art"], env=env)
    if r.returncode:
        return r.returncode
    report = os.path.join(MOD, "map_report.txt")
    if os.path.exists(report):
        print(open(report, encoding="utf-8").read())
    r = subprocess.run([sys.executable, os.path.join(HERE, "validate.py")])
    if r.returncode:
        print("Validation found problems (listed above). The mod was built but not installed.")
        return r.returncode
    if args.no_install:
        print(f"Built at {MOD}")
        return 0
    dest_root = documents_mod_dir()
    dest = os.path.join(dest_root, "ModernDay2024")
    os.makedirs(dest_root, exist_ok=True)
    if os.path.isdir(dest):
        shutil.rmtree(dest)
    shutil.copytree(MOD, dest)
    shutil.copy(os.path.join(os.path.dirname(MOD), "ModernDay2024.mod"), os.path.join(dest_root, "ModernDay2024.mod"))
    print(f"\nInstalled to {dest}\nOpen the HOI4 launcher, enable \"Modern Day: 2024\" in a playset, and start the "
          "\"The Second Term\" bookmark.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
