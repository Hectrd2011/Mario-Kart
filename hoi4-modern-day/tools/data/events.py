"""Events. Dates are real-world; on_startup schedules them by day offset.

Event(id, kind, title, desc, pic, options, ...)
  kind:   "country" or "news"
  pic:    key into PICTURES
  options: list of (text, effect, ai_factor)
"""
from dataclasses import dataclass, field

START = (2024, 11, 6)

# picture key -> (glyph, theme, iso or None, wide)
PICTURES = {
    "inauguration": ("flag", "politics", "US", False),
    "election": ("vote", "politics", None, False),
    "ceasefire": ("hand-peace", "diplomacy", None, False),
    "war": ("sword-cross", "crisis", None, False),
    "missiles": ("rocket-launch", "crisis", None, False),
    "protest": ("bullhorn", "politics", None, False),
    "coup": ("shield-star", "crisis", None, False),
    "deal": ("handshake", "diplomacy", None, False),
    "money": ("cash-multiple", "economy", None, False),
    "nuclear": ("radioactive", "nuclear", None, False),
    "parliament": ("gavel", "politics", None, False),
    "map": ("map-marker", "diplomacy", None, False),
    "strike": ("bomb", "crisis", None, False),
    "ship": ("ferry", "economy", None, False),
    "chip": ("chip", "tech", None, False),
    "syria": ("fire", "crisis", "SY", False),
    "korea": ("shield-star", "crisis", "KR", False),
    "germany": ("traffic-light", "politics", "DE", False),
    "ukraine": ("shield", "military", "UA", False),
    "israel": ("rocket-launch", "military", "IL", False),
    "iran": ("atom", "nuclear", "IR", False),
    "news_world": ("earth", "diplomacy", None, True),
    "news_war": ("sword-cross", "crisis", None, True),
    "news_election": ("vote", "politics", None, True),
    "news_peace": ("hand-peace", "diplomacy", None, True),
    "news_economy": ("chart-line", "economy", None, True),
}


@dataclass
class Event:
    id: str
    kind: str
    title: str
    desc: str
    pic: str
    options: list
    trigger: str = ""
    immediate: str = ""
    date: tuple = None       # schedule on startup for `tag`
    tag: str = ""
    hidden: bool = False
    major: bool = False      # news events only: shown to everyone


EVENTS = []


def ev(*a, **k):
    e = Event(*a, **k)
    EVENTS.append(e)
    return e


def lead(tag, old, new, party=None):
    """Swap the country leader to a waiting character."""
    eff = f"if = {{ limit = {{ has_character = {tag}_{old} }} retire_character = {tag}_{old} }} recruit_character = {tag}_{new} promote_character = {tag}_{new}"
    if party:
        ide, long, short = party
        eff += f" set_party_name = {{ ideology = {ide} long_name = {tag}_{ide}_party_{new}_long name = {tag}_{ide}_party_{new} }}"
    return eff


def news(id_, title, desc, pic="news_world", text="Interesting times."):
    return ev(id_, "news", title, desc, pic, [(text, "", 1)], major=True)


# party renames used by lead(): (tag, ideology, character key) -> (long, short)
PARTY_RENAMES = {}


def party(tag, ide, key, long, short):
    PARTY_RENAMES[(tag, ide, key)] = (long, short)
    return (ide, long, short)


# =========================================================== United States
ev("md_usa.1", "country", "The Second Inauguration",
   "On a freezing day in Washington, moved indoors to the Capitol Rotunda, Donald J. Trump takes the oath of office "
   "as the 47th President of the United States, the first since Grover Cleveland to win non-consecutive terms. "
   "\"The golden age of America begins right now,\" he declares.",
   "inauguration",
   [("Make America Great Again!",
     lead("USA", "joe_biden", "donald_trump", party("USA", "democratic", "donald_trump", "Republican Party", "Republicans")) +
     " set_country_flag = md_usa_trump_era"
     " if = { limit = { has_idea = md_usa_transition } remove_ideas = md_usa_transition }"
     " md_usa_swap_cabinet = yes"
     " news_event = { id = md_news.1 days = 0 }", 1)],
   date=(2025, 1, 20), tag="USA")
news("md_news.1", "Trump Sworn In as 47th President",
     "Donald Trump has been inaugurated for a second term as President of the United States. Within hours he signed "
     "orders declaring a national emergency at the southern border, withdrawing from the Paris Agreement and pardoning "
     "the January 6th defendants. Allies and adversaries alike are bracing for four turbulent years.", "news_election",
     "A new era in Washington.")

ev("md_usa.30", "country", "American Demands on the Canal",
   "Washington accuses Panama of letting China run the canal and threatens to \"take it back\". The President insists "
   "American warships must pass free of charge.",
   "ship",
   [("Leave the Belt and Road and give the US priority.",
     "add_opinion_modifier = { target = USA modifier = md_opinion_rapprochement } USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_rapprochement } } give_military_access = USA", 70),
    ("The canal is Panamanian, and it will stay that way.",
     "add_stability = 0.05 USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_pressure } }", 30)])
ev("md_usa.31", "country", "An Offer for Greenland",
   "The United States has made a formal offer to purchase Greenland. Nuuk and Copenhagen are united in outrage, but "
   "the President says that American ownership of Greenland is \"an absolute necessity\".",
   "map",
   [("Greenland is not for sale.",
     "add_stability = 0.03 USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_threatened } country_event = { id = md_usa.33 days = 1 } }", 100),
    ("Accept the American offer.",
     "md_cede_greenland = yes USA = { country_event = { id = md_usa.34 days = 1 } } add_political_power = 200 add_stability = -0.1", 0)])
ev("md_usa.32", "country", "The Fifty-First State",
   "The American President has again suggested that Canada should become the fifty-first state, mocking the Prime "
   "Minister as \"Governor\". This time the offer is formal.",
   "map",
   [("Elbows up. Never.", "add_stability = 0.05 add_war_support = 0.05 USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_threatened } }", 100),
    ("Join the Union.", "USA = { annex_country = { target = ROOT transfer_troops = yes } }", 0)])
ev("md_usa.33", "country", "Denmark Refuses",
   "Copenhagen has rejected our offer for Greenland, and European capitals have closed ranks behind Denmark.",
   "map", [("Their loss.", "add_political_power = -25", 1)])
ev("md_usa.34", "country", "Greenland Is Ours",
   "Denmark has agreed to sell Greenland. The largest land purchase since Alaska.",
   "map", [("A great real estate deal!", "add_stability = 0.05 add_war_support = 0.05", 1)])

# =========================================================== China / Taiwan
ev("md_prc.10", "country", "Beijing's Offer",
   "Beijing proposes \"peaceful reunification\" under one country, two systems, with guarantees for Taiwan's "
   "economy and way of life. After Hong Kong, few in Taipei believe the guarantees.",
   "deal",
   [("Taiwan's future is for Taiwanese to decide.", "add_stability = 0.05 add_war_support = 0.05 PRC = { add_opinion_modifier = { target = ROOT modifier = md_opinion_pressure } }", 98),
    ("Accept reunification.", "PRC = { annex_country = { target = ROOT transfer_troops = yes } }", 2)])

# =========================================================== Russia-Ukraine war
CEASEFIRE = "md_ukraine_ceasefire = yes"
ev("md_war.10", "country", "An American Peace Plan",
   "The American envoys have arrived with a plan: a ceasefire along the current line of contact, sanctions relief, and "
   "no NATO membership for Ukraine. The Kremlin must decide.",
   "ceasefire",
   [("Accept a ceasefire on the current lines.", "UKR = { country_event = { id = md_war.13 days = 1 } }", 40),
    ("Reject it. The operation continues.", "add_war_support = 0.03 USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_pressure } }", 60)])
ev("md_war.11", "country", "Moscow Offers a Ceasefire",
   "The Kremlin proposes a ceasefire along the current front line. Russian troops would keep the territory they hold.",
   "ceasefire",
   [("Accept. Ukraine must survive.", CEASEFIRE, 30),
    ("Refuse. We will not reward aggression.", "add_war_support = 0.05", 70)])
ev("md_war.12", "country", "Kyiv Proposes Talks",
   "Ukraine's delegation in Istanbul proposes an unconditional thirty-day ceasefire.",
   "ceasefire",
   [("Agree to a ceasefire.", CEASEFIRE, 30),
    ("Demand Ukraine withdraw from the annexed regions first.", "add_war_support = 0.02", 70)])
ev("md_war.13", "country", "Moscow Accepts the American Plan",
   "Russia has accepted Washington's plan for a ceasefire on the current front line. Now it is up to Kyiv.",
   "ceasefire",
   [("Sign the ceasefire.", CEASEFIRE, 50),
    ("Refuse to give up our land.", "add_war_support = 0.05 USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_pressure } }", 50)])
news("md_news.10", "Guns Fall Silent in Ukraine",
     "After almost three years of full-scale war, a ceasefire has come into force along the front line in Ukraine. "
     "Russia keeps the territory it holds; Kyiv insists it will never recognise the occupation. Few expect the peace "
     "to be permanent.", "news_peace", "Will it hold?")

# =========================================================== Middle East
ev("md_isr.1", "country", "Ceasefire with Hezbollah",
   "American and French mediators have brokered a sixty-day ceasefire on the Lebanese border. Hezbollah would withdraw "
   "north of the Litani and the Lebanese army would deploy in the south.",
   "ceasefire",
   [("Accept the ceasefire.", "add_stability = 0.03 LEB = { country_event = md_isr.2 }", 90),
    ("Keep pushing north.", "add_war_support = 0.03 add_stability = -0.03", 10)],
   date=(2024, 11, 27), tag="ISR")
ev("md_isr.2", "country", "The Guns Fall Silent in the South",
   "Israel has accepted the ceasefire. For the first time in over a year, there is quiet on the southern border.",
   "ceasefire",
   [("Deploy the army to the south.", "add_stability = 0.05 if = { limit = { has_idea = md_leb_hezbollah_state_within } remove_ideas = md_leb_hezbollah_state_within add_ideas = md_leb_weakened_hezbollah }", 1)])
ev("md_isr.10", "country", "Pressure for a Gaza Deal",
   "Washington wants the war in Gaza ended and the hostages home. The coalition's far-right partners threaten to "
   "walk out if a deal is signed.",
   "deal",
   [("Sign the hostage deal.", "md_gaza_ceasefire = yes", 70),
    ("Refuse. The war goes on.", "add_war_support = 0.05 USA = { add_opinion_modifier = { target = ROOT modifier = md_opinion_pressure } }", 30)])
ev("md_isr.11", "country", "The Gaza Ceasefire",
   "A three-phase ceasefire takes effect in Gaza. The first hostages are released in exchange for Palestinian prisoners.",
   "ceasefire",
   [("Bring them home.", "md_gaza_ceasefire = yes", 80),
    ("Delay the deal.", "add_war_support = 0.03", 20)],
   trigger="NOT = { has_global_flag = md_gaza_ceasefire }", date=(2025, 1, 19), tag="ISR")
ev("md_isr.20", "country", "Normalisation with Israel?",
   "Washington is pressing for Saudi-Israeli normalisation. Riyadh's price: a credible path to a Palestinian state.",
   "deal",
   [("Normalise relations.", "add_opinion_modifier = { target = ISR modifier = md_opinion_rapprochement } ISR = { add_opinion_modifier = { target = ROOT modifier = md_opinion_rapprochement } add_stability = 0.05 } add_stability = -0.03", 30),
    ("Not without a Palestinian state.", "add_stability = 0.02", 70)])
ev("md_isr.30", "country", "Operation Rising Lion",
   "Intelligence says Iran is weeks from breakout. The air force is ready to strike the nuclear sites and the "
   "commanders of the Revolutionary Guard.",
   "israel",
   [("Strike now.", "if = { limit = { country_exists = PER } PER = { add_timed_idea = { idea = md_per_nuclear_setback days = 540 } country_event = { id = md_per.1 days = 0 } } } add_named_threat = { threat = 4 name = md_threat_iran_strikes } news_event = { id = md_news.30 days = 1 }", 90),
    ("Hold off.", "add_war_support = -0.02", 10)],
   trigger="NOT = { has_completed_focus = ISR_rising_lion }", date=(2025, 6, 13), tag="ISR")
ev("md_per.1", "country", "Israel Strikes Iran",
   "Explosions at Natanz, Fordow and Isfahan. Senior IRGC commanders and nuclear scientists are dead.",
   "iran",
   [("True Promise III: fire the missiles.", "add_war_support = 0.05 add_stability = -0.03 add_named_threat = { threat = 2 name = md_threat_true_promise }", 90),
    ("Absorb the blow.", "add_stability = -0.06", 10)])
news("md_news.30", "The Twelve-Day War",
     "Israel has launched waves of airstrikes against Iran's nuclear programme. Iran answered with hundreds of ballistic "
     "missiles. The United States joined in with bunker-busters on Fordow before a ceasefire took hold.", "news_war",
     "The Middle East will never be the same.")

# =========================================================== Syria
ev("md_syr.1", "country", "Operation Deterrence of Aggression",
   "With Hezbollah gutted and Russia stretched thin, HTS and allied factions are ready to break out of Idlib and drive "
   "on Aleppo.",
   "syria",
   [("Launch the offensive.", "md_syria_offensive = yes", 95),
    ("Wait.", "add_political_power = 25", 5)],
   date=(2024, 11, 27), tag="HTS")
ev("md_syr.2", "country", "Damascus Falls",
   "Aleppo, Hama and Homs have fallen in days. The army has melted away. Bashar al-Assad has boarded a plane to Moscow.",
   "syria",
   [("The regime is finished.", "md_assad_falls = yes", 95),
    ("Fight to the last.", "add_war_support = 0.1 add_stability = -0.1", 5)],
   trigger="has_war_with = HTS", date=(2024, 12, 8), tag="SYR")
news("md_news.20", "Fall of the Assad Regime",
     "Fifty-four years of Assad family rule have ended. Rebel forces led by Hay'at Tahrir al-Sham have entered Damascus "
     "and Bashar al-Assad has fled to Moscow. Crowds topple statues of Hafez al-Assad as prisoners stream out of "
     "Sednaya.", "news_war", "A new Syria.")

# =========================================================== Korea
ev("md_kor.1", "country", "Emergency Martial Law",
   "Late at night President Yoon appears on television and declares emergency martial law, accusing the opposition of "
   "\"anti-state activities\". Troops are on their way to the National Assembly.",
   "korea",
   [("Declare martial law.", "add_stability = -0.15 country_event = { id = md_kor.2 hours = 6 }", 95),
    ("Step back from the brink.", "set_country_flag = md_kor_martial_law_over add_political_power = -50", 5)],
   date=(2024, 12, 3), tag="KOR")
ev("md_kor.2", "country", "The Assembly Votes",
   "Lawmakers climb the fences of the National Assembly. All 190 present vote to lift martial law. Six hours after "
   "declaring it, Yoon backs down.",
   "parliament",
   [("Martial law is over.", "add_stability = 0.05 country_event = { id = md_kor.3 days = 11 }", 1)])
ev("md_kor.3", "country", "President Yoon Impeached",
   "The National Assembly has impeached the President. Prime Minister Han Duck-soo becomes acting president.",
   "parliament",
   [("The constitution works.", lead("KOR", "yoon_suk_yeol", "han_duck_soo") + " country_event = { id = md_kor.4 days = 111 }", 1)])
ev("md_kor.4", "country", "Yoon Removed from Office",
   "The Constitutional Court unanimously upholds the impeachment. A snap presidential election will be held in June.",
   "parliament",
   [("To the polls.", "country_event = { id = md_kor.5 days = 60 }", 1)])
ev("md_kor.5", "country", "Lee Jae-myung Wins the Presidency",
   "The Democratic Party's Lee Jae-myung has won the snap election and is sworn in the next morning.",
   "election",
   [("Congratulations, President Lee.", lead("KOR", "han_duck_soo", "lee_jae_myung", party("KOR", "democratic", "lee_jae_myung", "Democratic Party of Korea", "DPK")) +
     " set_country_flag = md_kor_martial_law_over add_stability = 0.08", 1)])

# =========================================================== Germany
ev("md_ger.1", "country", "The Traffic Light Goes Out",
   "Hours after the American result, Chancellor Scholz fires his finance minister Christian Lindner. The FDP quits "
   "the government and the traffic-light coalition is over. Scholz will face a confidence vote.",
   "germany",
   [("Call a snap election.", "add_stability = -0.05 add_political_power = -25 set_country_flag = md_ger_snap_election country_event = { id = md_ger.2 days = 109 }", 1)],
   date=(2024, 11, 7), tag="GER")
ev("md_ger.2", "country", "The Federal Election",
   "Germans have voted. The CDU/CSU comes first, the AfD doubles its vote to come second, and the SPD suffers its "
   "worst result since 1887.",
   "election",
   [("Merz will form a government.", "set_country_flag = md_ger_election_held add_popularity = { ideology = fascism popularity = 0.03 } country_event = { id = md_ger.3 days = 72 }", 1)])
ev("md_ger.3", "country", "Chancellor Merz",
   "After a historic failed first round, Friedrich Merz is elected Chancellor at the head of a CDU/CSU-SPD coalition.",
   "parliament",
   [("A new government for Germany.", lead("GER", "olaf_scholz", "friedrich_merz", party("GER", "democratic", "friedrich_merz", "Christlich Demokratische Union", "CDU/CSU")) + " add_stability = 0.05", 1)])

# =========================================================== France
ev("md_fra.1", "country", "Barnier Government Falls",
   "The left and the Rassemblement National have voted together to censure Michel Barnier's government over the "
   "budget. It is the shortest-lived government of the Fifth Republic.",
   "parliament",
   [("Appoint François Bayrou.", "add_stability = -0.05 add_political_power = -50", 1)],
   date=(2024, 12, 4), tag="FRA")

# =========================================================== Canada
ev("md_can.1", "country", "Trudeau Steps Down",
   "Facing a caucus revolt and collapsing polls, Justin Trudeau announces he will resign once the Liberals pick a new "
   "leader.",
   "parliament",
   [("The race begins.", "add_political_power = -25 country_event = { id = md_can.2 days = 67 }", 1)],
   date=(2025, 1, 6), tag="CAN")
ev("md_can.2", "country", "Prime Minister Carney",
   "Former central banker Mark Carney wins the Liberal leadership by a landslide and is sworn in as Prime Minister.",
   "election",
   [("Elbows up.", lead("CAN", "justin_trudeau", "mark_carney") + " add_stability = 0.06", 1)])

# =========================================================== Romania, Georgia, Haiti
ev("md_rom.1", "country", "The Election Is Annulled",
   "The Constitutional Court has annulled the presidential election after declassified intelligence revealed a "
   "Russian-backed TikTok campaign behind the surprise first-round winner, Călin Georgescu.",
   "parliament",
   [("Rerun the election.", "add_stability = -0.08 add_popularity = { ideology = fascism popularity = 0.04 } country_event = { id = md_rom.2 days = 163 }", 1)],
   date=(2024, 12, 6), tag="ROM")
ev("md_rom.2", "country", "Nicușor Dan Elected",
   "Bucharest's mayor Nicușor Dan wins the rerun against the nationalist George Simion.",
   "election",
   [("Romania stays in the West.", lead("ROM", "klaus_iohannis", "nicusor_dan", party("ROM", "democratic", "nicusor_dan", "Independent", "Ind.")) + " add_stability = 0.06", 1)])
ev("md_geo.1", "country", "EU Talks Suspended",
   "The government has suspended EU accession talks until 2028. Tens of thousands march on parliament every night.",
   "protest",
   [("Hold firm.", "add_stability = -0.08 add_popularity = { ideology = neutrality popularity = 0.05 }", 80),
    ("Reopen the talks.", "add_stability = 0.04 add_political_power = -75", 20)],
   date=(2024, 11, 28), tag="GEO")
ev("md_hai.1", "country", "Conille Dismissed",
   "The Transitional Presidential Council has fired Prime Minister Garry Conille and appointed businessman Alix Didier "
   "Fils-Aimé.",
   "parliament",
   [("A new prime minister.", lead("HAI", "garry_conille", "alix_didier_fils_aime"), 1)],
   date=(2024, 11, 11), tag="HAI")

# =========================================================== India-Pakistan
ev("md_ind.1", "country", "Operation Sindoor",
   "Two weeks after the Pahalgam massacre, Indian missiles strike targets across Pakistan and Pakistani-administered "
   "Kashmir. Pakistan answers with drones and artillery along the Line of Control.",
   "missiles",
   [("A measured response.", "add_war_support = 0.05 army_experience = 10 PAK = { add_war_support = 0.05 } add_named_threat = { threat = 2 name = md_threat_sindoor }", 1)],
   trigger="NOT = { has_completed_focus = IND_operation_sindoor } country_exists = PAK NOT = { has_war_with = PAK }",
   date=(2025, 5, 7), tag="IND")

# =========================================================== routine changes of government
TRANSITIONS = [
    # tag, date, old key, new key, title, desc, party rename or None
    ("MRT", (2024, 11, 13), "pravind_jugnauth", "navin_ramgoolam", "Landslide in Mauritius",
     "The Alliance du Changement has won all sixty mainland seats. Navin Ramgoolam returns as Prime Minister.",
     ("democratic", "Alliance du Changement", "AdC")),
    ("LIT", (2024, 12, 12), "ingrida_simonyte", "gintautas_paluckas", "A Social Democrat Government",
     "After the October election, Gintautas Paluckas becomes Prime Minister at the head of a Social Democrat-led coalition.",
     ("democratic", "Lietuvos socialdemokratų partija", "LSDP")),
    ("SML", (2024, 12, 12), "muse_bihi_abdi", "abdirahman_irro", "A Peaceful Handover in Hargeisa",
     "The opposition's Abdirahman Irro has won the presidential election and is sworn in.", ("democratic", "Waddani", "Waddani")),
    ("ICE", (2024, 12, 21), "bjarni_benediktsson", "kristrun_frostadottir", "A New Government in Reykjavík",
     "Kristrún Frostadóttir of the Social Democratic Alliance becomes Iceland's youngest prime minister.",
     ("democratic", "Samfylkingin", "S")),
    ("GHA", (2025, 1, 7), "nana_akufo_addo", "john_mahama", "Mahama Returns",
     "John Mahama of the NDC is sworn in after a landslide election victory.", ("democratic", "National Democratic Congress", "NDC")),
    ("LEB", (2025, 1, 9), "najib_mikati", "joseph_aoun", "Lebanon Elects a President",
     "After over two years of vacancy, parliament elects army commander Joseph Aoun as President.", None),
    ("MZB", (2025, 1, 15), "filipe_nyusi", "daniel_chapo", "President Chapo",
     "Daniel Chapo is sworn in amid deadly post-election protests.", None),
    ("BUL", (2025, 1, 16), "dimitar_glavchev", "rosen_zhelyazkov", "Bulgaria Finally Has a Government",
     "After seven elections in four years, Rosen Zhelyazkov of GERB forms a government.", ("democratic", "GERB–SDS", "GERB")),
    ("IRE", (2025, 1, 23), "simon_harris", "micheal_martin", "Taoiseach Martin",
     "Micheál Martin returns as Taoiseach in a Fianna Fáil-Fine Gael coalition.", ("democratic", "Fianna Fáil", "FF")),
    ("BEL", (2025, 2, 3), "alexander_de_croo", "bart_de_wever", "The Arizona Coalition",
     "Bart De Wever of the N-VA becomes Belgium's first Flemish nationalist prime minister.", ("democratic", "Nieuw-Vlaamse Alliantie", "N-VA")),
    ("URG", (2025, 3, 1), "luis_lacalle_pou", "yamandu_orsi", "The Left Returns in Uruguay",
     "Yamandú Orsi of the Frente Amplio is sworn in as President.", ("democratic", "Frente Amplio", "FA")),
    ("AUS", (2025, 3, 3), "karl_nehammer", "christian_stocker", "Chancellor Stocker",
     "After talks between the FPÖ and ÖVP collapse, Christian Stocker forms a three-party coalition.", None),
    ("NMB", (2025, 3, 21), "nangolo_mbumba", "netumbo_nandi_ndaitwah", "Namibia's First Woman President",
     "Netumbo Nandi-Ndaitwah is sworn in as President of Namibia.", None),
    ("JAP", (2025, 10, 21), "shigeru_ishiba", "sanae_takaichi", "Japan's First Woman Prime Minister",
     "Sanae Takaichi becomes Prime Minister after Ishiba resigns over the LDP's election losses.", None),
]

for i, (tag, date, old, new, title, desc, pr) in enumerate(TRANSITIONS, start=1):
    prt = party(tag, pr[0], new, pr[1], pr[2]) if pr else None
    ev(f"md_leaders.{i}", "country", title, desc, "election",
       [("A new government.", lead(tag, old, new, prt), 1)], date=date, tag=tag)
