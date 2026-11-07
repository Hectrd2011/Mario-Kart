from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


# =================================================================== UNITED KINGDOM
E = Tree("md_eng_focus", "ENG", "GB")
f = E.f
E.idea("md_eng_gb_energy", "Great British Energy",
       "A publicly owned clean power company.", "wind-turbine", "energy",
       production_factory_max_efficiency_factor=0.05, local_resources_factor=0.05)
E.idea("md_eng_planning_reform", "Grey Belt Planning Reform",
       "Build, baby, build: 1.5 million new homes.", "home-city", "economy",
       production_speed_buildings_factor=0.1, stability_factor=0.02)
E.idea("md_eng_defence_review", "Strategic Defence Review",
       "A move to warfighting readiness.", "shield", "military",
       army_org_factor=0.05, production_speed_arms_factory_factor=0.08)
E.idea("md_eng_eu_reset", "The EU Reset",
       "Closer ties on defence, food standards and youth mobility.", "currency-eur", "diplomacy",
       trade_opinion_factor=0.1, stability_factor=0.02)
E.idea("md_eng_border_security_command", "Border Security Command",
       "Smash the gangs and stop the boats.", "ferry", "politics", stability_factor=0.04)

f("ENG_change", "Change",
  "Fourteen years of opposition are over. Now Labour has to deliver.",
  10, 0, "flag", "politics", cost=5, reward=J(pp(50)), historical=True)
f("ENG_fix_foundations", "Fix the Foundations",
  "Stability, investment and reform.",
  4, 1, "hammer-wrench", "economy", pre=["ENG_change"], reward=J(civ(1)), historical=True)
f("ENG_autumn_budget", "The Autumn Budget",
  "Forty billion pounds of tax rises and more borrowing for investment.",
  3, 2, "piggy-bank", "economy", pre=["ENG_fix_foundations"], reward=J(remove("md_eng_fiscal_black_hole"), stab(-0.02), civ(1)), historical=True)
f("ENG_gb_energy", "Great British Energy",
  "Clean power by 2030.",
  5, 2, "wind-turbine", "energy", pre=["ENG_fix_foundations"], reward=J(idea("md_eng_gb_energy")), historical=True)
f("ENG_planning_reform", "Planning and Infrastructure Bill",
  "Get Britain building.",
  3, 3, "home-city", "economy", pre=["ENG_autumn_budget"], reward=J(idea("md_eng_planning_reform")), historical=True)
f("ENG_national_wealth_fund", "The National Wealth Fund",
  "Public money to crowd in private investment.",
  5, 3, "bank", "economy", pre=["ENG_gb_energy"], reward=J(civ(2)), historical=True)
f("ENG_ai_opportunities", "AI Opportunities Action Plan",
  "Make Britain an AI superpower.",
  4, 4, "brain", "tech", pre=["ENG_planning_reform", "ENG_national_wealth_fund"], reward=J(research()), historical=True)
f("ENG_defence_review", "Strategic Defence Review",
  "Move the armed forces to warfighting readiness.",
  10, 1, "shield", "military", pre=["ENG_change"], reward=J(idea("md_eng_defence_review")), historical=True)
f("ENG_storm_shadow", "Storm Shadow for Ukraine",
  "Let Ukraine fire British missiles into Russia.",
  8, 2, "rocket-launch", "military", pre=["ENG_defence_review"], reward=J(opinion("UKR", "md_opinion_aid")), historical=True)
f("ENG_three_percent", "Two Point Five, then Three",
  "Raise defence spending, paid for by cutting foreign aid.",
  10, 2, "chart-line", "military", pre=["ENG_defence_review"], reward=J(mil(3)), historical=True)
f("ENG_aukus_submarines", "Twelve SSN-AUKUS Boats",
  "A new generation of attack submarines, built in Barrow.",
  12, 2, "submarine", "military", pre=["ENG_defence_review"], reward=J(dock(2), xp("navy", 25)), historical=True)
f("ENG_coalition_of_willing", "Lead the Coalition of the Willing",
  "Britain and France will guarantee any ceasefire in Ukraine.",
  9, 3, "account-group", "diplomacy", pre=["ENG_storm_shadow", "ENG_three_percent"], reward=J(opinion("UKR", "md_opinion_aid"), opinion("FRA", "md_opinion_aid"), ws(0.03)), historical=True)
f("ENG_global_britain_navy", "Carrier Strike Group",
  "Send HMS Prince of Wales to the Indo-Pacific.",
  12, 3, "ship-wheel", "military", pre=["ENG_aukus_submarines"], reward=J(xp("navy", 25), opinion("JAP", "md_opinion_aid")), historical=True)
f("ENG_eu_reset", "The EU Reset",
  "Repair relations with Brussels without rejoining.",
  16, 1, "currency-eur", "diplomacy", pre=["ENG_change"], reward=J(idea("md_eng_eu_reset")), historical=True)
f("ENG_special_relationship", "The Special Relationship",
  "Keep Washington close whatever comes.",
  18, 2, "handshake", "diplomacy", pre=["ENG_eu_reset"], reward=J(opinion("USA", "md_opinion_trade_deal")), historical=True)
f("ENG_security_pact", "UK-EU Security Pact",
  "A defence and security partnership with the European Union.",
  15, 2, "shield-star", "diplomacy", pre=["ENG_eu_reset"], reward=J(opinion("FRA", "md_opinion_trade_deal"), opinion("GER", "md_opinion_trade_deal")), historical=True)
f("ENG_economic_prosperity_deal", "Economic Prosperity Deal",
  "Lower tariffs on British cars and steel.",
  18, 3, "truck", "economy", pre=["ENG_special_relationship"], reward=J(civ(1)), historical=True)
f("ENG_chagos_deal", "The Chagos Deal",
  "Hand sovereignty to Mauritius and lease back Diego Garcia.",
  15, 3, "anchor", "diplomacy", pre=["ENG_security_pact"], reward=J(pp(50), opinion("MRT", "md_opinion_trade_deal")), historical=True)
f("ENG_stop_the_boats", "Smash the Gangs",
  "A Border Security Command to stop the small boats.",
  22, 1, "ferry", "politics", pre=["ENG_change"], reward=J(idea("md_eng_border_security_command")), historical=True)
f("ENG_reform_threat", "Answer Reform",
  "Reform UK is topping the polls. Labour must respond.",
  22, 2, "bullhorn", "politics", pre=["ENG_stop_the_boats"], reward=J(pop("fascism", -0.03), pop("democratic", 0.03)), historical=True)
f("ENG_renew_britain", "Renew Britain",
  "A decade of national renewal.",
  20, 4, "star-four-points", "politics", pre=["ENG_reform_threat", "ENG_economic_prosperity_deal"], reward=J(stab(0.05), pp(100)))

# =================================================================== GERMANY
G = Tree("md_ger_focus", "GER", "DE")
f = G.f
G.idea("md_ger_infrastructure_fund", "Infrastructure Special Fund",
       "Five hundred billion euros over twelve years for bridges, rails and the grid.",
       "bridge", "economy", production_speed_buildings_factor=0.15, production_speed_infrastructure_factor=0.25)
G.idea("md_ger_bundeswehr_reborn", "Europe's Strongest Army",
       "The goal: the strongest conventional army in Europe.",
       "tank", "military", army_org_factor=0.05, production_speed_arms_factory_factor=0.15)
G.idea("md_ger_military_service", "New Military Service",
       "Every young man must fill in the questionnaire.",
       "account-multiple-plus", "military", conscription=0.01)
G.idea("md_ger_migration_turnaround", "Migration Turnaround",
       "Border controls and pushbacks at every frontier.",
       "fence", "politics", stability_factor=0.03, monthly_population=-0.03)
G.idea("md_ger_firewall", "The Firewall",
       "No cooperation with the AfD, ever.",
       "wall", "politics", drift_defence_factor=0.2)

f("GER_traffic_light_collapse", "The Traffic Light Goes Out",
  "Scholz has fired Lindner. The coalition is finished.",
  12, 0, "traffic-light", "politics", cost=3, reward=J(stab(-0.02), pp(25)), historical=True)
f("GER_snap_election", "Snap Election",
  "Germany votes on 23 February.",
  12, 1, "vote", "politics", pre=["GER_traffic_light_collapse"], available="has_country_flag = md_ger_election_held", reward=J(pp(50)), historical=True)
f("GER_grand_coalition", "A Coalition for the Centre",
  "CDU, CSU and SPD form a government.",
  12, 2, "handshake", "politics", pre=["GER_snap_election"], reward=J(stab(0.05)), historical=True)
f("GER_debt_brake_reform", "Loosen the Debt Brake",
  "Exempt defence spending above 1% of GDP from the debt brake.",
  8, 3, "lock-open", "economy", pre=["GER_grand_coalition"], reward=J(remove("md_ger_debt_brake"), pp(50)), historical=True)
f("GER_infrastructure_fund", "€500 Billion for Infrastructure",
  "A special fund to rebuild a crumbling country.",
  7, 4, "bridge", "economy", pre=["GER_debt_brake_reform"], reward=J(idea("md_ger_infrastructure_fund"), infra(3)), historical=True)
f("GER_energy_reset", "Reset the Energiewende",
  "New gas plants and cheaper power for industry.",
  9, 4, "transmission-tower", "energy", pre=["GER_debt_brake_reform"], reward=J(remove("md_ger_energy_shock"), civ(1)), historical=True)
f("GER_modell_deutschland", "Modell Deutschland 2.0",
  "Make Germany's industry competitive again.",
  8, 5, "cogs", "economy", pre=["GER_infrastructure_fund", "GER_energy_reset"], reward=J(civ(3)))
f("GER_bundeswehr", "Whatever It Takes",
  "Unlimited borrowing for defence.",
  14, 3, "shield", "military", pre=["GER_grand_coalition"], reward=J(mil(3)), historical=True)
f("GER_brigade_lithuania", "Panzerbrigade 45",
  "A permanent German armoured brigade in Lithuania.",
  13, 4, "tank", "military", pre=["GER_bundeswehr"], reward=J(opinion("LIT", "md_opinion_aid"), xp("army", 25)), historical=True)
f("GER_military_service", "New Military Service",
  "A voluntary service with the option of compulsion.",
  15, 4, "account-multiple-plus", "military", pre=["GER_bundeswehr"], reward=J(idea("md_ger_military_service")), historical=True)
f("GER_strongest_army", "Europe's Strongest Army",
  "The largest conventional force in Europe.",
  14, 5, "shield-star", "military", pre=["GER_brigade_lithuania", "GER_military_service"], reward=J(swap("md_ger_zeitenwende", "md_ger_bundeswehr_reborn")))
f("GER_taurus", "Send the Taurus",
  "Give Ukraine the long-range cruise missile Scholz refused to send.",
  16, 5, "rocket-launch", "military", pre=["GER_bundeswehr"], mutex=["GER_no_taurus"], reward=J(opinion("UKR", "md_opinion_aid"), on("UKR", timed("md_ukr_long_range_strikes", 365))))
f("GER_no_taurus", "No Taurus",
  "Germany will not be drawn into the war.",
  18, 5, "hand-back-left", "diplomacy", pre=["GER_bundeswehr"], mutex=["GER_taurus"], reward=J(stab(0.02)))
f("GER_migration_turnaround", "The Migration Turnaround",
  "Turn back asylum-seekers at the border.",
  18, 3, "fence", "politics", pre=["GER_grand_coalition"], reward=J(idea("md_ger_migration_turnaround")), historical=True)
f("GER_keep_firewall", "Hold the Firewall",
  "The Brandmauer stands.",
  17, 4, "wall", "politics", pre=["GER_migration_turnaround"], mutex=["GER_break_firewall"], reward=J(idea("md_ger_firewall")), historical=True)
f("GER_break_firewall", "Tear Down the Firewall",
  "Pass laws with AfD votes if necessary.",
  19, 4, "wall-fire", "crisis", pre=["GER_migration_turnaround"], mutex=["GER_keep_firewall"], reward=J(pop("fascism", 0.05), stab(-0.03)), ai="factor = 0.1")
f("GER_digital_ministry", "A Ministry for Digitisation",
  "Germany finally gets serious about the internet.",
  10, 3, "web", "tech", pre=["GER_grand_coalition"], reward=J(research()), historical=True)

# =================================================================== FRANCE
F = Tree("md_fra_focus", "FRA", "FR")
f = F.f
F.idea("md_fra_european_umbrella", "European Nuclear Umbrella",
       "French deterrence extended to the continent.", "radioactive", "nuclear",
       enemy_justify_war_goal_time=0.2, opinion_gain_monthly_factor=0.1)
F.idea("md_fra_war_economy", "Économie de Guerre",
       "Nexter and MBDA on a war footing.", "factory", "military", production_speed_arms_factory_factor=0.12)
F.idea("md_fra_nuclear_renaissance", "Nuclear Renaissance",
       "Six new EPR2 reactors.", "atom", "energy", production_factory_max_efficiency_factor=0.05, local_resources_factor=0.05)
F.idea("md_fra_stable_government", "A Working Majority",
       "The government can finally pass a budget.", "scale-balance", "politics", political_power_factor=0.05)

f("FRA_cohabitation_crisis", "A Government Without a Majority",
  "Barnier governs at the mercy of the Rassemblement National.",
  10, 0, "scale-balance", "politics", cost=3, reward=J(pp(25)), historical=True)
f("FRA_budget_49_3", "Force the Budget Through",
  "Use Article 49.3 and dare the Assembly to bring the government down.",
  9, 1, "gavel", "politics", pre=["FRA_cohabitation_crisis"], mutex=["FRA_compromise_budget"], reward=J(stab(-0.03), pp(75)), historical=True)
f("FRA_compromise_budget", "A Compromise Budget",
  "Win over the Socialists with concessions on pensions.",
  11, 1, "handshake", "politics", pre=["FRA_cohabitation_crisis"], mutex=["FRA_budget_49_3"], reward=J(stab(0.02), pp(-25)))
f("FRA_working_majority", "Find a Majority",
  "Build a stable governing base in the Assembly.",
  10, 2, "account-group", "politics", pre=[["FRA_budget_49_3", "FRA_compromise_budget"]], reward=J(swap("md_fra_hung_parliament", "md_fra_stable_government")))
f("FRA_strategic_autonomy", "European Strategic Autonomy",
  "Europe must be able to defend itself.",
  4, 1, "shield-star", "diplomacy", pre=["FRA_cohabitation_crisis"], reward=J(pp(50)), historical=True)
f("FRA_nuclear_umbrella", "A European Nuclear Umbrella",
  "Open a debate on extending French deterrence to Europe.",
  3, 2, "radioactive", "nuclear", pre=["FRA_strategic_autonomy"], reward=J(idea("md_fra_european_umbrella")), historical=True)
f("FRA_economie_de_guerre", "Économie de Guerre",
  "Build shells and Caesar howitzers faster.",
  5, 2, "factory", "military", pre=["FRA_strategic_autonomy"], reward=J(idea("md_fra_war_economy"), mil(2)), historical=True)
f("FRA_weimar_triangle", "The Weimar Triangle",
  "Paris, Berlin and Warsaw speak for Europe.",
  3, 3, "account-group", "diplomacy", pre=["FRA_nuclear_umbrella"], reward=J(opinion("GER", "md_opinion_trade_deal"), opinion("POL", "md_opinion_trade_deal")), historical=True)
f("FRA_coalition_of_willing", "The Coalition of the Willing",
  "Reassurance forces for Ukraine, with Britain.",
  5, 3, "flag-variant", "diplomacy", pre=["FRA_economie_de_guerre"], reward=J(opinion("UKR", "md_opinion_aid"), opinion("ENG", "md_opinion_aid")), historical=True)
f("FRA_rafale_exports", "Rafale Diplomacy",
  "Sell Rafales to India, Indonesia, Serbia and the Gulf.",
  4, 4, "airplane", "military", pre=["FRA_weimar_triangle", "FRA_coalition_of_willing"], reward=J(mil(1), opinion("IND", "md_opinion_trade_deal"), opinion("INS", "md_opinion_trade_deal")), historical=True)
f("FRA_recognize_palestine", "Recognise Palestine",
  "France recognises the State of Palestine at the United Nations.",
  15, 1, "flag-variant", "diplomacy", pre=["FRA_cohabitation_crisis"], reward=J(opinion("ISR", "md_opinion_pressure"), opinion("PAL", "md_opinion_aid")), historical=True)
f("FRA_africa_withdrawal", "Leave the Sahel",
  "Close the last bases in Chad, Senegal and Côte d'Ivoire.",
  15, 2, "airplane-takeoff", "diplomacy", pre=["FRA_recognize_palestine"], reward=J(remove("md_fra_francafrique_retreat"), pp(50)), historical=True)
f("FRA_indo_pacific", "A Power in the Indo-Pacific",
  "New Caledonia, Réunion and Polynesia make France a Pacific power.",
  15, 3, "ship-wheel", "military", pre=["FRA_africa_withdrawal"], reward=J(dock(2), xp("navy", 20)))
f("FRA_choose_france", "Choose France",
  "Billions in foreign investment announced at Versailles.",
  19, 1, "office-building", "economy", pre=["FRA_cohabitation_crisis"], reward=J(civ(2)), historical=True)
f("FRA_epr2", "Six New Reactors",
  "Relaunch the nuclear industry with the EPR2.",
  18, 2, "atom", "energy", pre=["FRA_choose_france"], reward=J(idea("md_fra_nuclear_renaissance")), historical=True)
f("FRA_ai_summit", "The AI Action Summit",
  "Mistral and the Paris summit put France on the AI map.",
  20, 2, "brain", "tech", pre=["FRA_choose_france"], reward=J(research()), historical=True)
f("FRA_grandeur", "La Grandeur",
  "France, once again, at the heart of Europe.",
  10, 5, "star-four-points", "politics", pre=["FRA_working_majority", "FRA_rafale_exports"], reward=J(stab(0.05), pp(100)))
