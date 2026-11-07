"""Decision categories, decisions, scripted effects and extra spirits."""

EXTRA_IDEAS = {
    "md_leb_weakened_hezbollah": dict(name="Weakened Hezbollah", desc="Hezbollah's leadership is dead and its arsenal depleted. The Lebanese army moves south.",
                                      glyph="account-group", theme="politics", mods=dict(stability_factor=-0.03)),
    "md_ceasefire_line": dict(name="Armistice Line", desc="A tense ceasefire holds along the old front.",
                              glyph="hand-peace", theme="diplomacy", mods=dict(war_support_factor=-0.05, stability_factor=0.05)),
    "md_gaza_truce": dict(name="Gaza Truce", desc="A fragile ceasefire holds in Gaza and the hostages are coming home.",
                          glyph="hand-peace", theme="diplomacy", mods=dict(stability_factor=0.06, war_support_factor=-0.03)),
    "md_syr_regime_collapse": dict(name="Regime Collapse", desc="Whole divisions are deserting.",
                                   glyph="fire", theme="crisis", mods=dict(army_org_factor=-0.4, army_defence_factor=-0.3, army_morale_factor=-0.3)),
    "md_hts_lightning_offensive": dict(name="Lightning Offensive", desc="Drones, pickups and momentum.",
                                       glyph="sword-cross", theme="military", mods=dict(army_attack_factor=0.3, army_speed_factor=0.2)),
    "md_syr_transition": dict(name="Transitional Syria", desc="A new government in Damascus, sanctions lifting, a country to rebuild.",
                              glyph="flag", theme="politics", mods=dict(stability_factor=-0.05, political_power_gain=0.1)),
    # decision results
    "md_dec_stimulus": dict(name="Stimulus Package", desc="Public spending to kick-start growth.", glyph="cash-multiple", theme="economy",
                            mods=dict(production_speed_buildings_factor=0.15, consumer_goods_factor=0.02)),
    "md_dec_austerity": dict(name="Austerity Budget", desc="Spending cuts to balance the books.", glyph="content-cut", theme="economy",
                             mods=dict(consumer_goods_factor=-0.04, stability_factor=-0.05)),
    "md_dec_defense_spending": dict(name="Defence Spending Surge", desc="Emergency defence budgets.", glyph="factory", theme="military",
                                    mods=dict(production_speed_arms_factory_factor=0.1, consumer_goods_factor=0.03)),
    "md_dec_offensive": dict(name="Major Offensive", desc="Every reserve thrown into the attack.", glyph="sword-cross", theme="military",
                             mods=dict(army_attack_factor=0.1, army_org_factor=-0.05)),
    "md_dec_grid_strikes": dict(name="Grid Under Attack", desc="Missile and drone strikes on power stations.", glyph="flash-alert", theme="crisis",
                                mods=dict(production_factory_max_efficiency_factor=-0.08, stability_factor=-0.03)),
    "md_dec_patriots": dict(name="Patriot Batteries", desc="More Patriot systems protect our cities.", glyph="shield", theme="military",
                            mods=dict(industry_repair_factor=0.25)),
}

SCRIPTED_EFFECTS = r"""
md_ukraine_ceasefire = {
	if = {
		limit = { country_exists = UKR country_exists = RUS }
		UKR = {
			every_owned_state = {
				limit = { is_controlled_by = RUS }
				RUS = { transfer_state = PREV }
			}
		}
		RUS = { white_peace = UKR }
		RUS = { add_timed_idea = { idea = md_ceasefire_line days = 730 } }
		UKR = { add_timed_idea = { idea = md_ceasefire_line days = 730 } }
	}
	set_global_flag = md_ukraine_ceasefire
	news_event = { id = md_news.10 days = 1 }
}

md_gaza_ceasefire = {
	if = {
		limit = { NOT = { has_global_flag = md_gaza_ceasefire } }
		set_global_flag = md_gaza_ceasefire
		if = {
			limit = { country_exists = ISR }
			ISR = {
				if = { limit = { has_idea = md_isr_hostage_crisis } remove_ideas = md_isr_hostage_crisis }
				add_timed_idea = { idea = md_gaza_truce days = 365 }
			}
		}
	}
}

md_syria_offensive = {
	if = {
		limit = { country_exists = HTS country_exists = SYR }
		HTS = {
			add_timed_idea = { idea = md_hts_lightning_offensive days = 30 }
			declare_war_on = { target = SYR type = annex_everything }
		}
		SYR = { add_timed_idea = { idea = md_syr_regime_collapse days = 60 } }
	}
}

md_assad_falls = {
	set_global_flag = md_assad_fallen
	if = {
		limit = { country_exists = HTS }
		HTS = {
			annex_country = { target = SYR transfer_troops = no }
			set_cosmetic_tag = HTS_TRANSITIONAL
			add_ideas = md_syr_transition
		}
	}
	news_event = { id = md_news.20 days = 1 }
}

md_usa_swap_cabinet = {
	if = { limit = { has_character = USA_antony_blinken } retire_character = USA_antony_blinken }
	if = { limit = { has_character = USA_lloyd_austin } retire_character = USA_lloyd_austin }
	if = { limit = { has_character = USA_jake_sullivan } retire_character = USA_jake_sullivan }
	if = { limit = { has_character = USA_janet_yellen } retire_character = USA_janet_yellen }
	recruit_character = USA_marco_rubio
	recruit_character = USA_pete_hegseth
	recruit_character = USA_elon_musk
	recruit_character = USA_scott_bessent
	recruit_character = USA_tom_homan
	recruit_character = USA_susie_wiles
}
"""

# Trump's cabinet (recruited at the inauguration)
from .model import Advisor, Look as K
USA_INCOMING = [
    Advisor("Marco Rubio", "Secretary of State", ["md_adv_diplomat"], K("m", "black", "short", skin=2, tie="red")),
    Advisor("Pete Hegseth", "Secretary of Defense", ["md_adv_security_hawk"], K("m", "brown", "slick", skin=1, tie="red")),
    Advisor("Elon Musk", "DOGE", ["md_adv_efficiency"], K("m", "brown", "short", attire="open", skin=1)),
    Advisor("Scott Bessent", "Secretary of the Treasury", ["md_adv_treasury_hawk"], K("m", "gray", "side", skin=1, tie="blue")),
    Advisor("Tom Homan", "Border Czar", ["md_adv_border_czar"], K("m", "white", "buzz", skin=1, tie="blue")),
    Advisor("Susie Wiles", "White House Chief of Staff", ["md_adv_chief_of_staff"], K("f", "white", "bob", skin=1)),
]

CATEGORIES = {
    "md_cat_economy": ("National Economy", "Budgets, investment and growth.", "money", ""),
    "md_cat_defense": ("Defence Procurement", "Arms purchases, reserves and exercises.", "war", ""),
    "md_cat_diplomacy": ("International Relations", "Alliances, blocs and aid.", "deal", ""),
    "md_cat_ukraine_war": ("The Russo-Ukrainian War", "The largest war in Europe since 1945.", "ukraine",
                           "OR = { tag = RUS tag = UKR } country_exists = UKR country_exists = RUS"),
    "md_cat_middle_east": ("Middle East Crisis", "Gaza, Lebanon, Yemen and Iran.", "israel",
                           "OR = { tag = ISR tag = PER tag = YEM }"),
    "md_cat_strategic_arsenal": ("Strategic Arsenal", "Nuclear forces and missile tests.", "nuclear",
                                 "OR = { tag = USA tag = RUS tag = PRC tag = ENG tag = FRA tag = IND tag = PAK tag = PRK tag = ISR }"),
}

# decision: id -> dict(cat, name, desc, glyph, theme, cost, visible, available, effect, days_re_enable, ai, fire_only_once)
D = {}


def dec(id_, cat, name, desc, glyph, theme, cost, effect, visible="", available="", cooldown=0, ai=1, once=False, days_remove=0, remove_effect=""):
    D[id_] = dict(cat=cat, name=name, desc=desc, glyph=glyph, theme=theme, cost=cost, effect=effect, visible=visible,
                  available=available, cooldown=cooldown, ai=ai, once=once, days_remove=days_remove, remove_effect=remove_effect)


DEMOCRACY_AT_PEACE = "has_government = democratic"

dec("md_stimulus_package", "md_cat_economy", "Stimulus Package", "Borrow and spend to boost construction.", "cash-multiple", "economy",
    75, "add_timed_idea = { idea = md_dec_stimulus days = 180 }", available="NOT = { has_idea = md_dec_austerity }", cooldown=365, ai=2)
dec("md_austerity_budget", "md_cat_economy", "Austerity Budget", "Cut spending to restore market confidence.", "content-cut", "economy",
    25, "add_timed_idea = { idea = md_dec_austerity days = 180 } add_political_power = 75", available="NOT = { has_idea = md_dec_stimulus }", cooldown=365, ai=0)
dec("md_infrastructure_push", "md_cat_economy", "National Infrastructure Push", "Roads, rail and power lines.", "road-variant", "economy",
    100, "random_owned_controlled_state = { limit = { free_building_slots = { building = infrastructure size > 0 } } add_building_construction = { type = infrastructure level = 1 instant_build = yes } } "
    "random_owned_controlled_state = { limit = { free_building_slots = { building = infrastructure size > 0 } } add_building_construction = { type = infrastructure level = 1 instant_build = yes } }",
    cooldown=180, ai=1)
dec("md_foreign_investment", "md_cat_economy", "Courting Foreign Investors", "Tax holidays for a new factory.", "office-building", "economy",
    120, "random_owned_controlled_state = { limit = { is_core_of = ROOT } add_extra_state_shared_building_slots = 1 add_building_construction = { type = industrial_complex level = 1 instant_build = yes } }",
    available="has_stability > 0.4", cooldown=240, ai=2)
dec("md_arms_factory_program", "md_cat_defense", "Expand the Arms Industry", "Build a new munitions plant.", "factory", "military",
    120, "random_owned_controlled_state = { limit = { is_core_of = ROOT } add_extra_state_shared_building_slots = 1 add_building_construction = { type = arms_factory level = 1 instant_build = yes } }",
    cooldown=240, ai=2)
dec("md_call_up_reserves", "md_cat_defense", "Call Up the Reserves", "Mobilise reservists for the war.", "account-multiple-plus", "military",
    50, "add_manpower = 50000 add_stability = -0.03", available="has_war = yes", cooldown=120, ai=3)
dec("md_emergency_arms_purchase", "md_cat_defense", "Emergency Arms Purchase", "Buy weapons on the world market.", "package-variant-closed", "military",
    75, "add_equipment_to_stockpile = { type = infantry_equipment amount = 4000 } add_equipment_to_stockpile = { type = artillery_equipment amount = 300 } add_equipment_to_stockpile = { type = support_equipment amount = 300 }",
    cooldown=120, ai=2)
dec("md_military_exercises", "md_cat_defense", "Large-Scale Exercises", "Train the army in realistic conditions.", "target", "military",
    25, "army_experience = 10 add_war_support = 0.01", cooldown=90, ai=1)
dec("md_defense_spending", "md_cat_defense", "Defence Spending Surge", "Raise the defence budget for a year.", "chart-line", "military",
    100, "add_timed_idea = { idea = md_dec_defense_spending days = 365 }", cooldown=365, ai=2)
dec("md_request_nato_membership", "md_cat_diplomacy", "Apply to Join NATO", "Ask for the protection of Article Five.", "shield-star", "diplomacy",
    150, "USA = { country_event = { id = md_dip.1 days = 1 } }",
    visible="has_government = democratic NOT = { is_in_faction = yes } NOT = { tag = USA } country_exists = USA USA = { is_faction_leader = yes }",
    available="has_war = no USA = { has_opinion = { target = ROOT value > 40 } } has_stability > 0.5", cooldown=365, ai=1)
dec("md_brics_partnership", "md_cat_diplomacy", "Seek BRICS Partnership", "Join the BRICS as a partner country.", "earth", "diplomacy",
    75, "add_ideas = md_gen_brics_partner if = { limit = { country_exists = PRC } add_opinion_modifier = { target = PRC modifier = md_opinion_brics_alignment } PRC = { add_opinion_modifier = { target = ROOT modifier = md_opinion_brics_alignment } } }",
    visible="NOT = { is_in_faction_with = USA } NOT = { has_idea = md_gen_brics_partner } NOT = { has_idea = md_gen_western_partner } NOT = { tag = PRC } NOT = { tag = RUS }",
    once=True, ai=1)
dec("md_send_aid_ukraine", "md_cat_diplomacy", "Send Weapons to Ukraine", "Ship rifles and shells from our stockpiles.", "package-variant-closed", "diplomacy",
    50, "send_equipment = { equipment = infantry_equipment amount = 2000 target = UKR } UKR = { add_opinion_modifier = { target = ROOT modifier = md_opinion_aid } }",
    visible="has_government = democratic country_exists = UKR UKR = { has_war_with = RUS } NOT = { tag = UKR }",
    available="has_equipment = { infantry_equipment > 2999 }", cooldown=120, ai=1)
dec("md_rus_summer_offensive", "md_cat_ukraine_war", "Launch a Summer Offensive", "Throw fresh divisions at the front.", "sword-cross", "military",
    100, "add_timed_idea = { idea = md_dec_offensive days = 60 }", visible="tag = RUS", available="has_war_with = UKR", cooldown=180, ai=3)
dec("md_rus_strike_grid", "md_cat_ukraine_war", "Strike the Energy Grid", "Missile and drone waves against Ukrainian power plants.", "flash-alert", "crisis",
    75, "UKR = { add_timed_idea = { idea = md_dec_grid_strikes days = 90 } }", visible="tag = RUS", available="has_war_with = UKR", cooldown=150, ai=3)
dec("md_rus_offer_ceasefire", "md_cat_ukraine_war", "Offer a Ceasefire", "Propose freezing the front where it stands.", "hand-peace", "diplomacy",
    100, "UKR = { country_event = { id = md_war.11 days = 1 } }", visible="tag = RUS", available="has_war_with = UKR", cooldown=180, ai=0)
dec("md_ukr_deep_strikes", "md_cat_ukraine_war", "Deep Strike Campaign", "Drones against Russian refineries.", "fire", "military",
    75, "RUS = { add_timed_idea = { idea = md_ukr_fuel_shortage days = 120 } }", visible="tag = UKR", available="has_war_with = RUS", cooldown=150, ai=3)
dec("md_ukr_request_patriots", "md_cat_ukraine_war", "Request Patriot Batteries", "Ask the allies for more air defence.", "shield", "military",
    75, "add_timed_idea = { idea = md_dec_patriots days = 365 }", visible="tag = UKR", available="has_war_with = RUS", cooldown=365, ai=2)
dec("md_ukr_offer_talks", "md_cat_ukraine_war", "Propose Talks", "Offer an unconditional ceasefire.", "hand-peace", "diplomacy",
    50, "RUS = { country_event = { id = md_war.12 days = 1 } }", visible="tag = UKR", available="has_war_with = RUS", cooldown=180, ai=0)
dec("md_isr_hostage_deal", "md_cat_middle_east", "Accept the Hostage Deal", "Trade a ceasefire for the hostages.", "hand-peace", "diplomacy",
    50, "md_gaza_ceasefire = yes", visible="tag = ISR NOT = { has_global_flag = md_gaza_ceasefire }", once=True, ai=1)
dec("md_isr_targeted_strike", "md_cat_middle_east", "Targeted Strike", "Kill a senior commander of the Axis of Resistance.", "crosshairs-gps", "military",
    50, "add_war_support = 0.02 army_experience = 5 add_named_threat = { threat = 1 name = md_threat_targeted_killing }", visible="tag = ISR", cooldown=120, ai=1)
dec("md_per_missile_salvo", "md_cat_middle_east", "Missile Salvo", "Fire ballistic missiles at Israel.", "rocket-launch", "crisis",
    100, "add_war_support = 0.03 add_named_threat = { threat = 2 name = md_threat_true_promise } ISR = { add_war_support = 0.03 }",
    visible="tag = PER", cooldown=240, ai=0)
dec("md_yem_red_sea_attacks", "md_cat_middle_east", "Attack Red Sea Shipping", "Drones and missiles against merchant ships.", "ferry", "crisis",
    50, "add_war_support = 0.03 add_named_threat = { threat = 1 name = md_threat_red_sea } EGY = { add_political_power = -25 }",
    visible="tag = YEM", cooldown=90, ai=1)
dec("md_nuclear_test", "md_cat_strategic_arsenal", "Missile Test", "Remind the world what we can do.", "rocket", "nuclear",
    50, "add_war_support = 0.02 add_named_threat = { threat = 1 name = md_threat_missile_test }", cooldown=180, ai=1)
dec("md_build_warheads", "md_cat_strategic_arsenal", "Expand the Arsenal", "Assemble additional warheads.", "radioactive", "nuclear",
    150, "add_nuclear_bombs = 1 add_named_threat = { threat = 1 name = md_threat_arsenal }", cooldown=365, ai=1)

DIP_EVENTS = [
    ("md_dip.1", "A Request to Join NATO", "[From.GetName] has formally applied to join the North Atlantic Treaty Organization.",
     [("Welcome them into the alliance.", "add_to_faction = FROM FROM = { country_event = md_dip.2 }", 70),
      ("The alliance is not ready.", "FROM = { country_event = md_dip.3 }", 30)]),
    ("md_dip.2", "Welcome to NATO", "Our application has been accepted. We are now covered by Article Five.",
     [("A historic day.", "add_stability = 0.05", 1)]),
    ("md_dip.3", "NATO Says Not Yet", "The allies have turned down our application, for now.",
     [("Disappointing.", "add_political_power = -50", 1)]),
]
