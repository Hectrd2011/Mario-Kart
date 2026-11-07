#!/usr/bin/env python3
"""Build the Modern Day 2024 mod from the data in tools/data.

    python3 tools/build.py            # everything
    python3 tools/build.py --no-art   # script and localisation only (fast)

Output goes to ../ModernDay2024 (the folder you copy into HOI4's mod dir).
"""
import argparse
import datetime
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from data.model import ascii_id, IDEOLOGIES                      # noqa: E402
from data.countries import COUNTRIES, BY_TAG                      # noqa: E402
from data.ideas import S as START_SPIRITS, T as TRAITS            # noqa: E402
from data.trees import TREES, SHARED_IDEAS, OPINION               # noqa: E402
from data import events as EV                                     # noqa: E402
from data import decisions as DEC                                 # noqa: E402
from gen.pdx import Out, loc_file, fmt_mods, pretty, MOD_NAME     # noqa: E402
from gen import mapdata                                           # noqa: E402

MOD_ROOT = os.path.join(os.path.dirname(HERE), MOD_NAME)
START = datetime.date(2024, 11, 6)
SUB = {"fascism_ideology": "fascism"}          # our key -> vanilla sub-ideology
IDEO_NAMES = {"democratic": "Democratic", "communism": "Communist", "fascism": "Nationalist", "neutrality": "Authoritarian"}


def char_id(tag, person):
    return f"{tag}_{person.key or ascii_id(person.name)}"


def all_ideas():
    ideas = {}
    ideas.update(START_SPIRITS)
    ideas.update(SHARED_IDEAS)
    ideas.update(DEC.EXTRA_IDEAS)
    for t in TREES:
        ideas.update(t.ideas)
    return ideas


# ------------------------------------------------------------------ descriptor
def write_descriptor(out, has_map):
    replace = ["common/bookmarks", "common/national_focus", "common/ai_strategy_plans", "history/countries"]
    if has_map:
        replace.append("history/states")
    body = [
        'version="1.0.0"',
        'tags={\n\t"Alternative History"\n\t"Events"\n\t"Gameplay"\n\t"Historical"\n\t"National Focuses"\n}',
        'name="Modern Day: 2024"',
        'picture="thumbnail.png"',
        'supported_version="1.16.*"',
    ] + [f'replace_path="{p}"' for p in replace]
    out.write("descriptor.mod", "\n".join(body))
    # the launcher file that sits next to the folder
    launcher = "\n".join(body + [f'path="mod/{MOD_NAME}"'])
    with open(os.path.join(os.path.dirname(MOD_ROOT), f"{MOD_NAME}.mod"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(launcher + "\n")


# ------------------------------------------------------------------ countries
GFX_CULTURE = {
    "western": "western_european", "eastern": "eastern_european", "middle_eastern": "middle_eastern",
    "african": "african", "asian": "asian", "south_american": "south_american", "commonwealth": "commonwealth",
}


def write_country_defs(out, new_tags):
    lines = []
    for c in COUNTRIES:
        if c.tag in new_tags:
            lines.append(f'{c.tag} = "countries/MD {c.name}.txt"')
            g = GFX_CULTURE[c.culture]
            out.write(f"common/countries/MD {c.name}.txt",
                      f"graphical_culture = {g}_gfx\ngraphical_culture_2d = {g}_2d\n\ncolor = {{ {c.color[0]} {c.color[1]} {c.color[2]} }}")
    out.write("common/country_tags/md_countries.txt", "\n".join(lines))
    colors = []
    for c in COUNTRIES:
        r, g, b = c.color
        colors.append(f"{c.tag} = {{\n\tcolor = rgb {{ {r} {g} {b} }}\n\tcolor_ui = rgb {{ {min(255, r + 40)} {min(255, g + 40)} {min(255, b + 40)} }}\n}}")
    out.write("common/countries/colors.txt", "\n".join(colors))


def laws(c):
    econ = {1: "partial_economic_mobilisation", 2: "low_economic_mobilisation", 3: "civilian_economy", 4: "civilian_economy"}[c.tier]
    cons = "volunteer_only" if c.ruling == "democratic" and c.ws < 40 else "limited_conscription"
    trade = "export_focus"
    if c.tag in ("RUS",):
        econ, cons, trade = "war_economy", "extensive_conscription", "limited_exports"
    if c.tag in ("UKR",):
        econ, cons, trade = "war_economy", "service_by_requirement", "export_focus"
    if c.tag in ("ISR", "PRK", "SUD", "RSF", "BRM"):
        econ, cons = "partial_economic_mobilisation", "extensive_conscription"
    if c.tag in ("PRK", "CUB", "AFG"):
        trade = "closed_economy"
    return [econ, cons, trade]


NUKES = {"USA": 12, "RUS": 12, "PRC": 5, "FRA": 3, "ENG": 3, "IND": 2, "PAK": 2, "ISR": 2, "PRK": 1}


def write_country_history(out, c, md):
    leader = c.leader
    lines = [f"# {c.name}: 6 November 2024"]
    cap = md.capital(c.tag)
    if cap:
        lines.append(f"capital = {cap}")
    if md.has_oob(c.tag):
        lines.append(f'oob = "MD_{c.tag}_2024"')
    lines.append(f"set_research_slots = {c.research_slots}")
    lines.append(f"set_stability = {c.stab / 100:.2f}")
    lines.append(f"set_war_support = {c.ws / 100:.2f}")
    lines.append(f"set_convoys = {md.convoys(c)}")
    if c.tag in NUKES:
        lines.append(f"add_nuclear_bombs = {NUKES[c.tag]}")
    techs = md.technologies(c)
    if techs:
        lines.append("set_technology = {\n" + "\n".join(f"\t{t} = 1" for t in techs) + "\n}")
    lines.append("")
    if c.election:
        last, freq, allowed = c.election
        lines.append(f'set_politics = {{\n\truling_party = {c.ruling}\n\tlast_election = "{last}"\n\telection_frequency = {freq}\n\telections_allowed = {"yes" if allowed else "no"}\n}}')
    else:
        lines.append(f"set_politics = {{\n\truling_party = {c.ruling}\n\telections_allowed = no\n}}")
    pops = " ".join(f"{k} = {v}" for k, v in c.pop.items())
    lines.append(f"set_popularities = {{ {pops} }}")
    lines.append("")
    lines.append("add_ideas = {\n" + "\n".join(f"\t{i}" for i in laws(c) + c.spirits) + "\n}")
    lines.append("")
    # characters: the sitting leader plus opposition leaders of other ideologies
    lines.append(f"recruit_character = {char_id(c.tag, leader)}")
    for o in c.others:
        if o.group != leader.group:
            lines.append(f"recruit_character = {char_id(c.tag, o)}")
    for a in c.advisors:
        lines.append(f"recruit_character = {char_id(c.tag, a)}")
    extra = md.history_extra(c)
    if extra:
        lines.append("")
        lines.append(extra)
    out.write(f"history/countries/{c.tag} - {c.name}.txt", "\n".join(lines))


def write_characters(out):
    loc = []
    for c in COUNTRIES:
        blocks = []
        people = c.leaders + c.others
        seen = set()
        for p in people:
            cid = char_id(c.tag, p)
            if cid in seen:
                continue
            seen.add(cid)
            loc.append((cid, p.name))
            desc = f"{cid}_desc"
            loc.append((desc, f"{p.title}." if p.title else p.name))
            traits = " ".join(p.traits)
            blocks.append(f"""	{cid} = {{
		name = {cid}
		portraits = {{
			civilian = {{
				large = "gfx/leaders/{c.tag}/md_{cid}.dds"
				small = "gfx/interface/ideas/md_leaders/{cid}.dds"
			}}
		}}
		country_leader = {{
			desc = "{desc}"
			ideology = {SUB.get(p.sub, p.sub)}
			traits = {{ {traits} }}
			expire = "2070.1.1.1"
			id = -1
		}}
	}}""")
        advisors = list(c.advisors) + (DEC.USA_INCOMING if c.tag == "USA" else [])
        for a in advisors:
            cid = char_id(c.tag, a)
            loc.append((cid, a.name))
            loc.append((f"{cid}_adv_role", a.role))
            traits = " ".join(a.traits)
            blocks.append(f"""	{cid} = {{
		name = {cid}
		portraits = {{
			civilian = {{
				small = "gfx/interface/advisors/md/{cid}.dds"
			}}
		}}
		advisor = {{
			slot = political_advisor
			idea_token = {cid}_adv
			allowed = {{ original_tag = {c.tag} }}
			traits = {{ {traits} }}
			cost = {a.cost}
			ai_will_do = {{ factor = 1 }}
		}}
	}}""")
            loc.append((f"{cid}_adv", f"{a.name}"))
        out.write(f"common/characters/MD_{c.tag}.txt", "characters = {\n" + "\n".join(blocks) + "\n}")
    return loc


def write_traits(out):
    blocks = []
    loc = []
    for tid, t in TRAITS.items():
        blocks.append(f"\t{tid} = {{\n\t\trandom = no\n{fmt_mods(t['mods'], chr(9) * 2)}\n\t}}")
        loc.append((tid, t["name"]))
    out.write("common/country_leader/md_traits.txt", "leader_traits = {\n" + "\n".join(blocks) + "\n}")
    return loc


def write_ideas(out, ideas):
    blocks = []
    loc = []
    for iid, d in ideas.items():
        blocks.append(f"\t\t{iid} = {{\n\t\t\tpicture = {iid}\n\t\t\tallowed = {{ always = no }}\n\t\t\tmodifier = {{\n{fmt_mods(d['mods'], chr(9) * 4)}\n\t\t\t}}\n\t\t}}")
        loc.append((iid, d["name"]))
        loc.append((f"{iid}_desc", d["desc"]))
    out.write("common/ideas/md_spirits.txt", "ideas = {\n\tcountry = {\n" + "\n".join(blocks) + "\n\t}\n}")
    return loc


def write_opinion(out):
    ops = dict(OPINION)
    for t in TREES:
        ops.update(t.opinion)
    blocks, loc = [], []
    for oid, (name, val) in ops.items():
        blocks.append(f"\t{oid} = {{\n\t\tvalue = {val}\n\t\tdecay = 1\n\t\tmin_trust = -100\n\t\tmax_trust = 100\n\t}}")
        loc.append((oid, name))
    out.write("common/opinion_modifiers/md_opinion_modifiers.txt", "opinion_modifiers = {\n" + "\n".join(blocks) + "\n}")
    return loc


# ------------------------------------------------------------------ focus trees
def focus_icon_key(fo, tree):
    iso = tree.iso if fo.flag_iso and tree.iso else ""
    return f"md_{fo.glyph.replace('-', '_')}_{fo.theme}" + (f"_{iso.lower()}" if iso else "")


def write_focus_trees(out):
    loc, icons = [], {}
    for t in TREES:
        if t.default:
            country = "country = { factor = 1 }"
        else:
            country = f"country = {{\n\t\tfactor = 0\n\t\tmodifier = {{\n\t\t\tadd = 20\n\t\t\ttag = {t.tag}\n\t\t}}\n\t}}"
        mutex = {}
        for fo in t.focuses:
            for m in fo.mutex:
                mutex.setdefault(fo.id, set()).add(m)
                mutex.setdefault(m, set()).add(fo.id)
        parts = [f"focus_tree = {{\n\tid = {t.id}\n\t{country}\n\tdefault = {'yes' if t.default else 'no'}\n\treset_on_civilwar = no\n"
                 f"\tcontinuous_focus_position = {{ x = {t.continuous[0]} y = {t.continuous[1]} }}"]
        for fo in t.focuses:
            key = focus_icon_key(fo, t)
            icons[key] = (fo.glyph, fo.theme, t.iso if fo.flag_iso else None)
            b = [f"\tfocus = {{", f"\t\tid = {fo.id}", f"\t\ticon = GFX_{key}", f"\t\tx = {fo.x}", f"\t\ty = {fo.y}",
                 f"\t\tcost = {fo.cost}"]
            for grp in fo.pre:
                b.append("\t\tprerequisite = { " + " ".join(f"focus = {p}" for p in grp) + " }")
            if fo.id in mutex:
                b.append("\t\tmutually_exclusive = { " + " ".join(f"focus = {m}" for m in sorted(mutex[fo.id])) + " }")
            if fo.available:
                b.append("\t\tavailable = {\n" + pretty(fo.available, 3) + "\n\t\t}")
            if fo.bypass:
                b.append("\t\tbypass = {\n" + pretty(fo.bypass, 3) + "\n\t\t}")
            from data.focus_dsl import FILTERS
            filt = FILTERS.get(fo.theme, "FOCUS_FILTER_POLITICAL")
            b.append(f"\t\tsearch_filters = {{ {filt}{' FOCUS_FILTER_HISTORICAL' if fo.historical else ''} }}")
            b.append(f"\t\tai_will_do = {{ {fo.ai} }}")
            b.append("\t\tcompletion_reward = {\n" + (pretty(fo.reward, 3) if fo.reward else "") + "\n\t\t}")
            b.append("\t}")
            parts.append("\n".join(b))
            loc.append((fo.id, fo.name))
            loc.append((f"{fo.id}_desc", fo.desc))
        parts.append("}")
        out.write(f"common/national_focus/{t.id}.txt", "\n\n".join(parts))
    return loc, icons


# ------------------------------------------------------------------ events
def days_from_start(d):
    return (datetime.date(*d) - START).days


def write_events(out):
    loc, pics = [], set()
    by_ns = {}
    for e in EV.EVENTS:
        ns = e.id.split(".")[0]
        by_ns.setdefault(ns, []).append(e)
    for e in DEC.DIP_EVENTS:
        pass
    for ns, evs in by_ns.items():
        blocks = [f"add_namespace = {ns}"]
        for e in evs:
            kind = "news_event" if e.kind == "news" else "country_event"
            pics.add(e.pic)
            b = [f"{kind} = {{", f"\tid = {e.id}", f"\ttitle = {e.id}.t", f"\tdesc = {e.id}.d",
                 f"\tpicture = GFX_md_event_{e.pic}"]
            if e.major:
                b.append("\tmajor = yes")
            b.append("\tis_triggered_only = yes")
            if e.trigger:
                b.append("\ttrigger = {\n" + pretty(e.trigger, 2) + "\n\t}")
            if e.immediate:
                b.append("\timmediate = {\n" + pretty(e.immediate, 2) + "\n\t}")
            for i, (text, eff, ai) in enumerate(e.options):
                okey = f"{e.id}.{chr(97 + i)}"
                loc.append((okey, text))
                ob = [f"\toption = {{", f"\t\tname = {okey}"]
                if len(e.options) > 1:
                    ob.append(f"\t\tai_chance = {{ factor = {ai} }}")
                if eff:
                    ob.append(pretty(eff, 2))
                ob.append("\t}")
                b.append("\n".join(ob))
            b.append("}")
            blocks.append("\n".join(b))
            loc.append((f"{e.id}.t", e.title))
            loc.append((f"{e.id}.d", e.desc))
        out.write(f"events/MD_{ns}.txt", "\n\n".join(blocks))
    # diplomacy events
    blocks = ["add_namespace = md_dip"]
    for eid, title, desc, opts in DEC.DIP_EVENTS:
        pics.add("deal")
        b = [f"country_event = {{", f"\tid = {eid}", f"\ttitle = {eid}.t", f"\tdesc = {eid}.d", "\tpicture = GFX_md_event_deal",
             "\tis_triggered_only = yes"]
        for i, (text, eff, ai) in enumerate(opts):
            okey = f"{eid}.{chr(97 + i)}"
            loc.append((okey, text))
            b.append(f"\toption = {{\n\t\tname = {okey}\n\t\tai_chance = {{ factor = {ai} }}\n{pretty(eff, 2)}\n\t}}")
        b.append("}")
        blocks.append("\n".join(b))
        loc.append((f"{eid}.t", title))
        loc.append((f"{eid}.d", desc))
    out.write("events/MD_md_dip.txt", "\n\n".join(blocks))
    # party renames used by leader-change events
    for (tag, ide, key), (long, short) in EV.PARTY_RENAMES.items():
        loc.append((f"{tag}_{ide}_party_{key}_long", long))
        loc.append((f"{tag}_{ide}_party_{key}", short))
    return loc, pics


def write_on_actions(out, md):
    sched = []
    for e in EV.EVENTS:
        if e.date and e.tag:
            d = days_from_start(e.date)
            sched.append(f"\t\t\tif = {{ limit = {{ country_exists = {e.tag} }} {e.tag} = {{ country_event = {{ id = {e.id} days = {d} }} }} }}")
    text = ("on_actions = {\n\ton_startup = {\n\t\teffect = {\n"
            "\t\t\tset_global_flag = md_modern_day\n" + "\n".join(sched) + "\n" + md.startup_effect() + "\n\t\t}\n\t}\n}")
    out.write("common/on_actions/md_on_actions.txt", text)


def write_scripted_effects(out, md):
    out.write("common/scripted_effects/md_effects.txt", DEC.SCRIPTED_EFFECTS.strip() + "\n\n" + md.scripted_effects())


def write_decisions(out):
    loc, icons = [], {}
    cats = []
    for cid, (name, desc, pic, allowed) in DEC.CATEGORIES.items():
        b = [f"{cid} = {{", f"\ticon = GFX_decision_category_{cid}" if False else "\ticon = generic_decision"]
        b = [f"{cid} = {{"]
        if allowed:
            b.append("\tallowed = {\n" + pretty(allowed, 2) + "\n\t}")
        b.append("}")
        cats.append("\n".join(b))
        loc.append((cid, name))
        loc.append((f"{cid}_desc", desc))
    out.write("common/decisions/categories/md_categories.txt", "\n\n".join(cats))
    by_cat = {}
    for did, d in DEC.D.items():
        by_cat.setdefault(d["cat"], []).append((did, d))
    blocks = []
    for cat, items in by_cat.items():
        inner = []
        for did, d in items:
            key = f"md_{d['glyph'].replace('-', '_')}_{d['theme']}"
            icons[key] = (d["glyph"], d["theme"])
            b = [f"\t{did} = {{", f"\t\ticon = {key}", f"\t\tcost = {d['cost']}"]
            if d["visible"]:
                b.append("\t\tvisible = {\n" + pretty(d["visible"], 3) + "\n\t\t}")
            if d["available"]:
                b.append("\t\tavailable = {\n" + pretty(d["available"], 3) + "\n\t\t}")
            if d["once"]:
                b.append("\t\tfire_only_once = yes")
            if d["cooldown"]:
                b.append(f"\t\tdays_re_enable = {d['cooldown']}")
            b.append("\t\tcomplete_effect = {\n" + pretty(d["effect"], 3) + "\n\t\t}")
            b.append(f"\t\tai_will_do = {{ factor = {d['ai']} }}")
            b.append("\t}")
            inner.append("\n".join(b))
            loc.append((did, d["name"]))
            loc.append((f"{did}_desc", d["desc"]))
        blocks.append(f"{cat} = {{\n" + "\n".join(inner) + "\n}")
    out.write("common/decisions/md_decisions.txt", "\n\n".join(blocks))
    return loc, icons


# ------------------------------------------------------------------ bookmark & defines
BOOKMARK_MAJORS = ["USA", "PRC", "RUS", "ENG", "FRA", "GER", "IND"]
BOOKMARK_MINORS = ["UKR", "ISR", "PER", "JAP", "KOR", "ROC", "TUR", "POL", "SAU", "PRK", "BRA", "SYR"]
BOOKMARK_TEXT = {
    "USA": "Donald Trump has won back the White House. Until 20 January a lame-duck Biden administration still holds power. Then: tariffs, DOGE, the border, and a promise to end the war in Ukraine in a day.",
    "PRC": "Xi Jinping's China faces a sluggish economy, a hostile Washington, and the 2027 deadline for a PLA ready to take Taiwan.",
    "RUS": "Nearly three years into the war, Russia is grinding forward in the Donbas, fighting off a Ukrainian incursion in Kursk, and hoping the new American president will hand it victory.",
    "ENG": "Keir Starmer's Labour government won a landslide in July but faces a fiscal black hole, a rising Reform UK and a world in turmoil.",
    "FRA": "With no majority in the Assembly, Macron's France lurches from budget crisis to budget crisis as the Rassemblement National waits for its moment.",
    "GER": "On the very day Trump wins, Olaf Scholz's traffic-light coalition collapses. Germany faces a snap election, a stagnant economy and a Bundeswehr that must be rebuilt.",
    "IND": "Narendra Modi's India is the world's most populous nation and fastest-growing major economy, courted by Washington and Moscow alike.",
    "UKR": "Ukraine holds out against the Russian invasion, holds a slice of Kursk, and fears that American aid is about to dry up.",
    "ISR": "Thirteen months after 7 October, Israel fights on seven fronts: Gaza, Lebanon, the West Bank, Syria, Iraq, Yemen and Iran.",
    "PER": "Iran's Axis of Resistance is reeling, its proxies battered and its air defences exposed. The nuclear question looms.",
    "JAP": "Shigeru Ishiba's LDP has just lost its majority. Japan is re-arming faster than at any time since 1945.",
    "KOR": "President Yoon Suk Yeol is unpopular and cornered by an opposition-controlled National Assembly...",
    "ROC": "Lai Ching-te's Taiwan makes the world's most advanced chips and lives under the shadow of the PLA.",
    "TUR": "Erdoğan's Türkiye balances between NATO and Russia, and eyes an opportunity in Syria.",
    "POL": "Poland is building the largest army in Europe on NATO's eastern flank.",
    "SAU": "Mohammed bin Salman's kingdom pursues Vision 2030 and weighs normalisation with Israel.",
    "PRK": "Kim Jong Un has sent troops to fight for Russia in Kursk in return for technology and cash.",
    "BRA": "Lula's Brazil hosts BRICS and COP30 and seeks a voice for the Global South.",
    "SYR": "Bashar al-Assad's regime looks secure. In three weeks it will not exist.",
}


def write_bookmark(out):
    entries = []
    for tag in BOOKMARK_MAJORS + ["---"] + BOOKMARK_MINORS:
        if tag == "---":
            entries.append('\t\t"---" = {\n\t\t\thistory = "OTHER_GAMES_DESC"\n\t\t}')
            continue
        c = BY_TAG[tag]
        entries.append(f'\t\t"{tag}" = {{\n\t\t\thistory = "MD_BM_{tag}"\n\t\t\tideology = {c.ruling}\n\t\t\tideas = {{ {" ".join(c.spirits[:3])} }}\n\t\t}}')
    text = ("bookmarks = {\n\tbookmark = {\n\t\tname = \"MD_BOOKMARK_NAME\"\n\t\tdesc = \"MD_BOOKMARK_DESC\"\n"
            "\t\tdate = 2024.11.6.12\n\t\tpicture = \"GFX_select_date_1936\"\n\t\tdefault_country = \"USA\"\n\t\tdefault = yes\n\n"
            + "\n".join(entries) + "\n\n\t\teffect = {\n\t\t\trandomize_weather = 22345\n\t\t}\n\t}\n}")
    out.write("common/bookmarks/md_2024.txt", text)
    loc = [("MD_BOOKMARK_NAME", "The Second Term"),
           ("MD_BOOKMARK_DESC", "6 November 2024. Donald Trump has won the American presidential election. Wars rage in Ukraine, Gaza, Lebanon and Sudan; Germany's government has just collapsed; and in three weeks the Assad regime will fall. The world is about to change.")]
    for tag, txt in BOOKMARK_TEXT.items():
        loc.append((f"MD_BM_{tag}", txt))
    return loc


def write_defines(out):
    out.write("common/defines/zz_md_defines.lua",
              'NDefines.NGame.START_DATE = "2024.11.6.12"\n'
              'NDefines.NGame.END_DATE = "2060.1.1.1"\n')


# ------------------------------------------------------------------ localisation
def country_loc(new_tags):
    loc = []
    for c in COUNTRIES:
        loc += [(c.tag, c.name), (f"{c.tag}_DEF", c.long), (f"{c.tag}_ADJ", c.adj)]
        for ide in IDEOLOGIES:
            loc += [(f"{c.tag}_{ide}", c.name), (f"{c.tag}_{ide}_DEF", c.long), (f"{c.tag}_{ide}_ADJ", c.adj)]
        for ide in IDEOLOGIES:
            p = c.parties.get(ide)
            long, short = p if p else (f"{c.adj} {IDEO_NAMES[ide]}s", f"{IDEO_NAMES[ide]}s")
            loc += [(f"{c.tag}_{ide}_party", short), (f"{c.tag}_{ide}_party_long", long)]
    loc += [("HTS_TRANSITIONAL", "Syria"), ("HTS_TRANSITIONAL_DEF", "the Syrian Arab Republic"), ("HTS_TRANSITIONAL_ADJ", "Syrian")]
    for ide in IDEOLOGIES:
        loc += [(f"HTS_TRANSITIONAL_{ide}", "Syria"), (f"HTS_TRANSITIONAL_{ide}_DEF", "the Syrian Arab Republic"),
                (f"HTS_TRANSITIONAL_{ide}_ADJ", "Syrian")]
    loc += [("md_faction_nato", "NATO")]
    return loc


THREATS = {
    "md_threat_iran_strikes": "Strikes on Iran", "md_threat_novorossiya": "Russian Claims on the Black Sea Coast",
    "md_threat_nuclear_doctrine": "Russian Nuclear Threats", "md_threat_oreshnik": "The Oreshnik Strike",
    "md_threat_prc_nukes": "Chinese Nuclear Build-Up", "md_threat_strait_thunder": "Exercises around Taiwan",
    "md_threat_taiwan_war": "Chinese Invasion Threat", "md_threat_scarborough": "Scarborough Shoal Dispute",
    "md_threat_true_promise": "Iranian Missile Strikes", "md_threat_iran_enrichment": "Iranian Weapons-Grade Enrichment",
    "md_threat_iran_bomb": "Iranian Nuclear Test", "md_threat_sindoor": "India-Pakistan Clashes",
    "md_threat_targeted_killing": "Targeted Killings", "md_threat_red_sea": "Red Sea Attacks",
    "md_threat_missile_test": "Missile Tests", "md_threat_arsenal": "Nuclear Build-Up",
}

UI_RENAMES = [
    # rename the ideology groups for a modern setting
    ("fascism", "Nationalism"), ("fascism_noun", "Nationalist"), ("fascism_desc", "Nationalist and national-populist movements that put the nation above international cooperation."),
    ("neutrality", "Authoritarianism"), ("neutrality_noun", "Authoritarian"), ("neutrality_desc", "Regimes in which power rests with a ruler, a party machine, a junta or a royal house rather than open elections."),
    ("democratic", "Democracy"), ("communism", "Communism"),
    ("nazism", "Ethnonationalism"), ("fascism_ideology", "National Populism"), ("falangism", "National Conservatism"), ("rexism", "Religious Nationalism"),
    ("despotism", "Personalist Dictatorship"), ("oligarchism", "Monarchy / Oligarchy"), ("moderatism", "Technocracy"), ("anarchism", "Insurgency"),
]


def write_localisation(out, chunks):
    for name, entries in chunks.items():
        sub = "replace/" if name.startswith("replace_") else ""
        out.write(f"localisation/english/{sub}md_{name}_l_english.yml", loc_file("english", entries), bom=True)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-art", action="store_true")
    args = ap.parse_args()

    md = mapdata.load()
    if os.path.isdir(MOD_ROOT):
        keep_art = args.no_art
        for entry in os.listdir(MOD_ROOT):
            if keep_art and entry == "gfx":
                continue
            p = os.path.join(MOD_ROOT, entry)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    out = Out(MOD_ROOT)

    new_tags = md.new_tags([c.tag for c in COUNTRIES])
    write_descriptor(out, md.has_states)
    write_defines(out)
    write_country_defs(out, new_tags)
    for c in COUNTRIES:
        write_country_history(out, c, md)
    md.write(out)

    loc = {}
    loc["replace_countries"] = country_loc(new_tags)
    loc["replace_ideologies"] = UI_RENAMES
    loc["characters"] = write_characters(out)
    loc["traits"] = write_traits(out)
    ideas = all_ideas()
    loc["ideas"] = write_ideas(out, ideas)
    loc["opinion"] = write_opinion(out)
    floc, focus_icons = write_focus_trees(out)
    loc["focus"] = floc
    eloc, pics = write_events(out)
    loc["events"] = eloc
    dloc, dec_icons = write_decisions(out)
    loc["decisions"] = dloc
    loc["bookmark"] = write_bookmark(out)
    loc["misc"] = list(THREATS.items()) + md.localisation()
    write_on_actions(out, md)
    write_scripted_effects(out, md)
    write_localisation(out, loc)

    from gen import gfx
    gfx.write_gfx(out, ideas, focus_icons, dec_icons, pics, render=not args.no_art)
    print(f"wrote {len(out.files)} script/loc files to {MOD_ROOT}")


if __name__ == "__main__":
    main()
