"""Data model for the Modern Day 2024 mod.

Everything the generators write comes from these records, so a fact
(a leader, a party, a colour) lives in exactly one place.
"""
from dataclasses import dataclass, field
import re
import unicodedata

IDEOLOGIES = ("democratic", "communism", "fascism", "neutrality")

SUB_IDEOLOGY_GROUP = {
    "conservatism": "democratic", "liberalism": "democratic", "socialism": "democratic",
    "marxism": "communism", "leninism": "communism", "stalinism": "communism",
    "anti_revisionism": "communism", "anarchist_communism": "communism",
    "nazism": "fascism", "fascism_ideology": "fascism", "falangism": "fascism", "rexism": "fascism",
    "despotism": "neutrality", "oligarchism": "neutrality", "anarchism": "neutrality",
    "moderatism": "neutrality", "centrism": "neutrality",
}


def ascii_id(text):
    """'Volodymyr Zelensky' -> 'volodymyr_zelensky' (safe for script ids)."""
    norm = unicodedata.normalize("NFKD", text)
    norm = norm.encode("ascii", "ignore").decode("ascii").lower()
    norm = re.sub(r"[^a-z0-9]+", "_", norm).strip("_")
    return norm


@dataclass
class Look:
    """Stylised portrait recipe. Nothing here tries to be a likeness:
    it only varies hair, attire and colouring so leaders read apart."""
    g: str = "m"             # m / f
    hair: str = "brown"      # black brown gray white blond red auburn dyedblond none
    style: str = "short"     # short side slick swept bald balding receding buzz curly long bob bun pony covered
    beard: str = ""          # "" stubble mustache goatee short full
    glasses: bool = False
    attire: str = "suit"     # suit open military thobe cleric mao kurta fatigues
    skin: int = 2            # 1 (lightest) .. 6 (darkest)
    tie: str = ""            # tie colour name, "" = none
    jacket: str = ""         # jacket colour override


@dataclass
class Leader:
    name: str
    sub: str                 # vanilla sub-ideology
    traits: list
    look: Look
    title: str = ""          # shown in the description
    desc: str = ""
    key: str = ""            # character id suffix (defaults to ascii name)

    @property
    def group(self):
        return SUB_IDEOLOGY_GROUP[self.sub]


@dataclass
class Advisor:
    name: str
    role: str                # shown name of the post
    traits: list
    look: Look
    cost: int = 150
    slot: str = "political_advisor"
    key: str = ""


@dataclass
class Country:
    tag: str
    iso: str                 # ISO-3166 alpha-2, used for the flag
    name: str
    long: str                # "the Republic of X" form used mid-sentence
    adj: str
    color: tuple
    culture: str             # western eastern middle_eastern african asian south_american commonwealth
    ruling: str
    pop: dict
    parties: dict            # ideology -> (long, short)
    leaders: list            # first is in office on 6 Nov 2024
    election: tuple = None   # (last_election, frequency_months, allowed)
    stab: int = 50
    ws: int = 30
    major: bool = False
    spirits: list = field(default_factory=list)
    advisors: list = field(default_factory=list)
    others: list = field(default_factory=list)   # leaders waiting in the wings (not in office)
    tier: int = 2            # 1 superpower .. 4 failed/small, drives techs and stockpiles
    research_slots: int = 3
    faction: str = ""
    region: str = ""

    @property
    def leader(self):
        return self.leaders[0]
