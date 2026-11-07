from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


# =================================================================== ISRAEL
I = Tree("md_isr_focus", "ISR", "IL")
f = I.f
I.idea("md_isr_gaza_operations", "Gaza Operations",
       "The war in Gaza grinds on.", "sword-cross", "military", war_support_factor=0.05, stability_factor=-0.05, consumer_goods_factor=0.03)
I.idea("md_isr_iron_beam", "Iron Beam",
       "Laser interceptors that cost a few dollars a shot.", "flash", "tech", industry_repair_factor=0.2, army_core_defence_factor=0.05)
I.idea("md_isr_haredi_draft", "Haredi Conscription",
       "Ultra-Orthodox yeshiva students must serve.", "account-multiple-plus", "military", conscription=0.008, stability_factor=-0.03)
I.idea("md_isr_national_unity", "National Unity",
       "A broad emergency government for a nation at war.", "account-group", "politics", stability_factor=0.08)
I.idea("md_isr_judicial_overhaul", "Judicial Overhaul",
       "The government reins in the Supreme Court.", "gavel", "politics", political_power_gain=0.15, stability_factor=-0.06)

f("ISR_iron_swords", "Swords of Iron",
  "Thirteen months after 7 October, the war goes on.",
  10, 0, "sword-cross", "military", cost=3, reward=J(xp("army", 25)), historical=True)
f("ISR_philadelphi", "The Philadelphi Corridor",
  "Hold the border between Gaza and Egypt.",
  3, 1, "map-marker", "military", pre=["ISR_iron_swords"], reward=J(timed("md_isr_gaza_operations", 180)), historical=True)
f("ISR_hostage_deal", "Bring Them Home",
  "Agree a ceasefire and exchange to free the hostages.",
  2, 2, "hand-peace", "diplomacy", pre=["ISR_philadelphi"], mutex=["ISR_total_victory"], reward=J(remove("md_isr_hostage_crisis"), stab(0.05)), historical=True)
f("ISR_total_victory", "Total Victory",
  "No deal until Hamas is destroyed.",
  4, 2, "flag-variant", "military", pre=["ISR_philadelphi"], mutex=["ISR_hostage_deal"], reward=J(ws(0.05), timed("md_isr_gaza_operations", 365)))
f("ISR_day_after", "The Day After",
  "Who governs Gaza when the guns fall silent?",
  3, 3, "home-city", "politics", pre=[["ISR_hostage_deal", "ISR_total_victory"]], reward=J(pp(75)))
f("ISR_northern_arrows", "Northern Arrows",
  "Decapitate Hezbollah and push it back from the border.",
  7, 1, "rocket-launch", "military", pre=["ISR_iron_swords"], reward=J(on("LEB", stab(-0.03)), xp("army", 15)), historical=True)
f("ISR_lebanon_ceasefire", "Ceasefire with Lebanon",
  "A US-brokered ceasefire: Hezbollah north of the Litani.",
  7, 2, "hand-peace", "diplomacy", pre=["ISR_northern_arrows"], reward=J(stab(0.03), pp(25)), historical=True)
f("ISR_syrian_buffer", "Buffer Zone on the Golan",
  "Take Mount Hermon and the buffer zone as the Assad regime collapses.",
  7, 3, "map", "military", pre=["ISR_lebanon_ceasefire"], available="OR = { NOT = { country_exists = SYR } has_global_flag = md_assad_fallen }", reward=J(cp(25), ws(0.02)), historical=True)
f("ISR_days_of_repentance", "Days of Repentance",
  "Strike Iran's air defences and missile factories.",
  12, 1, "airplane", "military", pre=["ISR_iron_swords"], reward=J(on("PER", stab(-0.02)), xp("air", 25)), historical=True)
f("ISR_strike_houthis", "Strike the Houthis",
  "Hit the ports and power plants of Hodeidah and Sana'a.",
  14, 2, "anchor", "military", pre=["ISR_days_of_repentance"], reward=J(xp("air", 15)), historical=True)
f("ISR_rising_lion", "Operation Rising Lion",
  "A full-scale strike on Iran's nuclear programme and its generals.",
  12, 2, "bomb", "military", pre=["ISR_days_of_repentance"],
  reward=J(on("PER", J(timed("md_per_nuclear_setback", 540), remove("md_per_nuclear_threshold"), stab(-0.05))), threat(4, "md_threat_iran_strikes"), ws(0.05)), historical=True)
f("ISR_iron_beam", "Iron Beam",
  "Deploy the world's first operational laser air-defence system.",
  10, 3, "flash", "tech", pre=["ISR_rising_lion", "ISR_lebanon_ceasefire"], reward=J(idea("md_isr_iron_beam")), historical=True)
f("ISR_abraham_accords", "Expand the Abraham Accords",
  "Normalisation with Riyadh is the prize.",
  17, 1, "handshake-outline", "diplomacy", pre=["ISR_iron_swords"], reward=J(opinion("UAE", "md_opinion_trade_deal"), opinion("MOR", "md_opinion_trade_deal")), historical=True)
f("ISR_saudi_normalization", "Peace with Riyadh",
  "The deal of the century.",
  17, 3, "star-crescent", "diplomacy", pre=["ISR_abraham_accords", "ISR_hostage_deal"], reward=J(on("SAU", event("md_isr.20", 2))))
f("ISR_national_unity", "National Unity Government",
  "Bring the opposition in.",
  20, 1, "account-group", "politics", pre=["ISR_iron_swords"], mutex=["ISR_judicial_overhaul"], reward=J(idea("md_isr_national_unity")))
f("ISR_judicial_overhaul", "Revive the Judicial Overhaul",
  "Finish what was started before the war.",
  22, 1, "gavel", "politics", pre=["ISR_iron_swords"], mutex=["ISR_national_unity"], reward=J(idea("md_isr_judicial_overhaul")), historical=True)
f("ISR_haredi_draft", "Draft the Haredim",
  "The Supreme Court has ruled: yeshiva students must serve.",
  21, 2, "account-multiple-plus", "military", pre=[["ISR_national_unity", "ISR_judicial_overhaul"]], reward=J(idea("md_isr_haredi_draft")), historical=True)
f("ISR_defence_industry", "Defence Export Boom",
  "Arrow, David's Sling and Iron Dome for Europe.",
  21, 3, "factory", "military", pre=["ISR_haredi_draft"], reward=J(mil(2), opinion("GER", "md_opinion_trade_deal")), historical=True)

# =================================================================== IRAN
P = Tree("md_per_focus", "PER", "IR")
f = P.f
P.idea("md_per_rearmed_axis", "Rearmed Axis",
       "Rockets and money flow again to Lebanon, Yemen and Iraq.", "earth-arrow-right", "military", send_volunteers_tension=-0.5, war_support_factor=0.05)
P.idea("md_per_resistance_economy", "Resistance Economy",
       "Self-sufficiency under sanctions.", "shield", "economy", production_factory_max_efficiency_factor=0.05, consumer_goods_factor=-0.03)
P.idea("md_per_nuclear_weapon", "The Bomb",
       "Iran has crossed the threshold.", "radioactive", "nuclear", enemy_justify_war_goal_time=0.5, nuclear_production_factor=0.5)
P.idea("md_per_sanctions_relief", "Sanctions Relief",
       "Oil flows to the world again.", "cash-multiple", "economy", consumer_goods_factor=-0.04, trade_opinion_factor=0.2)
P.idea("md_per_hijab_enforcement", "Hijab and Chastity Law",
       "Harsh penalties for unveiled women.", "gavel", "politics", stability_factor=-0.05, political_power_gain=0.1)
P.idea("md_per_social_opening", "Social Opening",
       "The morality police stand down.", "account-group", "society", stability_factor=0.05, democratic_drift=0.02)

f("PER_resistance", "Resistance",
  "The Islamic Republic will not bow.",
  10, 0, "shield-star", "military", cost=3, reward=J(pp(50)), historical=True)
f("PER_true_promise_iii", "True Promise III",
  "Retaliate for Israel's strikes with a missile barrage.",
  4, 1, "rocket-launch", "military", pre=["PER_resistance"], reward=J(ws(0.03), threat(2, "md_threat_true_promise")), historical=True)
f("PER_rebuild_axis", "Rebuild the Axis",
  "Rearm Hezbollah and the Houthis after a year of losses.",
  3, 2, "earth-arrow-right", "military", pre=["PER_true_promise_iii"], reward=J(swap("md_per_axis_of_resistance", "md_per_rearmed_axis")))
f("PER_houthi_supply", "Supply the Houthis",
  "Missiles and drones smuggled to Yemen.",
  5, 2, "ferry", "military", pre=["PER_true_promise_iii"], reward=J(on("YEM", "add_equipment_to_stockpile = { type = infantry_equipment amount = 3000 producer = PER }"), opinion("YEM", "md_opinion_alliance")), historical=True)
f("PER_missile_city", "Missile Cities",
  "Rebuild the underground missile bases.",
  4, 3, "rocket", "military", pre=["PER_rebuild_axis", "PER_houthi_supply"], reward=J(mil(2), tech("PER_missile_bonus", "rocketry", 1.0, 1)), historical=True)
f("PER_nuclear_question", "The Nuclear Question",
  "Enrich to 60%, 90%, or negotiate?",
  10, 1, "atom", "nuclear", pre=["PER_resistance"], reward=J(pp(25)), historical=True)
f("PER_weapons_grade", "Ninety Per Cent",
  "Enrich to weapons grade.",
  9, 2, "radioactive", "nuclear", pre=["PER_nuclear_question"], mutex=["PER_oman_talks"], reward=J(threat(4, "md_threat_iran_enrichment"), ws(0.03)), ai="factor = 0.3")
f("PER_the_bomb", "The Bomb",
  "Test a nuclear device and change the Middle East for ever.",
  9, 3, "radioactive", "nuclear", pre=["PER_weapons_grade"], available="NOT = { has_idea = md_per_nuclear_setback }",
  reward=J(swap("md_per_nuclear_threshold", "md_per_nuclear_weapon"), threat(10, "md_threat_iran_bomb"), on("ISR", ws(0.1)), on("SAU", ws(0.05))), ai="factor = 0.2")
f("PER_oman_talks", "The Oman Talks",
  "Araghchi and Witkoff meet in Muscat.",
  11, 2, "handshake", "diplomacy", pre=["PER_nuclear_question"], mutex=["PER_weapons_grade"], reward=J(opinion("OMA", "md_opinion_trade_deal"), stab(0.02)), historical=True)
f("PER_new_deal", "A New Nuclear Deal",
  "Limits on enrichment in return for sanctions relief.",
  11, 3, "file-sign", "diplomacy", pre=["PER_oman_talks"], available="USA = { has_opinion = { target = ROOT value > -20 } }",
  reward=J(swap("md_per_maximum_pressure", "md_per_sanctions_relief")))
f("PER_look_east", "Look East",
  "A 25-year partnership with China and a treaty with Russia.",
  15, 1, "compass", "diplomacy", pre=["PER_resistance"], reward=J(opinion("PRC", "md_opinion_trade_deal"), opinion("RUS", "md_opinion_alliance")), historical=True)
f("PER_resistance_economy", "Resistance Economy",
  "Make do without the West.",
  15, 2, "shield", "economy", pre=["PER_look_east"], reward=J(idea("md_per_resistance_economy"), civ(1)), historical=True)
f("PER_energy_crisis", "Fix the Energy Crisis",
  "Blackouts in a country floating on gas.",
  15, 3, "flash-alert", "energy", pre=["PER_resistance_economy"], reward=J(civ(1), infra(2)), historical=True)
f("PER_hijab_law", "Enforce the Hijab Law",
  "The Guardian Council's Chastity and Hijab law takes effect.",
  19, 1, "gavel", "politics", pre=["PER_resistance"], mutex=["PER_pezeshkian_reforms"], reward=J(idea("md_per_hijab_enforcement")))
f("PER_pezeshkian_reforms", "Pezeshkian's Reforms",
  "Shelve the hijab law and lift the internet filters.",
  21, 1, "account-group", "society", pre=["PER_resistance"], mutex=["PER_hijab_law"], reward=J(idea("md_per_social_opening")), historical=True)
f("PER_succession", "The Succession",
  "The Supreme Leader is 85. Who comes next?",
  20, 2, "crown", "politics", pre=[["PER_hijab_law", "PER_pezeshkian_reforms"]], reward=J(stab(0.03), pp(50)))

P.opinion.update({"md_opinion_alliance": ("Strategic Partnership", 50)})
I.opinion.update({})
