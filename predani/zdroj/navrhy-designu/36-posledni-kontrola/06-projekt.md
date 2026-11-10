# Poslední kontrola · pohled 06: dává projekt smysl?

*10. 11. 2026 · maketa SCHEMA 89 · nic v maketě ani v dokumentech neměněno. Posuzováno proti `15-ZDROJ-PRAVDY-MAKETA.md` (hlavně odst. 1–3, 6–10, 18), `CLAUDE.md`, `maketa-rozhodovaci/predani/00-postup.md`, `01-cesta-k-demu.md`, `README.md`, `navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/06-regulace-bezpecnost.md` a `07-realny-provoz.md`; rešerše konkurence `29-…` jen jako kontext (jména z ní sem nepíšu). Nejde o právní ani regulatorní stanovisko; místa, která musí potvrdit odborník, jsou označená **[ověřit]**. Odhady, které nestojí na datech, jsou označené **[předpoklad]**.*

Úhel: kritický, ne zdvořilý. Projekt je promyšlený do hloubky, jakou málokterá maketa má, a zásady (dávku určuje lékař, nikdy „snězte víc“, deterministika, stopa) drží. Právě proto níže píšu hlavně to, co by ho mohlo potopit.

---

## 0. Shrnutí v deseti větách

1. **Myšlenka dává smysl:** pro pacienta na pevných dávkách je otázka „je problém v dávce, nebo v jídle?“ skutečná a dnešní report ze senzoru na ni neodpoví. Kombinaci „zápis jídla bez sacharidů + učení reakce + plán lékaře“ rešerše u nikoho nenašla.
2. **Největší existenční riziko je kohorta.** Po rozhodnutí 4. 11. 2026 „žádný jiný lék na diabetes“ zbývá podle hrubého odhadu v ČR řádově jednotky tisíc pacientů, spíš méně **[předpoklad]**, a trend jde proti (přibývá léků, které kohorta vylučuje). Na pilot 30–40 pacientů to stačí, na produkt sotva.
3. **Druhé riziko je zátěž pacienta:** 8–11 min denně v rutině, asi 24 min v prvních týdnech, 6 pohledů do senzoru denně, 92 dní, bez úhrady, bez kouče, bez herních prvků. Hlavní motivace je „lékař to uvidí“. To je silná páka, ale nezměřená.
4. **Třetí riziko je ekonomika ordinace:** kontrola stojí lékaře odhadem 10–14 min jen na část NutriFee (měřeno nad SCHEMA 77, od té doby nezměřeno), sestru 15–25 min zaučení a 2–5 min export, bez kódu výkonu a bez plátce.
5. Regulačně je to téměř jistě **zdravotnický prostředek, pravděpodobně třída IIb** kvůli kartě „posoudit dávku“ se směrem větve. Vlastník to vědomě přijal. **Regulatorní konzultace „do 30 dnů“ (R18, 6. 10. 2026) podle dokumentů neproběhla.**
6. **Nejnaléhavější konkrétní problém je plán prvního dema:** má „vypadat jako ostrá aplikace“, pravidla v něm mají štítek „✓ schváleno“, ačkoli je garant neschválil, lékař v něm smí zařadit nového pacienta a o štítku DEMO předávka nemluví. To je cesta k použití neschváleného prostředku na skutečném pacientovi a ke skutečným zdravotním údajům v demu.
7. Vnitřní logika je z větší části konzistentní; nejslabší místa jsou subjektivní „obvyklá porce“ jako vstup čistých dat, opis vrcholu z grafu jako hlavní míra a rozpor „lékař mezi kontrolami nic nedělá“ × „nečekejte na kontrolu, poraďte se s lékařem“.
8. Kohorta nemá v podmínkách **korekční schéma** (přidávání jednotek podle glukózy), které je v praxi běžné; pravidlo I-VYSOKA „inzulin navíc si nepíchejte“ by s ním bylo v přímém rozporu.
9. Odpovědnost je popsaná dobře na úrovni rolí (lékař rozhoduje, garant schvaluje, výrobce provádí), ale **výrobce jako právnická osoba neexistuje v žádném dokumentu**, a garant je zároveň ošetřující lékař studie i role na straně výrobce.
10. Dokumentace je mezi sebou téměř konzistentní; `15` odst. 17–18 ale obsahuje nejméně sedm tvrzení, která novější rozhodnutí přebila bez poznámky, a zásada 9 („žádná jména produktů“) je v rozporu se stavem veřejného repozitáře i s rozhodnutím vlastníka 6. 11. 2026.

---

## 1. Přínos

### 1.1 Pacient: kolik práce proti jakému užitku

**Cena (z měření `07` nad SCHEMA 77; od té doby krok 1 otázka po otázce a „méně je víc“, nové měření chybí):**

| | Rutina | První 2–3 týdny |
|---|---|---|
| Den | 37 klepnutí, 6 pohledů do senzoru, 0 psaní, **8–11 min** | **asi 24 min** |
| Období 92 dní | **asi 12–17 hodin** **[předpoklad: přepočet z denního odhadu]** | |
| Jednou | převzetí plánu 5–10 min, zaučení 15–25 min, export před kontrolou mimo aplikaci (15–45 min s pomocí rodiny, bez ní spíš neprovede) | |

**Užitek pro pacienta (co opravdu dostane):**

- U jídel, která jí často, slovo „většinou v cíli / častěji nad cílem“ a rozmezí vrcholů z vlastních dat. **Jen u jídel, která jedl aspoň 4× se shodou.** Senior s pestrou stravou bude mít známou menšinu jídel; po každé změně dávky se učení k jídlům daného jídla dne začíná znovu (`15` odst. 6, 18).
- Jednu až dvě rady před jídlem (porce k obvyklé, doplněk, pořadí, procházka). Žádná z nich není pro tuto kohortu klinicky ověřená v podobě, v jaké ji aplikace dává; studie to má teprve zjistit.
- Bezpečnostní pravidla ve správnou chvíli (pod 4, nad 15, menší porce, „nevím“, nemoc). To je skutečná hodnota a dnes ji pacient má nejvýš na papíře.
- **Nepřímo:** lékař na kontrole lépe rozhodne o dávce. To je podle `07` odst. 8 hlavní účinek pro tuto kohortu – a pacient ho uvidí až po 92 dnech.

**Proč by to dělal 92 dní.** Aplikace vědomě nemá body, série ani kouče (`15` odst. 7b, 18). Zbývá: (a) připomínky v telefonu, (b) karta „Jak to dopadlo“, (c) týdenní shrnutí a milníky, (d) **„lékař uvidí, jak reagujete na svá jídla“**. Páka (d) je u české kultury důvěry v lékaře nejsilnější a projekt ji správně staví do středu. Slabina: odměna (známé jídlo) přichází pozdě – první známé jídlo v simulaci 12 týdnů 16.–40. den i po rozšíření okna učení (`15` odst. 10, SCHEMA 85) – a zátěž je nejvyšší právě na začátku, kdy aplikace ještě nic neví. Literatura o denících jídla ukazuje rychlý odpad v prvních týdnech (shrnuto v rešerši `29`).

**Hodnocení:** poměr práce a užitku je **pro pacienta samotného hraniční**, pro dvojici pacient + lékař přijatelný. Projekt stojí na tom, že pacient vydrží první měsíc.

**Doporučení:** (1) v pilotu měřit odpad po týdnech a podíl dní se třemi zápisy jako primární proveditelnostní výstup; (2) připravit **odlehčený režim pro známé jídlo se stálou reakcí** (bez opisu nejvyšší hodnoty, jen inzulin, porce a „glukóza teď“ kvůli „pod 4“; vrchol doplní export) jako variantu k otestování, ne jako hotové rozhodnutí; (3) nové měření zátěže nad SCHEMA 89.

### 1.2 Lékař: co dnes chybí a co dostane

**Dnes chybí:** report ze senzoru ukazuje křivku glukózy bez kontextu – lékař neví, co pacient jedl, v jaké porci, zda dávku píchl a kdy. U pevné dávky je to přesně informace, bez které nejde rozlišit „dávka“ a „jídlo“.

**NutriFee dodá:** obvyklou porci v %, inzulin podle plánu a včas v %, reakce na jídla dne, poklesy s okolnostmi (porce, dávka), noci s okolnostmi, vývoj v čase, a návrhové karty s ověřovacími body a větví jeho vlastního schváleného postupu. To je pro tuto otázku víc, než dává kterýkoli zmapovaný produkt.

**Stojí to za jeho čas?** Kontrola: 17 kliknutí, asi 2 700 slov, **10–14 min jen na část NutriFee** (měřeno nad SCHEMA 77; sestra od té doby převzala léky, HbA1c, hmotnost a body „nejde ověřit z dat“; nový čas nikdo nezměřil – `29/02` riziko 8). Při běžné délce diabetologické kontroly **[předpoklad: 10–20 min]** NutriFee spotřebuje většinu návštěvy. Zařazení: posuvníky od SCHEMA 84 nahradily ±1, takže 63 kliknutí z `07` už neplatí; nové číslo chybí.

**Hodnocení:** hodnota pro lékaře je reálná a odlišující, **ale jen pokud se kontrola vejde do času, který lékař má**. Mezi kontrolami nedělá nic – to je správně a prodejné.

**Doporučení:** změřit kontrolu nad SCHEMA 89 se skutečným lékařem; cílit na „pětiminutovou cestu“ (souhrn → jediná karta, která něco mění → potvrzení), zbytek rozbalovací.

### 1.3 Plátce a klinika

- **Ordinace:** nová práce lékaře a sestry bez výkonu, který by ji platil, plus odpovědnost za nový prostředek. Bez úhrady ji nepřijme nikdo kromě nadšenců a studijních center.
- **Plátce:** potenciální přínos (čas v cíli, HbA1c, méně těžkých poklesů) je zatím hypotéza bez dat; malá kohorta znamená malý rozpočtový dopad, a tedy i malou prioritu. Obdoba hrazených digitálních aplikací v ČR podle rešerše chybí **[ověřit stav legislativy]**.
- **Jiní plátci** (výrobci inzulinu, per, senzorů) by narušili neutralitu, na které projekt stojí.

**Hodnocení:** obchodní model je **otevřený a dnes neexistuje**. Na pilot to nevadí; na rozhodnutí „stavět ostrou aplikaci se třídou IIb“ ano – certifikace IIb stojí řádově víc, než může malá kohorta bez úhrady vrátit **[předpoklad]**.

**Doporučení:** před rozhodnutím o ostré aplikaci (ne před pilotem) jedna stránka obchodního modelu: kdo platí, za co, kolik pacientů je potřeba k pokrytí certifikace a provozu.

### 1.4 Kohorta: je dost velká a reálná?

**Definice dnes (`15` odst. 1, K-KRITERIA):** dospělý s DM2 · bazál 1× večer + inzulin ke třem jídlům, pevné dávky · senzor · **žádný jiný lék na diabetes (ani tablety, ani GLP-1)** · ne premixy · bez těhotenství, opakovaných těžkých poklesů, těžkého onemocnění ledvin a jater, akarbózy, potíží s pohybem, zrakem, pamětí · zvládne telefon.

**Hrubý řetěz odhadu pro ČR** (každý krok **[předpoklad]**, jen řád velikosti, k nahrazení daty registrů a plátců):

| Krok | Podíl | Zbývá (řád) |
|---|---|---|
| lidé s diabetem | – | stovky tisíc až milion |
| z toho DM2 na inzulinu | asi pětina | desítky tisíc až 200 tisíc |
| z toho bazál + 3 dávky k jídlu (ne jen bazál, ne premix) | asi třetina | desítky tisíc |
| z toho pevné dávky (bez dávky podle sacharidů a bez korekčního schématu) | asi polovina | desítky tisíc |
| z toho se senzorem | asi polovina | jednotky až desítky tisíc |
| **z toho bez jakéhokoli jiného léku na diabetes** | **asi pětina až třetina** – metformin se k inzulinu běžně ponechává a léky s ochranou srdce a ledvin přibývají; bez nich bývají hlavně pacienti s onemocněním ledvin, které je zčásti vylučovacím kritériem | **jednotky tisíc** |
| z toho bez potíží s pohybem, zrakem, pamětí a se smartphonem | asi polovina | **řádově 1–5 tisíc** |

**Závěr:** kohorta je **reálná, ale úzká a zužující se**. Pilot 30–40 pacientů v několika velkých centrech naplnit půjde **[předpoklad]**; produkt pro takovou skupinu se v ČR neuživí.

**Vnitřní napětí kohorty:**
- Rozhodnutí „jen inzulin“ (4. 11. 2026) má bezpečnostní důvod: deriváty sulfonylurey mění riziko poklesu, o kterém aplikace neví. Variantu „zapsat druh tablet“ vlastník zavrhl, protože by aplikace musela „o lécích mluvit a rozhodovat“ (`15` odst. 18). **Tento důvod je slabší, než vypadá:** vylučovací kritéria už jeden lék jmenují (akarbóza) a lékař je potvrzuje zaškrtnutím, aplikace o nich s pacientem nemluví. Stejně by šlo vyloučit jen léky se samostatným rizikem poklesu a ponechat ty, které riziko poklesu samy výrazně nezvyšují. Léky, které tlumí chuť k jídlu, mají vlastní důvod k vyloučení (víc menších porcí po píchnutí) **[ověřit u garanta]**.
- Podle `CLAUDE.md` mám při návrhu zavržené varianty připomenout důvod a zeptat se: **vlastník kohortu rozhodl 4. 11. 2026 z bezpečnostního důvodu; nový důvod pro otevření je proveditelnost (velikost kohorty) a slabší argument „aplikace by musela mluvit o lécích“.** Rozhodne vlastník s garantem.
- Při odpovědi „Ano, začal jiný lék“ na kontrole aplikace jen zapíše stopu a běží dál, tedy přesně v situaci, kvůli které kohorta vznikla. Konzistentní by bylo, aby „Ano“ vedlo k rozhodnutí lékaře „ukončit účast / pokračovat“ (nic se nepíše, jen volba).
- **Korekční schéma chybí** v podmínkách i ve vylučovacích kritériích (v `15` ani v registru se slovo nevyskytuje). Pacient, který má od lékaře „při glukóze nad 12 přidejte 2 j.“, bude (a) dostávat kartu „Jiná dávka než v plánu“, (b) mít většinu jídel „nečistých“, (c) číst v I-VYSOKA „Inzulin navíc si nepíchejte“ – v přímém rozporu se svým lékařem.
- „Bazál 1× večer“ je v kohortě, ale ne v zaškrtávátku podmínek („bazál + 3 prandiální“); pacient s ranním bazálem projde zařazením a analýza nocí pro něj neplatí.

---

## 2. Vnitřní logika

### 2.1 Sedí cíl „konzistence porce k pevné dávce“ s tím, co aplikace měří a radí?

**Z větší části ano, s dvěma posuny:**

1. **Konzistence se neměří, jen deklaruje.** „Obvyklá porce“ je volba pacienta a je nejpohodlnější (`07` odst. 3, bod 8). Přitom je to první podmínka čistých dat pro návrh k dávce. Nepřiznaná menší porce = pokles bez pravidla I-MENE a „čisté“ jídlo, které ve skutečnosti čisté není. Aplikace to kompenzuje shodou zápisů (učení) a bodem „pokles při obvyklé porci blokuje zvýšit“ – ten ovšem stojí na téže deklaraci. **Doporučení:** v pilotu porovnat podíl „obvyklá porce“ s rozptylem vrcholů u téhož jídla; jinou cestu ověření aplikace nemá.
2. **Tři ze čtyř rad nejsou o konzistenci, ale o složení a pohybu** (doplněk, pořadí, procházka). To je obhajitelné („jídlo k dávce“ = porce + složení), ale `15` odst. 1 a zásada 2 to pojmenovávají jen napůl. Doplněk („Přidejte k jídlu…“) je doslova „snězte víc“, jen bílkoviny a tuku a jen před píchnutím; zásada 3 to neporušuje, ale **komunikačně je to místo, kde se garant nebo hodnotitel zarazí** – stojí za jednu větu v účelu určení.

Míra „v cíli“ (vrchol ≤ 10,0 do 120 min) je jedna pro pacienta, report i návrh – to je správně a dobře zdůvodněné (`15` odst. 18, 21. 10. 2026).

### 2.2 Učí se aplikace z dat, která má?

**Data:** celá mmol/l z posuvníku, hodnota před jídlem a nejvyšší do 2 h odečtená z grafu až u dalšího jídla (3–5 h později), noci jen z exportu nebo nepovinného čipu, export jednou za období.

| Prah / okno | Hodnota | Posouzení |
|---|---|---|
| Shoda zápisů (známé jídlo) | 4 z posledních 6, rozdíl vzestupů ≤ 2,5 | **Konzistentní, ale na hraně šumu dat.** Vzestup je rozdíl dvou zaokrouhlených čísel, rozdíl vzestupů rozdíl čtyř: zaokrouhlení samo dá chybu až ±2 mmol/l (směrodatná odchylka asi 0,6). K tomu chyba senzoru a hlavně chyba odečtu vrcholu z grafu (nejtěžší úkon dne, `07` B2). Simulace z 18. 10. 2026 rozhodla 4 z 6 nad kódem – **[ověřit], zda počítala s celými čísly a chybou odečtu**; když ne, zopakovat. |
| Rozchod | ≥ 3,5 → jedna otázka | Konzistentní s 2,5 (pásmo 2,5–3,5 je „nic“). |
| Stupeň reakce | od 4 zápisů, okno 8, práh 50 % | Konzistentní se známým jídlem (obojí od 4). |
| „V cíli“ | vrchol ≤ 10,0 z celých čísel | Čip „10“ zahrnuje 9,5–10,4; hranice je fakticky 10,5. Návrh k dávce má „medián > cíl + 0,5“, tedy totéž. Konzistentní, jen to nikde není napsané. |
| Učení 45/30, návrh 30/15 | dvě okna včasného inzulinu | **Konzistentní** – volnější pro učení, přísnější pro dávku; zápis mezi okny jde do učení, ne do návrhu (`15` odst. 10). |
| Čistá data pro dávku | ≥ 28 dní od změny, ≥ 8 čistých jídel, 2/3 nad 10,0, medián > cíl + 0,5 | Konzistentní a dosažitelné za 92 dní, pokud pacient zapisuje aspoň polovinu jídel **[předpoklad]**. |
| Poklesy | 2 za klouzavých 7 dní → karta | Konzistentní; denní poklesy pokrývá otázka „klesla do 4 h po jídle pod 4?“ u každého dalšího jídla, noci jen čip a export. |
| Bazál z nocí | ≥ 2 noci < 3,9 nebo 1 < 3,0 | **Závisí na exportu**, který pacient podle `07` A3 sám spíš nepošle. Čip u snídaně je nepovinný. Bez obojího návrh k bazálu nevznikne a report to od SCHEMA 74 řekne. |

**Strukturální slabina:** učení se trhá třikrát – podle jídla dne (stejné jídlo u snídaně a večeře se slévá jen při stejné dávce), podle dávky (po každé změně znovu) a podle názvu (jiná příloha = jiné jídlo). U seniora s pestrou stravou bude podíl zápisů u známého jídla nízký; model makety (21 jídel, 19 známých) je optimistický (`07` B9). **Doporučení:** před pilotem simulace s realistickou pestrostí stravy a s chybou opisu; stanovit, jaký podíl „známých“ zápisů je pro pacienta ještě užitečný.

**Kde se aplikace z dat neučí a tvrdí to:** „učí se“ je přesné jen pro rozmezí vrcholů. Rady se neučí – nabídka je pravidlo, stažení doplňku po 3 neúspěších je pravidlo. Pro zdůvodnění „není systém AI“ je to výhoda; v textech pro lékaře a plátce by „učí se“ mělo znít „počítá z vašich zápisů“.

### 2.3 Rozpory mezi zásadami

| # | Rozpor | Kde | Posouzení a doporučení |
|---|---|---|---|
| R1 | **„Lékař mezi kontrolami nic nedělá a nic nesleduje“** × karta po 2 poklesech a I-HYPO „**nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal**“ | `15` zásada 5 × odst. 2.3, 8 | Skutečný rozpor. Aplikace pacienta pošle k lékaři, ale lékaři nedá nástroj: report existuje jen na kontrole. Lékař dostane telefonát a nemá data. Rozlišení „nevyzýváme volat, jen radíme poradit se“ je pro pacienta i regulátora tenké. **Doporučení:** povolit „mimořádnou kontrolu“ – lékař otevře podklady kdykoli, když pacient přijde (akce zůstává jen s pacientem v ordinaci, zásada 5 se nemění). |
| R2 | „Aplikace k volání nikdy sama nevyzve“ × pravidla I-HYPO, I-NEMOC, I-VYSOKA „volejte záchrannou službu“, „vyhledejte ještě ten den lékařskou pomoc“ | odst. 2.3, 4.5 | Formálně vyřešeno („ordinace“ ≠ „záchranná služba / lékařská pomoc“). Věcně v pořádku a bezpečné; jen to v textech pro garanta stojí za větu, aby zásada nezněla absolutně. |
| R3 | Zásada 4 „každý text ze **schválené** položky“ × maketa a plánované demo se chovají, jako by bylo schváleno | odst. 2.4 × `01-cesta-k-demu` | V maketě vědomé a označené („ke schválení“). V demu ne – viz odst. 3.4 a zjištění 1. |
| R4 | „Lékař je vždy jen jeden“ × realita hospitalizací a jiných lékařů | odst. 1, 18 | Rozhodnuto vlastníkem 1. 11. 2026, zbytkové riziko zmírňuje karta „Jiná dávka než v plánu“. Mezitím ale připomínka v telefonu ukazuje starou dávku jako „podle plánu“. Nechat jako přijaté riziko, výslovně v analýze rizik a v návodu k použití. |
| R5 | Garant = ošetřující lékař v první studii (odst. 3) × garant je v ostrém provozu „role na straně výrobce“ (odst. 13) | odst. 3 × 13 | Lékař schvaluje pravidla, která pak sám používá u svých pacientů ve studii, a je zároveň na straně výrobce. Ve studii přípustné, ale musí být deklarované (střet zájmů, nezávislost hodnocení). `06` doporučuje druhé klinické posouzení bezpečnostních položek. |
| R6 | Kohorta „žádný jiný lék“ × odpověď „Ano, začal jiný lék“ jen zapíše stopu | odst. 1, 9 | Viz 1.4. Doporučení: „Ano“ → volba lékaře ukončit/pokračovat. |
| R7 | „Rady první“: `15` odst. 18 (ř. „Čistá data a rady první“) říká „návrh vznikne až po ≥ 3 přijatých radách bez efektu“ × od SCHEMA 84 brána není zámek | odst. 18 × 10 | Zastaralá věta, viz odst. 5. |
| R8 | „Konzistence, ne omezování“ (zásada 2) × R-PORCE u větší porce před píchnutím radí ubrat | zásada 2, 3 | Není rozpor (návrat k obvyklé), ale pacient to čte jako „jezte méně“. Ověřit v testu použitelnosti. |

---

## 3. Regulace a bezpečnost

### 3.1 Je to zdravotnický prostředek?

**Ostrá aplikace: téměř jistě ano** – software, který z hodnot konkrétního pacienta radí k jídlu s ohledem na podaný inzulin, eviduje poklesy a lékaři předkládá návrh k posouzení dávky se směrem, poskytuje informace k terapeutickým rozhodnutím. Prohlášení „dávku nedoporučujeme“ to nezmění, rozhoduje účel celku (`06` odst. 1.1).

**Třída podle pravidla 11:** dílčí funkce IIa (rady, poklesy, pravidla, report); **karta „posoudit dávku“ s větví zvýšit/snížit pravděpodobně IIb** – chybně ukázaná větev „zvýšit“ může po souhlasu lékaře vést k těžké hypoglykémii a pravidlo hodnotí závažnost dopadu, ne pravděpodobnost. Cesta k IIa by znamenala kartu bez směru; vlastník ji 18. 10. 2026 vědomě odmítl (hlavní hodnota pro lékaře). Rešerše `29/01` („IIa“) je příliš optimistická; `15`, `06` a `00-postup` už počítají s IIb – v pořádku. **[ověřit u regulatorního poradce a v předběžném dialogu s notifikovanou osobou]**

**Není systém AI** (pravidla definují lidé, výstup deterministický) – nutné výslovně zdůvodnit v dokumentaci; slovo „učí se“ to komplikuje.

### 3.2 Co z toho plyne pro demo, studii a ostrý provoz

| Fáze | Co platí | Co chybí / riziko |
|---|---|---|
| **Maketa** (dnes) | Není uvedení na trh ani do provozu; syntetická data; štítek DEMO; garant posuzuje neformálně. | Účty a rozhodnutí garantů jsou osobní údaje (e-mail, názory) – informace pro ně, smlouva se zpracovatelem databázové služby, umístění v EU (`06` C12). |
| **První demo** (plán 9.–10. 11. 2026) | Pořád ne uvedení na trh, **pokud** se nepoužije u skutečného pacienta a nic netvrdí o účinku. | **Plán to nezajišťuje:** demo „vypadá a chová se jako ostrá aplikace“, „pravidla jsou schválená“ se štítkem „✓ schváleno“, lékař „může zařadit nového pacienta“, aplikace pacienta se instaluje na vlastní telefon, a štítek DEMO ani podmínky použití předávka nezmiňuje. Lékař, který si demo zkouší, ho může dát skutečnému pacientovi nebo zadat skutečné údaje. To by byla klinická zkouška bez povolení a zpracování zdravotních údajů bez právního základu. Materiály k demu navíc spoluurčují účel určení. |
| **Pilot / studie** (R17: 30–40 pacientů, 3 měsíce) | Hodnocený prostředek, který ovlivňuje léčbu → klinická zkouška podle MDR (u IIb povolení státního ústavu a stanovisko etické komise před zahájením), protokol, informovaný souhlas, pojištění, hlášení nežádoucích příhod, změny jako podstatné změny. **[ověřit, zda pilot proveditelnosti spadá pod čl. 62, nebo čl. 82 a národní úpravu]** | Hodnocený prostředek musí mít řízení rizik, dokumentaci návrhu a software vyvinutý řízeně. **Rozhodnutí „demo nad převzatým jádrem, o přepisu po demu“ hrozí, že se demo potichu stane hodnoceným prostředkem bez historie návrhu.** Rozhodnout dřív, než začne vývoj dema, zda kód dema půjde do studie; pokud ano, vést dokumentaci podle normy pro životní cyklus softwaru od prvního dne. |
| **Ostrý provoz** | Systém řízení kvality, technická dokumentace, posouzení shody notifikovanou osobou, osoba odpovědná za dodržování předpisů, pojištění, návod k použití se seznamem kompatibilních senzorů, dozor po uvedení na trh, pravidelné zprávy o bezpečnosti, vigilance (`06` odst. 5, `00-postup` odd. 4). | Registr pravidel je součást prostředku: každé vypnutí položky je změna prostředku, případně bezpečnostní nápravné opatření (`06` B12). |

**Regulatorní konzultace:** `15` odst. 17, R18 (6. 10. 2026) slibuje „regulatorní konzultace do 30 dnů“. V dokumentech není záznam, že proběhla; `06` i `00-postup` 4.3 ji stále uvádějí jako budoucí krok. Termín uplynul kolem 5. 11. 2026.

### 3.3 Kdo za co ručí

| Kdo | Za co | Je to správně vymezené? |
|---|---|---|
| **Ošetřující lékař** | rozhodnutí o dávce, zařazení (kritéria potvrzuje zaškrtnutím), vydání plánu jako celku, rozhodnutí u každého návrhu | **Ano.** Zásada 1, volič „jiná dávka“ u každé dávky, „rozhodnuto jinak než postup“ ve stopě. Lékař podepisuje plán, ne pravidla („platí obecná pravidla NutriFee v1 · beze změny u pacienta“). |
| **Garant** | klinický obsah registru (prahy, texty, postup posouzení dávky, bezpečnostní pravidla) | **Částečně.** V první studii = lékař (střet rolí, R5); v ostrém provozu role výrobce, který garantovo schválení teprve uvolní řízením změn. Pacient čte „posoudil je lékař“ – neví, který; může myslet svého lékaře. |
| **Výrobce** | prostředek jako celek, uvolnění verzí registru, převodníky exportů, provoz serveru, vigilance | **Pojmenován jen rolí.** Žádný dokument neříká, kdo je výrobce (právnická osoba), kdo je osoba odpovědná za dodržování předpisů, kdo je pojištěn. Bez toho nejde podat žádost o klinickou zkoušku. |
| **Sestra** | zaučení, nahrání exportu, odpovědi „před lékařem“ | Ano, s výhradou: ostrá aplikace má role oddělit (`15` odst. 3, SCHEMA 87). |
| **Pacient** | pravdivý opis, porce, potvrzení inzulinu, upozornění na nízkou glukózu v aplikaci senzoru | Ano, ale část bezpečnosti stojí na tom, co aplikace nevidí a neověří (upozornění senzoru, `06` A2). Musí být v návodu i v analýze rizik. |

### 3.4 Ochrana osobních údajů (zdravotní údaje)

**Už v demu se syntetickými daty musí platit:**
- Do dema se **technicky ani organizačně** nedostanou skutečné zdravotní údaje: jména syntetických pacientů generuje systém, zařazení nového pacienta jen se smyšleným nebo přiděleným označením, viditelný štítek DEMO, krátké podmínky použití pro testující lékaře („jen k vyzkoušení, ne pro pacienty“), účty jen pro personál.
- Osobní údaje testujících (e-mail, role, rozhodnutí a poznámky garanta): informace o zpracování, smlouva se zpracovatelem, servery v EU, výmaz po skončení.
- Veřejný repozitář: žádné tajné klíče, oprávnění na řádcích ověřená testem (`15` zásada 6 už popisuje).

**Až v ostrém provozu (a pro studii):**
- Posouzení vlivu (DPIA) – povinné (zdravotní údaje, zranitelní lidé, nová technologie); osnova z 18. 10. 2026 existuje, chybí doplnění o tok dat podle dnešního `15`.
- Právní základ pro zdravotní údaje (poskytování péče, ve studii výslovný souhlas), role správce a zpracovatele (ordinace × výrobce × provozovatel serveru), smlouvy, lhůty uchování podle předpisů o zdravotnické dokumentaci a o klinické zkoušce, pseudonymizace dat studie, hlášení porušení do 72 h, záznamy přístupů.
- **Cesta exportu „pacient pošle do ordinace“ je otevřená a bude nejspíš e-mailem.** Zdravotní údaje nešifrovaným e-mailem jsou riziko pro ordinaci i výrobce. Řešení `07` A3 (přenos z pacientova telefonu na kontrole, personál se nepřihlašuje jeho účtem) je zároveň řešením ochrany dat.

**[ověřit u pověřence pro ochranu osobních údajů a právníka]**

### 3.5 Bezpečnost pacienta – co je silné a co zbývá

**Silné:** nikdy „snězte víc“ po píchnutí (s pojistkou v kódu), bezpečnostní větev před bránou rad, při „pod 4“ žádná rada, procházka ne při riziku, další jídlo „na řadě“ až po 3 h, svačina bez inzulinu, pokles při obvyklé porci blokuje „zvýšit“, žádná velikost kroku v jednotkách, zamítnutí kritérií zařazení a opsaných hodnot jen jako nesouhlas.

**Zbývá (z `06` a vlastního čtení, bez opakování všeho):** aplikace mlčí, když ji pacient neotevře a připomínka nepřijde; noční poklesy bez exportu a bez čipu nikdo nevidí; systematicky nadhodnocený opis mimo okno exportu může vést k větvi „zvýšit“ (bod 9 postupu ji jistí jen tam, kde je export); korekční schéma v rozporu s I-VYSOKA; ranní bazál mimo předpoklady analýzy nocí.

---

## 4. Rizika projektu

| Riziko | Pravděpodobnost / dopad | Co by projekt potopilo | Co s tím |
|---|---|---|---|
| **Kohorta příliš úzká** | vysoká / vysoký | Pilot se naplní, produkt ne; plátce nezajímá. | Odhad z dat registrů a plátců **před** rozhodnutím o ostré aplikaci (doporučeno už 29. 10., neuděláno); znovu otevřít „jen inzulin“ s garantem (1.4). |
| **Adherence pacientů** | vysoká / vysoký | Odpad v prvním měsíci; data pro lékaře děravá, návrhy nevzniknou. | Měřit týden po týdnu; odlehčený režim pro známá jídla; zaučení s rodinou; připomínky; pravidelná věta „lékař uvidí“. |
| **Opisování hodnot** | jistá zátěž / střední až vysoký | Chybný vrchol → špatné učení i návrh. | Shoda opisu s exportem jako primární výstup bezpečnosti dat (už navrženo); simulace s chybou odečtu; věta k odečtu z grafu (je). |
| **Export se nedostane do ordinace** | vysoká / střední | Bez času v cíli a nocí; návrh k bazálu nevznikne. | Přenos na kontrole z pacientova telefonu (`07` A3), v pilotu měřit podíl kontrol s exportem. |
| **Ochota lékařů** | střední až vysoká / vysoký | 10–14 min na kontrolu bez úhrady; „dejte mi číslo“ – lékař, který chce konkrétní dávku, NutriFee vnímá jako slabší než titrační software. | Změřit kontrolu nad SCHEMA 89; pětiminutová cesta; argumentovat „problém v dávce, nebo v jídle“, ne „návrh dávky“. |
| **Odpovědnost** | střední / vysoký | Bez výrobce jako osoby, pojištění a osoby odpovědné za předpisy nelze studii podat; nejasné „posoudil je lékař“ u pacienta. | Založit/určit výrobce; smlouva s garantem; pacientská věta „…posoudil je lékař, který za pravidla NutriFee odborně odpovídá“ nebo neutrální „pravidla NutriFee“ **[ověřit s právníkem]**. |
| **Konkurence** | střední / střední | Výrobce senzoru přidá k jídlu poznámky a vyhodnocení ve své bezplatné aplikaci; datové platformy přidají kontext jídla; titrační software dá lékaři číslo. | Odlišení není „učení z jídla“, ale **plán lékaře + příprava kontroly sestrou + karta „dávka, nebo jídlo?“**; to stavět do popředí. Bez napojení na výrobce je výhoda (nezávislost) i slabina (opis). |
| **Demo použité jako ostrá aplikace** | střední / velmi vysoký | Skutečný pacient v neschváleném prostředku, zdravotní údaje v demu, tvrzení „schváleno“ bez schválení. | Viz zjištění 1. |
| **Regulace IIb a cena certifikace** | jistá / vysoký | Náklady a čas bez obchodního modelu. | Regulatorní konzultace hned (R18 je po termínu); obchodní model před ostrou aplikací. |
| **Jeden garant** | střední / střední | Chybné pravidlo bez druhého pohledu; střet rolí. | Druhé klinické posouzení u bezpečnostních položek (I-*, B-HYPO, D-POSTUP). |
| **Rozsah projektu vs. zdroje** | střední / střední | 89 verzí schématu, 393 testů, 342 kB zdroje pravdy pro maketu, která ještě neviděla pacienta. Riziko, že se dál ladí maketa místo ověření předpokladů na lidech. | Zmrazit maketu (R20 to už jednou řekl); další krok je test použitelnosti s 5–8 seniory a 2–3 lékaři, ne další SCHEMA. |

---

## 5. Konzistence dokumentace

`15`, `CLAUDE.md` a `predani/` se v **zásadách** shodují (dávka, porce, volání, deterministika, kohorta jen inzulin, DEMO jednou, v ordinaci se nepíše). `predani/zdroj/15-ZDROJ-PRAVDY-MAKETA.md` je bajtově shodný s kořenovým `15`. Rozpory a zastaralá tvrzení:

### 5.1 Uvnitř `15`

| # | Místo | Tvrzení | Proč zastaralé |
|---|---|---|---|
| D1 | odst. 18, „Čistá data a rady první“ | „návrh vznikne až po ≥ 3 přijatých radách bez efektu“ | Od SCHEMA 84 karta k dávce vzniká vždy, brána „rady první“ je bod 10 postupu, ne zámek (odst. 10, 18 nahoře). |
| D2 | odst. 18, „Garant schvaluje jen klinické položky; **provozní schválil vlastník**“ | nadpis | Od 27. 10. 2026 (Q1) provozní položky neschvaluje nikdo. |
| D3 | odst. 18, „Pokyny jsou součást plánu…“ (21. 10.) | „pacient vidí pokyn jako pokyn svého lékaře, protože podepsal plán“ | Od 27. 10. 2026 jsou pravidla obecná pravidla NutriFee bez podpisu lékaře. |
| D4 | odst. 18, „Pokyn pro nemoc dvakrát“ (18. 10.) | „Lékař nastaví dva pokyny voličem“ | Od SCHEMA 66 lékař pravidla nevybírá ani nenastavuje (mění hodnotu jen výjimečně). |
| D5 | odst. 18, „Garant = záložka lékaře, **vše předem schválené**“ | nadpis | Od 7. 10. 2026 „ke schválení“ (poznámka v textu je, nadpis ne). |
| D6 | odst. 17, R11 | „tolerance 30/15 min zůstává pro učení“ | Od SCHEMA 85 učení 45/30, návrh 30/15. |
| D7 | odst. 17, R9 | „min–max do 5 zápisů, percentily od 8, barevný stupeň od 6“ | Odst. 6: min–max 1–7, stupeň od 4. |
| D8 | odst. 17, R2 | „hypo návrh … ≥ 15 % čistých jídel“ | Odst. 10: poklesy ze všech zápisů, ne jen čistých. |
| D9 | odst. 18, úvodní věta | „Argumentace z debat 25. 9. – 1. 10. 2026“ | Odstavec sahá do 7. 11. 2026. |
| D10 | hlavička dokumentu | výčet doplnění končí 27. 10. 2026 | Obsah sahá do SCHEMA 89 (9. 11.). |
| D11 | odst. 18, „Tablety a GLP-1 navíc ano“ v zavrženém seznamu | „kohorta bez perorálních antidiabetik“ je v seznamu zavržených (18. 10.) | Od 4. 11. 2026 platí právě kohorta bez jiných léků; položka „Zavrženo“ odporuje platnému stavu. |

`predani/01-cesta-k-demu.md` říká, že „zastaralá čísla v `15` odst. 16–17 jsou deník“. Odst. 17 ale nese rozhodnutí formulovaná jako platná („rozhodnutí vlastníka zapsaná jako platná“) a odst. 18 je výslovně závazný („než změníš rozhodnutí, přečti 18“). D1–D5 a D11 jsou v odst. 18, takže je nová posádka bude číst jako platné.

### 5.2 Mezi `15`, `CLAUDE.md` a `predani/`

| # | Rozpor | Doporučení |
|---|---|---|
| D12 | **Zásada 9** (`CLAUDE.md`, `15` odst. 2, `00-postup` 1.2: „žádná jména … výrobců ani produktů“) × veřejný `predani/zdroj/15` obsahuje názvy databázové služby (12×), hostingu, knihovny ikon, zdroje ilustrací, písem a nástroje pro automatizaci prohlížeče; README předávky jmenuje mobilní platformy. Vlastník 6. 11. 2026: „Jména neřeš, dej to ven.“ | Zásadu upřesnit: zakázaná jsou jména osob, institucí, výrobců senzorů, inzulinů a konkurenčních produktů; názvy technických nástrojů a platforem povolené. Jinak test „žádná jména“ i zásada lžou. |
| D13 | **Plán dema** (`01-cesta-k-demu`): „pravidla jsou schválená“, štítek „✓ schváleno“, „vypadá jako ostrá aplikace“ × `15` zásada 4 (schváleno = rozhodnutí garanta), zásada 7 (štítek DEMO), `00-postup` 2.6 („nerozhodnutá položka nesmí působit“, „rozhodnutí v maketě jsou neformální“) | Viz zjištění 1. |
| D14 | `CLAUDE.md` „Testy: … `nutrifee-rozhodovaci-maketa.test.cjs`“ × `predani` od SCHEMA 89 rychlá sada a zlaté výstupy | Doplnit do `CLAUDE.md` rychlou sadu a zlaté výstupy. |
| D15 | `CLAUDE.md`: „Zdrojem pravdy pro kód je `maketa-rozhodovaci/` na Disku“ × `predani/README`: „při rozporu platí chování makety v tomto repozitáři“ | Pro programátora platí repozitář, pro vlastníka Disk; po publikaci shodné. Stačí jedna věta v `CLAUDE.md`, že předávka odkazuje na publikovanou kopii. |
| D16 | `CLAUDE.md` „Publikovaná maketa (commit `52268f1` a starší) je stará verze“ vedle „při rozporu platí publikovaná maketa“ | Čte se jako rozpor; přeformulovat na „commity do `52268f1` včetně jsou stará verze, platí poslední publikovaná“. |
| D17 | `00-postup` 4.4 „lékař na kontrole odhadem 10–14 min“ | Měřeno nad SCHEMA 77; od té doby sestra převzala část kontroly. Označit jako staré měření. |
| D18 | Kohorta „bazál 1× večer“ (`15` odst. 1, slovník) × zaškrtávátko podmínek „bazál + 3 prandiální“ (odst. 4, K-KRITERIA) | Doplnit „bazál večer“ do podmínky, nebo zobecnit analýzu nocí. |
| D19 | Interní podklady `29/01` a `29/02` (nepublikované): „pravděpodobně IIa“, „Souhlasím / Upravit / Zamítnout“, „rozšíření o tablety a GLP-1 pomohlo“ | Zastaralé po SCHEMA 84 a kontrole 4; protože slouží jako „věty do rozhovoru“, opravit dřív, než je někdo použije. |
| D20 | `15` odst. 17 R18 „regulatorní konzultace do 30 dnů“ | Bez záznamu o splnění; doplnit stav (proběhla / odložena / kdy). |

---

## 6. Deset nejdůležitějších zjištění podle dopadu

1. **Plán prvního dema může vést k použití neschváleného prostředku u skutečného pacienta.** Demo „vypadá jako ostrá aplikace“, pravidla nese „✓ schváleno“ bez rozhodnutí garanta, lékař smí zařadit nového pacienta, aplikace pacienta se instaluje na telefon a štítek DEMO předávka nezmiňuje. *Doporučení:* do `01-cesta-k-demu` doplnit trvalý štítek „DEMO · syntetická data · není určeno pro léčbu“ (zásada 7), krátké podmínky použití pro testující, zařazení nového pacienta jen se smyšleným označením, místo „✓ schváleno“ v demu „pravidla NutriFee v1 (návrh)“ nebo stav „ke schválení“; vlastník rozhodne tlačítkem.
2. **Kohorta „jen inzulin“ je podle hrubého odhadu řádově jednotky tisíc pacientů v ČR a zmenšuje se** **[předpoklad]**. *Doporučení:* odhad z dat registrů a plátců před rozhodnutím o ostré aplikaci; s garantem znovu posoudit vyloučení jen léků se samostatným rizikem poklesu (důvod „aplikace by musela mluvit o lécích“ je slabý, kritéria už jeden lék jmenují); vlastník rozhodl 4. 11. z bezpečnostního důvodu, takže jde o vědomé přebití, ne opravu.
3. **Regulatorní konzultace (R18, termín kolem 5. 11. 2026) podle dokumentů neproběhla a výrobce jako právnická osoba nikde neexistuje.** *Doporučení:* konzultace a předběžný dialog s notifikovanou osobou teď; určit výrobce, osobu odpovědnou za dodržování předpisů a pojištění; rozhodnout, zda kód dema půjde do studie, a podle toho začít dokumentaci životního cyklu softwaru.
4. **Zátěž pacienta (8–11 min denně, 24 min na začátku, 6 pohledů do senzoru) proti odměně, která přichází po týdnech.** *Doporučení:* nové měření nad SCHEMA 89; test použitelnosti s 5–8 seniory dřív než další verze makety; odlehčený režim pro známá jídla jako varianta k otestování; v pilotu odpad po týdnech jako primární výstup proveditelnosti.
5. **Rozpor „lékař mezi kontrolami nic nedělá“ × „nečekejte na kontrolu, poraďte se s lékařem“:** aplikace pacienta k lékaři pošle, lékaři nedá data. *Doporučení:* „mimořádná kontrola“ – lékař otevře podklady, když pacient přijde (zásada 5 se nemění, akce jen s pacientem).
6. **Korekční schéma není v podmínkách zařazení ani ve vylučovacích kritériích** a I-VYSOKA („inzulin navíc si nepíchejte“) by mu přímo odporovalo; ranní bazál je mimo předpoklady, ale projde zařazením. *Doporučení:* doplnit do K-KRITERIA „bez korekčního schématu“ a „bazál večer“ (nové znění ke schválení garantem).
7. **Čistá data stojí na deklarované „obvyklé porci“ a na vrcholu odečteném z grafu**, obojí neověřitelné a s chybou blízkou prahům učení (2,5 / 3,5 mmol/l). *Doporučení:* zopakovat statistickou simulaci s celými čísly, chybou odečtu a realistickou pestrostí stravy; v pilotu měřit shodu opisu s exportem a rozptyl vrcholů u „obvyklé porce“.
8. **Ekonomika ordinace a plátce neexistuje:** 10–14 min lékaře (staré měření), práce sestry, bez výkonu a bez úhrady. *Doporučení:* změřit kontrolu nad SCHEMA 89, navrhnout pětiminutovou cestu; před ostrou aplikací jedna stránka obchodního modelu.
9. **Export ze senzoru se nejspíš do ordinace nedostane a „pošle do ordinace“ bude v praxi e-mail se zdravotními údaji.** Bez exportu chybí noci, čas v cíli a jistota opisu. *Doporučení:* přenos z pacientova telefonu na kontrole (personál se dál nepřihlašuje jeho účtem); v pilotu podíl kontrol s exportem a vyplněných nočních čipů.
10. **Zastaralá tvrzení v závazném odst. 18 a rozpor zásady 9 s veřejným repozitářem.** D1–D5 a D11 nová posádka přečte jako platná; zásada 9 zakazuje názvy produktů, které veřejný `15` obsahuje. *Doporučení:* opravit D1–D11 poznámkami „přebito …“ (nic neměnit na chování); upřesnit zásadu 9 na jména osob, institucí, výrobců senzorů a inzulinů a konkurenčních produktů; doplnit stav R18.
