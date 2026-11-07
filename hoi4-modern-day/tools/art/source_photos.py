#!/usr/bin/env python3
"""Find freely licensed photos of every leader and advisor.

Wikidata gives each person's main image (P18); Wikimedia Commons gives its
licence and a resized copy. Only public-domain and Creative Commons
(CC0 / BY / BY-SA) images, or open government licences, are kept; their
authors and licences are written to tools/data/photo_credits.json.

The script is polite: one batched request at a time, honouring
Retry-After, so it is slow on purpose. Downloads are cached in
tools/vendor/photos/ (not committed).
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
sys.path.insert(0, TOOLS)
from data.countries import COUNTRIES          # noqa: E402
from data.decisions import USA_INCOMING        # noqa: E402
from data.model import ascii_id               # noqa: E402

CACHE = os.path.join(TOOLS, "vendor", "photos")
CREDITS = os.path.join(TOOLS, "data", "photo_credits.json")
UA = "ModernDay2024-HOI4-mod-builder/1.0 (leader portraits; https://github.com/Hectrd2011/Mario-Kart)"

# English Wikipedia titles where they differ from the name we display
TITLES = {
    "Volodymyr Zelensky": "Volodymyr Zelenskyy", "Luiz Inácio Lula da Silva": "Luiz Inácio Lula da Silva",
    "Ferdinand Marcos Jr.": "Bongbong Marcos", "Mohammed VI": "Mohammed VI of Morocco", "Abdullah II": "Abdullah II of Jordan",
    "Mohamed bin Zayed": "Mohamed bin Zayed Al Nahyan", "Mishal al-Ahmad al-Jaber": "Mishal Al-Ahmad Al-Jaber Al-Sabah",
    "Haitham bin Tariq": "Haitham bin Tariq", "Hassanal Bolkiah": "Hassanal Bolkiah", "Mswati III": "Mswati III",
    "Tô Lâm": "Tô Lâm", "K. P. Sharma Oli": "KP Sharma Oli", "Xanana Gusmão": "Xanana Gusmão",
    "Abdel Fattah el-Sisi": "Abdel Fattah el-Sisi", "Bashar al-Assad": "Bashar al-Assad",
    "Ahmed al-Sharaa": "Ahmed al-Sharaa", "Ali Khamenei": "Ali Khamenei", "Kim Jong Un": "Kim Jong Un",
    "JD Vance": "JD Vance", "Robert Fico": "Robert Fico", "Nicușor Dan": "Nicușor Dan",
    "Recep Tayyip Erdoğan": "Recep Tayyip Erdoğan", "Alexander Lukashenko": "Alexander Lukashenko",
    "Mohammed bin Salman": "Mohammed bin Salman", "Tamim bin Hamad Al Thani": "Tamim bin Hamad Al Thani",
    "Hamad bin Isa Al Khalifa": "Hamad bin Isa Al Khalifa", "Abdul-Malik al-Houthi": "Abdul-Malik al-Houthi",
    "Mohamed Hamdan Dagalo": "Mohamed Hamdan Dagalo", "Mohammed Shia al-Sudani": "Mohammed Shia al-Sudani",
    "Teodoro Obiang Nguema Mbasogo": "Teodoro Obiang Nguema Mbasogo", "Andrey Belousov": "Andrey Belousov",
    "Sergey Lavrov": "Sergey Lavrov", "Gideon Sa'ar": "Gideon Sa'ar", "Benjamin Netanyahu": "Benjamin Netanyahu",
    "Joseph Aoun": "Joseph Aoun", "Najib Mikati": "Najib Mikati", "Garry Conille": "Garry Conille",
    "Alix Didier Fils-Aimé": "Alix Didier Fils-Aimé", "Brice Oligui Nguema": "Brice Oligui Nguema",
    "Mahamat Déby": "Mahamat Déby", "Assimi Goïta": "Assimi Goïta", "Ibrahim Traoré": "Ibrahim Traoré",
    "Évariste Ndayishimiye": "Évariste Ndayishimiye", "Félix Tshisekedi": "Félix Tshisekedi",
    "Faustin-Archange Touadéra": "Faustin-Archange Touadéra", "Umaro Sissoco Embaló": "Umaro Sissoco Embaló",
    "Ismaïl Omar Guelleh": "Ismaïl Omar Guelleh", "Muse Bihi Abdi": "Muse Bihi Abdi", "Abdirahman Irro": "Abdirahman Mohamed Abdullahi",
    "Nangolo Mbumba": "Nangolo Mbumba", "Duma Boko": "Duma Boko", "Sam Matekane": "Sam Matekane",
    "Bernardo Arévalo": "Bernardo Arévalo", "Johnny Briceño": "Johnny Briceño", "Philip Davis": "Philip Davis (Bahamian politician)",
    "Keith Rowley": "Keith Rowley", "Andrew Holness": "Andrew Holness", "Luis Abinader": "Luis Abinader",
    "Rodrigo Chaves": "Rodrigo Chaves Robles", "José Raúl Mulino": "José Raúl Mulino", "Daniel Noboa": "Daniel Noboa",
    "Dina Boluarte": "Dina Boluarte", "Luis Arce": "Luis Arce", "Santiago Peña": "Santiago Peña",
    "Luis Lacalle Pou": "Luis Lacalle Pou", "Irfaan Ali": "Irfaan Ali", "Chan Santokhi": "Chan Santokhi",
    "Simon Harris": "Simon Harris", "Micheál Martin": "Micheál Martin", "Alexander De Croo": "Alexander De Croo",
    "Dick Schoof": "Dick Schoof", "Luc Frieden": "Luc Frieden", "Viola Amherd": "Viola Amherd",
    "Karl Nehammer": "Karl Nehammer", "Christian Stocker": "Christian Stocker", "Luís Montenegro": "Luís Montenegro",
    "Robert Abela": "Robert Abela", "Bjarni Benediktsson": "Bjarni Benediktsson (born 1970)",
    "Kristrún Frostadóttir": "Kristrún Frostadóttir", "Borjana Krišto": "Borjana Krišto", "Milojko Spajić": "Milojko Spajić",
    "Hristijan Mickoski": "Hristijan Mickoski", "Nikos Christodoulides": "Nikos Christodoulides",
    "Klaus Iohannis": "Klaus Iohannis", "Dimitar Glavchev": "Dimitar Glavchev", "Rosen Zhelyazkov": "Rosen Zhelyazkov",
    "Kristen Michal": "Kristen Michal", "Evika Siliņa": "Evika Siliņa", "Ingrida Šimonytė": "Ingrida Šimonytė",
    "Gintautas Paluckas": "Gintautas Paluckas", "Irakli Kobakhidze": "Irakli Kobakhidze",
    "Sviatlana Tsikhanouskaya": "Sviatlana Tsikhanouskaya", "Kassym-Jomart Tokayev": "Kassym-Jomart Tokayev",
    "Shavkat Mirziyoyev": "Shavkat Mirziyoyev", "Serdar Berdimuhamedow": "Serdar Berdimuhamedov",
    "Sadyr Japarov": "Sadyr Japarov", "Emomali Rahmon": "Emomali Rahmon", "Mahmoud Abbas": "Mahmoud Abbas",
    "Mazloum Abdi": "Mazloum Abdi", "Rashad al-Alimi": "Rashad al-Alimi", "Abdul Hamid Dbeibeh": "Abdul Hamid Dbeibeh",
    "Khalifa Haftar": "Khalifa Haftar", "Kais Saied": "Kais Saied", "Abdelmadjid Tebboune": "Abdelmadjid Tebboune",
    "Hibatullah Akhundzada": "Hibatullah Akhundzada", "Abiy Ahmed": "Abiy Ahmed", "Isaias Afwerki": "Isaias Afwerki",
    "Hassan Sheikh Mohamud": "Hassan Sheikh Mohamud", "William Ruto": "William Ruto", "Yoweri Museveni": "Yoweri Museveni",
    "Samia Suluhu Hassan": "Samia Suluhu Hassan", "Paul Kagame": "Paul Kagame", "Denis Sassou Nguesso": "Denis Sassou Nguesso",
    "Paul Biya": "Paul Biya", "Abdel Fattah al-Burhan": "Abdel Fattah al-Burhan", "Salva Kiir": "Salva Kiir Mayardit",
    "Bola Tinubu": "Bola Tinubu", "Abdourahamane Tchiani": "Abdourahamane Tchiani", "Bassirou Diomaye Faye": "Bassirou Diomaye Faye",
    "Adama Barrow": "Adama Barrow", "Mamady Doumbouya": "Mamady Doumbouya", "Julius Maada Bio": "Julius Maada Bio",
    "Joseph Boakai": "Joseph Boakai", "Alassane Ouattara": "Alassane Ouattara", "Nana Akufo-Addo": "Nana Akufo-Addo",
    "John Mahama": "John Mahama", "Faure Gnassingbé": "Faure Gnassingbé", "Patrice Talon": "Patrice Talon",
    "Mohamed Ould Ghazouani": "Mohamed Ould Ghazouani", "João Lourenço": "João Lourenço",
    "Hakainde Hichilema": "Hakainde Hichilema", "Emmerson Mnangagwa": "Emmerson Mnangagwa", "Filipe Nyusi": "Filipe Nyusi",
    "Daniel Chapo": "Daniel Chapo", "Lazarus Chakwera": "Lazarus Chakwera", "Netumbo Nandi-Ndaitwah": "Netumbo Nandi-Ndaitwah",
    "Cyril Ramaphosa": "Cyril Ramaphosa", "Andry Rajoelina": "Andry Rajoelina", "Pravind Jugnauth": "Pravind Jugnauth",
    "Navin Ramgoolam": "Navin Ramgoolam", "Narendra Modi": "Narendra Modi", "Shehbaz Sharif": "Shehbaz Sharif",
    "Muhammad Yunus": "Muhammad Yunus", "Anura Kumara Dissanayake": "Anura Kumara Dissanayake", "Tshering Tobgay": "Tshering Tobgay",
    "Xi Jinping": "Xi Jinping", "Lai Ching-te": "Lai Ching-te", "Shigeru Ishiba": "Shigeru Ishiba", "Sanae Takaichi": "Sanae Takaichi",
    "Yoon Suk Yeol": "Yoon Suk Yeol", "Lee Jae-myung": "Lee Jae-myung", "Han Duck-soo": "Han Duck-soo",
    "Luvsannamsrain Oyun-Erdene": "Luvsannamsrain Oyun-Erdene", "Thongloun Sisoulith": "Thongloun Sisoulith",
    "Hun Manet": "Hun Manet", "Paetongtarn Shinawatra": "Paetongtarn Shinawatra", "Min Aung Hlaing": "Min Aung Hlaing",
    "Anwar Ibrahim": "Anwar Ibrahim", "Lawrence Wong": "Lawrence Wong", "Prabowo Subianto": "Prabowo Subianto",
    "Anthony Albanese": "Anthony Albanese", "Peter Dutton": "Peter Dutton", "Christopher Luxon": "Christopher Luxon",
    "James Marape": "James Marape", "Sitiveni Rabuka": "Sitiveni Rabuka", "Jeremiah Manele": "Jeremiah Manele",
    "Pete Hegseth": "Pete Hegseth", "Tom Homan": "Tom Homan", "Susie Wiles": "Susie Wiles", "Scott Bessent": "Scott Bessent",
    "Andriy Yermak": "Andriy Yermak", "Andrii Sybiha": "Andrii Sybiha", "Rustem Umerov": "Rustem Umerov",
    "Oleksandr Syrskyi": "Oleksandr Syrskyi", "Herzi Halevi": "Herzi Halevi", "Hossein Salami": "Hossein Salami",
    "Abbas Araghchi": "Abbas Araghchi", "Masoud Pezeshkian": "Masoud Pezeshkian", "Li Qiang": "Li Qiang", "Wang Yi": "Wang Yi (politician)",
    "Dong Jun": "Dong Jun", "Cai Qi": "Cai Qi", "Jörg Kukies": "Jörg Kukies", "Jean-Noël Barrot": "Jean-Noël Barrot",
    "Sébastien Lecornu": "Sébastien Lecornu", "Michel Barnier": "Michel Barnier", "Rachel Reeves": "Rachel Reeves",
    "David Lammy": "David Lammy", "John Healey": "John Healey", "Angela Rayner": "Angela Rayner",
    "Mark Carney": "Mark Carney", "Pierre Poilievre": "Pierre Poilievre", "Justin Trudeau": "Justin Trudeau",
    "Jordan Bardella": "Jordan Bardella", "Jean-Luc Mélenchon": "Jean-Luc Mélenchon", "Herbert Kickl": "Herbert Kickl",
    "Călin Georgescu": "Călin Georgescu", "María Corina Machado": "María Corina Machado", "Naftali Bennett": "Naftali Bennett",
    "Yair Lapid": "Yair Lapid", "Israel Katz": "Israel Katz", "Bezalel Smotrich": "Bezalel Smotrich",
}

OK_LICENSE = re.compile(r"(public domain|^pd|cc0|cc[ -]by|attribution|ogl|open government|godl|kremlin)", re.I)


def get_json(url, tries=8):
    for _ in range(tries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except HTTPError as e:
            if e.code in (429, 503):
                wait = int(e.headers.get("Retry-After", "60") or 60)
                print(f"  rate limited, waiting {wait}s", flush=True)
                time.sleep(wait + 2)
                continue
            raise
    raise SystemExit("gave up after repeated rate limits")


def people():
    out = []
    for c in COUNTRIES:
        seen = set()
        for p in c.leaders + c.others:
            cid = f"{c.tag}_{p.key or ascii_id(p.name)}"
            if cid not in seen:
                seen.add(cid)
                out.append((cid, p.name))
        for a in list(c.advisors) + (USA_INCOMING if c.tag == "USA" else []):
            out.append((f"{c.tag}_{ascii_id(a.name)}", a.name))
    return out


def main():
    os.makedirs(CACHE, exist_ok=True)
    credits = json.load(open(CREDITS)) if os.path.exists(CREDITS) else {}
    todo = [(cid, n) for cid, n in people() if cid not in credits]
    names = sorted({n for _, n in todo})
    title_of = {n: TITLES.get(n, n) for n in names}
    # 1. Wikidata: person -> image filename
    image_of = {}
    titles = sorted(set(title_of.values()))
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        url = ("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&sites=enwiki&props=claims|sitelinks"
               "&sitefilter=enwiki&maxlag=5&titles=" + urllib.parse.quote("|".join(batch)))
        print(f"wikidata {i // 50 + 1}/{(len(titles) + 49) // 50}", flush=True)
        d = get_json(url)
        for e in d.get("entities", {}).values():
            t = e.get("sitelinks", {}).get("enwiki", {}).get("title")
            imgs = [c["mainsnak"]["datavalue"]["value"] for c in e.get("claims", {}).get("P18", []) if "datavalue" in c["mainsnak"]]
            if t and imgs:
                image_of[t] = imgs[0]
        time.sleep(3)
    # 2. Commons: licence + resized URL
    files = sorted(set(image_of.values()))
    info = {}
    for i in range(0, len(files), 40):
        batch = files[i:i + 40]
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata"
               "&iiurlwidth=640&maxlag=5&titles=" + urllib.parse.quote("|".join("File:" + f for f in batch)))
        print(f"commons {i // 40 + 1}/{(len(files) + 39) // 40}", flush=True)
        d = get_json(url)
        norm = {n["to"]: n["from"] for n in d.get("query", {}).get("normalized", [])}
        for p in d.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            meta = ii.get("extmetadata", {})
            title = norm.get(p.get("title"), p.get("title", ""))
            fname = title.split(":", 1)[-1]
            lic = meta.get("LicenseShortName", {}).get("value", "")
            artist = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()
            info[fname] = dict(license=lic, artist=artist[:200], thumb=ii.get("thumburl"), page=ii.get("descriptionurl"))
        time.sleep(3)
    # 3. download the allowed ones
    got = skipped = 0
    for cid, name in todo:
        f = image_of.get(title_of[name])
        meta = info.get(f) if f else None
        if not meta or not meta.get("thumb"):
            continue
        if not OK_LICENSE.search(meta["license"] or ""):
            skipped += 1
            print(f"  skip {name}: licence '{meta['license']}'")
            continue
        path = os.path.join(CACHE, cid + ".jpg")
        if not os.path.exists(path):
            req = urllib.request.Request(meta["thumb"], headers={"User-Agent": UA})
            for attempt in range(5):
                try:
                    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as fh:
                        fh.write(r.read())
                    break
                except HTTPError as e:
                    if e.code in (429, 503):
                        time.sleep(int(e.headers.get("Retry-After", "30") or 30) + 2)
                        continue
                    raise
            time.sleep(1.2)
        credits[cid] = dict(name=name, file=f, license=meta["license"], author=meta["artist"], source=meta["page"])
        got += 1
        json.dump(credits, open(CREDITS, "w"), indent=1, ensure_ascii=False)
    total = len(people())
    print(f"photos: {len(credits)}/{total} people ({got} new, {skipped} skipped for licence)")


if __name__ == "__main__":
    main()
