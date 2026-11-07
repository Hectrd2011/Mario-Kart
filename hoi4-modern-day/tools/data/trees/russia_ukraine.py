from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


AT_WAR_UKR = "has_war_with = UKR"
AT_WAR_RUS = "has_war_with = RUS"

# =================================================================== RUSSIA
R = Tree("md_rus_focus", "RUS", "RU")
f = R.f

R.idea("md_rus_glide_bombs", "Glide Bomb Doctrine",
       "Soviet-era bombs fitted with wings and satellite guidance pound Ukrainian positions from beyond air-defence range.",
       "bomb", "military", army_attack_factor=0.05)
R.idea("md_rus_geran_production", "Geran Drone Production",
       "The Alabuga plant turns out thousands of Shahed-type drones every month.",
       "quadcopter", "military", production_speed_arms_factory_factor=0.05, army_attack_factor=0.03)
R.idea("md_rus_donbas_offensive", "The Donbas Offensive",
       "Wave after wave of assaults grind towards Pokrovsk, Kostiantynivka and Kramatorsk.",
       "sword-cross", "military", army_attack_factor=0.1, army_org_factor=-0.05)
R.idea("md_rus_general_mobilization", "Second Wave of Mobilisation",
       "Hundreds of thousands more men are called up.",
       "account-group", "military", conscription=0.02, stability_factor=-0.08)
R.idea("md_rus_volunteer_army", "Volunteer Bonuses",
       "Record sign-up bonuses keep recruits coming without a new call-up.",
       "cash-multiple", "military", conscription=0.008, consumer_goods_factor=0.03)
R.idea("md_rus_fortress_russia", "Fortress Russia",
       "Isolated, defiant and on a permanent war footing.",
       "castle", "politics", stability_factor=0.08, war_support_factor=0.08, drift_defence_factor=0.3)
R.idea("md_rus_high_key_rate", "21% Key Rate",
       "The central bank fights inflation by choking credit.",
       "bank", "economy", consumer_goods_factor=-0.03, production_speed_buildings_factor=-0.08)
R.idea("md_rus_cheap_credit", "Cheap War Credit",
       "Subsidised loans flood the defence industry; inflation follows.",
       "cash-multiple", "economy", production_speed_arms_factory_factor=0.1, consumer_goods_factor=0.05, stability_factor=-0.04)
R.idea("md_rus_sanctions_proof", "Sanctions-Proof Economy",
       "Yuan payments, parallel imports and Asian buyers blunt the sanctions.",
       "shield", "economy", trade_opinion_factor=0.15, production_factory_max_efficiency_factor=0.05)
R.idea("md_rus_attrition", "War of Attrition",
       "Time, men and shells are on Russia's side. Or so Moscow believes.",
       "timer-sand", "military", army_defence_factor=0.1, war_support_factor=0.05)
R.idea("md_rus_strategic_deterrence", "Escalation Dominance",
       "The threat of nuclear use deters Western escalation.",
       "radioactive", "nuclear", enemy_justify_war_goal_time=0.3, lend_lease_tension=0.5)
R.idea("md_prk_troops_in_kursk", "Troops in Kursk",
       "Thousands of North Korean soldiers fight alongside Russia.",
       "account-group", "military", experience_gain_army=0.05, conscription=-0.003)
R.idea("md_ukr_fuel_shortage", "Refinery Damage",
       "Drone strikes have knocked out a fifth of refining capacity.",
       "fire", "crisis", production_factory_max_efficiency_factor=-0.05)
R.idea("md_rus_bombers_destroyed", "Strategic Bombers Destroyed",
       "Drones smuggled in lorries wrecked a third of the strategic bomber fleet.",
       "airplane", "crisis", war_support_factor=-0.03)
R.opinion.update({"md_opinion_alliance": ("Strategic Partnership", 50)})

f("RUS_victory_smo", "Victory in the Special Military Operation",
  "All objectives of the special military operation will be achieved.",
  12, 0, "flag", "military", cost=5, reward=J(ws(0.03), xp("army", 25)), historical=True)
# military
f("RUS_total_war_economy", "Total War Economy",
  "Defence and security now take 40% of the federal budget.",
  4, 1, "factory", "military", pre=["RUS_victory_smo"], reward=J(mil(3)), historical=True)
f("RUS_glide_bombs", "Glide Bomb Doctrine",
  "UMPK kits turn every dumb bomb into a stand-off weapon.",
  2, 2, "bomb", "military", pre=["RUS_total_war_economy"], reward=J(idea("md_rus_glide_bombs")), historical=True)
f("RUS_geran_drones", "Mass-Produce the Geran",
  "Turn the Alabuga special economic zone into the world's largest drone factory.",
  4, 2, "quadcopter", "military", pre=["RUS_total_war_economy"], reward=J(idea("md_rus_geran_production")), historical=True)
f("RUS_contract_soldiers", "Contract Soldiers",
  "Recruit from the regions, the prisons and abroad.",
  6, 2, "account-group", "military", pre=["RUS_total_war_economy"], reward=J(manpower(150000)), historical=True)
f("RUS_kursk_counteroffensive", "Kursk Counteroffensive",
  "Drive the Ukrainians out of Kursk oblast.",
  3, 3, "sword-cross", "military", pre=["RUS_glide_bombs"], available=AT_WAR_UKR, bypass="NOT = { has_war_with = UKR }",
  reward=J(timed("md_rus_donbas_offensive", 120)), historical=True)
f("RUS_north_korean_troops", "Comrades from Pyongyang",
  "Invoke the mutual defence treaty and bring in North Korean troops.",
  6, 3, "handshake", "diplomacy", pre=["RUS_contract_soldiers"],
  reward=J(manpower(15000), xp("army", 15), on("PRK", timed("md_prk_troops_in_kursk", 365)), opinion("PRK", "md_opinion_alliance")), historical=True)
f("RUS_take_pokrovsk", "The Pokrovsk Axis",
  "Cut the logistics hub that supplies the whole Donbas front.",
  3, 4, "map-marker", "military", pre=["RUS_kursk_counteroffensive", "RUS_geran_drones"], available=AT_WAR_UKR,
  bypass="NOT = { has_war_with = UKR }", reward=J(timed("md_rus_donbas_offensive", 180), cp(25)), historical=True)
f("RUS_second_mobilization", "Second Wave of Mobilisation",
  "The front needs men. Call them up.",
  6, 4, "account-multiple-plus", "military", pre=["RUS_north_korean_troops"], mutex=["RUS_volunteer_army"],
  reward=J(idea("md_rus_general_mobilization"), manpower(300000)), ai="factor = 0.3")
f("RUS_volunteer_army", "Pay Them More",
  "Raise sign-up bonuses again rather than risk another mobilisation.",
  8, 4, "cash-multiple", "economy", pre=["RUS_north_korean_troops"], mutex=["RUS_second_mobilization"],
  reward=J(swap("md_rus_partial_mobilization", "md_rus_volunteer_army")), historical=True)
f("RUS_liberate_donbas", "Liberate the Donbas",
  "Take the whole of Donetsk and Luhansk oblasts.",
  3, 5, "flag-variant", "military", pre=["RUS_take_pokrovsk"], available=AT_WAR_UKR, bypass="NOT = { has_war_with = UKR }",
  reward=J(timed("md_rus_donbas_offensive", 240), xp("army", 50)))
f("RUS_secure_land_bridge", "Secure the Land Bridge",
  "Push the line back from Crimea and take Zaporizhzhia and Kherson.",
  3, 6, "bridge", "military", pre=["RUS_liberate_donbas"], available=AT_WAR_UKR, bypass="NOT = { has_war_with = UKR }",
  reward=J(cp(50), ws(0.03)))
f("RUS_novorossiya", "Novorossiya",
  "Odesa and Mykolaiv were Russian cities. Take the whole Black Sea coast.",
  3, 7, "anchor", "crisis", pre=["RUS_secure_land_bridge"], available=AT_WAR_UKR,
  reward=J("every_state = { limit = { is_owned_by = UKR is_coastal = yes } add_claim_by = ROOT }", threat(5, "md_threat_novorossiya")),
  ai="factor = 0.5")
# politics
f("RUS_strengthen_vertical", "Strengthen the Power Vertical",
  "Governors, oligarchs and the security services answer to one man.",
  11, 1, "domain", "politics", pre=["RUS_victory_smo"], reward=J(pp(100)), historical=True)
f("RUS_purge_mod", "Purge the Defence Ministry",
  "Arrest the deputy ministers who grew rich on the war.",
  10, 2, "handcuffs", "politics", pre=["RUS_strengthen_vertical"], reward=J(stab(0.03), "army_experience = 10"), historical=True)
f("RUS_patriotic_education", "Patriotic Education",
  "Military training in schools and Conversations about Important Things every Monday.",
  12, 2, "school", "society", pre=["RUS_strengthen_vertical"], reward=J(ws(0.05)), historical=True)
f("RUS_time_of_heroes", "Time of Heroes",
  "Put veterans of the operation into the new elite.",
  10, 3, "medal", "politics", pre=["RUS_purge_mod"], reward=J(stab(0.03), pp(50)), historical=True)
f("RUS_foreign_agents", "Foreign Agents",
  "Silence the remaining critics as foreign agents and extremists.",
  12, 3, "eye", "intel", pre=["RUS_patriotic_education"], reward=J(pop("democratic", -0.03), stab(0.02)), historical=True)
f("RUS_fortress_russia", "Fortress Russia",
  "A nation that can no longer be divided or coerced.",
  11, 4, "castle", "politics", pre=["RUS_time_of_heroes", "RUS_foreign_agents"], reward=J(idea("md_rus_fortress_russia")))
# economy
f("RUS_pivot_east", "Pivot to the East",
  "If Europe will not buy, Asia will.",
  16, 1, "compass", "economy", pre=["RUS_victory_smo"], reward=J(opinion("PRC", "md_opinion_alliance"), opinion("IND", "md_opinion_trade_deal")), historical=True)
f("RUS_power_of_siberia_2", "Power of Siberia 2",
  "A second pipeline to China, through Mongolia.",
  15, 2, "gas-station", "energy", pre=["RUS_pivot_east"], reward=J(civ(1), infra(2)))
f("RUS_shadow_fleet", "The Shadow Fleet",
  "Hundreds of old tankers carry Russian crude past the price cap.",
  17, 2, "ferry", "economy", pre=["RUS_pivot_east"], reward=J(remove("md_rus_oil_sanctions"), pp(50)), historical=True)
f("RUS_import_substitution", "Import Substitution",
  "Make at home what the West will no longer sell.",
  15, 3, "cogs", "economy", pre=["RUS_power_of_siberia_2"], reward=J(civ(2)), historical=True)
f("RUS_key_rate", "Defend the Rouble",
  "Let Nabiullina raise the key rate to 21%.",
  17, 3, "bank", "economy", pre=["RUS_shadow_fleet"], mutex=["RUS_cheap_credit"], reward=J(idea("md_rus_high_key_rate"), stab(0.03)), historical=True)
f("RUS_cheap_credit", "Cheap Credit for the Front",
  "Order the central bank to finance the war.",
  19, 3, "cash-multiple", "economy", pre=["RUS_shadow_fleet"], mutex=["RUS_key_rate"], reward=J(idea("md_rus_cheap_credit")))
f("RUS_sanctions_proof", "A Sanctions-Proof Economy",
  "Yuan settlements, parallel imports and new partners.",
  16, 4, "shield", "economy", pre=[["RUS_import_substitution"], ["RUS_key_rate", "RUS_cheap_credit"]],
  reward=J(swap("md_rus_sanctions", "md_rus_sanctions_proof")))
f("RUS_northern_sea_route", "The Northern Sea Route",
  "Nuclear icebreakers open an Arctic shipping lane to Asia.",
  16, 5, "ship-wheel", "economy", pre=["RUS_sanctions_proof"], reward=J(dock(2), infra(2)))
# diplomacy
f("RUS_multipolar_world", "A Multipolar World",
  "The age of American hegemony is ending.",
  23, 1, "earth", "diplomacy", pre=["RUS_victory_smo"], reward=J(pp(50)), historical=True)
f("RUS_brics_kazan", "The Kazan Declaration",
  "Build on the Kazan summit: BRICS payment systems and new members.",
  20, 2, "earth", "diplomacy", pre=["RUS_multipolar_world"], reward=J(opinion("PRC", "md_opinion_trade_deal"), opinion("IND", "md_opinion_trade_deal"), opinion("BRA", "md_opinion_trade_deal")), historical=True)
f("RUS_dprk_treaty", "Treaty with Pyongyang",
  "The Comprehensive Strategic Partnership: shells and soldiers for technology.",
  22, 2, "handshake", "diplomacy", pre=["RUS_multipolar_world"],
  reward=J(on("PRK", "add_equipment_to_stockpile = { type = artillery_equipment amount = 1000 producer = PRK }"),
           equip("artillery_equipment", 2000), opinion("PRK", "md_opinion_alliance")), historical=True)
f("RUS_iran_partnership", "Treaty with Tehran",
  "A twenty-year strategic partnership with Iran.",
  24, 2, "handshake-outline", "diplomacy", pre=["RUS_multipolar_world"], reward=J(opinion("PER", "md_opinion_alliance")), historical=True)
f("RUS_africa_corps", "The Africa Corps",
  "Fold the old Wagner networks into a state-run Africa Corps.",
  26, 2, "account-group", "diplomacy", pre=["RUS_multipolar_world"],
  reward=J(on("MLI", opinion("RUS", "md_opinion_alliance")), on("CAF", opinion("RUS", "md_opinion_alliance")), on("BFA", opinion("RUS", "md_opinion_alliance"))), historical=True)
f("RUS_union_state", "Deepen the Union State",
  "Bind Minsk ever closer to Moscow.",
  20, 3, "handshake", "politics", pre=["RUS_brics_kazan"],
  reward=J(opinion("BLR", "md_opinion_alliance"), on("BLR", "give_military_access = RUS")), historical=True)
f("RUS_negotiate_with_trump", "Talk to Washington",
  "The new American president wants a deal. Name the price.",
  23, 3, "phone", "diplomacy", pre=["RUS_dprk_treaty", "RUS_iran_partnership"], mutex=["RUS_grind_on"],
  available="USA = { has_country_flag = md_usa_trump_era }",
  reward=J(opinion("USA", "md_opinion_rapprochement")), historical=True)
f("RUS_istanbul_talks", "The Istanbul Talks",
  "Offer Kyiv a ceasefire along the current front line.",
  23, 4, "hand-peace", "diplomacy", pre=["RUS_negotiate_with_trump"], available=AT_WAR_UKR,
  reward=J(on("UKR", event("md_war.11", 1))), historical=True)
f("RUS_grind_on", "Grind On",
  "There is nothing to discuss until Kyiv capitulates.",
  25, 3, "timer-sand", "military", pre=["RUS_dprk_treaty", "RUS_iran_partnership"], mutex=["RUS_negotiate_with_trump"],
  reward=J(ws(0.05)))
f("RUS_war_of_attrition", "The War of Attrition",
  "Exhaust Ukraine and outlast the West.",
  25, 4, "shield", "military", pre=["RUS_grind_on"], reward=J(idea("md_rus_attrition")))
# nuclear
f("RUS_nuclear_doctrine", "Update the Nuclear Doctrine",
  "An attack by a non-nuclear state backed by a nuclear one is now a joint attack.",
  30, 1, "radioactive", "nuclear", pre=["RUS_victory_smo"], reward=J(threat(2, "md_threat_nuclear_doctrine"), ws(0.02)), historical=True)
f("RUS_oreshnik", "Oreshnik",
  "Test the new intermediate-range ballistic missile on Dnipro.",
  29, 2, "rocket-launch", "nuclear", pre=["RUS_nuclear_doctrine"], reward=J(tech("RUS_oreshnik_bonus", "rocketry", 1.0, 1), threat(2, "md_threat_oreshnik")), historical=True)
f("RUS_sarmat", "Sarmat",
  "Finally put the RS-28 heavy ICBM on combat duty.",
  31, 2, "rocket", "nuclear", pre=["RUS_nuclear_doctrine"], reward=J(tech("RUS_sarmat_bonus", "nuclear", 1.0, 1)))
f("RUS_escalation_dominance", "Escalation Dominance",
  "Make the West believe Moscow is ready to go further than they are.",
  30, 3, "radioactive", "nuclear", pre=["RUS_oreshnik", "RUS_sarmat"], reward=J(idea("md_rus_strategic_deterrence")))

# =================================================================== UKRAINE
U = Tree("md_ukr_focus", "UKR", "UA")
f = U.f
U.idea("md_ukr_fortified_donbas", "Fortified Donbas",
       "Dragon's teeth, anti-tank ditches and minefields stretch across the east.",
       "wall", "military", army_core_defence_factor=0.12)
U.idea("md_ukr_corps_system", "Army Corps",
       "Brigades are grouped into proper army corps with their own staff.",
       "account-group", "military", army_org_factor=0.08, planning_speed=0.15)
U.idea("md_ukr_drone_line", "The Drone Line",
       "A kill zone ten kilometres deep, watched by thousands of drones.",
       "quadcopter", "military", army_defence_factor=0.1, army_attack_factor=0.03)
U.idea("md_ukr_mobilization_reform", "Mobilisation Reform",
       "The draft age is lowered and every man must register.",
       "account-multiple-plus", "military", conscription=0.015, stability_factor=-0.05)
U.idea("md_ukr_contract_18_24", "18-24 Contracts",
       "A one-year contract and a million hryvnias for young volunteers.",
       "draw-pen", "military", conscription=0.006)
U.idea("md_ukr_liberation_offensive", "Liberation Offensive",
       "Every reserve is committed to the attack.",
       "sword-cross", "military", army_attack_factor=0.12, army_morale_factor=0.05)
U.idea("md_ukr_eu_candidate", "EU Accession Path",
       "Opening the clusters of EU accession talks.",
       "currency-eur", "diplomacy", trade_opinion_factor=0.15, stability_factor=0.03)
U.idea("md_ukr_arsenal", "Arsenal of Ukraine",
       "Ukraine now makes most of the weapons it fires.",
       "factory", "military", production_speed_arms_factory_factor=0.15, industrial_capacity_factory=0.1)
U.idea("md_ukr_security_guarantees", "Security Guarantees",
       "European troops and American intelligence underwrite the peace.",
       "shield-star", "diplomacy", enemy_justify_war_goal_time=0.5, stability_factor=0.05)
U.idea("md_ukr_clean_government", "Clean Government",
       "NABU and SAPO are independent and the Western money keeps coming.",
       "scale-balance", "politics", political_power_factor=0.1, stability_factor=0.03)

f("UKR_victory_plan", "The Victory Plan",
  "Zelensky's five-point plan: NATO, weapons, deterrence, resources and the postwar.",
  12, 0, "flag", "politics", cost=5, reward=J(ws(0.03), pp(50)), historical=True)
f("UKR_hold_the_line", "Hold the Line",
  "Every metre of Ukrainian land is paid for in Russian blood.",
  4, 1, "shield", "military", pre=["UKR_victory_plan"], reward=J(xp("army", 25)), historical=True)
f("UKR_kursk_operation", "Hold the Kursk Salient",
  "Keep a bargaining chip on Russian soil.",
  1, 2, "map-marker", "military", pre=["UKR_hold_the_line"], available=AT_WAR_RUS, bypass="NOT = { has_war_with = RUS }",
  reward=J(cp(25), ws(0.02)), historical=True)
f("UKR_fortify_donbas", "Fortify the Donbas",
  "Build fortified lines behind Pokrovsk, Kostiantynivka and Kramatorsk.",
  3, 2, "wall", "military", pre=["UKR_hold_the_line"], reward=J(idea("md_ukr_fortified_donbas")), historical=True)
f("UKR_corps_reform", "Army Corps Reform",
  "Group the brigades into corps with their own staffs.",
  5, 2, "account-group", "military", pre=["UKR_hold_the_line"], reward=J(idea("md_ukr_corps_system")), historical=True)
f("UKR_drone_line", "The Drone Line",
  "Turn the front into a kill zone patrolled by drones.",
  2, 3, "quadcopter", "tech", pre=["UKR_kursk_operation", "UKR_fortify_donbas"], reward=J(idea("md_ukr_drone_line")), historical=True)
f("UKR_mobilization_reform", "Mobilisation Reform",
  "Lower the draft age and enforce registration.",
  5, 3, "account-multiple-plus", "military", pre=["UKR_corps_reform"], mutex=["UKR_volunteer_contracts"],
  reward=J(idea("md_ukr_mobilization_reform"), manpower(100000)), ai="factor = 0.5")
f("UKR_volunteer_contracts", "18-24 Contracts",
  "Leave the draft age at 25 but pay young volunteers handsomely.",
  7, 3, "draw-pen", "military", pre=["UKR_corps_reform"], mutex=["UKR_mobilization_reform"],
  reward=J(idea("md_ukr_contract_18_24"), manpower(30000)), historical=True)
f("UKR_long_range_drones", "Long-Range Drone Campaign",
  "Liutyi drones strike airbases, depots and refineries a thousand kilometres away.",
  2, 4, "airplane", "tech", pre=["UKR_drone_line"], reward=J(xp("air", 25)), historical=True)
f("UKR_neptune_flamingo", "Neptune and Flamingo",
  "Home-grown cruise missiles with a range of three thousand kilometres.",
  4, 4, "rocket-launch", "tech", pre=["UKR_drone_line"], reward=J(mil(1), tech("UKR_missile_bonus", "rocketry", 1.0, 1)), historical=True)
f("UKR_refinery_strikes", "Strike the Refineries",
  "Hit Russia where it earns its money.",
  2, 5, "fire", "military", pre=["UKR_long_range_drones"], available=AT_WAR_RUS,
  reward=J(on("RUS", timed("md_ukr_fuel_shortage", 270))), historical=True)
f("UKR_spiderweb", "Operation Spiderweb",
  "Smuggle drones in lorries to the airbases of the strategic bomber fleet.",
  4, 5, "spider-web", "intel", pre=["UKR_neptune_flamingo"], available=AT_WAR_RUS,
  reward=J(on("RUS", timed("md_rus_bombers_destroyed", 365)), ws(0.05)), historical=True)
f("UKR_liberation_offensive", "Liberation Offensive",
  "Commit the reserves and break the front.",
  3, 6, "sword-cross", "military", pre=["UKR_refinery_strikes", "UKR_spiderweb"], available=AT_WAR_RUS,
  reward=J(timed("md_ukr_liberation_offensive", 180)))
# foreign
f("UKR_appeal_to_west", "Appeal to the West",
  "Ukraine's survival is Europe's security.",
  12, 1, "earth", "diplomacy", pre=["UKR_victory_plan"], reward=J(pp(50)), historical=True)
f("UKR_ramstein", "The Ramstein Format",
  "Fifty nations coordinating military aid to Ukraine.",
  10, 2, "package-variant-closed", "diplomacy", pre=["UKR_appeal_to_west"],
  reward=J("add_equipment_to_stockpile = { type = infantry_equipment amount = 10000 } add_equipment_to_stockpile = { type = artillery_equipment amount = 800 }"), historical=True)
f("UKR_eu_accession", "Open EU Accession Talks",
  "The first intergovernmental conference opened in Luxembourg.",
  12, 2, "currency-eur", "diplomacy", pre=["UKR_appeal_to_west"], reward=J(idea("md_ukr_eu_candidate")), historical=True)
f("UKR_us_minerals", "The Minerals Partnership",
  "A joint reconstruction fund with the United States.",
  14, 2, "diamond-stone", "economy", pre=["UKR_appeal_to_west"], reward=J(civ(1), opinion("USA", "md_opinion_trade_deal")), historical=True)
f("UKR_coalition_of_willing", "The Coalition of the Willing",
  "Britain and France lead a coalition ready to guarantee a ceasefire.",
  10, 3, "account-group", "diplomacy", pre=["UKR_ramstein"], reward=J(opinion("ENG", "md_opinion_aid"), opinion("FRA", "md_opinion_aid")), historical=True)
f("UKR_frozen_assets", "Unlock Frozen Russian Assets",
  "Use the windfall profits of Russia's frozen reserves to pay for the war.",
  11, 4, "cash-lock", "economy", pre=["UKR_coalition_of_willing", "UKR_eu_accession"], reward=J(civ(1), mil(2)), historical=True)
f("UKR_purl", "Buy American",
  "European allies buy American weapons for Ukraine through PURL.",
  14, 3, "cart", "diplomacy", pre=["UKR_us_minerals"],
  reward=J("add_equipment_to_stockpile = { type = anti_air_equipment amount = 1000 } add_equipment_to_stockpile = { type = anti_tank_equipment amount = 1500 }"), historical=True)
f("UKR_nato_path", "The Path to NATO",
  "An irreversible path to membership, as promised in Washington.",
  13, 4, "shield-star", "diplomacy", pre=["UKR_purl"], reward=J(opinion("USA", "md_opinion_aid"), pp(50)))
f("UKR_security_guarantees", "Security Guarantees",
  "A ceasefire is worthless without guarantees.",
  12, 5, "shield-star", "diplomacy", pre=["UKR_frozen_assets", "UKR_nato_path"], reward=J(idea("md_ukr_security_guarantees")))
# economy
f("UKR_wartime_economy", "The Wartime Economy",
  "Keep the economy alive under the bombs.",
  19, 1, "chart-line", "economy", pre=["UKR_victory_plan"], reward=J(civ(1)), historical=True)
f("UKR_energy_resilience", "Energy Resilience",
  "Disperse the grid, buy generators and import power from Europe.",
  18, 2, "transmission-tower", "energy", pre=["UKR_wartime_economy"], reward=J(infra(2), stab(0.03)), historical=True)
f("UKR_grain_corridor", "The Black Sea Corridor",
  "Keep the grain ships sailing from Odesa.",
  20, 2, "grain", "economy", pre=["UKR_wartime_economy"], reward=J(civ(1), pp(25)), historical=True)
f("UKR_danish_model", "The Danish Model",
  "Allies pay Ukrainian factories directly to build weapons for the front.",
  18, 3, "factory", "military", pre=["UKR_energy_resilience"], reward=J(mil(3)), historical=True)
f("UKR_defense_city", "Defence City",
  "A special tax regime for defence manufacturers.",
  20, 3, "city", "economy", pre=["UKR_grain_corridor"], reward=J(mil(2)), historical=True)
f("UKR_arsenal_of_ukraine", "Arsenal of Ukraine",
  "Drones, shells and missiles made at home.",
  19, 4, "factory", "military", pre=["UKR_danish_model", "UKR_defense_city"], reward=J(idea("md_ukr_arsenal")))
f("UKR_reconstruction", "The Reconstruction Fund",
  "Rebuild the cities, the grid and the railways.",
  19, 5, "hard-hat", "economy", pre=["UKR_arsenal_of_ukraine"], available="has_war = no",
  reward=J(civ(3), infra(3), stab(0.05)))
# politics
f("UKR_national_unity", "National Unity",
  "One country, one fight.",
  24, 1, "account-group", "politics", pre=["UKR_victory_plan"], reward=J(stab(0.03)), historical=True)
f("UKR_anti_corruption", "Protect NABU",
  "Back down from the law that gutted the anti-corruption agencies.",
  23, 2, "scale-balance", "politics", pre=["UKR_national_unity"], reward=J(idea("md_ukr_clean_government")), historical=True)
f("UKR_sanction_collaborators", "Sanction the Collaborators",
  "Strip the pro-Russian elites of their assets and their parties.",
  25, 2, "handcuffs", "intel", pre=["UKR_national_unity"], reward=J(pop("neutrality", -0.03), stab(0.02)), historical=True)
f("UKR_peace_talks", "Talks in Istanbul",
  "Explore a ceasefire along the current front line.",
  23, 3, "hand-peace", "diplomacy", pre=["UKR_anti_corruption"], mutex=["UKR_not_one_step"], available=AT_WAR_RUS,
  reward=J(on("RUS", event("md_war.12", 1))), historical=True)
f("UKR_not_one_step", "Not One Step Back",
  "No ceasefire while Russian troops stand on Ukrainian soil.",
  25, 3, "flag-variant", "military", pre=["UKR_sanction_collaborators"], mutex=["UKR_peace_talks"], reward=J(ws(0.08)))
f("UKR_postwar_elections", "Postwar Elections",
  "Lift martial law and let Ukrainians vote.",
  23, 4, "vote", "politics", pre=["UKR_peace_talks"], available="has_war = no",
  reward=J(remove("md_ukr_martial_law"), "set_politics = { ruling_party = democratic elections_allowed = yes }", stab(0.05)))
f("UKR_liberate_crimea", "Liberate Crimea",
  "Crimea is Ukraine.",
  25, 4, "anchor", "military", pre=["UKR_not_one_step"], available=AT_WAR_RUS,
  reward=J(timed("md_ukr_liberation_offensive", 240), "every_state = { limit = { is_owned_by = RUS is_core_of = UKR } add_claim_by = ROOT }"))
