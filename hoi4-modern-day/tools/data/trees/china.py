from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


C = Tree("md_prc_focus", "PRC", "CN")
f = C.f
C.idea("md_prc_new_productive_forces", "New Quality Productive Forces",
       "EVs, batteries, solar and AI: the new engines of growth.",
       "car-electric", "economy", production_speed_industrial_complex_factor=0.1, research_speed_factor=0.05)
C.idea("md_prc_chip_self_reliance", "Chip Self-Reliance",
       "Huawei and SMIC are closing the gap despite export controls.",
       "chip", "tech", research_speed_factor=0.08)
C.idea("md_prc_ai_plus", "AI+",
       "Open-weight Chinese models are deployed across the whole economy.",
       "brain", "tech", research_speed_factor=0.07, production_factory_efficiency_gain_factor=0.05)
C.idea("md_prc_stimulus", "Consumer Stimulus",
       "Trade-in subsidies and support for the property market revive demand.",
       "cash-multiple", "economy", consumer_goods_factor=-0.03, stability_factor=0.03)
C.idea("md_prc_common_prosperity", "Common Prosperity",
       "Rein in the tycoons and narrow the wealth gap.",
       "account-group", "society", stability_factor=0.05, political_power_gain=0.1)
C.idea("md_prc_blue_water_navy", "Blue-Water Navy",
       "Three carriers and the largest navy in the world.",
       "ship-wheel", "military", production_speed_dockyard_factor=0.15, industrial_capacity_dockyard=0.1)
C.idea("md_prc_strait_pressure", "Pressure on the Strait",
       "Constant drills encircle Taiwan.",
       "anchor", "military", war_support_factor=0.05)
C.idea("md_prc_rare_earth_leverage", "Rare Earth Leverage",
       "Export licences for rare earths and magnets are China's sharpest weapon.",
       "diamond-stone", "economy", trade_opinion_factor=0.1, local_resources_factor=0.1)
C.idea("md_prc_nuclear_expansion", "Nuclear Expansion",
       "From 600 warheads to over a thousand by 2030.",
       "radioactive", "nuclear", nuclear_production_factor=0.25, enemy_justify_war_goal_time=0.3)

f("PRC_chinese_dream", "The Chinese Dream",
  "The great rejuvenation of the Chinese nation by 2049.",
  12, 0, "flag", "politics", cost=5, reward=J(pp(100)), historical=True)
# economy
f("PRC_new_productive_forces", "New Quality Productive Forces",
  "Pour credit into the industries of the future.",
  4, 1, "car-electric", "economy", pre=["PRC_chinese_dream"], reward=J(idea("md_prc_new_productive_forces")), historical=True)
f("PRC_made_in_china", "Made in China 2025",
  "Lead the world in ten strategic industries.",
  3, 2, "factory", "economy", pre=["PRC_new_productive_forces"], reward=J(civ(3)), historical=True)
f("PRC_consumer_stimulus", "Revive Consumption",
  "Trade-in subsidies, child support and a rescue for the property market.",
  5, 2, "home-city", "economy", pre=["PRC_new_productive_forces"], reward=J(swap("md_prc_property_slump", "md_prc_stimulus")), historical=True)
f("PRC_chip_self_reliance", "Self-Reliance in Chips",
  "Build a complete chip supply chain beyond the reach of American controls.",
  3, 3, "chip", "tech", pre=["PRC_made_in_china"], reward=J(idea("md_prc_chip_self_reliance")), historical=True)
f("PRC_deepseek", "The DeepSeek Moment",
  "A Chinese lab matches the best American models at a fraction of the cost.",
  3, 4, "brain", "tech", pre=["PRC_chip_self_reliance"], reward=J(research()), historical=True)
f("PRC_ai_plus", "AI+ Initiative",
  "Put artificial intelligence into every factory, hospital and ministry.",
  4, 5, "robot", "tech", pre=["PRC_deepseek", "PRC_common_prosperity"], reward=J(idea("md_prc_ai_plus")), historical=True)
f("PRC_common_prosperity", "Common Prosperity",
  "Growth that the whole nation shares.",
  5, 3, "account-group", "society", pre=["PRC_consumer_stimulus"], reward=J(idea("md_prc_common_prosperity")), historical=True)
f("PRC_dual_circulation", "Dual Circulation",
  "A domestic market strong enough to shrug off any blockade.",
  5, 4, "sync", "economy", pre=["PRC_common_prosperity"], reward=J(civ(2), infra(2)), historical=True)
# military
f("PRC_pla_centenary", "The 2027 Centenary Goal",
  "The PLA must be ready by its hundredth birthday.",
  11, 1, "shield-star", "military", pre=["PRC_chinese_dream"], reward=J(xp("army", 25), mil(2)), historical=True)
f("PRC_rocket_force_purge", "Purge the Rocket Force",
  "Corrupt generals filled missiles with water. Not any more.",
  10, 2, "handcuffs", "politics", pre=["PRC_pla_centenary"], reward=J(stab(0.02), xp("army", 15)), historical=True)
f("PRC_three_carriers", "Commission the Fujian",
  "A third carrier, with electromagnetic catapults.",
  12, 2, "ship-wheel", "military", pre=["PRC_pla_centenary"], reward=J(dock(3), xp("navy", 25)), historical=True)
f("PRC_hypersonic_arsenal", "Carrier Killers",
  "DF-21D, DF-26 and hypersonic glide vehicles hold American carriers at risk.",
  10, 3, "rocket-launch", "military", pre=["PRC_rocket_force_purge"], reward=J(tech("PRC_missile_bonus", "rocketry", 1.0, 2)), historical=True)
f("PRC_blue_water_navy", "A Blue-Water Navy",
  "Out-build every navy on Earth.",
  12, 3, "anchor", "military", pre=["PRC_three_carriers"], reward=J(idea("md_prc_blue_water_navy")))
f("PRC_nuclear_expansion", "A Thousand Warheads",
  "Silo fields in the desert and a full triad.",
  10, 4, "radioactive", "nuclear", pre=["PRC_hypersonic_arsenal"], reward=J(idea("md_prc_nuclear_expansion"), threat(2, "md_threat_prc_nukes")), historical=True)
f("PRC_strait_thunder", "Strait Thunder",
  "Rehearse a blockade of Taiwan.",
  12, 4, "radar", "military", pre=["PRC_blue_water_navy"], reward=J(idea("md_prc_strait_pressure"), threat(2, "md_threat_strait_thunder")), historical=True)
f("PRC_reunification_by_force", "Reunification by Force",
  "If Taipei will not come willingly, the PLA will bring it home.",
  11, 5, "sword-cross", "crisis", pre=["PRC_nuclear_expansion", "PRC_strait_thunder"], mutex=["PRC_peaceful_reunification"],
  available="has_war_support > 0.5", ai="factor = 0.2",
  reward=J("if = { limit = { country_exists = ROC } create_wargoal = { type = annex_everything target = ROC } }", threat(10, "md_threat_taiwan_war")))
f("PRC_peaceful_reunification", "Peaceful Reunification",
  "Win over Taiwan with trade, culture and patience.",
  13, 5, "hand-peace", "diplomacy", pre=["PRC_strait_thunder"], mutex=["PRC_reunification_by_force"],
  reward=J(on("ROC", event("md_prc.10", 3))))
# diplomacy
f("PRC_global_initiatives", "The Global Initiatives",
  "Global Development, Security, Civilisation and Governance Initiatives.",
  19, 1, "earth", "diplomacy", pre=["PRC_chinese_dream"], reward=J(pp(50)), historical=True)
f("PRC_belt_and_road", "Belt and Road 2.0",
  "Smaller, greener, smarter projects.",
  17, 2, "train", "economy", pre=["PRC_global_initiatives"], reward=J(civ(1), opinion("PAK", "md_opinion_trade_deal"), opinion("INS", "md_opinion_trade_deal")), historical=True)
f("PRC_no_limits", "No Limits Partnership",
  "Moscow needs Beijing more than ever.",
  19, 2, "handshake", "diplomacy", pre=["PRC_global_initiatives"], reward=J(opinion("RUS", "md_opinion_alliance")), historical=True)
f("PRC_brics_expansion", "BRICS Expansion",
  "Turn BRICS into the voice of the Global South.",
  21, 2, "earth-arrow-right", "diplomacy", pre=["PRC_global_initiatives"], reward=J(opinion("BRA", "md_opinion_trade_deal"), opinion("SAF", "md_opinion_trade_deal"), opinion("SAU", "md_opinion_trade_deal")), historical=True)
f("PRC_trade_war_retaliation", "Fight the Trade War",
  "Match every tariff, and cut off the rare earths.",
  18, 3, "currency-cny", "economy", pre=["PRC_belt_and_road", "PRC_no_limits"],
  available="USA = { has_completed_focus = USA_tariffs_on_china }",
  reward=J(idea("md_prc_rare_earth_leverage"), opinion("USA", "md_opinion_tariffs")), historical=True)
f("PRC_geneva_truce", "The Geneva Truce",
  "A ninety-day tariff truce, then another.",
  18, 4, "handshake-outline", "diplomacy", pre=["PRC_trade_war_retaliation"], reward=J(civ(1), stab(0.02)), historical=True)
f("PRC_africa_partnership", "Partners in Africa",
  "Zero tariffs for the least-developed African economies.",
  21, 3, "earth", "diplomacy", pre=["PRC_brics_expansion"],
  reward=J(opinion("ETH", "md_opinion_trade_deal"), opinion("NGA", "md_opinion_trade_deal"), opinion("KEN", "md_opinion_trade_deal")), historical=True)
f("PRC_new_world_order", "A Community of Common Destiny",
  "A world order with Chinese characteristics.",
  20, 5, "globe-model", "diplomacy", pre=["PRC_geneva_truce", "PRC_africa_partnership"], reward=J(pp(100), stab(0.03)))
# politics & South China Sea
f("PRC_xi_thought", "Xi Jinping Thought",
  "Socialism with Chinese characteristics for a new era.",
  25, 1, "book-open-variant", "politics", pre=["PRC_chinese_dream"], reward=J(stab(0.03)), historical=True)
f("PRC_anti_corruption", "Tigers and Flies",
  "The anti-corruption campaign never ends.",
  24, 2, "handcuffs", "politics", pre=["PRC_xi_thought"], reward=J(pp(75)), historical=True)
f("PRC_third_plenum", "Third Plenum Reforms",
  "Unify the national market and modernise governance.",
  26, 2, "gavel", "politics", pre=["PRC_xi_thought"], reward=J(civ(1), pp(50)), historical=True)
f("PRC_nine_dash_line", "The Nine-Dash Line",
  "Enforce China's claims across the South China Sea.",
  25, 3, "map", "military", pre=["PRC_anti_corruption", "PRC_third_plenum"], reward=J(xp("navy", 20), opinion("PHI", "md_opinion_pressure"), opinion("VIE", "md_opinion_pressure")), historical=True)
f("PRC_scarborough", "Scarborough Shoal Nature Reserve",
  "Declare a nature reserve around the disputed shoal.",
  25, 4, "leaf", "military", pre=["PRC_nine_dash_line"], reward=J(threat(1, "md_threat_scarborough"), ws(0.02)), historical=True)

C.opinion.update({"md_opinion_alliance": ("Strategic Partnership", 50)})

# =================================================================== TAIWAN (shares the china module)
TW = Tree("md_roc_focus", "ROC", "TW")
f = TW.f
TW.idea("md_roc_whole_of_society", "Whole-of-Society Resilience",
        "Civil defence drills, reservist training and an ammunition stockpile.",
        "shield-star", "military", army_core_defence_factor=0.1, war_support_factor=0.05)
TW.idea("md_roc_t_dome", "T-Dome",
        "A multi-layered air and missile defence system for the island.",
        "shield", "military", industry_repair_factor=0.3, enemy_justify_war_goal_time=0.1)
f("ROC_defend_democracy", "Defend Taiwanese Democracy",
  "Peace through strength across the Strait.",
  5, 0, "flag", "politics", cost=5, reward=J(pp(50)), historical=True)
f("ROC_one_year_service", "One-Year Conscription",
  "Restore twelve months of compulsory service.",
  3, 1, "account-group", "military", pre=["ROC_defend_democracy"], reward=J(manpower(30000), xp("army", 15)), historical=True)
f("ROC_whole_of_society", "Whole-of-Society Resilience",
  "Every citizen ready for the worst.",
  3, 2, "shield-star", "military", pre=["ROC_one_year_service"], reward=J(idea("md_roc_whole_of_society")), historical=True)
f("ROC_t_dome", "T-Dome",
  "Air defence for every city on the island.",
  3, 3, "shield", "military", pre=["ROC_whole_of_society"], reward=J(idea("md_roc_t_dome")), historical=True)
f("ROC_tsmc_abroad", "TSMC Goes Global",
  "Fabs in Arizona, Kumamoto and Dresden, but the best stay home.",
  7, 1, "chip", "tech", pre=["ROC_defend_democracy"], reward=J(research(), opinion("USA", "md_opinion_trade_deal")), historical=True)
f("ROC_defence_budget", "Three Per Cent for Defence",
  "And five per cent by 2030.",
  7, 2, "chart-line", "military", pre=["ROC_tsmc_abroad"], reward=J(mil(2)), historical=True)
f("ROC_drone_national_team", "The Drone National Team",
  "A non-Chinese drone supply chain built in Taiwan.",
  7, 3, "quadcopter", "tech", pre=["ROC_defence_budget"], reward=J(mil(1), xp("air", 20)), historical=True)
f("ROC_porcupine_complete", "The Porcupine Bristles",
  "An island no navy can swallow.",
  5, 4, "anchor", "military", pre=["ROC_t_dome", "ROC_drone_national_team"], reward=J(ws(0.05), cp(25)))
