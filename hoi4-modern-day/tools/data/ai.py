"""AI strategies for 2024 (replace vanilla's 1936 plans).

(id, country, enable trigger, abort trigger, [(type, target, value)])
"""

S = [
    ("md_ai_rus_war", "RUS", "has_war_with = UKR", "NOT = { has_war_with = UKR }",
     [("conquer", "UKR", 200), ("front_unit_request", "UKR", 60)]),
    ("md_ai_ukr_war", "UKR", "has_war_with = RUS", "NOT = { has_war_with = RUS }",
     [("antagonize", "RUS", 200), ("front_unit_request", "RUS", 80)]),
    ("md_ai_rus_friends", "RUS", "always = yes", "always = no",
     [("befriend", "BLR", 150), ("befriend", "PRK", 100), ("befriend", "PER", 80), ("befriend", "PRC", 120),
      ("antagonize", "USA", 30)]),
    ("md_ai_prc_taiwan", "PRC", "country_exists = ROC", "NOT = { country_exists = ROC }",
     [("antagonize", "ROC", 150), ("befriend", "RUS", 100), ("befriend", "PRK", 80), ("befriend", "PAK", 80)]),
    ("md_ai_usa_partners", "USA", "always = yes", "always = no",
     [("befriend", "JAP", 120), ("befriend", "KOR", 120), ("befriend", "ISR", 100), ("befriend", "PHI", 80),
      ("befriend", "ROC", 80), ("befriend", "AST", 100), ("antagonize", "PER", 60), ("antagonize", "PRK", 60)]),
    ("md_ai_usa_aid_ukraine", "USA", "NOT = { has_country_flag = md_usa_trump_era } country_exists = UKR UKR = { has_war_with = RUS }",
     "OR = { has_country_flag = md_usa_trump_era NOT = { country_exists = UKR } }", [("support", "UKR", 100)]),
    ("md_ai_isr_iran", "ISR", "country_exists = PER", "NOT = { country_exists = PER }",
     [("antagonize", "PER", 150), ("befriend", "USA", 150)]),
    ("md_ai_per_axis", "PER", "always = yes", "always = no",
     [("antagonize", "ISR", 150), ("antagonize", "USA", 80), ("support", "YEM", 60), ("befriend", "RUS", 80)]),
    ("md_ai_sud_war", "SUD", "has_war_with = RSF", "NOT = { has_war_with = RSF }", [("conquer", "RSF", 200)]),
    ("md_ai_rsf_war", "RSF", "has_war_with = SUD", "NOT = { has_war_with = SUD }", [("conquer", "SUD", 200)]),
    ("md_ai_hts_war", "HTS", "has_war_with = SYR", "NOT = { has_war_with = SYR }", [("conquer", "SYR", 250)]),
    ("md_ai_ind_pak", "IND", "country_exists = PAK", "NOT = { country_exists = PAK }", [("antagonize", "PAK", 60), ("befriend", "USA", 50)]),
    ("md_ai_pak_ind", "PAK", "country_exists = IND", "NOT = { country_exists = IND }", [("antagonize", "IND", 60), ("befriend", "PRC", 80)]),
    ("md_ai_prk_kor", "PRK", "country_exists = KOR", "NOT = { country_exists = KOR }", [("antagonize", "KOR", 100), ("befriend", "RUS", 80)]),
    ("md_ai_kor_prk", "KOR", "country_exists = PRK", "NOT = { country_exists = PRK }", [("antagonize", "PRK", 100)]),
    ("md_ai_europe_support_ukraine", "ENG", "country_exists = UKR UKR = { has_war_with = RUS }", "NOT = { country_exists = UKR }", [("support", "UKR", 100), ("antagonize", "RUS", 60)]),
    ("md_ai_fra_support_ukraine", "FRA", "country_exists = UKR UKR = { has_war_with = RUS }", "NOT = { country_exists = UKR }", [("support", "UKR", 80), ("antagonize", "RUS", 50)]),
    ("md_ai_ger_support_ukraine", "GER", "country_exists = UKR UKR = { has_war_with = RUS }", "NOT = { country_exists = UKR }", [("support", "UKR", 80)]),
    ("md_ai_pol_russia", "POL", "country_exists = RUS", "always = no", [("antagonize", "RUS", 100), ("support", "UKR", 80)]),
]


def write(out):
    blocks = []
    for sid, tag, enable, abort, strats in S:
        lines = [f"{sid} = {{", f"\tallowed = {{ original_tag = {tag} }}", f"\tenable = {{ {enable} }}", f"\tabort = {{ {abort} }}"]
        for typ, target, val in strats:
            lines.append(f'\tai_strategy = {{ type = {typ} id = "{target}" value = {val} }}')
        lines.append("}")
        blocks.append("\n".join(lines))
    out.write("common/ai_strategy/md_ai_strategy.txt", "\n\n".join(blocks))
