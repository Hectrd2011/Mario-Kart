#!/usr/bin/env python3
"""Static checks for the built mod. Exit code 1 on any error.

HOI4 itself is the final judge, but most mod-breaking mistakes are missing
references, unbalanced braces and bad localisation files, and those can be
caught without the game.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.path.dirname(HERE), "ModernDay2024")
sys.path.insert(0, HERE)

from gen.pdx import braces_balanced  # noqa: E402

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8-sig") as fh:
        return fh.read()


def files(ext, sub=""):
    for dp, _, fs in os.walk(os.path.join(ROOT, sub)):
        for f in fs:
            if f.endswith(ext):
                yield os.path.relpath(os.path.join(dp, f), ROOT)


def strip_comments(text):
    return "\n".join(re.sub(r'#.*$', "", line) if '"' not in line else line for line in text.splitlines())


# ------------------------------------------------------------------ vanilla things we rely on
VANILLA_IDEAS = {
    "civilian_economy", "low_economic_mobilisation", "partial_economic_mobilisation", "war_economy", "tot_economic_mobilisation",
    "disarmed_nation", "volunteer_only", "limited_conscription", "extensive_conscription", "service_by_requirement",
    "all_adults_serve", "scraping_the_barrel", "free_trade", "export_focus", "limited_exports", "closed_economy",
}
VANILLA_GFX = {"GFX_select_date_1936"}
VANILLA_TEXTURES = {"gfx/interface/goals/shine_overlay.dds"}

# Modifiers used by this mod that exist in vanilla HOI4 (1.12+).
KNOWN_MODIFIERS = {
    "political_power_gain", "political_power_factor", "stability_factor", "war_support_factor", "stability_weekly",
    "war_support_weekly", "consumer_goods_factor", "production_speed_buildings_factor",
    "production_speed_industrial_complex_factor", "production_speed_arms_factory_factor",
    "production_speed_infrastructure_factor", "production_speed_dockyard_factor", "industrial_capacity_factory",
    "industrial_capacity_dockyard", "production_factory_max_efficiency_factor", "production_factory_efficiency_gain_factor",
    "research_speed_factor", "conscription", "conscription_factor", "monthly_population", "army_attack_factor",
    "army_defence_factor", "army_org_factor", "army_morale_factor", "army_core_attack_factor", "army_core_defence_factor",
    "trade_opinion_factor", "justify_war_goal_time", "enemy_justify_war_goal_time", "drift_defence_factor",
    "democratic_drift", "communism_drift", "fascism_drift", "neutrality_drift", "local_resources_factor",
    "experience_gain_army", "command_power_gain_mult", "planning_speed", "industry_repair_factor",
    "nuclear_production_factor", "encryption_factor", "decryption_factor", "opinion_gain_monthly_factor",
    "send_volunteers_tension", "lend_lease_tension", "army_speed_factor",
}

# Effects, triggers and structural keys this mod uses.
KNOWN_KEYS = {
    # structure
    "focus_tree", "id", "country", "factor", "modifier", "add", "tag", "default", "reset_on_civilwar",
    "continuous_focus_position", "x", "y", "focus", "icon", "cost", "prerequisite", "mutually_exclusive", "available",
    "bypass", "search_filters", "ai_will_do", "completion_reward", "ideas", "picture", "allowed", "name", "portraits",
    "civilian", "large", "small", "country_leader", "desc", "ideology", "traits", "expire", "advisor", "slot",
    "idea_token", "leader_traits", "random", "characters", "opinion_modifiers", "value", "decay", "min_trust",
    "max_trust", "add_namespace", "country_event", "news_event", "title", "major", "is_triggered_only", "trigger",
    "immediate", "option", "ai_chance", "days", "hours", "on_actions", "on_startup", "effect", "bookmarks", "bookmark",
    "date", "default_country", "history", "spriteTypes", "spriteType", "SpriteType", "texturefile", "effectFile",
    "animation", "animationmaskfile", "animationtexturefile", "animationrotation", "animationlooping", "animationtime",
    "animationdelay", "animationblendmode", "animationtype", "animationrotationoffset", "animationtexturescale",
    "legacy_lazy_load", "visible", "fire_only_once", "days_re_enable", "complete_effect", "limit", "if", "else",
    "else_if", "NOT", "OR", "AND", "graphical_culture", "graphical_culture_2d", "color", "color_ui",
    # history
    "capital", "oob", "set_research_slots", "set_stability", "set_war_support", "set_convoys", "add_nuclear_bombs",
    "set_technology", "set_politics", "ruling_party", "last_election", "election_frequency", "elections_allowed",
    "set_popularities", "democratic", "communism", "fascism", "neutrality", "add_ideas", "recruit_character",
    "create_faction", "add_to_faction", "declare_war_on", "target", "type", "give_military_access",
    "diplomatic_relation", "relation", "active", "set_cosmetic_tag", "randomize_weather",
    # effects
    "add_political_power", "add_stability", "add_war_support", "add_timed_idea", "idea", "swap_ideas", "remove_idea",
    "add_idea", "remove_ideas", "random_owned_controlled_state", "capital_scope", "add_extra_state_shared_building_slots",
    "add_building_construction", "level", "instant_build", "free_building_slots", "building", "size", "include_locked",
    "is_core_of", "is_coastal", "add_research_slot", "army_experience", "air_experience", "navy_experience",
    "add_tech_bonus", "bonus", "uses", "category", "add_manpower", "add_equipment_to_stockpile", "amount", "producer",
    "set_country_flag", "set_global_flag", "custom_effect_tooltip", "add_opinion_modifier", "add_popularity",
    "popularity", "add_named_threat", "threat", "add_command_power", "leave_faction", "every_country",
    "every_state", "every_owned_state", "add_claim_by", "create_wargoal", "annex_country", "transfer_troops",
    "transfer_state", "white_peace", "retire_character", "promote_character", "set_party_name", "long_name",
    "send_equipment", "equipment", "set_politics",
    # triggers
    "has_country_flag", "has_global_flag", "country_exists", "has_war_with", "has_war", "has_idea",
    "has_completed_focus", "has_character", "has_government", "has_stability", "has_war_support", "has_opinion",
    "is_in_faction", "is_in_faction_with", "is_faction_leader", "is_owned_by", "is_controlled_by", "has_equipment",
    "always", "original_tag", "FROM", "ROOT", "PREV",
}


def scan_keys(text):
    return set(re.findall(r'(?:^|[\s{])([A-Za-z_][A-Za-z0-9_\.]*)\s*=', text))


def main():
    if not os.path.isdir(ROOT):
        print("build the mod first: python3 tools/build.py")
        return 1

    script_files = [f for f in files(".txt") if not f.startswith("localisation")] + list(files(".gfx"))
    blob = {}
    for rel in script_files:
        text = read(rel)
        blob[rel] = text
        if not braces_balanced(strip_comments(text)):
            err(f"{rel}: unbalanced braces")
    if not os.path.exists(os.path.join(ROOT, "descriptor.mod")):
        err("descriptor.mod missing")

    # ---------------------------------------------------------- localisation
    loc = {}
    for rel in files(".yml", "localisation"):
        raw = open(os.path.join(ROOT, rel), "rb").read()
        if not raw.startswith(b"\xef\xbb\xbf"):
            err(f"{rel}: missing UTF-8 BOM")
        text = raw.decode("utf-8-sig")
        lines = text.splitlines()
        if not rel.endswith("_l_english.yml") or lines[0].strip() != "l_english:":
            err(f"{rel}: bad header or name")
        for n, line in enumerate(lines[1:], 2):
            if not line.strip():
                continue
            if "\t" in line:
                err(f"{rel}:{n}: tab in localisation")
            m = re.match(r'^ ([A-Za-z0-9_\.\-]+):0 "(.*)"$', line)
            if not m:
                err(f"{rel}:{n}: malformed line: {line[:80]}")
                continue
            k, v = m.groups()
            if k in loc:
                err(f"duplicate loc key {k} ({loc[k][0]} and {rel})")
            loc[k] = (rel, v)
            if re.search(r'(?<!\\)"', v):
                err(f"{rel}:{n}: unescaped quote in {k}")

    def need_loc(key, where):
        if key not in loc:
            err(f"{where}: no localisation for {key}")

    all_text = "\n".join(blob.values())

    # ---------------------------------------------------------- definitions
    ideas_txt = blob.get("common/ideas/md_spirits.txt", "")
    ideas = set(re.findall(r'^\t\t(md_\w+) = \{', ideas_txt, re.M))
    traits = set(re.findall(r'^\t(md_\w+) = \{', blob.get("common/country_leader/md_traits.txt", ""), re.M))
    opinions = set(re.findall(r'^\t(md_\w+) = \{', blob.get("common/opinion_modifiers/md_opinion_modifiers.txt", ""), re.M))
    effects = set(re.findall(r'^(md_\w+) = \{', blob.get("common/scripted_effects/md_effects.txt", ""), re.M))
    events = set(re.findall(r'^\tid = (md_\w+\.\d+)', "\n".join(v for k, v in blob.items() if k.startswith("events/")), re.M))
    focuses = set(re.findall(r'^\t\tid = (\w+)', "\n".join(v for k, v in blob.items() if "national_focus" in k), re.M))
    chars = set()
    for k, v in blob.items():
        if k.startswith("common/characters/"):
            chars |= set(re.findall(r'^\t(\w+) = \{', v, re.M))
    gfx = set(re.findall(r'name = "(GFX_\w+)"', all_text)) | VANILLA_GFX
    tags = set(re.findall(r'^([A-Z][A-Z0-9]{2}) = ', blob.get("common/countries/colors.txt", ""), re.M))
    decisions = set()
    dtxt = blob.get("common/decisions/md_decisions.txt", "")
    decisions = set(re.findall(r'^\t(md_\w+) = \{', dtxt, re.M))
    cats = set(re.findall(r'^(md_cat_\w+) = \{', blob.get("common/decisions/categories/md_categories.txt", ""), re.M))

    # ---------------------------------------------------------- references
    for rel, text in blob.items():
        t = strip_comments(text)
        for m in re.findall(r'(?:add_ideas|idea|remove_idea|add_idea|has_idea|remove_ideas) = (\w+)', t):
            if m not in ideas and m not in VANILLA_IDEAS:
                err(f"{rel}: unknown idea {m}")
        for block in re.findall(r'add_ideas = \{([^}]*)\}', t):
            for m in block.split():
                if m not in ideas and m not in VANILLA_IDEAS:
                    err(f"{rel}: unknown idea {m}")
        for m in re.findall(r'(?:country_event|news_event) = (?:\{ *id = )?(md_\w+\.\d+)', t):
            if m not in events:
                err(f"{rel}: unknown event {m}")
        for m in re.findall(r'id = (md_\w+\.\d+)', t):
            if m not in events:
                err(f"{rel}: unknown event {m}")
        for m in re.findall(r'(?:recruit_character|promote_character|retire_character|has_character) = (\w+)', t):
            if m not in chars:
                err(f"{rel}: unknown character {m}")
        for m in re.findall(r'has_completed_focus = (\w+)', t):
            if m not in focuses:
                err(f"{rel}: unknown focus {m}")
        for m in re.findall(r'modifier = (md_opinion_\w+)', t):
            if m not in opinions:
                err(f"{rel}: unknown opinion modifier {m}")
        for m in re.findall(r'\b(md_\w+) = yes', t):
            if m not in effects:
                err(f"{rel}: unknown scripted effect {m}")
        for m in re.findall(r'(?:icon|picture) = (GFX_\w+)', t):
            if m not in gfx:
                err(f"{rel}: missing sprite {m}")
        for m in re.findall(r'\b([A-Z]{3}) = \{', t):
            if m not in tags and m not in ("NOT", "AND"):
                err(f"{rel}: unknown country scope {m}")
        for m in re.findall(r'(?:country_exists|tag|original_tag|target|has_war_with|give_military_access|is_owned_by|is_controlled_by|is_core_of|add_claim_by|is_in_faction_with) = ([A-Z]{3})\b', t):
            if m not in tags:
                err(f"{rel}: unknown tag {m}")
        for k in scan_keys(t):
            if k in KNOWN_KEYS or k in tags or k.startswith(("md_", "GFX_")) or k in ideas or k in traits \
                    or k in effects or k in decisions or k in cats or k in chars or re.match(r'^[A-Z]{3}$', k) \
                    or k in KNOWN_MODIFIERS or k.startswith(("USA_", "RUS_", "PRC_")) or k == "HTS_TRANSITIONAL":
                continue
            if rel.startswith("history/countries/") and re.match(r'^\w+$', k):
                pass
            warn(f"{rel}: unrecognised key '{k}'")

    # modifiers in spirits and traits
    for rel in ("common/ideas/md_spirits.txt", "common/country_leader/md_traits.txt"):
        for m in re.findall(r'^\t+(\w+) = -?[0-9.]+$', blob.get(rel, ""), re.M):
            if m not in KNOWN_MODIFIERS:
                err(f"{rel}: unknown modifier {m}")

    # traits on characters
    for k, v in blob.items():
        if k.startswith("common/characters/"):
            for block in re.findall(r'\btraits = \{([^}]*)\}', v):
                for t in block.split():
                    if t not in traits:
                        err(f"{k}: unknown trait {t}")

    # ---------------------------------------------------------- localisation coverage
    for i in ideas:
        need_loc(i, "idea")
        need_loc(f"{i}_desc", "idea")
    for t in traits:
        need_loc(t, "trait")
    for o in opinions:
        need_loc(o, "opinion modifier")
    for f in focuses:
        need_loc(f, "focus")
        need_loc(f"{f}_desc", "focus")
    for e in events:
        need_loc(f"{e}.t", "event")
        need_loc(f"{e}.d", "event")
    for rel, text in blob.items():
        if rel.startswith("events/"):
            for m in re.findall(r'name = (md_\w+\.\d+\.[a-z])', text):
                need_loc(m, rel)
        if rel.startswith("common/characters/"):
            for m in re.findall(r'name = (\w+)', text):
                need_loc(m, rel)
            for m in re.findall(r'desc = "(\w+)"', text):
                need_loc(m, rel)
    for d in decisions:
        need_loc(d, "decision")
        need_loc(f"{d}_desc", "decision")
    for c in cats:
        need_loc(c, "decision category")
    for tag in tags:
        for suffix in ("", "_DEF", "_ADJ"):
            need_loc(f"{tag}{suffix}", "country")
        for ide in ("democratic", "communism", "fascism", "neutrality"):
            need_loc(f"{tag}_{ide}_party", "party")
            need_loc(f"{tag}_{ide}_party_long", "party")
    for m in re.findall(r'(?:custom_effect_tooltip|name) = (md_t\w+)', all_text):
        need_loc(m, "tooltip/threat")
    for m in re.findall(r'long_name = (\w+) name = (\w+)', re.sub(r'\s+', ' ', all_text)):
        need_loc(m[0], "party rename")
        need_loc(m[1], "party rename")
    for m in re.findall(r'"(MD_BM_\w+|MD_BOOKMARK_\w+)"', all_text):
        need_loc(m, "bookmark")

    # ---------------------------------------------------------- files on disk
    art_built = os.path.isdir(os.path.join(ROOT, "gfx"))
    if art_built:
        for m in re.findall(r'texturefile = "([^"]+)"', all_text):
            if m not in VANILLA_TEXTURES and not os.path.exists(os.path.join(ROOT, m)):
                err(f"missing texture {m}")
        for m in re.findall(r'(?:large|small) = "([^"]+)"', all_text):
            if not os.path.exists(os.path.join(ROOT, m)):
                err(f"missing portrait {m}")
        for tag in tags:
            for sub in ("", "medium/", "small/"):
                if not os.path.exists(os.path.join(ROOT, f"gfx/flags/{sub}{tag}.tga")):
                    err(f"missing flag gfx/flags/{sub}{tag}.tga")
        if not os.path.exists(os.path.join(ROOT, "thumbnail.png")):
            err("thumbnail.png missing")
    else:
        warn("art not built: texture checks skipped")

    for w in sorted(set(warnings)):
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print(f"\n{len(script_files)} script files, {len(loc)} localisation keys, {len(focuses)} focuses, {len(ideas)} spirits, "
          f"{len(events)} events, {len(decisions)} decisions, {len(chars)} characters, {len(tags)} countries")
    print(f"{len(errors)} errors, {len(set(warnings))} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
