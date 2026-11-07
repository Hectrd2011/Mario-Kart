"""Writing Paradox script and localisation files."""
import os
import re

MOD_NAME = "ModernDay2024"


class Out:
    def __init__(self, root):
        self.root = root
        self.files = {}

    def path(self, rel):
        return os.path.join(self.root, rel)

    def write(self, rel, text, bom=False):
        p = self.path(rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        data = text if text.endswith("\n") else text + "\n"
        with open(p, "w", encoding="utf-8-sig" if bom else "utf-8", newline="\n") as fh:
            fh.write(data)
        self.files[rel] = data


def q(s):
    """Quote a string for a .yml localisation value."""
    return '"' + s.replace('"', '\\"') + '"'


def loc_file(lang, entries):
    lines = [f"l_{lang}:"]
    for k, v in entries:
        lines.append(f" {k}:0 {q(v)}")
    return "\n".join(lines) + "\n"


def fmt_mods(mods, indent="\t\t\t"):
    out = []
    for k, v in mods.items():
        if isinstance(v, float):
            s = ("%.3f" % v).rstrip("0").rstrip(".")
        else:
            s = str(v)
        out.append(f"{indent}{k} = {s}")
    return "\n".join(out)


def pretty(script, base=0):
    """Re-indent a one-line script blob into tidy nested blocks."""
    tokens = re.findall(r'"[^"]*"|\{|\}|[^\s{}]+', script)
    out, line, depth = [], [], base
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == "{":
            out.append("\t" * depth + " ".join(line) + " {")
            line = []
            depth += 1
        elif t == "}":
            if line:
                out.append("\t" * depth + " ".join(line))
                line = []
            depth -= 1
            out.append("\t" * depth + "}")
        else:
            # key = value pairs go on their own line
            if line and len(line) >= 3 and line[-2] == "=":
                out.append("\t" * depth + " ".join(line))
                line = []
            line.append(t)
        i += 1
    if line:
        out.append("\t" * depth + " ".join(line))
    return "\n".join(l for l in out if l.strip())


def braces_balanced(text):
    depth = 0
    in_str = False
    for line in text.splitlines():
        code = line.split("#", 1)[0] if '"' not in line else line
        for ch in code:
            if ch == '"':
                in_str = not in_str
            elif not in_str:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth < 0:
                        return False
    return depth == 0
