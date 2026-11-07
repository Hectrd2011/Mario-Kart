"""A tiny DSL for writing focus trees and the reward snippets they use.

Rewards are plain HOI4 script strings; the helpers below just save typing
and keep effects consistent between trees.
"""
from dataclasses import dataclass, field

FILTERS = {
    "politics": "FOCUS_FILTER_POLITICAL", "economy": "FOCUS_FILTER_INDUSTRY",
    "military": "FOCUS_FILTER_ARMY_XP", "tech": "FOCUS_FILTER_RESEARCH",
    "diplomacy": "FOCUS_FILTER_POLITICAL", "crisis": "FOCUS_FILTER_STABILITY",
    "energy": "FOCUS_FILTER_INDUSTRY", "society": "FOCUS_FILTER_STABILITY",
    "nuclear": "FOCUS_FILTER_RESEARCH", "intel": "FOCUS_FILTER_POLITICAL",
}


@dataclass
class Focus:
    id: str
    name: str
    desc: str
    x: int
    y: int
    glyph: str
    theme: str
    cost: int = 10
    pre: list = field(default_factory=list)      # list of lists (OR inside, AND across)
    mutex: list = field(default_factory=list)
    available: str = ""
    bypass: str = ""
    reward: str = ""
    ai: str = "factor = 1"
    flag_iso: bool = True
    historical: bool = False


@dataclass
class Tree:
    id: str
    tag: str                 # "" for the generic tree
    iso: str = ""
    focuses: list = field(default_factory=list)
    ideas: dict = field(default_factory=dict)    # spirits granted by this tree
    opinion: dict = field(default_factory=dict)  # opinion modifiers: id -> (name, value)
    tooltips: dict = field(default_factory=dict) # custom tooltip loc
    flags_loc: dict = field(default_factory=dict)
    default: bool = False
    continuous: tuple = (50, 1500)

    def f(self, id_, name, desc, x, y, glyph, theme, cost=10, pre=None, mutex=None,
          available="", bypass="", reward="", ai="factor = 1", historical=False, flag_iso=True):
        if pre and isinstance(pre[0], str):
            pre = [[p] for p in pre]      # plain list = all required (AND)
        self.focuses.append(Focus(id_, name, desc, x, y, glyph, theme, cost, pre or [],
                                  mutex or [], available, bypass, reward, ai, flag_iso, historical))
        return id_

    def idea(self, id_, name, desc, glyph, theme, **mods):
        self.ideas[id_] = dict(name=name, desc=desc, glyph=glyph, theme=theme, mods=mods)
        return id_

    def tip(self, key, text):
        self.tooltips[key] = text
        return key

    def either(self, *ids):
        return [list(ids)]


# ------------------------------------------------------------------ reward helpers
def pp(n):
    return f"add_political_power = {n}"


def stab(x):
    return f"add_stability = {x}"


def ws(x):
    return f"add_war_support = {x}"


def idea(i):
    return f"add_ideas = {i}"


def timed(i, days):
    return f"add_timed_idea = {{ idea = {i} days = {days} }}"


def swap(old, new):
    return f"swap_ideas = {{ remove_idea = {old} add_idea = {new} }}"


def remove(i):
    return f"if = {{ limit = {{ has_idea = {i} }} remove_ideas = {i} }}"


def _build(btype, n, capital=False):
    """Grant n levels of a shared building, adding the slots it needs."""
    head = "capital_scope = {" if capital else "random_owned_controlled_state = { limit = { is_core_of = ROOT }"
    return (f"{head} add_extra_state_shared_building_slots = {n} "
            f"add_building_construction = {{ type = {btype} level = {n} instant_build = yes }} }}")


def civ(n=1):
    return _build("industrial_complex", n)


def mil(n=1):
    return _build("arms_factory", n)


def dock(n=1):
    return (f"random_owned_controlled_state = {{ limit = {{ is_coastal = yes }} add_extra_state_shared_building_slots = {n} "
            f"add_building_construction = {{ type = dockyard level = {n} instant_build = yes }} }}")


def infra(times=2):
    one = ("random_owned_controlled_state = { limit = { free_building_slots = { building = infrastructure size > 0 } } "
           "add_building_construction = { type = infrastructure level = 1 instant_build = yes } }")
    return " ".join([one] * times)


def slots(n=2):
    return f"random_owned_controlled_state = {{ add_extra_state_shared_building_slots = {n} }}"


def research():
    return "add_research_slot = 1"


def xp(kind, n):
    return f"{kind}_experience = {n}"


def tech(name, cat, bonus=0.5, uses=1):
    return f"add_tech_bonus = {{ name = {name} bonus = {bonus} uses = {uses} category = {cat} }}"


def manpower(n):
    return f"add_manpower = {n}"


def equip(kind, n):
    return f"add_equipment_to_stockpile = {{ type = {kind} amount = {n} producer = ROOT }}"


def event(eid, days=0):
    if days:
        return f"country_event = {{ id = {eid} days = {days} }}"
    return f"country_event = {eid}"


def flag(f):
    return f"set_country_flag = {f}"


def gflag(f):
    return f"set_global_flag = {f}"


def tt(key):
    return f"custom_effect_tooltip = {key}"


def opinion(target, mod):
    return f"if = {{ limit = {{ country_exists = {target} }} add_opinion_modifier = {{ target = {target} modifier = {mod} }} {target} = {{ add_opinion_modifier = {{ target = ROOT modifier = {mod} }} }} }}"


def pop(ide, x):
    return f"add_popularity = {{ ideology = {ide} popularity = {x} }}"


def threat(n, name):
    return f"add_named_threat = {{ threat = {n} name = {name} }}"


def cp(n):
    return f"add_command_power = {n}"


def J(*parts):
    return "\n".join(p for p in parts if p)
