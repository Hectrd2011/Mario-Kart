"""The map layer: borders, capitals, armies and technology.

These need HOI4's own map files (history/states, map/definition.csv, ...).
`load()` looks for a copy of the game files and returns a provider; with
no game files it returns a provider that writes nothing map-related.
"""
import os

GAME_DIRS = [
    os.environ.get("HOI4_DIR", ""),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vanilla"),
]


class NoMap:
    has_states = False

    def new_tags(self, tags):
        return set(tags)

    def capital(self, tag):
        return None

    def has_oob(self, tag):
        return False

    def convoys(self, c):
        return {1: 400, 2: 120, 3: 30, 4: 5}[c.tier]

    def technologies(self, c):
        return []

    def history_extra(self, c):
        return ""

    def write(self, out):
        pass

    def startup_effect(self):
        return ""

    def scripted_effects(self):
        return "md_cede_greenland = {\n\tcustom_effect_tooltip = md_tt_greenland\n}\n"

    def localisation(self):
        return [("md_tt_greenland", "Greenland is transferred to the United States.")]


def load():
    for d in GAME_DIRS:
        if d and os.path.isdir(os.path.join(d, "history", "states")):
            from . import mapbuild
            return mapbuild.VanillaMap(os.path.abspath(d))
    return NoMap()
