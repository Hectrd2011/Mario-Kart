from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J

T = Tree("md_usa_focus", "USA", "US")
f = T.f

TRUMP = "has_country_flag = md_usa_trump_era"
BIDEN = "NOT = { has_country_flag = md_usa_trump_era }"


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


T.idea("md_usa_doge", "Department of Government Efficiency",
       "Elon Musk's DOGE is tearing through federal agencies, cancelling contracts and leases.",
       "content-cut", "economy", consumer_goods_factor=-0.04, political_power_factor=0.1, stability_factor=-0.04)
T.idea("md_usa_border_lockdown", "Border Lockdown",
       "Crossings at the southern border have fallen to the lowest levels in decades.",
       "wall", "politics", stability_factor=0.05, monthly_population=-0.05)
T.idea("md_usa_tariff_wall", "The Tariff Wall",
       "The highest American tariffs since the 1930s shelter home industry and anger trading partners.",
       "cash-remove", "economy", production_speed_industrial_complex_factor=0.1, consumer_goods_factor=0.04, trade_opinion_factor=-0.2)
T.idea("md_usa_trade_deals", "Reciprocal Trade Deals",
       "Bilateral deals with Japan, Korea, Britain and the EU lower the walls a little.",
       "handshake", "economy", production_speed_industrial_complex_factor=0.08, trade_opinion_factor=0.05)
T.idea("md_usa_trade_war", "All-Out Trade War",
       "No exemptions, no pauses, no deals.",
       "trending-up", "crisis", production_speed_industrial_complex_factor=0.12, consumer_goods_factor=0.06, trade_opinion_factor=-0.35, stability_factor=-0.05)
T.idea("md_usa_energy_dominance", "Energy Dominance",
       "Record oil and gas output and a nuclear revival power the American economy.",
       "oil", "energy", local_resources_factor=0.15, production_factory_max_efficiency_factor=0.05)
T.idea("md_usa_ai_supremacy", "AI Supremacy",
       "The largest compute build-out in history has put American AI labs years ahead.",
       "brain", "tech", research_speed_factor=0.1)
T.idea("md_usa_golden_dome", "Golden Dome",
       "A space-based missile shield over the American homeland.",
       "shield-star", "military", enemy_justify_war_goal_time=0.25, industry_repair_factor=0.25)
T.idea("md_usa_department_of_war", "The Department of War",
       "A warrior ethos for the Pentagon.",
       "shield-star", "military", army_org_factor=0.05, war_support_factor=0.05, experience_gain_army=0.02)
T.idea("md_usa_arsenal_of_freedom", "Arsenal of Freedom",
       "American industry is again the arsenal of the free world.",
       "factory", "military", production_speed_arms_factory_factor=0.15, industrial_capacity_factory=0.1)
T.idea("md_usa_isolationism", "America Alone",
       "The United States has walked away from its alliances.",
       "earth-off", "diplomacy", stability_factor=0.03, war_support_factor=-0.1, trade_opinion_factor=-0.15)
T.idea("md_ukr_long_range_strikes", "Long-Range Strikes Authorised",
       "ATACMS and Storm Shadow may now hit military targets inside Russia.",
       "rocket-launch", "military", army_attack_factor=0.05)
T.idea("md_rus_oil_sanctions", "Oil Sanctions",
       "New sanctions on the shadow fleet and on Rosneft and Lukoil bite into oil revenue.",
       "oil", "crisis", consumer_goods_factor=0.04, political_power_factor=-0.05)
T.idea("md_per_nuclear_setback", "Nuclear Programme Set Back",
       "Fordow, Natanz and Isfahan lie in ruins.",
       "radioactive", "crisis", research_speed_factor=-0.05, stability_factor=-0.05)
T.idea("md_nato_spending_surge", "NATO Spending Surge",
       "Allies have pledged to spend 5% of GDP on defence and security.",
       "shield", "military", production_speed_arms_factory_factor=0.08, consumer_goods_factor=0.02)

T.opinion.update({
    "md_opinion_tariffs": ("Tariffs", -25),
    "md_opinion_trade_deal": ("Trade Deal", 25),
    "md_opinion_aid": ("Military Aid", 30),
    "md_opinion_pressure": ("Diplomatic Pressure", -30),
    "md_opinion_rapprochement": ("Rapprochement", 25),
    "md_opinion_threatened": ("Territorial Threats", -50),
})

# ------------------------------------------------------------------ Biden's last weeks
f("USA_lame_duck_session", "The Lame Duck Session",
  "Seventy-five days remain until the inauguration. The outgoing administration can still act.",
  2, 0, "timer-sand", "politics", cost=3, available=BIDEN, bypass=TRUMP, reward=J(pp(50)), historical=True)
f("USA_authorize_atacms", "Authorise Long-Range Strikes",
  "Lift the ban on Ukraine using ATACMS against targets inside Russia.",
  0, 1, "rocket-launch", "military", cost=2, pre=["USA_lame_duck_session"], available=BIDEN, bypass=TRUMP,
  reward=J(on("UKR", timed("md_ukr_long_range_strikes", 365)), on("RUS", ws(0.03)), opinion("UKR", "md_opinion_aid")), historical=True)
f("USA_rush_aid", "Rush Aid out the Door",
  "Spend every remaining dollar of drawdown authority before January.",
  2, 1, "package-variant-closed", "military", cost=3, pre=["USA_lame_duck_session"], available=BIDEN, bypass=TRUMP,
  reward=J(on("UKR", "add_equipment_to_stockpile = { type = infantry_equipment amount = 20000 producer = USA } "
                     "add_equipment_to_stockpile = { type = artillery_equipment amount = 1500 producer = USA } "
                     "add_equipment_to_stockpile = { type = anti_tank_equipment amount = 1500 producer = USA } "
                     "add_equipment_to_stockpile = { type = support_equipment amount = 1500 producer = USA }"),
           pp(-25)), historical=True)
f("USA_sanction_shadow_fleet", "Sanction the Shadow Fleet",
  "Sweeping sanctions on Russian oil majors and the tankers that carry their crude.",
  4, 1, "oil", "economy", cost=3, pre=["USA_lame_duck_session"], available=BIDEN, bypass=TRUMP,
  reward=J(on("RUS", timed("md_rus_oil_sanctions", 540))), historical=True)
f("USA_farewell_address", "The Farewell Address",
  "Warn the nation about an emerging oligarchy, and hand over power peacefully.",
  2, 2, "microphone-variant", "politics", cost=2, pre=[["USA_authorize_atacms", "USA_rush_aid", "USA_sanction_shadow_fleet"]],
  available=BIDEN, bypass=TRUMP, reward=J(stab(0.03)), historical=True)

# ------------------------------------------------------------------ Trump
f("USA_second_inauguration", "The Second Inauguration",
  "Donald J. Trump is sworn in as the 47th President of the United States.",
  19, 0, "flag", "politics", cost=1, available=TRUMP, reward=J(pp(100), stab(0.02)), historical=True)
f("USA_day_one_orders", "Day One Executive Orders",
  "A blizzard of executive orders on the border, energy, federal hiring and pardons.",
  19, 1, "draw-pen", "politics", cost=3, pre=["USA_second_inauguration"],
  reward=J(pp(75), stab(0.02)), historical=True)

# domestic
f("USA_doge", "Department of Government Efficiency",
  "Give Elon Musk and DOGE the run of the federal government.",
  8, 2, "content-cut", "economy", pre=["USA_day_one_orders"], reward=J(idea("md_usa_doge")), historical=True)
f("USA_cut_federal_workforce", "Cut the Federal Workforce",
  "Hiring freezes, buyouts and mass firings of probationary employees.",
  7, 3, "account-multiple-minus", "economy", pre=["USA_doge"], reward=J(pp(100), stab(-0.03)), historical=True)
f("USA_close_usaid", "Shut Down USAID",
  "Fold the foreign aid agency into the State Department and cancel most of its programmes.",
  9, 3, "cash-remove", "diplomacy", pre=["USA_doge"], reward=J(pp(75)), historical=True)
f("USA_big_beautiful_bill", "One Big Beautiful Bill",
  "Make the 2017 tax cuts permanent, fund the border and cut Medicaid.",
  8, 4, "gavel", "economy", pre=["USA_cut_federal_workforce", "USA_close_usaid"],
  reward=J(civ(2), stab(0.03), remove("md_usa_doge")), historical=True)
f("USA_secure_border", "Secure the Border",
  "Declare a national emergency at the southern border and send in the troops.",
  11, 2, "wall", "politics", pre=["USA_day_one_orders"], reward=J(stab(0.03), ws(0.02)), historical=True)
f("USA_remain_in_mexico", "Remain in Mexico",
  "Reinstate the Migrant Protection Protocols and end catch-and-release.",
  11, 3, "passport", "politics", pre=["USA_secure_border"], reward=J(pp(50), opinion("MEX", "md_opinion_pressure")), historical=True)
f("USA_mass_deportations", "Mass Deportation Operation",
  "The largest deportation operation in American history.",
  11, 4, "airplane-takeoff", "politics", pre=["USA_remain_in_mexico"],
  reward=J(stab(-0.02), ws(0.03), pop("democratic", -0.02)), historical=True)
f("USA_finish_the_wall", "Finish the Wall",
  "Complete the border wall from the Pacific to the Gulf.",
  12, 5, "wall", "economy", pre=["USA_mass_deportations"], reward=J(idea("md_usa_border_lockdown")))

# economy
f("USA_america_first_trade", "America First Trade Policy",
  "Tariffs are the most beautiful word in the dictionary.",
  15, 2, "cash-multiple", "economy", pre=["USA_day_one_orders"], reward=J(pp(50)), historical=True)
f("USA_tariffs_on_china", "Tariffs on China",
  "Fentanyl tariffs on Chinese goods, raised again and again.",
  14, 3, "currency-cny", "economy", pre=["USA_america_first_trade"],
  reward=J(civ(1), opinion("PRC", "md_opinion_tariffs")), historical=True)
f("USA_tariffs_on_neighbors", "Tariffs on Canada and Mexico",
  "Twenty-five per cent on America's closest trading partners, unless they stop the drugs and migrants.",
  16, 3, "truck", "economy", pre=["USA_america_first_trade"],
  reward=J(civ(1), opinion("CAN", "md_opinion_tariffs"), opinion("MEX", "md_opinion_tariffs")), historical=True)
f("USA_liberation_day", "Liberation Day",
  "Reciprocal tariffs on every country on Earth, announced in the Rose Garden.",
  15, 4, "flag-variant", "economy", pre=["USA_tariffs_on_china", "USA_tariffs_on_neighbors"],
  reward=J(idea("md_usa_tariff_wall"), stab(-0.03), gflag("md_liberation_day")), historical=True)
f("USA_reciprocal_trade_deals", "The Art of the Trade Deal",
  "Pause the tariffs for ninety days and sign deals with whoever comes to the table.",
  14, 5, "handshake", "economy", pre=["USA_liberation_day"], mutex=["USA_trade_war_escalation"],
  reward=J(swap("md_usa_tariff_wall", "md_usa_trade_deals"), opinion("JAP", "md_opinion_trade_deal"),
           opinion("ENG", "md_opinion_trade_deal"), opinion("KOR", "md_opinion_trade_deal")), historical=True)
f("USA_trade_war_escalation", "No Exemptions, No Pauses",
  "Hold the line. Let the rest of the world pay.",
  16, 5, "trending-up", "crisis", pre=["USA_liberation_day"], mutex=["USA_reciprocal_trade_deals"],
  reward=J(swap("md_usa_tariff_wall", "md_usa_trade_war")))
f("USA_reshore_manufacturing", "Reshore American Manufacturing",
  "Factories are coming home: chips in Arizona, cars in Michigan, steel in Pennsylvania.",
  15, 6, "factory", "economy", pre=[["USA_reciprocal_trade_deals", "USA_trade_war_escalation"]],
  reward=J(civ(2), mil(1)))
f("USA_golden_age", "The Golden Age of America",
  "\"The golden age of America begins right now.\"",
  15, 7, "star-four-points", "economy", pre=["USA_reshore_manufacturing"],
  reward=J(civ(2), mil(2), stab(0.05)))
f("USA_energy_dominance", "Unleash American Energy",
  "Declare a national energy emergency and tear up the restrictions on drilling.",
  19, 2, "lightning-bolt", "energy", pre=["USA_day_one_orders"], reward=J(pp(50)), historical=True)
f("USA_drill_baby_drill", "Drill, Baby, Drill",
  "Open federal lands, the Alaskan Arctic and the outer continental shelf to drilling.",
  18, 3, "oil", "energy", pre=["USA_energy_dominance"], reward=J(idea("md_usa_energy_dominance")), historical=True)
f("USA_nuclear_renaissance", "Nuclear Renaissance",
  "Quadruple American nuclear power by 2050 with small modular reactors.",
  18, 4, "atom", "energy", pre=["USA_drill_baby_drill"], reward=J(civ(1), infra(2)), historical=True)
f("USA_ai_action_plan", "America's AI Action Plan",
  "Strip away the rules holding back American AI.",
  20, 3, "brain", "tech", pre=["USA_energy_dominance"], reward=J(research()), historical=True)
f("USA_stargate", "Project Stargate",
  "Five hundred billion dollars of data centres across the American heartland.",
  20, 4, "server", "tech", pre=["USA_ai_action_plan"], reward=J(civ(1), tech("USA_stargate_bonus", "electronics", 1.0, 2)), historical=True)
f("USA_win_ai_race", "Win the AI Race",
  "Whoever leads in artificial intelligence will lead the twenty-first century.",
  19, 5, "robot", "tech", pre=["USA_stargate", "USA_nuclear_renaissance"], reward=J(idea("md_usa_ai_supremacy")))

# foreign policy
f("USA_america_first_foreign", "Peace Through Strength",
  "End the wars, make the allies pay, and deal with adversaries face to face.",
  27, 1, "earth", "diplomacy", pre=["USA_second_inauguration"], reward=J(pp(50)), historical=True)
f("USA_make_nato_pay", "Make NATO Pay",
  "Allies who don't pay their way can't expect America to protect them.",
  22, 2, "shield", "diplomacy", pre=["USA_america_first_foreign"], reward=J(pp(25), stab(0.01)), historical=True)
f("USA_five_percent_pledge", "The Five Per Cent Pledge",
  "At The Hague, the allies commit 5% of GDP to defence.",
  21, 3, "chart-line", "diplomacy", pre=["USA_make_nato_pay"], mutex=["USA_question_article_five"],
  reward=J("every_country = { limit = { is_in_faction_with = ROOT NOT = { tag = ROOT } } add_timed_idea = { idea = md_nato_spending_surge days = 1095 } }"),
  historical=True)
f("USA_burden_shared", "Burden Shared",
  "With Europe re-arming, America can turn to the Pacific.",
  21, 4, "handshake", "diplomacy", pre=["USA_five_percent_pledge"], reward=J(xp("army", 25), pp(50)))
f("USA_question_article_five", "Question Article Five",
  "Would America really go to war for Estonia?",
  23, 3, "help-circle", "crisis", pre=["USA_make_nato_pay"], mutex=["USA_five_percent_pledge"],
  reward=J(stab(-0.03), pop("fascism", 0.02)), ai="factor = 0")
f("USA_leave_nato", "Leave NATO",
  "Walk away from the alliance that won the Cold War.",
  23, 4, "earth-off", "crisis", pre=["USA_question_article_five"],
  reward=J("leave_faction = yes", idea("md_usa_isolationism")), ai="factor = 0")
f("USA_end_ukraine_war", "End the War in Ukraine",
  "\"I'll end that war in twenty-four hours.\"",
  25, 2, "peace", "diplomacy", pre=["USA_america_first_foreign"], reward=J(pp(50)), historical=True)
f("USA_pressure_kyiv", "Pressure Kyiv",
  "Pause intelligence sharing and aid until Ukraine agrees to talks.",
  24, 3, "hand-back-left", "diplomacy", pre=["USA_end_ukraine_war"], mutex=["USA_pressure_moscow"],
  reward=J(on("UKR", "if = { limit = { has_idea = md_ukr_western_aid } remove_ideas = md_ukr_western_aid add_timed_idea = { idea = md_ukr_aid_paused days = 60 } }"),
           opinion("RUS", "md_opinion_rapprochement"), opinion("UKR", "md_opinion_pressure")), historical=True)
f("USA_pressure_moscow", "Pressure Moscow",
  "Secondary tariffs on buyers of Russian oil and Tomahawks on the table.",
  26, 3, "hand-back-right", "diplomacy", pre=["USA_end_ukraine_war"], mutex=["USA_pressure_kyiv"],
  reward=J(on("RUS", timed("md_rus_oil_sanctions", 365)), opinion("UKR", "md_opinion_aid")))
f("USA_minerals_deal", "The Minerals Deal",
  "A reconstruction investment fund in return for a share of Ukraine's rare earths.",
  25, 4, "diamond-stone", "economy", pre=[["USA_pressure_kyiv", "USA_pressure_moscow"]],
  reward=J(civ(1), opinion("UKR", "md_opinion_trade_deal")), historical=True)
f("USA_peace_summit", "The Peace Summit",
  "Bring Putin and Zelensky to the table and get a ceasefire signed.",
  25, 5, "handshake", "diplomacy", pre=["USA_minerals_deal"],
  available="RUS = { has_war_with = UKR }",
  reward=J(on("RUS", event("md_war.10", 1))), historical=True)
f("USA_middle_east_deals", "The Deal of the Century",
  "Hostages home, Iran contained, and Riyadh at the table.",
  28, 2, "star-crescent", "diplomacy", pre=["USA_america_first_foreign"], reward=J(pp(50)))
f("USA_gaza_ceasefire", "Gaza Ceasefire Deal",
  "Lean on Netanyahu and Hamas's patrons until a hostage deal is signed.",
  27, 3, "hand-peace", "diplomacy", pre=["USA_middle_east_deals"],
  reward=J(on("ISR", event("md_isr.10", 1))), historical=True)
f("USA_abraham_accords_ii", "Abraham Accords II",
  "Bring Saudi Arabia and others into the Abraham Accords.",
  27, 4, "handshake-outline", "diplomacy", pre=["USA_gaza_ceasefire"],
  reward=J(opinion("SAU", "md_opinion_rapprochement"), opinion("ISR", "md_opinion_rapprochement"), on("SAU", event("md_isr.20", 3))))
f("USA_maximum_pressure_iran", "Maximum Pressure on Iran",
  "Drive Iranian oil exports to zero.",
  29, 3, "cash-remove", "diplomacy", pre=["USA_middle_east_deals"],
  reward=J(opinion("PER", "md_opinion_pressure"), on("PER", stab(-0.03))), historical=True)
f("USA_operation_midnight_hammer", "Operation Midnight Hammer",
  "B-2 bombers and bunker-busters against Fordow, Natanz and Isfahan.",
  29, 4, "bomb", "military", pre=["USA_maximum_pressure_iran"],
  reward=J(on("PER", J(timed("md_per_nuclear_setback", 730), remove("md_per_nuclear_threshold"))), threat(3, "md_threat_iran_strikes"), ws(0.02)),
  historical=True)
f("USA_new_middle_east", "A New Middle East",
  "Peace through strength from the Mediterranean to the Gulf.",
  28, 5, "earth-arrow-right", "diplomacy", pre=["USA_abraham_accords_ii", "USA_operation_midnight_hammer"], reward=J(stab(0.03), pp(100)))
f("USA_contain_china", "Confront Beijing",
  "China is the only rival with the means to overturn the American order.",
  31, 2, "currency-cny", "diplomacy", pre=["USA_america_first_foreign"], reward=J(pp(25)))
f("USA_arm_taiwan", "Arm Taiwan",
  "Harpoons, HIMARS and drones for the porcupine.",
  30, 3, "shield", "military", pre=["USA_contain_china"], mutex=["USA_grand_bargain"],
  reward=J(on("ROC", "add_equipment_to_stockpile = { type = anti_tank_equipment amount = 1500 producer = USA } add_equipment_to_stockpile = { type = anti_air_equipment amount = 1500 producer = USA }"),
           opinion("ROC", "md_opinion_aid"), opinion("PRC", "md_opinion_pressure")))
f("USA_first_island_chain", "Hold the First Island Chain",
  "Bases in the Philippines, Japan and Australia ring the Chinese coast.",
  30, 4, "map-marker", "military", pre=["USA_arm_taiwan"],
  reward=J(xp("navy", 25), opinion("PHI", "md_opinion_aid"), opinion("JAP", "md_opinion_aid")))
f("USA_grand_bargain", "A Grand Bargain with Xi",
  "Soybeans, chips and TikTok: a deal is always possible.",
  32, 3, "handshake", "diplomacy", pre=["USA_contain_china"], mutex=["USA_arm_taiwan"],
  reward=J(opinion("PRC", "md_opinion_trade_deal"), civ(1)))
f("USA_trade_truce_beijing", "Trade Truce with Beijing",
  "Rare earths for tariff cuts: a one-year truce.",
  32, 4, "currency-cny", "economy", pre=["USA_grand_bargain"], reward=J(remove("md_usa_trade_war"), civ(1)), historical=True)
f("USA_gulf_of_america", "The Gulf of America",
  "Rename the Gulf of Mexico by executive order.",
  34, 2, "map", "politics", pre=["USA_america_first_foreign"], reward=J(ws(0.02), stab(0.01)), historical=True)
f("USA_panama_canal", "Take Back the Canal",
  "Chinese firms run the canal's ports. Panama must choose.",
  34, 3, "ferry", "diplomacy", pre=["USA_gulf_of_america"], reward=J(on("PAN", event("md_usa.30", 2))), historical=True)
f("USA_greenland_offer", "Buy Greenland",
  "Greenland is vital to American security. Make Denmark an offer.",
  34, 4, "map-marker", "diplomacy", pre=["USA_panama_canal"], reward=J(on("DEN", event("md_usa.31", 2))), historical=True)
f("USA_fifty_first_state", "The Fifty-First State",
  "Canada would be so much better off as a state. Ask them.",
  34, 5, "flag-variant", "crisis", pre=["USA_greenland_offer"],
  reward=J(on("CAN", event("md_usa.32", 2)), opinion("CAN", "md_opinion_threatened")), ai="factor = 0.2", historical=True)

# military
f("USA_peace_through_strength", "Rebuild the Military",
  "The strongest military the world has ever seen, and the most lethal.",
  37, 1, "shield-star", "military", pre=["USA_second_inauguration"], reward=J(xp("army", 25)), historical=True)
f("USA_department_of_war", "The Department of War",
  "Restore the old name and a warrior ethos to the Pentagon.",
  36, 2, "sword-cross", "military", pre=["USA_peace_through_strength"], reward=J(idea("md_usa_department_of_war")), historical=True)
f("USA_golden_dome", "Golden Dome",
  "A space-based missile defence shield for the homeland.",
  38, 2, "shield-star", "military", pre=["USA_peace_through_strength"], reward=J(idea("md_usa_golden_dome")), historical=True)
f("USA_shipbuilding_revival", "Make Shipbuilding Great Again",
  "China out-builds American shipyards two hundred to one. Not any more.",
  36, 3, "ship-wheel", "military", pre=["USA_department_of_war"], reward=J(dock(3), xp("navy", 25)), historical=True)
f("USA_space_force", "Space Force Expansion",
  "Dominate the ultimate high ground.",
  38, 3, "satellite-variant", "tech", pre=["USA_golden_dome"], reward=J(research()))
f("USA_drone_dominance", "Unleash Drone Dominance",
  "Every army squad gets drones by 2026.",
  36, 4, "quadcopter", "military", pre=["USA_shipbuilding_revival"], reward=J(mil(2), xp("air", 25)), historical=True)
f("USA_hypersonics", "Hypersonic Weapons",
  "Dark Eagle and the Conventional Prompt Strike close the gap with Russia and China.",
  38, 4, "rocket-launch", "tech", pre=["USA_space_force"], reward=J(mil(1), tech("USA_hypersonic_bonus", "rocketry", 1.0, 2)))
f("USA_arsenal_of_freedom", "Arsenal of Freedom",
  "Shell, missile and drone production at wartime levels, in peacetime.",
  37, 5, "factory", "military", pre=["USA_drone_dominance", "USA_hypersonics"], reward=J(idea("md_usa_arsenal_of_freedom"), mil(2)))

T.ideas.setdefault("md_ukr_aid_paused", dict(
    name="Aid Paused", desc="Washington has paused weapons deliveries and intelligence sharing.",
    glyph="timer-sand", theme="crisis", mods=dict(army_attack_factor=-0.05, production_speed_arms_factory_factor=-0.1)))
