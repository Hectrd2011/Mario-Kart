"""Starting national spirits and leader / advisor traits.

Each spirit: id -> (name, description, glyph, theme, modifiers)
glyph is a Material Design Icons name, theme picks the badge colour.
"""

S = {}


def spirit(id_, name, desc, glyph, theme, **mods):
    assert id_ not in S, id_
    S[id_] = dict(name=name, desc=desc, glyph=glyph, theme=theme, mods=mods)


# ---------------------------------------------------------------- shared
spirit("md_nuclear_triad", "Nuclear Triad",
       "Land, sea and air legs of a full nuclear arsenal make any attack on our homeland unthinkable.",
       "radioactive", "nuclear", enemy_justify_war_goal_time=0.5, war_support_factor=0.05, nuclear_production_factor=0.25)
spirit("md_nuclear_deterrent", "Nuclear Deterrent",
       "A credible nuclear deterrent keeps the most dangerous wars from ever starting.",
       "radioactive", "nuclear", enemy_justify_war_goal_time=0.3, nuclear_production_factor=0.15)
spirit("md_western_sanctions_light", "Western Sanctions",
       "Targeted sanctions from the United States and the European Union restrict trade and finance.",
       "cash-remove", "crisis", trade_opinion_factor=-0.25, consumer_goods_factor=0.05, production_factory_max_efficiency_factor=-0.05)
spirit("md_rus_sanctions_light", "Sanctioned Ally of Moscow",
       "Our support for Russia's war has brought Western sanctions down on us as well.",
       "cash-remove", "crisis", trade_opinion_factor=-0.2, production_factory_max_efficiency_factor=-0.05)
spirit("md_multi_vector", "Multi-Vector Diplomacy",
       "We keep doors open in Washington, Brussels, Moscow and Beijing alike.",
       "compass", "diplomacy", trade_opinion_factor=0.2, opinion_gain_monthly_factor=0.15, drift_defence_factor=0.1)
spirit("md_petro_state_spirit", "Hydrocarbon Economy",
       "Oil and gas exports fill the treasury, but leave the economy at the mercy of world prices.",
       "oil", "energy", local_resources_factor=0.15, consumer_goods_factor=-0.03, research_speed_factor=-0.05)
spirit("md_neutral_tradition", "Tradition of Neutrality",
       "Staying out of other people's wars is a matter of national identity.",
       "peace", "diplomacy", drift_defence_factor=0.2, war_support_factor=-0.1, enemy_justify_war_goal_time=0.2)
spirit("md_armed_neutrality", "Armed Neutrality",
       "Neutral, but ready: every citizen is a soldier and every valley a fortress.",
       "shield-star", "military", drift_defence_factor=0.25, army_core_defence_factor=0.15, conscription=0.01)
spirit("md_no_standing_army", "No Standing Army",
       "We abolished our army long ago and rely on police forces and our allies.",
       "hand-peace", "diplomacy", conscription_factor=-0.5, war_support_factor=-0.2, stability_factor=0.05)
spirit("md_gang_violence", "Gang Violence",
       "Organised criminal gangs fight the state for control of the streets.",
       "pistol", "crisis", stability_factor=-0.1, consumer_goods_factor=0.03)
spirit("md_sahel_insurgency", "Jihadist Insurgency",
       "Al-Qaeda and Islamic State affiliates roam the countryside and strike at will.",
       "fire", "crisis", stability_factor=-0.12, war_support_factor=0.05, production_speed_buildings_factor=-0.1)
spirit("md_aes_alliance", "Alliance of Sahel States",
       "Mali, Burkina Faso and Niger have broken with ECOWAS and France to form their own confederation.",
       "handshake", "diplomacy", war_support_factor=0.1, trade_opinion_factor=-0.1, army_core_defence_factor=0.05)
spirit("md_wagner_africa_corps", "Russian Africa Corps",
       "Russian military contractors guard the regime in exchange for mining concessions.",
       "account-group", "military", army_defence_factor=0.05, local_resources_factor=-0.1, stability_factor=0.03)
spirit("md_lithium_triangle", "Lithium Triangle",
       "Our salt flats hold some of the largest lithium reserves on Earth.",
       "battery-charging-high", "energy", local_resources_factor=0.1, trade_opinion_factor=0.1)
spirit("md_energy_blackouts", "Rolling Blackouts",
       "An ageing grid and fuel shortages mean the lights go out for hours every day.",
       "flash-alert", "crisis", production_factory_max_efficiency_factor=-0.1, stability_factor=-0.05)
spirit("md_free_active", "Free and Active Foreign Policy",
       "We are friends with all and enemies of none.",
       "compass", "diplomacy", drift_defence_factor=0.1, trade_opinion_factor=0.15)

# ---------------------------------------------------------------- USA
spirit("md_usa_polarized_nation", "A Polarized Nation",
       "Red and blue America barely speak the same language. Every policy is a battle.",
       "scale-balance", "politics", stability_factor=-0.08, political_power_factor=-0.1)
spirit("md_usa_reserve_currency", "Global Reserve Currency",
       "The dollar underwrites world trade, letting Washington borrow and sanction like no one else.",
       "currency-usd", "economy", consumer_goods_factor=-0.05, trade_opinion_factor=0.25, research_speed_factor=0.05)
spirit("md_usa_arsenal", "Arsenal of Democracy",
       "The world's largest defence industry still sets the standard for every army on Earth.",
       "factory", "military", industrial_capacity_factory=0.1, production_speed_arms_factory_factor=0.1, experience_gain_army=0.02)
spirit("md_usa_transition", "Presidential Transition",
       "The election is over and a new administration is preparing to take power on 20 January.",
       "timer-sand", "politics", political_power_factor=-0.25)

# ---------------------------------------------------------------- Canada / Mexico / Latin America
spirit("md_can_housing_crisis", "Housing Crisis",
       "Rents and home prices have soared out of reach for a generation of Canadians.",
       "home-city", "crisis", stability_factor=-0.05, consumer_goods_factor=0.03)
spirit("md_can_resource_superpower", "Resource Superpower",
       "Oil sands, potash, uranium and critical minerals make Canada a quiet energy giant.",
       "pickaxe", "energy", local_resources_factor=0.15)
spirit("md_mex_cartel_violence", "Cartel Wars",
       "The cartels command private armies and control entire regions of the country.",
       "pistol", "crisis", stability_factor=-0.1, production_speed_buildings_factor=-0.05)
spirit("md_mex_nearshoring", "Nearshoring Boom",
       "Factories leaving China are setting up next door to the American market.",
       "truck", "economy", production_speed_industrial_complex_factor=0.1, trade_opinion_factor=0.1)
spirit("md_slv_state_of_exception", "State of Exception",
       "Civil liberties are suspended and tens of thousands of suspected gang members are behind bars.",
       "handcuffs", "politics", stability_factor=0.1, democratic_drift=-0.02)
spirit("md_cub_embargo", "The Embargo",
       "Six decades of American embargo have strangled Cuba's economy.",
       "cash-remove", "crisis", trade_opinion_factor=-0.4, consumer_goods_factor=0.08)
spirit("md_hai_gang_rule", "Gang Rule",
       "Armed coalitions like Viv Ansanm control most of Port-au-Prince. The state barely exists.",
       "fire", "crisis", stability_factor=-0.25, production_speed_buildings_factor=-0.3, political_power_factor=-0.3)
spirit("md_pan_canal", "The Panama Canal",
       "Five per cent of world trade passes through our canal.",
       "ferry", "economy", trade_opinion_factor=0.3, consumer_goods_factor=-0.03)
spirit("md_bra_brics_founder", "BRICS Founder",
       "A founding member of BRICS, pushing for a multipolar world order.",
       "earth", "diplomacy", trade_opinion_factor=0.1, opinion_gain_monthly_factor=0.1)
spirit("md_bra_amazon_stewardship", "Guardians of the Amazon",
       "Protecting the rainforest earns goodwill abroad but limits development at home.",
       "tree", "society", stability_factor=0.03, local_resources_factor=-0.05)
spirit("md_arg_chainsaw_austerity", "The Chainsaw",
       "Milei's shock therapy has slashed spending, ministries and subsidies.",
       "content-cut", "economy", consumer_goods_factor=-0.05, stability_factor=-0.05, political_power_gain=0.1)
spirit("md_arg_inflation", "Runaway Inflation",
       "Prices still rise by the month, even as the chainsaw falls.",
       "trending-up", "crisis", consumer_goods_factor=0.05, stability_factor=-0.05)
spirit("md_col_armed_groups", "Armed Groups",
       "The ELN and FARC dissidents still hold out in the jungle.",
       "pistol", "crisis", stability_factor=-0.06)
spirit("md_ven_oil_collapse", "Collapsed Oil Industry",
       "The world's largest oil reserves, pumped by a crumbling industry.",
       "oil", "crisis", local_resources_factor=-0.25, consumer_goods_factor=0.1)
spirit("md_guy_oil_boom", "Offshore Oil Boom",
       "New offshore fields have made Guyana the fastest-growing economy in the world.",
       "oil", "energy", local_resources_factor=0.25, production_speed_buildings_factor=0.15)

# ---------------------------------------------------------------- Europe
spirit("md_eng_fiscal_black_hole", "The Fiscal Black Hole",
       "The Treasury is short of money and the bond markets are watching every move.",
       "piggy-bank", "economy", consumer_goods_factor=0.03, political_power_factor=-0.05)
spirit("md_eng_city_of_london", "The City of London",
       "One of the world's great financial centres funds the nation.",
       "bank", "economy", trade_opinion_factor=0.15, research_speed_factor=0.03)
spirit("md_ire_tech_haven", "European Tech Haven",
       "Low taxes have brought the world's tech giants to Dublin.",
       "server", "economy", production_speed_industrial_complex_factor=0.1, consumer_goods_factor=-0.05)
spirit("md_fra_hung_parliament", "Hung Parliament",
       "No bloc holds a majority in the National Assembly, and any budget could bring down the government.",
       "scale-balance", "politics", stability_factor=-0.1, political_power_factor=-0.15)
spirit("md_fra_force_de_frappe", "Force de Frappe",
       "France's independent deterrent guarantees her sovereignty.",
       "radioactive", "nuclear", enemy_justify_war_goal_time=0.3, nuclear_production_factor=0.15, war_support_factor=0.03)
spirit("md_fra_francafrique_retreat", "End of Françafrique",
       "French troops are being sent home from the Sahel, one junta at a time.",
       "airplane-takeoff", "diplomacy", political_power_factor=-0.03)
spirit("md_ger_debt_brake", "Schuldenbremse",
       "The constitutional debt brake keeps borrowing tight, even in a crisis.",
       "lock", "economy", consumer_goods_factor=-0.03, production_speed_buildings_factor=-0.1)
spirit("md_ger_energy_shock", "Energy Price Shock",
       "Cheap Russian gas is gone, and heavy industry is struggling with the bill.",
       "gas-station", "crisis", production_factory_max_efficiency_factor=-0.05, industrial_capacity_factory=-0.05)
spirit("md_ger_zeitenwende", "Zeitenwende",
       "A €100 billion special fund is rebuilding the Bundeswehr after decades of neglect.",
       "shield", "military", production_speed_arms_factory_factor=0.1, army_org_factor=0.03)
spirit("md_swiss_banking", "Swiss Banking",
       "Discreet, stable and immensely rich.",
       "bank", "economy", consumer_goods_factor=-0.05, trade_opinion_factor=0.2)
spirit("md_ita_public_debt", "Mountain of Debt",
       "Public debt above 135% of GDP limits every government's room to act.",
       "piggy-bank", "economy", consumer_goods_factor=0.03)
spirit("md_ita_migration_pact", "Mediterranean Gatekeeper",
       "Italy is on the front line of Mediterranean migration and wants Europe to share the load.",
       "ferry", "politics", political_power_gain=0.05, stability_factor=-0.03)
spirit("md_spr_valencia_floods", "Valencia Floods",
       "Catastrophic floods in Valencia have killed over two hundred people and shaken trust in the state.",
       "water-pump", "crisis", stability_factor=-0.05, production_speed_buildings_factor=-0.05)
spirit("md_hol_chip_machines", "Lithography Leader",
       "The machines that print the world's most advanced chips are made in the Netherlands.",
       "chip", "tech", research_speed_factor=0.08)
spirit("md_den_greenland_question", "The Greenland Question",
       "Greenland's future is debated in Nuuk, Copenhagen and, increasingly, Washington.",
       "map-marker", "politics", political_power_factor=-0.03)
spirit("md_nor_sovereign_wealth", "Sovereign Wealth Fund",
       "The world's largest sovereign wealth fund turns North Sea oil into permanent prosperity.",
       "cash-multiple", "economy", consumer_goods_factor=-0.06, stability_factor=0.05)
spirit("md_swe_arms_industry", "Swedish Defence Industry",
       "Saab, Bofors and Kockums make Sweden a small country with a big arms industry.",
       "airplane", "military", production_speed_arms_factory_factor=0.08, research_speed_factor=0.03)
spirit("md_fin_total_defence", "Comprehensive Security",
       "Every Finn knows their role should the eastern neighbour come again.",
       "shield-star", "military", army_core_defence_factor=0.2, conscription=0.015, war_support_factor=0.05)
spirit("md_pol_eastern_shield", "East Shield",
       "Poland is building the strongest land army in Europe along its eastern frontier.",
       "shield", "military", army_core_defence_factor=0.1, production_speed_arms_factory_factor=0.1, conscription=0.005)
spirit("md_pol_cohabitation", "Cohabitation",
       "A liberal government faces a conservative president with a veto pen.",
       "scale-balance", "politics", political_power_factor=-0.1)
spirit("md_cze_ammo_initiative", "Czech Ammunition Initiative",
       "Prague brokers artillery shells from around the world for Ukraine.",
       "package-variant-closed", "military", production_speed_arms_factory_factor=0.05, trade_opinion_factor=0.1)
spirit("md_hun_eu_funds_frozen", "Frozen EU Funds",
       "Billions in EU funds remain frozen over rule-of-law disputes.",
       "currency-eur", "economy", consumer_goods_factor=0.03, production_speed_buildings_factor=-0.05)
spirit("md_bos_dayton_deadlock", "Dayton Deadlock",
       "Ethnic power-sharing means almost nothing can be decided.",
       "scale-balance", "politics", political_power_factor=-0.2, stability_factor=-0.05)
spirit("md_ser_kosovo_question", "The Kosovo Question",
       "Belgrade does not recognise Kosovo's independence.",
       "map-marker", "politics", war_support_factor=0.05)
spirit("md_kos_partial_recognition", "Partial Recognition",
       "Around half of the world's states recognise Kosovo.",
       "passport", "diplomacy", trade_opinion_factor=-0.1)
spirit("md_cyp_divided_island", "A Divided Island",
       "Turkish troops still occupy the north of the island, fifty years on.",
       "fence", "politics", stability_factor=-0.03)
spirit("md_mol_transnistria", "Transnistria",
       "A Russian-backed breakaway republic sits on the left bank of the Dniester.",
       "map-marker", "crisis", stability_factor=-0.05)
spirit("md_e_estonia", "e-Estonia",
       "The world's most digital state runs on code.",
       "web", "tech", research_speed_factor=0.05, political_power_gain=0.05)

# ---------------------------------------------------------------- Russia & neighbours
spirit("md_rus_war_economy", "War Economy",
       "Defence spending has reached 6% of GDP. The factories run around the clock.",
       "factory", "military", production_speed_arms_factory_factor=0.2, industrial_capacity_factory=0.1, consumer_goods_factor=0.05)
spirit("md_rus_sanctions", "Western Sanctions Regime",
       "The harshest sanctions ever imposed on a major economy.",
       "cash-remove", "crisis", trade_opinion_factor=-0.4, research_speed_factor=-0.1, production_factory_max_efficiency_factor=-0.05)
spirit("md_rus_partial_mobilization", "Contract Recruitment Drive",
       "Generous bonuses fill the ranks without a second wave of mobilization.",
       "account-group", "military", conscription=0.01, army_morale_factor=-0.05)
spirit("md_rus_power_vertical", "The Power Vertical",
       "Every lever of the state answers to the Kremlin.",
       "domain", "politics", stability_factor=0.08, democratic_drift=-0.03, political_power_gain=0.15)
spirit("md_ukr_total_defense", "Total Defense",
       "The whole nation is mobilised to resist the invasion.",
       "shield-star", "military", army_core_defence_factor=0.2, war_support_factor=0.15, consumer_goods_factor=0.05)
spirit("md_ukr_western_aid", "Western Military Aid",
       "Weapons, ammunition and money flow in from the United States and Europe.",
       "package-variant-closed", "military", production_speed_arms_factory_factor=0.15, industrial_capacity_factory=0.1)
spirit("md_ukr_drone_warfare", "Drone Warfare",
       "Ukraine builds millions of drones a year and has rewritten the rules of modern war.",
       "quadcopter", "tech", army_attack_factor=0.08, research_speed_factor=0.05)
spirit("md_ukr_martial_law", "Martial Law",
       "Elections are suspended for the duration of the war.",
       "gavel", "politics", stability_factor=0.05, political_power_gain=0.1)
spirit("md_blr_union_state", "The Union State",
       "Belarus is bound ever tighter to Moscow, now hosting Russian nuclear weapons.",
       "handshake", "politics", stability_factor=0.05, drift_defence_factor=0.1)
spirit("md_geo_disputed_election", "Disputed Election",
       "The opposition rejects the October results and the streets of Tbilisi are filling with protesters.",
       "vote", "crisis", stability_factor=-0.12)
spirit("md_arm_westward_pivot", "Westward Pivot",
       "After Karabakh, Yerevan has frozen its CSTO membership and looks to the West.",
       "compass", "diplomacy", drift_defence_factor=-0.05, trade_opinion_factor=0.05)

# ---------------------------------------------------------------- Middle East
spirit("md_tur_inflation", "Lira Crisis",
       "Inflation and a collapsing lira squeeze every Turkish household.",
       "currency-usd", "crisis", consumer_goods_factor=0.05, stability_factor=-0.05)
spirit("md_tur_defense_industry", "Turkish Defence Industry",
       "From Bayraktar drones to KAAN fighters, Turkey arms itself.",
       "quadcopter", "military", production_speed_arms_factory_factor=0.1, research_speed_factor=0.03)
spirit("md_tur_bosporus", "Keeper of the Straits",
       "Under the Montreux Convention Ankara controls the passage between the Black Sea and the world.",
       "anchor", "diplomacy", trade_opinion_factor=0.1)
spirit("md_isr_iron_dome", "Iron Dome",
       "Layered missile defence intercepts rockets from Gaza, Lebanon, Yemen and Iran.",
       "shield", "military", army_core_defence_factor=0.1, industry_repair_factor=0.3)
spirit("md_isr_multi_front_war", "Seven-Front War",
       "Gaza, Lebanon, Syria, the West Bank, Yemen, Iraq and Iran.",
       "sword-cross", "military", war_support_factor=0.1, consumer_goods_factor=0.05, stability_factor=-0.05)
spirit("md_isr_hostage_crisis", "Hostages in Gaza",
       "Around a hundred hostages are still held in Gaza.",
       "account-group", "crisis", stability_factor=-0.08)
spirit("md_isr_tech_nation", "Start-Up Nation",
       "Israel has more tech start-ups per head than anywhere else on Earth.",
       "chip", "tech", research_speed_factor=0.08, encryption_factor=0.25, decryption_factor=0.25)
spirit("md_pal_occupation", "Occupation",
       "Checkpoints, settlements and war define Palestinian life.",
       "fence", "crisis", stability_factor=-0.15, production_speed_buildings_factor=-0.25)
spirit("md_leb_hezbollah_state_within", "A State Within a State",
       "Hezbollah's arsenal rivals the Lebanese army. It is reeling from Israel's offensive.",
       "account-group", "crisis", stability_factor=-0.1, war_support_factor=0.05)
spirit("md_leb_economic_collapse", "Economic Collapse",
       "The lira has lost over 95% of its value since 2019.",
       "trending-down", "crisis", consumer_goods_factor=0.1)
spirit("md_syr_hollow_army", "Hollow Army",
       "Unpaid, demoralised conscripts guard the regime's lines. Its allies are distracted.",
       "account-group", "crisis", army_org_factor=-0.2, army_morale_factor=-0.2, army_defence_factor=-0.15)
spirit("md_syr_captagon_economy", "Captagon State",
       "Amphetamine smuggling is now the regime's biggest export.",
       "flask", "crisis", consumer_goods_factor=0.05, trade_opinion_factor=-0.15)
spirit("md_irq_militias", "Popular Mobilization Forces",
       "Iran-aligned militias act with little regard for Baghdad.",
       "account-group", "crisis", stability_factor=-0.05, war_support_factor=0.05)
spirit("md_per_maximum_pressure", "Sanctions",
       "American secondary sanctions choke Iranian oil exports and banking.",
       "cash-remove", "crisis", trade_opinion_factor=-0.35, consumer_goods_factor=0.08)
spirit("md_per_axis_of_resistance", "Axis of Resistance",
       "Hezbollah, the Houthis, Iraqi militias and Hamas form Tehran's forward defence. Most are badly bloodied.",
       "earth-arrow-right", "military", send_volunteers_tension=-0.5, war_support_factor=0.05)
spirit("md_per_nuclear_threshold", "Nuclear Threshold",
       "Iran has enough enriched uranium for several bombs, if it chose to build them.",
       "atom", "nuclear", research_speed_factor=0.03)
spirit("md_per_irgc", "The Revolutionary Guard",
       "The IRGC is a military, an industrial empire and a political force at once.",
       "shield-star", "military", conscription=0.01, stability_factor=0.03)
spirit("md_sau_vision_2030", "Vision 2030",
       "Giga-projects like NEOM aim to wean the kingdom off oil.",
       "city", "economy", production_speed_buildings_factor=0.1, consumer_goods_factor=-0.05)
spirit("md_sau_opec_swing", "OPEC+ Swing Producer",
       "Riyadh decides how much oil the world gets.",
       "oil", "energy", local_resources_factor=0.2, trade_opinion_factor=0.15)
spirit("md_yem_red_sea_campaign", "Red Sea Campaign",
       "Houthi missiles and drones have turned the Red Sea into a war zone.",
       "rocket-launch", "military", war_support_factor=0.1, army_core_defence_factor=0.15)
spirit("md_uae_global_hub", "Global Hub",
       "Dubai and Abu Dhabi connect the world's trade, finance and travel.",
       "airport", "economy", trade_opinion_factor=0.25, consumer_goods_factor=-0.05)
spirit("md_qat_lng_giant", "LNG Giant",
       "Qatar supplies a fifth of the world's liquefied natural gas.",
       "gas-station", "energy", local_resources_factor=0.2, consumer_goods_factor=-0.05)
spirit("md_afg_international_isolation", "International Isolation",
       "No country formally recognises the Islamic Emirate.",
       "earth-off", "crisis", trade_opinion_factor=-0.4, research_speed_factor=-0.2)

# ---------------------------------------------------------------- Africa
spirit("md_egy_debt_crisis", "Debt Crisis",
       "Mega-projects and a weak pound have left Egypt deep in debt.",
       "trending-down", "crisis", consumer_goods_factor=0.05)
spirit("md_egy_suez_revenue_loss", "Empty Canal",
       "Houthi attacks have halved traffic through the Suez Canal.",
       "ferry", "crisis", trade_opinion_factor=-0.05, consumer_goods_factor=0.03)
spirit("md_lba_divided_country", "A Divided Country",
       "Rival governments in Tripoli and Benghazi each claim to rule Libya.",
       "fence", "politics", stability_factor=-0.08)
spirit("md_eth_ethnic_insurgencies", "Ethnic Insurgencies",
       "Fano militias in Amhara and the OLA in Oromia fight the federal army.",
       "fire", "crisis", stability_factor=-0.1)
spirit("md_dji_bases", "Foreign Bases",
       "American, Chinese, French, Italian and Japanese troops are all based here.",
       "flag-variant", "diplomacy", consumer_goods_factor=-0.05)
spirit("md_som_al_shabaab", "Al-Shabaab",
       "The insurgents control much of southern Somalia.",
       "fire", "crisis", stability_factor=-0.15)
spirit("md_sml_unrecognized", "Unrecognised State",
       "Somaliland has governed itself since 1991, but no country recognises it.",
       "passport", "diplomacy", trade_opinion_factor=-0.2, stability_factor=0.05)
spirit("md_ken_gen_z_protests", "Gen Z Protests",
       "Young Kenyans took to the streets against the 2024 Finance Bill.",
       "bullhorn", "crisis", stability_factor=-0.05)
spirit("md_drc_eastern_war", "War in the East",
       "The Rwanda-backed M23 rebels are advancing on Goma.",
       "fire", "crisis", stability_factor=-0.15)
spirit("md_drc_critical_minerals", "Critical Minerals",
       "Most of the world's cobalt comes out of Congolese soil.",
       "diamond-stone", "energy", local_resources_factor=0.2)
spirit("md_cmr_anglophone_crisis", "Anglophone Crisis",
       "Separatists in the English-speaking regions have waged war since 2017.",
       "fire", "crisis", stability_factor=-0.07)
spirit("md_sud_civil_war", "Sudanese Civil War",
       "The army and the RSF have torn the country apart since April 2023.",
       "fire", "crisis", stability_factor=-0.15, war_support_factor=0.1, production_speed_buildings_factor=-0.25)
spirit("md_nga_insurgency", "Boko Haram and Banditry",
       "Jihadists in the north-east and bandits in the north-west defy the federal government.",
       "fire", "crisis", stability_factor=-0.08)
spirit("md_moz_post_election_unrest", "Post-Election Unrest",
       "Opposition supporters reject FRELIMO's victory in the October election.",
       "bullhorn", "crisis", stability_factor=-0.1)
spirit("md_moz_cabo_delgado", "Cabo Delgado Insurgency",
       "An Islamic State affiliate threatens the gas fields of the north.",
       "fire", "crisis", stability_factor=-0.05, local_resources_factor=-0.1)
spirit("md_saf_loadshedding", "Load-Shedding",
       "Eskom's failing power stations have kept South Africa on rolling blackouts.",
       "flash-alert", "crisis", production_factory_max_efficiency_factor=-0.05)

# ---------------------------------------------------------------- Asia
spirit("md_ind_demographic_dividend", "Demographic Dividend",
       "The most populous country on Earth has a young and growing workforce.",
       "account-multiple-plus", "society", monthly_population=0.1, conscription=0.005)
spirit("md_ind_strategic_autonomy", "Strategic Autonomy",
       "India buys Russian oil, joins the Quad and trusts no one entirely.",
       "compass", "diplomacy", drift_defence_factor=0.15, trade_opinion_factor=0.15)
spirit("md_ind_make_in_india", "Make in India",
       "Production-linked incentives are pulling manufacturing to India.",
       "factory", "economy", production_speed_industrial_complex_factor=0.1)
spirit("md_pak_establishment", "The Establishment",
       "The army has the final word in Pakistani politics.",
       "shield-star", "politics", stability_factor=0.03, democratic_drift=-0.02)
spirit("md_pak_imf_program", "IMF Programme",
       "A $7 billion IMF bailout comes with strict conditions.",
       "bank", "economy", consumer_goods_factor=0.03, political_power_factor=-0.05)
spirit("md_ban_july_revolution", "July Revolution",
       "The student uprising that toppled Sheikh Hasina has left an interim government in charge.",
       "bullhorn", "politics", stability_factor=-0.05, political_power_gain=0.1)
spirit("md_prc_worlds_factory", "The World's Factory",
       "A third of the world's manufacturing happens in China.",
       "factory", "economy", industrial_capacity_factory=0.15, production_speed_industrial_complex_factor=0.1, production_speed_arms_factory_factor=0.1)
spirit("md_prc_property_slump", "Property Slump",
       "The collapse of Evergrande and Country Garden weighs on growth.",
       "home-city", "crisis", consumer_goods_factor=0.03, stability_factor=-0.03)
spirit("md_prc_great_firewall", "The Great Firewall",
       "The internet stops at China's border.",
       "wall", "politics", stability_factor=0.05, drift_defence_factor=0.25)
spirit("md_prc_pla_modernization", "PLA Modernisation",
       "The PLA is to be a world-class military by 2049, with the 2027 goals coming first.",
       "rocket-launch", "military", production_speed_dockyard_factor=0.15, research_speed_factor=0.05)
spirit("md_roc_silicon_shield", "Silicon Shield",
       "TSMC makes 90% of the world's most advanced chips. Nobody can afford to see it destroyed.",
       "chip", "tech", research_speed_factor=0.1, enemy_justify_war_goal_time=0.25)
spirit("md_roc_porcupine", "Porcupine Strategy",
       "Mines, missiles and drones to make an invasion as painful as possible.",
       "shield", "military", army_core_defence_factor=0.15)
spirit("md_jap_ageing_society", "Ageing Society",
       "Japan's population is shrinking and greying.",
       "human-queue", "society", monthly_population=-0.1, conscription_factor=-0.1)
spirit("md_jap_defense_buildup", "Defence Build-Up",
       "Japan is doubling defence spending to 2% of GDP and buying counterstrike missiles.",
       "shield", "military", production_speed_arms_factory_factor=0.08, production_speed_dockyard_factor=0.08)
spirit("md_jap_article_9", "Article 9",
       "The pacifist constitution still limits what the Self-Defense Forces may do.",
       "book-open-variant", "politics", war_support_factor=-0.15, justify_war_goal_time=0.5)
spirit("md_kor_chaebol_economy", "Chaebol Economy",
       "Samsung, Hyundai, SK and LG drive a high-tech export economy.",
       "office-building", "economy", industrial_capacity_factory=0.08, research_speed_factor=0.05)
spirit("md_kor_k_defense", "K-Defence",
       "Korean tanks, howitzers and jets are selling across the world.",
       "tank", "military", production_speed_arms_factory_factor=0.1)
spirit("md_kor_low_birthrate", "The Lowest Birth Rate",
       "South Korea has the lowest fertility rate ever recorded.",
       "human-queue", "society", monthly_population=-0.15)
spirit("md_prk_songun", "Songun",
       "Military-first politics: the army comes before everything.",
       "shield-star", "military", conscription=0.05, consumer_goods_factor=0.05, army_org_factor=0.05)
spirit("md_prk_juche_autarky", "Juche",
       "Self-reliance, poverty and isolation.",
       "lock", "economy", trade_opinion_factor=-0.4, research_speed_factor=-0.1)
spirit("md_prk_nuclear_arsenal", "Nuclear Arsenal",
       "Dozens of warheads and missiles that may reach the United States.",
       "radioactive", "nuclear", enemy_justify_war_goal_time=0.5, nuclear_production_factor=0.25)
spirit("md_vie_bamboo_diplomacy", "Bamboo Diplomacy",
       "Firm roots, flexible branches: friends with Washington and Beijing alike.",
       "sprout", "diplomacy", trade_opinion_factor=0.15, drift_defence_factor=0.1)
spirit("md_vie_export_boom", "Export Boom",
       "Factories leaving China are landing in Vietnam.",
       "truck", "economy", production_speed_industrial_complex_factor=0.1)
spirit("md_brm_spring_revolution", "Spring Revolution",
       "Resistance forces and ethnic armies have pushed the junta back across the country.",
       "fire", "crisis", stability_factor=-0.2, army_morale_factor=-0.1)
spirit("md_sgp_entrepot", "Global Entrepôt",
       "One of the busiest ports on Earth.",
       "anchor", "economy", trade_opinion_factor=0.25, consumer_goods_factor=-0.06)
spirit("md_ins_nickel_downstreaming", "Nickel Downstreaming",
       "Banning raw ore exports has built a battery-metals industry at home.",
       "pickaxe", "economy", local_resources_factor=0.1, production_speed_industrial_complex_factor=0.05)
spirit("md_phi_south_china_sea_standoff", "South China Sea Standoff",
       "Chinese coast guard ships ram and water-cannon Filipino vessels at Second Thomas Shoal.",
       "anchor", "military", war_support_factor=0.05)
spirit("md_ast_aukus", "AUKUS",
       "Nuclear-powered submarines and advanced technology from the United States and Britain.",
       "submarine", "military", production_speed_dockyard_factor=0.1, research_speed_factor=0.03)
spirit("md_ast_mining_boom", "Mining Boom",
       "Iron ore, lithium and coal flow to Asia.",
       "pickaxe", "energy", local_resources_factor=0.15)


# ================================================================ traits
# Leader traits: id -> (name, modifiers). Advisor traits share the table.
T = {}


def trait(id_, name, **mods):
    assert id_ not in T, id_
    T[id_] = dict(name=name, mods=mods)


trait("md_lame_duck", "Lame Duck", political_power_factor=-0.15)
trait("md_elder_statesman", "Elder Statesman", stability_factor=0.05, opinion_gain_monthly_factor=0.1)
trait("md_dealmaker", "The Dealmaker", trade_opinion_factor=0.2, opinion_gain_monthly_factor=0.15)
trait("md_populist_firebrand", "Populist Firebrand", political_power_gain=0.15, stability_factor=-0.03, war_support_factor=0.05)
trait("md_america_first", "America First", production_speed_industrial_complex_factor=0.05, trade_opinion_factor=-0.1, war_support_factor=0.05)
trait("md_prosecutor", "Former Prosecutor", stability_factor=0.03)
trait("md_unpopular_incumbent", "Unpopular Incumbent", stability_factor=-0.05)
trait("md_charismatic", "Charismatic", political_power_gain=0.1, stability_factor=0.03)
trait("md_economist", "Economist", consumer_goods_factor=-0.03, production_speed_buildings_factor=0.05)
trait("md_crisis_manager", "Crisis Manager", stability_factor=0.05, political_power_factor=0.05)
trait("md_technocrat", "Technocrat", research_speed_factor=0.05)
trait("md_reformer", "Reformer", political_power_gain=0.1, stability_factor=-0.02)
trait("md_anti_corruption", "Anti-Corruption Crusader", political_power_factor=0.1, stability_factor=0.03)
trait("md_strongman", "Strongman", stability_factor=0.1, democratic_drift=-0.02, political_power_gain=0.1)
trait("md_crypto_president", "Bitcoin President", research_speed_factor=0.02, trade_opinion_factor=-0.05)
trait("md_contested_mandate", "Contested Mandate", stability_factor=-0.08, drift_defence_factor=-0.1)
trait("md_interim_leader", "Interim Leader", political_power_factor=-0.1, stability_factor=0.03)
trait("md_libertarian_shock", "Anarcho-Capitalist", consumer_goods_factor=-0.05, production_speed_buildings_factor=0.05)
trait("md_oil_boom_president", "Oil Boom President", local_resources_factor=0.05)
trait("md_cautious_reformer", "Cautious Reformer", stability_factor=0.04, political_power_factor=-0.05)
trait("md_lawyer", "Human Rights Lawyer", political_power_factor=0.03)
trait("md_young_leader", "Young Leader", political_power_gain=0.05, stability_factor=-0.02)
trait("md_jupiterian", "Jupiterian President", political_power_gain=0.1, stability_factor=-0.03)
trait("md_eu_federalist", "European Federalist", trade_opinion_factor=0.1, opinion_gain_monthly_factor=0.1)
trait("md_caretaker", "Caretaker", political_power_factor=-0.2)
trait("md_coalition_builder", "Coalition Builder", stability_factor=0.05, political_power_factor=-0.03)
trait("md_atlanticist", "Atlanticist", opinion_gain_monthly_factor=0.1, war_support_factor=0.03)
trait("md_survivor", "Political Survivor", stability_factor=0.04, drift_defence_factor=0.1)
trait("md_illiberal_democrat", "Illiberal Democrat", stability_factor=0.08, drift_defence_factor=0.15, opinion_gain_monthly_factor=-0.05)
trait("md_eurosceptic", "Eurosceptic", trade_opinion_factor=-0.05, political_power_gain=0.05)
trait("md_balancer", "Great Balancer", drift_defence_factor=0.1, trade_opinion_factor=0.1)
trait("md_war_president", "Wartime Leader", war_support_factor=0.1, army_morale_factor=0.05)
trait("md_kgb_veteran", "Intelligence Veteran", encryption_factor=0.2, decryption_factor=0.2)
trait("md_exile_leader", "Leader in Exile", political_power_factor=-0.1)
trait("md_petro_state", "Petro-Autocrat", local_resources_factor=0.05, stability_factor=0.03)
trait("md_dynast", "Dynastic Heir", stability_factor=0.05, political_power_factor=0.05)
trait("md_hollow_regime", "Hollow Regime", stability_factor=-0.1, army_morale_factor=-0.1)
trait("md_insurgent_commander", "Insurgent Commander", army_attack_factor=0.05, army_morale_factor=0.05)
trait("md_absolute_monarch", "Absolute Monarch", stability_factor=0.1, political_power_gain=0.1)
trait("md_mediator", "Regional Mediator", opinion_gain_monthly_factor=0.2)
trait("md_power_broker", "Power Broker", political_power_gain=0.1, trade_opinion_factor=0.05)
trait("md_vision_2030", "Visionary Crown Prince", production_speed_buildings_factor=0.05, stability_factor=0.03)
trait("md_supreme_leader", "Supreme Leader", stability_factor=0.1, democratic_drift=-0.03)
trait("md_recluse", "Recluse", opinion_gain_monthly_factor=-0.1, stability_factor=0.03)
trait("md_military_ruler", "Military Ruler", army_org_factor=0.03, stability_factor=0.03, democratic_drift=-0.02)
trait("md_military_backed", "Backed by the Army", stability_factor=0.05)
trait("md_military_reformer", "Military Reformer", army_org_factor=0.05)
trait("md_sovereigntist", "Sovereigntist", war_support_factor=0.08, trade_opinion_factor=-0.05)
trait("md_hustler", "The Hustler", political_power_gain=0.05)
trait("md_absent_ruler", "Absentee Ruler", political_power_factor=-0.15, stability_factor=0.03)
trait("md_hindu_nationalist", "Hindutva", war_support_factor=0.05, stability_factor=0.03)
trait("md_core_leader", "Core of the Party", stability_factor=0.1, political_power_gain=0.15)
trait("md_party_apparatchik", "Party Apparatchik", political_power_factor=0.05)
trait("md_defense_hawk", "Defence Hawk", production_speed_arms_factory_factor=0.05, war_support_factor=0.03)

# advisor traits
trait("md_adv_diplomat", "Seasoned Diplomat", opinion_gain_monthly_factor=0.2, trade_opinion_factor=0.1)
trait("md_adv_defense_chief", "Defence Chief", production_speed_arms_factory_factor=0.08, army_org_factor=0.03)
trait("md_adv_security_hawk", "Security Hawk", war_support_factor=0.08, enemy_justify_war_goal_time=0.15)
trait("md_adv_economist", "Economic Steward", consumer_goods_factor=-0.03, production_speed_industrial_complex_factor=0.08)
trait("md_adv_party_whip", "Political Fixer", political_power_gain=0.15)
trait("md_adv_negotiator", "Chief Negotiator", opinion_gain_monthly_factor=0.15, political_power_gain=0.05)
trait("md_adv_war_economist", "War Economist", production_speed_arms_factory_factor=0.1, industrial_capacity_factory=0.05)
trait("md_adv_general_staff", "Chief of the General Staff", army_org_factor=0.05, planning_speed=0.1)
trait("md_adv_green_transition", "Green Transition Minister", production_speed_buildings_factor=0.05, research_speed_factor=0.03)
trait("md_adv_hardliner", "Hardliner", war_support_factor=0.1, stability_factor=-0.03)
trait("md_adv_reformist", "Reformist President", stability_factor=0.05, trade_opinion_factor=0.1)
trait("md_adv_efficiency", "Efficiency Czar", political_power_factor=0.1, consumer_goods_factor=-0.03, stability_factor=-0.03)
trait("md_adv_border_czar", "Border Czar", stability_factor=0.05, monthly_population=-0.05)
trait("md_adv_treasury_hawk", "Treasury Hawk", consumer_goods_factor=-0.05, trade_opinion_factor=0.05)
trait("md_adv_intel_chief", "Intelligence Chief", encryption_factor=0.2, decryption_factor=0.2)
trait("md_adv_public_health", "Public Health Contrarian", stability_factor=-0.02, monthly_population=0.03)
trait("md_adv_chief_of_staff", "Chief of Staff", political_power_gain=0.1, stability_factor=0.02)
