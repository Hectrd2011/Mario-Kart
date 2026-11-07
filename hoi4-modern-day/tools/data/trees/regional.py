"""Smaller national trees: a custom branch plus grafted generic branches."""
from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J
from . import generic


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


def build(tag, iso, custom, graft=("economy", "military", "politics")):
    T = Tree(f"md_{tag.lower()}_focus", tag, iso)
    x = custom(T)
    for branch in graft:
        getattr(generic, branch)(T, f"{tag}G", x)
        x += 6
    return T


# ------------------------------------------------------------------ India
def india(T):
    f = T.f
    T.idea("md_ind_viksit_bharat", "Viksit Bharat 2047", "A developed India by the centenary of independence.",
           "flag", "economy", production_speed_industrial_complex_factor=0.08, stability_factor=0.03)
    T.idea("md_ind_semiconductor_mission", "India Semiconductor Mission", "Fabs in Gujarat and Assam.",
           "chip", "tech", research_speed_factor=0.06)
    T.idea("md_ind_agnipath", "Agnipath", "Four-year enlistments for a younger army.", "account-group", "military",
           conscription=0.005, army_org_factor=-0.02)
    f("IND_viksit_bharat", "Viksit Bharat 2047", "A developed nation within a generation.",
      3, 0, "flag", "economy", cost=5, reward=J(idea("md_ind_viksit_bharat")), historical=True)
    f("IND_operation_sindoor", "Operation Sindoor",
      "Answer the Pahalgam massacre with strikes on terrorist camps in Pakistan.",
      1, 1, "rocket-launch", "military", pre=["IND_viksit_bharat"], reward=J(ws(0.05), xp("air", 25), opinion("PAK", "md_opinion_pressure")), historical=True)
    f("IND_defence_make_in_india", "Atmanirbhar Defence",
      "BrahMos, Tejas and Pinaka made at home.", 3, 1, "factory", "military", pre=["IND_viksit_bharat"], reward=J(mil(3)), historical=True)
    f("IND_semiconductors", "Semiconductor Mission", "Tata and Micron build chip plants in India.",
      5, 1, "chip", "tech", pre=["IND_viksit_bharat"], reward=J(idea("md_ind_semiconductor_mission")), historical=True)
    f("IND_agnipath", "Reform Agnipath", "Keep more of the Agniveers after four years.",
      1, 2, "account-group", "military", pre=["IND_operation_sindoor"], reward=J(idea("md_ind_agnipath"), manpower(50000)), historical=True)
    f("IND_quad", "The Quad", "Strengthen the partnership with the US, Japan and Australia.",
      3, 2, "account-group", "diplomacy", pre=["IND_defence_make_in_india"], reward=J(opinion("USA", "md_opinion_trade_deal"), opinion("JAP", "md_opinion_trade_deal"), opinion("AST", "md_opinion_trade_deal")), historical=True)
    f("IND_russian_oil", "Discounted Russian Oil", "Keep buying, whatever Washington says.",
      5, 2, "oil", "energy", pre=["IND_semiconductors"], reward=J(opinion("RUS", "md_opinion_trade_deal"), civ(1)), historical=True)
    f("IND_gaganyaan", "Gaganyaan", "Indian astronauts on Indian rockets.",
      4, 3, "rocket", "tech", pre=["IND_quad", "IND_russian_oil"], reward=J(research()), historical=True)
    f("IND_vishwaguru", "Vishwaguru", "India as teacher to the world and voice of the Global South.",
      2, 3, "earth", "diplomacy", pre=["IND_agnipath", "IND_quad"], reward=J(pp(100), stab(0.03)), historical=True)
    return 7


# ------------------------------------------------------------------ Japan
def japan(T):
    f = T.f
    T.idea("md_jap_counterstrike", "Counterstrike Capability", "Tomahawks and upgraded Type 12 missiles.",
           "rocket-launch", "military", army_attack_factor=0.05, enemy_justify_war_goal_time=0.2)
    T.idea("md_jap_rapidus", "Rapidus", "Two-nanometre chips made in Hokkaido.", "chip", "tech", research_speed_factor=0.06)
    f("JAP_defence_posture", "A New Security Posture", "The most dangerous security environment since the war.",
      3, 0, "shield-star", "military", cost=5, reward=J(pp(50)), historical=True)
    f("JAP_counterstrike", "Counterstrike Capability", "The ability to strike enemy missile bases.",
      1, 1, "rocket-launch", "military", pre=["JAP_defence_posture"], reward=J(idea("md_jap_counterstrike")), historical=True)
    f("JAP_gcap", "Global Combat Air Programme", "A sixth-generation fighter with Britain and Italy.",
      3, 1, "airplane", "tech", pre=["JAP_defence_posture"], reward=J(xp("air", 25), opinion("ENG", "md_opinion_trade_deal"), opinion("ITA", "md_opinion_trade_deal")), historical=True)
    f("JAP_rapidus", "Rapidus", "Bring advanced chipmaking home.",
      5, 1, "chip", "tech", pre=["JAP_defence_posture"], reward=J(idea("md_jap_rapidus")), historical=True)
    f("JAP_revise_article_9", "Revise Article Nine", "Recognise the Self-Defense Forces in the constitution.",
      1, 2, "book-open-variant", "politics", pre=["JAP_counterstrike"], reward=J(remove("md_jap_article_9"), ws(0.05)), ai="factor = 0.5")
    f("JAP_philippines_raa", "Reciprocal Access with Manila", "Japanese troops may now train in the Philippines.",
      3, 2, "handshake", "diplomacy", pre=["JAP_gcap"], reward=J(opinion("PHI", "md_opinion_aid")), historical=True)
    f("JAP_revitalize_regions", "Revitalise the Regions", "Ishiba's plan to bring life back to rural Japan.",
      5, 2, "home-city", "society", pre=["JAP_rapidus"], reward=J(civ(2), stab(0.02)), historical=True)
    f("JAP_normal_nation", "A Normal Nation", "Japan takes its place as a full security partner.",
      3, 3, "flag", "military", pre=["JAP_revise_article_9", "JAP_philippines_raa"], reward=J(mil(2), xp("navy", 25)))
    return 7


# ------------------------------------------------------------------ South Korea
def korea(T):
    f = T.f
    T.idea("md_kor_democratic_resilience", "Democratic Resilience", "The republic survived martial law.",
           "pillar", "politics", stability_factor=0.06, drift_defence_factor=0.15)
    f("KOR_republic_endures", "The Republic Endures", "Democracy is not a given.",
      3, 0, "flag", "politics", cost=5, reward=J(pp(50)), historical=True)
    f("KOR_k_defense_exports", "K-Defence Exports", "K2 tanks and K9 howitzers for Poland and the world.",
      1, 1, "tank", "military", pre=["KOR_republic_endures"], reward=J(mil(2), opinion("POL", "md_opinion_trade_deal")), historical=True)
    f("KOR_chip_superpower", "Semiconductor Superpower", "The Yongin mega-cluster.",
      3, 1, "chip", "tech", pre=["KOR_republic_endures"], reward=J(research()), historical=True)
    f("KOR_trilateral", "Camp David Trilateral", "Seoul, Tokyo and Washington together.",
      5, 1, "account-group", "diplomacy", pre=["KOR_republic_endures"], reward=J(opinion("JAP", "md_opinion_rapprochement"), opinion("USA", "md_opinion_aid")), historical=True)
    f("KOR_kill_chain", "Kill Chain", "Pre-emptive strike, missile defence and massive retaliation.",
      1, 2, "crosshairs-gps", "military", pre=["KOR_k_defense_exports"], reward=J(xp("army", 25), cp(25)), historical=True)
    f("KOR_nuclear_latency", "Nuclear Latency", "Keep the option of a bomb open.",
      3, 2, "atom", "nuclear", pre=["KOR_chip_superpower"], reward=J(tech("KOR_nuclear_bonus", "nuclear", 1.0, 1), opinion("PRK", "md_opinion_pressure")), ai="factor = 0.3")
    f("KOR_birthrate_emergency", "Population Emergency", "A new ministry to fight the falling birth rate.",
      5, 2, "baby-carriage", "society", pre=["KOR_trilateral"], reward=J(remove("md_kor_low_birthrate"), stab(0.02)), historical=True)
    f("KOR_democratic_resilience", "Democratic Resilience", "Never again martial law.",
      3, 3, "pillar", "politics", pre=["KOR_kill_chain", "KOR_birthrate_emergency"], available="has_country_flag = md_kor_martial_law_over",
      reward=J(idea("md_kor_democratic_resilience")))
    return 7


# ------------------------------------------------------------------ Turkey
def turkey(T):
    f = T.f
    T.idea("md_tur_steel_dome", "Steel Dome", "An integrated Turkish air-defence system.", "shield", "military", industry_repair_factor=0.2)
    T.idea("md_tur_orthodox_economics", "Orthodox Economics", "High interest rates to tame inflation.", "bank", "economy",
           consumer_goods_factor=-0.02, stability_factor=0.02)
    f("TUR_century_of_turkiye", "The Century of Türkiye", "A strong, independent Türkiye for its second century.",
      3, 0, "flag", "politics", cost=5, reward=J(pp(50)), historical=True)
    f("TUR_kaan", "KAAN", "Türkiye's own fifth-generation fighter.",
      1, 1, "airplane", "tech", pre=["TUR_century_of_turkiye"], reward=J(xp("air", 25), mil(1)), historical=True)
    f("TUR_steel_dome", "Steel Dome", "Layered air defence made by Aselsan and Roketsan.",
      1, 2, "shield", "military", pre=["TUR_kaan"], reward=J(idea("md_tur_steel_dome")), historical=True)
    f("TUR_simsek_programme", "The Şimşek Programme", "Orthodox policy to bring inflation down.",
      3, 1, "bank", "economy", pre=["TUR_century_of_turkiye"], reward=J(swap("md_tur_inflation", "md_tur_orthodox_economics")), historical=True)
    f("TUR_pkk_disarmament", "Terror-Free Türkiye", "Öcalan calls on the PKK to lay down its arms.",
      5, 1, "hand-peace", "politics", pre=["TUR_century_of_turkiye"], reward=J(stab(0.05)), historical=True)
    f("TUR_syria_influence", "The New Syria", "Ankara's allies rule in Damascus.",
      5, 2, "map", "diplomacy", pre=["TUR_pkk_disarmament"], available="has_global_flag = md_assad_fallen",
      reward=J(opinion("HTS", "md_opinion_alliance"), pp(50)), historical=True)
    f("TUR_mediator", "Black Sea Mediator", "Host the talks between Russia and Ukraine in Istanbul.",
      3, 2, "anchor", "diplomacy", pre=["TUR_simsek_programme"], reward=J(opinion("RUS", "md_opinion_trade_deal"), opinion("UKR", "md_opinion_trade_deal")), historical=True)
    f("TUR_regional_power", "Pivotal Power", "From the Balkans to the Caucasus, nothing happens without Ankara.",
      3, 3, "star-crescent", "diplomacy", pre=["TUR_steel_dome", "TUR_mediator", "TUR_syria_influence"], reward=J(pp(100), ws(0.05)))
    return 7


# ------------------------------------------------------------------ Poland
def poland(T):
    f = T.f
    T.idea("md_pol_largest_army", "The Largest Army in Europe", "Three hundred thousand soldiers by 2035.",
           "tank", "military", army_org_factor=0.05, conscription=0.008)
    f("POL_east_shield", "East Shield", "Fortify the border with Belarus and Kaliningrad.",
      3, 0, "shield", "military", cost=5, reward=J(xp("army", 25)), historical=True)
    f("POL_k2_abrams", "K2s and Abrams", "Over a thousand tanks from Korea and America.",
      1, 1, "tank", "military", pre=["POL_east_shield"], reward=J(mil(2), opinion("KOR", "md_opinion_trade_deal"), opinion("USA", "md_opinion_trade_deal")), historical=True)
    f("POL_five_percent", "Five Per Cent for Defence", "The highest defence spending in NATO.",
      3, 1, "chart-line", "military", pre=["POL_east_shield"], reward=J(mil(2)), historical=True)
    f("POL_eu_presidency", "Poland's EU Presidency", "Security, Europe! The 2025 Council presidency.",
      5, 1, "currency-eur", "diplomacy", pre=["POL_east_shield"], reward=J(pp(50), opinion("GER", "md_opinion_trade_deal")), historical=True)
    f("POL_largest_army", "The Largest Army in Europe", "Train every adult man for war.",
      2, 2, "account-multiple-plus", "military", pre=["POL_k2_abrams", "POL_five_percent"], reward=J(idea("md_pol_largest_army")), historical=True)
    f("POL_nuclear_power", "Poland's First Nuclear Plant", "Westinghouse reactors on the Baltic coast.",
      5, 2, "atom", "energy", pre=["POL_eu_presidency"], reward=J(civ(2)), historical=True)
    f("POL_cpk", "Central Communication Port", "A new hub airport and high-speed rail.",
      4, 3, "airport", "economy", pre=["POL_nuclear_power"], reward=J(infra(3), civ(1)), historical=True)
    f("POL_bulwark", "Bulwark of Europe", "Poland stands guard on Europe's eastern flank.",
      3, 4, "castle", "military", pre=["POL_largest_army", "POL_cpk"], reward=J(stab(0.05), ws(0.05)))
    return 7


# ------------------------------------------------------------------ Saudi Arabia
def saudi(T):
    f = T.f
    T.idea("md_sau_giga_projects", "Giga-Projects", "NEOM, Qiddiya and the Red Sea Project.", "city", "economy",
           production_speed_buildings_factor=0.1)
    f("SAU_vision_2030", "Vision 2030", "Diversify the kingdom beyond oil.",
      3, 0, "city", "economy", cost=5, reward=J(civ(1)), historical=True)
    f("SAU_neom", "NEOM", "The Line, Oxagon and Trojena.", 1, 1, "office-building", "economy", pre=["SAU_vision_2030"], reward=J(idea("md_sau_giga_projects")), historical=True)
    f("SAU_world_cup", "Expo 2030 and the World Cup", "The world comes to Riyadh.", 3, 1, "soccer", "society", pre=["SAU_vision_2030"], reward=J(stab(0.05)), historical=True)
    f("SAU_opec_strategy", "Flood the Market", "Raise output to win back market share.", 5, 1, "oil", "energy", pre=["SAU_vision_2030"], reward=J(civ(1), opinion("RUS", "md_opinion_pressure")), historical=True)
    f("SAU_yemen_peace", "Peace in Yemen", "Find a way out of the war with the Houthis.", 1, 2, "hand-peace", "diplomacy", pre=["SAU_neom"], reward=J(stab(0.03), opinion("YEM", "md_opinion_rapprochement")), historical=True)
    f("SAU_pakistan_pact", "Strategic Defence Pact with Pakistan", "An attack on one is an attack on both.", 3, 2, "shield-star", "military", pre=["SAU_world_cup"], reward=J(opinion("PAK", "md_opinion_alliance"), ws(0.03)), historical=True)
    f("SAU_defense_industry", "Localise Defence Production", "Half of all defence spending at home by 2030.", 5, 2, "factory", "military", pre=["SAU_opec_strategy"], reward=J(mil(3)), historical=True)
    f("SAU_leader_of_islam", "Leader of the Arab World", "From Riyadh, a new Middle East.", 3, 3, "star-crescent", "diplomacy", pre=["SAU_yemen_peace", "SAU_pakistan_pact", "SAU_defense_industry"], reward=J(pp(100)))
    return 7


# ------------------------------------------------------------------ Canada
def canada(T):
    f = T.f
    T.idea("md_can_elbows_up", "Elbows Up", "Canadians rally against American threats.", "flag", "politics", stability_factor=0.06, war_support_factor=0.05)
    f("CAN_leadership_question", "The Leadership Question", "Trudeau's caucus is in revolt.",
      3, 0, "account-tie", "politics", cost=3, reward=J(pp(25)), historical=True)
    f("CAN_elbows_up", "Elbows Up", "Never the fifty-first state.",
      2, 1, "flag", "politics", pre=["CAN_leadership_question"], available="USA = { has_country_flag = md_usa_trump_era }", reward=J(idea("md_can_elbows_up")), historical=True)
    f("CAN_counter_tariffs", "Counter-Tariffs", "Answer American tariffs dollar for dollar.",
      4, 1, "cash-remove", "economy", pre=["CAN_leadership_question"], reward=J(remove("md_can_housing_crisis"), opinion("USA", "md_opinion_tariffs")), historical=True)
    f("CAN_one_canadian_economy", "One Canadian Economy", "Tear down the barriers between the provinces.",
      4, 2, "truck", "economy", pre=["CAN_counter_tariffs"], reward=J(civ(2)), historical=True)
    f("CAN_defence_two_percent", "Two Per Cent, Finally", "Meet the NATO target this year, not in 2032.",
      2, 2, "shield", "military", pre=["CAN_elbows_up"], reward=J(mil(2), xp("army", 15)), historical=True)
    f("CAN_arctic_sovereignty", "Arctic Sovereignty", "Submarines, radars and icebreakers for the north.",
      1, 3, "snowflake", "military", pre=["CAN_defence_two_percent"], reward=J(dock(1), xp("navy", 20)), historical=True)
    f("CAN_diversify_trade", "Diversify Trade", "Sell to Europe and Asia, not just the Americans.",
      4, 3, "earth", "diplomacy", pre=["CAN_one_canadian_economy"], reward=J(opinion("ENG", "md_opinion_trade_deal"), opinion("JAP", "md_opinion_trade_deal")), historical=True)
    f("CAN_energy_superpower", "An Energy Superpower", "New pipelines and LNG terminals to the coasts.",
      3, 4, "gas-station", "energy", pre=["CAN_arctic_sovereignty", "CAN_diversify_trade"], reward=J(civ(2), stab(0.03)))
    return 7


# ------------------------------------------------------------------ Brazil
def brazil(T):
    f = T.f
    T.idea("md_bra_neoindustrialization", "Nova Indústria Brasil", "A state-led push to reindustrialise.", "factory", "economy",
           production_speed_industrial_complex_factor=0.1)
    f("BRA_lula_third_term", "Lula's Third Term", "Brazil is back.",
      3, 0, "flag", "politics", cost=5, reward=J(pp(50)), historical=True)
    f("BRA_brics_presidency", "BRICS Presidency", "Host the 2025 summit in Rio.",
      1, 1, "earth", "diplomacy", pre=["BRA_lula_third_term"], reward=J(opinion("PRC", "md_opinion_trade_deal"), opinion("IND", "md_opinion_trade_deal")), historical=True)
    f("BRA_cop30", "COP30 in Belém", "Host the climate conference at the gates of the Amazon.",
      3, 1, "tree", "society", pre=["BRA_lula_third_term"], reward=J(stab(0.03)), historical=True)
    f("BRA_new_pac", "The New PAC", "A growth acceleration programme for infrastructure.",
      5, 1, "road-variant", "economy", pre=["BRA_lula_third_term"], reward=J(infra(3)), historical=True)
    f("BRA_mercosur_eu", "The Mercosur-EU Deal", "A trade deal twenty-five years in the making.",
      1, 2, "handshake", "diplomacy", pre=["BRA_brics_presidency"], reward=J(opinion("FRA", "md_opinion_trade_deal"), opinion("GER", "md_opinion_trade_deal"), civ(1)), historical=True)
    f("BRA_amazon_fund", "Tropical Forests Forever", "A fund that pays countries to keep their forests standing.",
      3, 2, "leaf", "society", pre=["BRA_cop30"], reward=J(pp(50)), historical=True)
    f("BRA_nova_industria", "Nova Indústria Brasil", "Reindustrialise Brazil with public credit.",
      5, 2, "factory", "economy", pre=["BRA_new_pac"], reward=J(idea("md_bra_neoindustrialization")), historical=True)
    f("BRA_petrobras", "Petrobras and the Equatorial Margin", "New offshore fields at the mouth of the Amazon.",
      4, 3, "oil", "energy", pre=["BRA_nova_industria", "BRA_amazon_fund"], reward=J(civ(2)), historical=True)
    f("BRA_global_south_leader", "Voice of the Global South", "Brazil speaks for the developing world.",
      2, 3, "account-group", "diplomacy", pre=["BRA_mercosur_eu", "BRA_amazon_fund"], reward=J(pp(100), stab(0.02)))
    return 7


TREES = [
    build("IND", "IN", india),
    build("JAP", "JP", japan),
    build("KOR", "KR", korea),
    build("TUR", "TR", turkey),
    build("POL", "PL", poland),
    build("SAU", "SA", saudi),
    build("CAN", "CA", canada),
    build("BRA", "BR", brazil),
]
