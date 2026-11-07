"""The generic modern tree, plus helpers to graft its branches into
smaller national trees (under tag-specific ids)."""
from ..focus_dsl import Tree, pp, stab, ws, idea, timed, swap, remove, civ, mil, dock, infra, slots, research, xp, tech, \
    manpower, equip, event, flag, gflag, tt, opinion, pop, threat, cp, J

SHARED_IDEAS = {}


def _idea(id_, name, desc, glyph, theme, **mods):
    SHARED_IDEAS[id_] = dict(name=name, desc=desc, glyph=glyph, theme=theme, mods=mods)
    return id_


_idea("md_gen_anti_corruption", "Anti-Corruption Drive", "Graft is being rooted out of the ministries.",
      "scale-balance", "politics", political_power_factor=0.1)
_idea("md_gen_professional_army", "Professional Army", "Long-service professionals instead of short-term conscripts.",
      "shield-star", "military", army_org_factor=0.05, army_morale_factor=0.05)
_idea("md_gen_air_defense", "Integrated Air Defence", "A layered network of radars and interceptors.",
      "radar", "military", industry_repair_factor=0.2, army_core_defence_factor=0.05)
_idea("md_gen_drone_program", "National Drone Programme", "Cheap drones by the thousand.",
      "quadcopter", "tech", army_attack_factor=0.04, production_speed_arms_factory_factor=0.04)
_idea("md_gen_digital_economy", "Digital Economy", "Mobile money, e-government and a start-up scene.",
      "cellphone-wireless", "tech", research_speed_factor=0.05, consumer_goods_factor=-0.02)
_idea("md_gen_green_transition", "Green Transition", "Solar, wind and grid upgrades.",
      "solar-power", "energy", production_factory_max_efficiency_factor=0.05, stability_factor=0.02)
_idea("md_gen_resource_extraction", "Resource Boom", "Open the mines and the oil fields to investors.",
      "pickaxe", "energy", local_resources_factor=0.2, stability_factor=-0.02)
_idea("md_gen_western_partner", "Western Partner", "Close ties with the United States and the European Union.",
      "handshake", "diplomacy", trade_opinion_factor=0.15, research_speed_factor=0.03)
_idea("md_gen_brics_partner", "BRICS Partner", "A seat at the table of the Global South.",
      "earth", "diplomacy", trade_opinion_factor=0.15, production_speed_industrial_complex_factor=0.05)
_idea("md_gen_non_aligned", "Non-Aligned", "Friends with everyone, allied to no one.",
      "compass", "diplomacy", drift_defence_factor=0.2, stability_factor=0.03)
_idea("md_gen_strong_institutions", "Strong Institutions", "Independent courts and a professional civil service.",
      "pillar", "politics", stability_factor=0.05, political_power_factor=0.05)
_idea("md_gen_consolidated_power", "Consolidated Power", "Opposition muzzled, power concentrated.",
      "domain", "politics", political_power_gain=0.15, democratic_drift=-0.02, stability_factor=0.02)
_idea("md_gen_education_reform", "Education Reform", "Schools and universities for a modern economy.",
      "school", "society", research_speed_factor=0.04)
_idea("md_gen_healthcare", "Universal Healthcare", "Clinics and hospitals within reach of every citizen.",
      "hospital-building", "society", monthly_population=0.05, stability_factor=0.03)

OPINION = {
    "md_opinion_western_alignment": ("Western Alignment", 30),
    "md_opinion_brics_alignment": ("BRICS Alignment", 30),
    "md_opinion_trade_deal": ("Trade Deal", 25),
    "md_opinion_aid": ("Military Aid", 30),
    "md_opinion_pressure": ("Diplomatic Pressure", -30),
    "md_opinion_tariffs": ("Tariffs", -25),
    "md_opinion_rapprochement": ("Rapprochement", 25),
    "md_opinion_threatened": ("Territorial Threats", -50),
    "md_opinion_alliance": ("Strategic Partnership", 50),
}


def on(tag, eff):
    return f"if = {{ limit = {{ country_exists = {tag} }} {tag} = {{ {eff} }} }}"


def economy(T, p, x0):
    f = T.f
    f(f"{p}_development_plan", "National Development Plan", "A five-year plan to modernise the economy.",
      x0 + 2, 0, "chart-line", "economy", reward=J(pp(50)))
    f(f"{p}_infrastructure", "Infrastructure Investment", "Roads, railways, ports and power lines.",
      x0 + 1, 1, "road-variant", "economy", pre=[f"{p}_development_plan"], reward=J(infra(3)))
    f(f"{p}_industrial_parks", "Industrial Parks", "Special economic zones with tax breaks for manufacturers.",
      x0 + 3, 1, "factory", "economy", pre=[f"{p}_development_plan"], reward=J(civ(2)))
    f(f"{p}_fdi", "Attract Foreign Investment", "Courting multinationals with cheap land and stable rules.",
      x0 + 1, 2, "cash-multiple", "economy", pre=[f"{p}_infrastructure"], reward=J(civ(1), slots(1)))
    f(f"{p}_arms_industry", "A Domestic Arms Industry", "Build at home what we used to buy abroad.",
      x0 + 3, 2, "factory", "military", pre=[f"{p}_industrial_parks"], reward=J(mil(2)))
    f(f"{p}_digital_economy", "The Digital Economy", "Fibre, 5G and mobile money.",
      x0 + 2, 3, "cellphone-wireless", "tech", pre=[f"{p}_fdi", f"{p}_arms_industry"], reward=J(idea("md_gen_digital_economy")))
    f(f"{p}_green_transition", "Green Transition", "Bet the future on renewables.",
      x0 + 1, 4, "solar-power", "energy", pre=[f"{p}_digital_economy"], mutex=[f"{p}_resource_boom"], reward=J(idea("md_gen_green_transition")))
    f(f"{p}_resource_boom", "Resource Boom", "Dig, drill and export.",
      x0 + 3, 4, "pickaxe", "energy", pre=[f"{p}_digital_economy"], mutex=[f"{p}_green_transition"], reward=J(idea("md_gen_resource_extraction")))
    f(f"{p}_economic_miracle", "An Economic Miracle", "A decade of growth has transformed the nation.",
      x0 + 2, 5, "star-four-points", "economy", pre=[[f"{p}_green_transition", f"{p}_resource_boom"]], reward=J(civ(2), stab(0.03)))


def military(T, p, x0):
    f = T.f
    f(f"{p}_military_modernization", "Military Modernisation", "Our armed forces need to fight the wars of this century.",
      x0 + 2, 0, "shield-star", "military", reward=J(xp("army", 15)))
    f(f"{p}_professional_army", "A Professional Army", "Long-service professionals and NCOs.",
      x0 + 1, 1, "account-group", "military", pre=[f"{p}_military_modernization"], reward=J(idea("md_gen_professional_army")))
    f(f"{p}_air_defense", "Integrated Air Defence", "Radars and missiles to close the skies.",
      x0 + 3, 1, "radar", "military", pre=[f"{p}_military_modernization"], reward=J(idea("md_gen_air_defense"), equip("anti_air_equipment", 300)))
    f(f"{p}_modern_equipment", "Procure Modern Equipment", "Rifles, night-vision and radios for every soldier.",
      x0 + 1, 2, "package-variant-closed", "military", pre=[f"{p}_professional_army"],
      reward=J(equip("infantry_equipment", 3000), equip("support_equipment", 300), equip("artillery_equipment", 200)))
    f(f"{p}_drone_program", "A National Drone Programme", "Lessons from Ukraine: drones win battles.",
      x0 + 3, 2, "quadcopter", "tech", pre=[f"{p}_air_defense"], reward=J(idea("md_gen_drone_program")))
    f(f"{p}_special_forces", "Special Forces", "Elite units for counter-terrorism and raids.",
      x0 + 1, 3, "parachute", "military", pre=[f"{p}_modern_equipment"], reward=J(xp("army", 25), manpower(5000)))
    f(f"{p}_navy", "Coast Guard and Navy", "Patrol boats, corvettes and a modern naval base.",
      x0 + 3, 3, "ship-wheel", "military", pre=[f"{p}_drone_program"], reward=J(dock(1), xp("navy", 15)))
    f(f"{p}_defense_doctrine", "A National Defence Doctrine", "Know who we will fight, and how.",
      x0 + 2, 4, "book-open-variant", "military", pre=[f"{p}_special_forces", f"{p}_navy"], reward=J(xp("army", 25), cp(25)))


def diplomacy(T, p, x0):
    f = T.f
    f(f"{p}_foreign_policy_review", "Foreign Policy Review", "The world is splitting into blocs. Where do we stand?",
      x0 + 2, 0, "earth", "diplomacy", reward=J(pp(25)))
    f(f"{p}_western_partnership", "Look West", "Washington and Brussels offer investment, arms and markets.",
      x0, 1, "handshake", "diplomacy", pre=[f"{p}_foreign_policy_review"], mutex=[f"{p}_join_brics", f"{p}_non_aligned"],
      reward=J(idea("md_gen_western_partner"), opinion("USA", "md_opinion_western_alignment")))
    f(f"{p}_join_brics", "Join the BRICS", "A bloc that answers to no one in the West.",
      x0 + 2, 1, "earth-arrow-right", "diplomacy", pre=[f"{p}_foreign_policy_review"], mutex=[f"{p}_western_partnership", f"{p}_non_aligned"],
      reward=J(idea("md_gen_brics_partner"), opinion("PRC", "md_opinion_brics_alignment"), opinion("RUS", "md_opinion_brics_alignment")))
    f(f"{p}_non_aligned", "Non-Alignment", "Take everyone's money, follow no one's orders.",
      x0 + 4, 1, "compass", "diplomacy", pre=[f"{p}_foreign_policy_review"], mutex=[f"{p}_western_partnership", f"{p}_join_brics"],
      reward=J(idea("md_gen_non_aligned")))
    f(f"{p}_security_partnership", "Security Partnership", "Joint exercises, arms deals and intelligence sharing.",
      x0, 2, "shield", "military", pre=[f"{p}_western_partnership"],
      reward=J(equip("infantry_equipment", 2000), equip("anti_tank_equipment", 200), opinion("USA", "md_opinion_aid")))
    f(f"{p}_new_development_bank", "The New Development Bank", "Cheap loans without lectures.",
      x0 + 2, 2, "bank", "economy", pre=[f"{p}_join_brics"], reward=J(civ(2)))
    f(f"{p}_nam_summit", "Host the Non-Aligned Summit", "A voice for the Global South.",
      x0 + 4, 2, "account-group", "diplomacy", pre=[f"{p}_non_aligned"], reward=J(stab(0.03), pp(50)))
    f(f"{p}_regional_power", "A Regional Power", "Our neighbours now look to us for leadership.",
      x0 + 2, 3, "flag-variant", "diplomacy", pre=[[f"{p}_security_partnership", f"{p}_new_development_bank", f"{p}_nam_summit"]],
      reward=J(pp(75), ws(0.03)))


def politics(T, p, x0):
    f = T.f
    f(f"{p}_state_reform", "State Reform", "A state fit for the twenty-first century.",
      x0 + 2, 0, "domain", "politics", reward=J(pp(50)))
    f(f"{p}_anti_corruption", "Anti-Corruption Drive", "Arrest the worst offenders, whoever they are.",
      x0 + 2, 1, "scale-balance", "politics", pre=[f"{p}_state_reform"], reward=J(idea("md_gen_anti_corruption")))
    f(f"{p}_strong_institutions", "Strengthen Institutions", "Courts, parliament and a free press.",
      x0 + 1, 2, "pillar", "politics", pre=[f"{p}_anti_corruption"], mutex=[f"{p}_consolidate_power"],
      reward=J(idea("md_gen_strong_institutions"), pop("democratic", 0.05)))
    f(f"{p}_consolidate_power", "Consolidate Power", "Stability first; freedoms can wait.",
      x0 + 3, 2, "domain", "politics", pre=[f"{p}_anti_corruption"], mutex=[f"{p}_strong_institutions"],
      reward=J(idea("md_gen_consolidated_power"), pop("neutrality", 0.05)))
    f(f"{p}_education_reform", "Education Reform", "Teach the skills the economy needs.",
      x0 + 1, 3, "school", "society", pre=[[f"{p}_strong_institutions", f"{p}_consolidate_power"]], reward=J(idea("md_gen_education_reform")))
    f(f"{p}_healthcare", "Universal Healthcare", "A clinic in every district.",
      x0 + 3, 3, "hospital-building", "society", pre=[[f"{p}_strong_institutions", f"{p}_consolidate_power"]], reward=J(idea("md_gen_healthcare")))
    f(f"{p}_national_unity", "National Unity", "One people, one future.",
      x0 + 2, 4, "account-group", "politics", pre=[f"{p}_education_reform", f"{p}_healthcare"], reward=J(stab(0.05), research()))


GEN = Tree("md_generic_focus", "", default=True)
economy(GEN, "MDG", 0)
military(GEN, "MDG", 6)
diplomacy(GEN, "MDG", 12)
politics(GEN, "MDG", 18)
