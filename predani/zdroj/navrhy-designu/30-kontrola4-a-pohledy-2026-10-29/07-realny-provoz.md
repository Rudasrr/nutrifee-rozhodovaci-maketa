# Pohled 07 – reálný provoz (pacient 68 let a praktická diabetologická ordinace)

*29. 10. 2026 · maketa SCHEMA 77 · nic v maketě neměněno. Role: (a) pacient 68 let, DM2 na inzulinu v pevných dávkách, nosí senzor, umí volat a posílat fotky, horší zrak, občas zapomíná; (b) sestra a lékař, 15 minut na kontrolu, bez psaní.*

## 0. Shrnutí

- **Pacient, běžný den (3 hlavní jídla živě + bazál, jídla už známá):** 37 klepnutí, 19 posunutí obrazovky, 0 znaků psaní, 4 otevření aplikace, **6 pohledů do aplikace senzoru** (3× „glukóza teď“, 3× nejvyšší hodnota z grafu za 2 h), asi 3 100 slov na obrazovkách. Čas **8–11 min denně** v rutině, **asi 24 min denně v prvních týdnech** (pacient čte všechno). Týden: **asi 265 klepnutí, 42 pohledů do senzoru, 60–80 min**.
- Proti křížové analýze z 15. 10. 2026 (80–90 klepnutí, 13–16 min, 6 přechodů do senzoru denně) je to **o polovinu méně klepnutí a asi o třetinu méně času**. Čas teď určují dvě věci: **čtení grafu senzoru** (asi 2,5 min denně) a **délka obrazovek** (Dnes 3,8–4,6 výšky telefonu, krok 1 u oběda 3,4, krok 3 3,2).
- **Ordinace:** zařazení stojí lékaře **63 kliknutí, z toho 44 jen na dávky** (volič ±1 od nuly; u běžných dávek 30 + 3×12 j. by to bylo 66). Zaučení u sestry 9 kliknutí, ale 15–25 min výkladu. Kontrola: sestra 1 klik v ukázce (reálně 6–10 a 2–5 min na najití souboru), lékař **17 kliknutí, 5 posunutí, asi 2 700 slov textu**; odhad **10–14 min jen na část NutriFee**. Do 15 minut se vejde, jen pokud je NutriFee celou náplní návštěvy.
- **Nálezy A (provoz nefunguje): 3** – žádné připomínky v telefonu pro zapomínajícího pacienta; dávky při zařazení voličem ±1 (desítky klepnutí a snadný překlep); cesta exportu „pošlete do ordinace“ je pro tohoto pacienta neproveditelná a bez exportu chybí noční poklesy.
- **Nálezy B: 9**, **C: 5** (oddíl 7).
- **Proti vážení a počítání maker** (oddíl 8): NutriFee na jedno jídlo 9–13 klepnutí, 0 psaní, váha ani tabulky ne, 2–3 min včetně senzoru; vážení s aplikací na sacharidy odhadem 25–35 klepnutí, 20–30 znaků psaní, kuchyňská váha, 3–5 min – a mimo domov nejde vůbec. Výhoda NutriFee není jen v čase: pacient se dozví, **kam se jeho glukóza po jeho jídle dostane a co mu u něj pomohlo**, což mu počítání gramů neřekne.

## 1. Jak se měřilo

- **Pacient:** vlastní kopie makety `scratchpad/shot/k4-real/m/` (server 127.0.0.1:8774), Playwright, telefon 390 × 844 px. Skript `k4-real/day.js` (knihovna `k4-real/lib.js`) skočí na stav příběhu („den před kontrolou“, pacient zná 19 z 21 jídel; „první snídaně“ pro začátek), posune hodiny a **skutečně klepe na tlačítka obrazovky** (zámek prezentace jen vypnutý stylem). Počítá klepnutí, posunutí obrazovky (cíl mimo viditelnou část → 1 posunutí na každých 60 % výšky), nové obrazovky, slova na obrazovce a znaky psaní. Pohledy do senzoru se připisují ručně tam, kde je pacient potřebuje.
- **Ordinace:** `k4-real/clinic.js`, desktop 1440 × 900, stejné počítání kliknutí; slova a výšky kroků kontroly `k4-real/rwords.js`.
- **Časový model pro seniora s horším zrakem** (odhad, ne měření): rozhodnutí a klepnutí 2,5 s · posunutí 1,5 s · znak psaní 1,2 s · pohled do aplikace senzoru na hodnotu teď 25 s (přepnutí, načtení, přečtení, návrat) · nejvyšší hodnota z grafu za dvě hodiny 30 s (najít okno 2 h, odečíst vrchol) · otevření telefonu a aplikace 10 s · čtení 0,35 s na slovo; v rutině čte pacient 15–30 % textu, v prvních týdnech všechno.

## 2. Pacient – měření

### 2a. Jedno jídlo a jednotlivé situace (naměřeno klepnutím)

„Mech.“ = klepnutí + posunutí + psaní + senzor; „Celkem“ = mech. + čtení 15–30 % textu.

| Situace | Klep. | Posun. | Psaní (zn.) | Obrazovek | Slov | Senzor teď / graf | Mech. (s) | Celkem (s) |
|---|---|---|---|---|---|---|---|---|
| Snídaně živě, „Ještě ne“, známé jídlo, rada přijata | 9 | 3 | 0 | 5 | 847 | 1 / 0 | 52 | 96–141 |
| Oběd živě + nejvyšší po snídani + „klesla pod 4?“ | 12 | 5 | 0 | 5 | 931 | 1 / 1 | 92 | 141–190 |
| Večeře živě („Ano, 8 j.“) + po obědě | 11 | 4 | 0 | 5 | 837 | 1 / 1 | 88 | 132–176 |
| Bazál večer + nejvyšší po večeři + pokles | 3 | 7 | 0 | 1 | 322 | 0 / 1 | 48 | 65–82 |
| Ráno zavřít milník a týdenní kartu | 2 | 0 | 0 | 1 | 204 | – | 5 | 16–26 |
| Oběd: „Ano, 10 j.“ + čas inzulinu | 13 | 6 | 0 | 5 | 886 | 1 / 1 | 96 | 143–190 |
| Oběd: hledání jídla psaním („guláš“) | 11 | 3 | 5 | 5 | 766 | 1 / 1 | 93 | 133–173 |
| Oběd: nové jídlo jen názvem („Rizoto s houbami“) | 12 | 4 | 16 | 5 | 768 | 1 / 1 | 110 | 151–191 |
| Menší porce po píchnutí + otázka za 60 min | 13 | 6 | 0 | 6 | 986 | 2 / 1 | 122 | 173–225 |
| „Nevím“ u inzulinu | 12 | 6 | 0 | 5 | 883 | 1 / 1 | 94 | 140–187 |
| Výpadek senzoru („nemám hodnotu“) | 11 | 7 | 0 | 5 | 921 | 1 / 1 | 93 | 141–190 |
| Zpětný zápis oběda v 16:00 (obě hodnoty a pokles z grafu) | 12 | 6 | 0 | 5 | 817 | 1 / 1 | 94 | 137–180 |
| Vynechaný oběd s inzulinem | 2 | 0 | 0 | 1 | 206 | – | 5 | 16–27 |
| Svačina | 4 | 2 | 0 | 4 | 552 | – | 13 | 42–71 |
| Nemoc: zapnout | 1 | 0 | 0 | 1 | 208 | – | 2 | 13–24 |
| Nemoc: denní dotaz + snídaně | 9 | 4 | 0 | 5 | 1 051 | 1 / 0 | 54 | 109–164 |
| Úplně první snídaně (neznámé jídlo, hledání) | 9 | 1 | 6 | 5 | 486 | 1 / 0 | 56 | 82–107 |

Převzetí plánu u sestry (jednou): asi 7 klepnutí, 6 stránek, asi 350 slov, 5–10 min s výkladem (odhad z kódu převzetí; automatický průchod se zasekl na stránce s dávkami, ne chyba makety).

### 2b. Den a týden

| | Klepnutí | Posunutí | Psaní | Otevření aplikace | Pohledy do senzoru | Čas |
|---|---|---|---|---|---|---|
| **Jedno hlavní jídlo (průměr)** | 10–11 | 4 | 0 | 1 | 1 teď + 1 graf | 2–3 min |
| **Běžný den** (3 jídla + bazál + zavření karet) | 37 | 19 | 0 | 4 | 3 teď + 3 graf | **8–11 min** (z toho senzor 2,8 min) |
| **Den v prvních 2–3 týdnech** (čte vše, jídla neznámá, hledá psaním) | 35–40 | 12–19 | 15–30 | 4 | 6 | **asi 24 min** |
| **Týden v rutině** (+1 zpětný zápis, 1 nové jídlo, 1 menší porce, týdenní karta) | asi 265 | asi 135 | asi 20 | 28 | 42 | **60–80 min** |
| Před kontrolou: export ze senzoru do ordinace | mimo aplikaci | | | | | 15–45 min s pomocí rodiny, bez ní spíš neprovede (A3) |

Porovnání s 15. 10. 2026: tehdy 80–90 klepnutí a 13–16 min denně, 10 otevření, 6 přechodů do senzoru a týdenní export. Teď 37 klepnutí, 4 otevření, 4 sezení se senzorem (6 odečtů), export jednou za období. Zátěž klesla zhruba na polovinu klepnutí a dvě třetiny času; **zbývá čtení grafu a délka obrazovek**.

## 3. Kde se pacient zasekne, splete nebo zkreslí data

| # | Místo | Co se stane | Dopad na data |
|---|---|---|---|
| 1 | Nic ho nepřipomene | Aplikace se ozve jen při otevření (zásada „nic nehlídá“; systémové připomínky v `15` nejsou popsané). Zapomínající pacient otevře aplikaci 1–2× denně. | Chybí zápisy, vrcholy (otázka čeká 24 h a pak zmizí), otázka „pod 4?“ za 60 min přijde až večer. Nejvíc zkresluje učení i report (A1). |
| 2 | Krok 1 u oběda a večeře: **dvě stejné mřížky 16 čipů** pod sebou („Teď · 12:20“ a „Po snídani · 7:00–9:00“), obrazovka 3,4 výšky telefonu | Se slabším zrakem klepne nejvyšší hodnotu do mřížky „teď“ nebo naopak; vybraná mřížka „teď“ zůstane rozbalená. | Prohozený vrchol a hodnota při jídle – jídlo vypadá v cíli, nebo naopak (B1). |
| 3 | Nejvyšší hodnota za první dvě hodiny podle grafu, 3–5 h po jídle | Najít v grafu okno 7:00–9:00 a odečíst vrchol je nejtěžší úkon dne; mnozí opíší hodnotu teď nebo vrchol mimo okno. „Další“ jde stisknout i bez odpovědi, takže blok lze přeskočit. | Vrchol je hlavní míra učení i návrhu k dávce. Model ukazuje shodu s exportem 35 z 36, to je optimistické; export doplní jen své okno (v modelu 14 dní) (B2). |
| 4 | Zapomenutý zápis ze včerejška | Sloty jsou jen pro dnešek; zpětně jde doplnit jen bazál („Byl včera večer bazál?“). | Večeře zapomenutá do rána je ztracená, i když graf senzoru ji ještě ukazuje (B3). |
| 5 | Jiné jídlo pod stejným názvem | „Chléb se sýrem“ s jiným pečivem, „guláš“ s knedlíkem i chlebem. Otázka při rozchodu přijde až od 3,5 mmol/l. | Menší rozdíly splývají; jídlo se může stát „známým“ s rozmezím ze směsi. Vědomě přijaté riziko (`15` odst. 6). |
| 6 | „Naposledy“ v kroku 2 | Pacient klepne první položku seznamu, i když jedl něco jiného. | Zápis u špatného jídla. Riziko malé, jídla mají ikonu a štítek. |
| 7 | „Ještě ne“ → „Píchnuto · uložit snídani“ | Pacient klepne a pak teprve jde píchat; když ho něco vyruší, inzulin je zapsaný jako podaný. | Nadhodnocené „inzulin podle plánu“. Volba „Uložit, píchnu za chvíli“ existuje, ale je druhá (C1). |
| 8 | Porce „obvyklá“ | Volí se podle pocitu; obvyklá je nejpohodlnější volba. | Menší porce bez přiznání = pokles bez pravidla I-MENE. Nejde řešit obrazovkou, jen zaučením. |
| 9 | Export před kontrolou | Pacient, který umí volat a fotit, export ze senzoru do ordinace neodešle. | Report bez času v cíli a bez nocí; návrh k bazálu z nočních poklesů nevznikne (A3). |
| 10 | Nemoc | Zapne se jedním klepnutím, ale vypnout musí pacient; denní dotaz „Už je vám lépe?“ to řeší. | Bez problému. |

Pacient se v měřených tocích **nezasekl ani jednou na zamčeném tlačítku bez vysvětlení**: každé zamčené „Další“ má pod sebou větu, co chybí. „Bezpečí“ je jedním klepnutím z každého kroku.

## 4. Je řeč srozumitelná?

V pořádku: vykání bez rodu, hlas „my“ („Známe ho“, „Za 60 min od jídla se zeptáme…“), otázky na věc („Je inzulin k tomuto jídlu už píchnutý?“), tlačítka jako odpovědi, „glukóza“, žádné „report“, „medián“, „skóre“. Věty v hlavních tlačítkách jsou krátké.

Žargon a nejasnosti, na které pacient 68 let narazí (texty z obrazovek):

| Kde | Text | Proč vadí | Návrh |
|---|---|---|---|
| Krok 1, čipy | „…jídlo zapíšeme i tak, do učení se započítá až s exportem“ | „učení“ a „export“ pacient nezná | „…jídlo zapíšeme i tak. Hodnotu doplníme na kontrole.“ |
| Krok 1, osa inzulinu | „Uprostřed je pásmo, kdy se zápis počítá do učení.“ | „učení“ | „Nejlépe je píchnout v tomto pásmu.“ (nesmí znít jako pokyn k času dávky – ověřit s `15` odst. 10 D-CISTA) |
| Krok 3, stupnice | „Rozmezí je z 25 zápisů bez krajních hodnot; po prvních 13 bylo 11–12,8.“ | statistika | „Spočítáno z 25 vašich zápisů.“ (věta o dřívějším rozmezí do detailu jídla) |
| Krok 3, ovesná kaše | Stupnice ukazuje řádek „s doplňkem 0 ze 3 v cíli“, ale doplněk se už nenabízí (stažen po 3 neúspěších); nabízí se procházka „zatím nevyzkoušená“ | pacient vidí radu, která nepomohla a kterou mu už nedáváme | řádek „s doplňkem“ u stažené rady nezobrazovat (B4) |
| Dnes | „Před kontrolou pošlete do ordinace export ze senzoru.“ | „export“; pacient neví, jak | viz A3 |
| Dnes, cesta ke kontrole | „Vašich častých jídel známe 19 z 20.“ | v pořádku | – |
| Výsledek jídla | „Podle hodnot, které jste opsali; export z aplikace senzoru je upřesní.“ | „export“ | „…na kontrole je upřesníme.“ |

## 5. Ordinace – měření

| Krok | Kdo | Kliknutí | Posunutí | Psaní | Text ke čtení | Odhad času | Poznámka |
|---|---|---|---|---|---|---|---|
| Zařazení: 4 podmínky + „bere tablety“ | lékař | 4–5 | 0 | 0 | 282 slov | 1 min | |
| Výchozí čas v cíli 58 % a pod 3,9 3 % | lékař | **11** | 0 | 0 | | 0,5 min | volič ±1 od 50 % a od 0 % |
| Dávky 8/10/8/18 j. | lékař | **44** | 0 | 0 | | 1–1,5 min | volič ±1 od nuly; běžné dávky DM2 (bazál 30, k jídlu 12–14) = 66+ |
| Ověření dávek s pacientem, pokračovat, vydat | lékař | 4 | 0–1 | 0 | stránka 2 035 px | 1–2 min | návyky i pravidla předvyplněné |
| **Zařazení celkem** | lékař | **63** | | 0 | | **4–6 min** | |
| Zaučení (8 bodů + dokončit) | sestra | 9 | 0 | 0 | 282 slov | 15–25 min | čas je výklad, ne kliknutí |
| Převzetí plánu | pacient u sestry | asi 7 | | 0 | asi 350 slov | 5–10 min | |
| Nahrání exportu | sestra | 1 v ukázce; reálně 6–10 | | 0 | | 2–5 min; bez exportu 0 nebo +5–10 min shánění | |
| Kontrola krok 1: souhrn + léky | lékař | 3 | 1–2 | 0 | 601 slov | 2–3 min | |
| Krok 2: bazál (8 j. dolů o 2), snídaně (+1), oběd (ponechat) | lékař | 10 | 2–3 | 0 | 467–672 slov na stránku, 8 ověřovacích bodů u návrhu | 2–3 min na návrh, tj. 6–8 min | „Vše sedí“ 1 klik; skutečné ověření techniky píchání 1–2 min |
| Beze změny (4 položky) | lékař | 1 | | 0 | 304 slov | 0,5 min | |
| Krok 3 potvrdit + vydat | lékař | 2 | | 0 | 336 slov | 1 min | |
| Krok 4 předat | lékař + pacient | 1 + převzetí pacientem | | 0 | 178 slov | 1–2 min | |
| **Kontrola celkem (lékař)** | | **17** | **5** | **0** | asi 2 700 slov | **10–14 min** | |

**Vejde se to do 15 minut bez psaní?** Psaní nikde (zásada 8 drží; jediné psaní v ordinaci je nepovinná vlastní otázka pacienta). Kliknutí nejsou problém kontroly – 17 je pod cílem „≈ 10 místo 30“ z 1. 10. 2026 jen o málo nad. Problém je **čas čtení a ověřování**: tři dávkové návrhy po 8 bodech, souhrn 600 slov. Část NutriFee zabere 10–14 min; na běžnou agendu návštěvy (prohlídka nohou, laboratoř, recepty, ostatní léky) zbývá 1–5 min. U zařazení je problém **volič dávek** (44–66 kliknutí, A2).

### 5a. Co lékař na kontrole potřebuje vědět a zda to dostane

| Potřeba lékaře | Dostane? | Kde / co chybí |
|---|---|---|
| Byly poklesy pod 4 (po jídle, v noci)? | Ano po jídle; noci **jen s exportem** | Bezpečnost; bez exportu noci chybí a návrh k bazálu nevznikne (A3) |
| Píchal pacient, jak má? | Ano | „Inzulin podle plánu 96 %, 6× jinak, 3× neví“ |
| Jedl konzistentně? | Ano | „Obvyklá porce 98 %“ |
| Jak spolehlivá jsou data? | **Částečně** | Tkanina zápisů za 92 dní a „2 zápisy bez dat“; chybí číslo „zapsáno X z Y hlavních jídel“ a „nejvyšší hodnota opsána u X z Y“ – jmenovatel „236 ze 239 jídel“ jsou jen zapsaná jídla (B8) |
| Co změnit a proč? | Ano | Návrhové karty s důvodem, oslabením, ověřením a větví postupu |
| Je to dávka, nebo jídlo? | Ano | bod „Nad cílem nejsou jen jedno nebo dvě jídla“, jídla opakovaně nad cílem |
| Technika píchání, jídlo mezi měřeními, stres | Ne z dat – ověřuje lékař s pacientem | 3 z 8 bodů nelze ověřit kliknutím bez rozhovoru (B6) |
| HbA1c a léky | Ano | HbA1c z karty pacienta, otázka „Léky mimo inzulin“ |
| Zvládá pacient aplikaci? | Ne | žádný signál zátěže (kolik otázek přeskočil, kolik dní bez otevření) (B8) |

## 6. Hlavní čísla

- Pacient: **37 klepnutí, 6 pohledů do senzoru, 0 psaní, 8–11 min denně**; týden **≈ 265 klepnutí, 42 pohledů, 60–80 min**; první týdny **≈ 24 min denně**.
- Jedno jídlo: **9–13 klepnutí, 3–7 posunutí, 5 obrazovek, 770–990 slov, 2–3 min**.
- Ordinace: zařazení **63 kliknutí (44 dávky), 4–6 min**; kontrola **17 kliknutí, 10–14 min** lékaře + **2–5 min** sestry na export; zaučení **15–25 min** sestry.

## 7. Nálezy a návrhy

### A – provoz nefunguje

**A1. Zapomínající pacient nemá nic, co ho k aplikaci přivede.** `15` popisuje jen připomínky „při otevření aplikace“ (karta „Co teď“, otázka za 60 min „jen při otevření, nic nehlídá“, odst. 7); systémové připomínky telefonu nejsou nikde. Celý model dat stojí na tom, že pacient otevře aplikaci 4× denně; pacient, který „občas zapomíná“, ji otevře 1–2×. Výsledek: chybějící zápisy, propadlé vrcholy (blok čeká 24 h), otázka na pokles po menší porci přijde večer místo za hodinu.
*Návrh (ke schválení vlastníkem, neporušuje `15`):* místní připomínky v telefonu, bez sítě, nejvýš 4 denně: tři k jídlům a jedna k bazálu, plus jednorázová za 60 min po menší porci s inzulinem (B-HYPO už čas má). Časy **zvolí pacient se sestrou při zaučení čipy** („snídám kolem 7 · 8 · 9“), lékař nic nenastavuje (odst. 7a: lékař žádná okna nenastavuje). Text připomínky je otázka, ne pokyn k dávce: „Chystáte se k obědu? Zapište ho v NutriFee.“ Aplikace se dál řídí tím, který slot je prázdný; připomínka jen otevře Dnes.

**A2. Dávky při zařazení voličem ±1 od nuly.** 44 kliknutí v modelu, 66 a víc u běžných dávek, plus 11 kliknutí na výchozí čas v cíli (±1 od 50 %). Lékař ťuká desítky krát a překlep o jednu jednotku přehlédne – kontrola zpětným čtením pacientem v převzetí to zachytí jen tehdy, když pacient dávky zná.
*Návrh:* volič dávky jako mřížka čísel 1–40 j. (stejný vzor jako čipy glukózy, v ordinaci bez psaní) s jemným ±1 vedle; dávka se dál **nepředvyplňuje** (rozhodnutí 6. 10. 2026 platí). Výchozí čas v cíli a čas pod 3,9 stejnou mřížkou po 5 % s ±1. Zařazení klesne z 63 na asi 15 kliknutí. Totéž pro volič nové dávky na kontrole, kde je dnes rozdíl 1–3 kliknutí – tam stačí ±1.

**A3. Cesta exportu je pro tohoto pacienta neproveditelná a bez exportu chybí bezpečnostní údaj.** Pacient dostane jen větu „Před kontrolou pošlete do ordinace export ze senzoru“; jak, maketa záměrně neříká (`15` odst. 6a, otevřený úkol ostré aplikace). Pacient, který umí volat a fotit, export ze senzoru do ordinace nepošle. Bez exportu report ukáže „bez dat“ u času v cíli a pod 3,9 (ověřeno: obrazovka to zvládne čistě), ale **noční poklesy a návrh „Posoudit bazál – noční hodnoty pod cílem“ zmizí**, protože noci zná jen export.
*Návrh (k rozhodnutí vlastníka; `15` pojmenovává úkol, neuzavírá ho):* udělat z exportu krok sestry **na kontrole s pacientovým telefonem v pacientově ruce** – pacient sám otevře sdílení v aplikaci senzoru a sestra soubor přijme v ordinaci; personál se nepřihlašuje účtem pacienta (`15` odst. 6a drží). Připomínku na Dnes pak změnit na „Na kontrolu si vezměte telefon, ve kterém máte aplikaci senzoru.“ Do reportu bez exportu doplnit větu v části Bezpečnost: „Noční hodnoty nejsou k dispozici – bez exportu nelze posoudit noční poklesy.“

### B – funguje, ale stojí zbytečně moc nebo zkresluje data

**B1. Dvě stejné mřížky čipů na kroku 1.** Hodnota teď a nejvyšší po předchozím jídle jsou dva bloky po 16 čipech pod sebou; zvolený blok „teď“ zůstává rozbalený. *Návrh:* po výběru „teď“ blok sbalit na řádek „Teď: 7 mmol/l · Změnit“ (stejně jako už odpovězený blok k předchozímu jídlu); blok k předchozímu jídlu dát před „teď“ s výraznější hlavičkou času. Krok 1 se zkrátí z 3,4 na asi 2 výšky telefonu.

**B2. Nejvyšší hodnota z grafu je nejtěžší úkon dne.** 3 odečty denně à asi 30 s, se slabším zrakem chybové; blok lze přeskočit. *Návrh:* pod nadpisem jednu větu „V grafu najděte čas 7:00–9:00 a nejvyšší bod v něm.“; ve studii sledovat podíl přeskočených a neshodných vrcholů (shoda s exportem už v reportu je – doplnit „bez odpovědi X z Y“). Odečet při bazálu večer nechat, ráno se nic nepřidává.

**B3. Zapomenutý zápis ze včerejška nejde doplnit.** Sloty jsou jen pro dnešek. *Návrh:* ráno na Dnes jedna karta „Včera chybí večeře – doplnit?“ se stejným zpětným zápisem (obě hodnoty a pokles z grafu), do 24 h od slotu – stejné okno, jaké už má otázka na nejvyšší hodnotu.

**B4. Žargon a stažená rada na stupnici.** Viz tabulka v oddílu 4 („učení“, „export“, „bez krajních hodnot“, řádek „s doplňkem“ u rady, kterou už nenabízíme). *Návrh:* přepsat podle tabulky; u stažené rady řádek na stupnici nezobrazovat.

**B5. Obrazovky jsou dlouhé.** Dnes 3,8–4,6 výšky telefonu, krok 3 3,2, krok 1 2,9–3,4; jedno jídlo 770–990 slov; 19 posunutí denně. Senior čte první výšku obrazovky. *Návrh:* v kroku 3 u známého jídla se sbalenou (rutinní) radou sbalit i stupnici do řádku „Po tomto jídle obvykle 12–15 · nad cílem · Ukázat“; na Dnes v rutině sbalit kartu „Cesta ke kontrole“ do řádku s počtem dní.

**B6. Osm ověřovacích bodů u každého dávkového návrhu.** Tři body (technika a místo píchání, jídlo mezi jídlem a měřením, stres a nemoc) nejdou ověřit z dat a lékař je musí probrat s pacientem; „Vše sedí“ svádí k mechanickému kliknutí. *Návrh (k rozhodnutí, mění dělbu práce z `15` odst. 15a „Ověření s pacientem“):* sestra tyto body probere před lékařem v části „Sestra“ a lékař je u návrhu vidí jako „sestra ověřila: sedí“. Ušetří 2–4 min lékaře; rozhoduje dál lékař.

**B7. Kontrola se do 15 minut vejde jen jako celá náplň návštěvy.** Část NutriFee 10–14 min lékaře. *Návrh:* krok 1 („Léky mimo inzulin“, nahrání exportu) a předání v kroku 4 (převzetí plánu pacientem) dělá sestra; lékař začíná na návrzích. Lékař pak 7–10 min.

**B8. Lékař nemá číslo spolehlivosti dat.** „Obvyklá porce 236 ze 239 jídel“ má jmenovatel jen zapsaná jídla; kolik hlavních jídel chybí, ukazuje jen tkanina. *Návrh:* do řádku „mimo učení“ doplnit dvě čísla bez hodnocení: „zapsáno 239 z 276 hlavních jídel · nejvyšší hodnota opsána u X z 239“. Lékař z toho pozná, jak moc návrhům věřit, a zároveň vidí, jestli pacient zátěž zvládá.

**B9. Podíl známých jídel bude v praxi nižší než v modelu.** Modelový pacient jí 21 jídel a zná 19; jídlo je známé po 4 shodných zápisech z 6. Senior s pestrou stravou jí řadu jídel méně než 4× za čtvrt roku – u nich nikdy nedostane „Kam se po něm glukóza dostane“. *Návrh:* nic neměnit na pravidlech, ale v pilotu měřit „podíl zápisů u známého jídla“ a při zaučení ukazovat „Je to jako…“ jako hlavní cestu u jídel, která jí zřídka.

### C – drobnosti

- **C1.** „Píchnuto · uložit snídani“ po „Ještě ne“ pacient klepne dřív, než píchne. Pod tlačítko přidat větu „Klepněte, až budete mít inzulin píchnutý“ – ta už je výš v kartě, dát ji přímo nad tlačítko.
- **C2.** Volba „Ano, 10 j.“ chce ještě čas inzulinu („právě teď“ / „před 5 min“…), tedy jedno klepnutí navíc; „právě teď“ předvybrat (nejde o dávku ani o odpověď na otázku o podání).
- **C3.** Svačina: 4 klepnutí, ale 552 slov – krok 3 svačiny může být jen „Uložit svačinu“ bez stupnice.
- **C4.** Karta „Byl včera večer bazál?“ zůstává na Dnes celý den; po poledni ji sbalit do řádku.
- **C5.** V ukázce kapitola „Zařazení“ zakládá návrh plánu bez startovních návyků (`NF.newDraft`), kdežto ostrá cesta (`startDraft`) je předvyplní; ruční průchod tak bez 4 kliknutí na návyky plán nevydá. Jen příběh, ne aplikace.

## 8. Jak aplikace pacientovi pomáhá s jídlem oproti vážení a počítání maker

**Co pacient od NutriFee u jídla dostane (měřeno na obrazovkách):**
1. **Před jídlem u známého jídla** vidí, kam se po něm jeho glukóza obvykle dostane (pruh 4–16 mmol/l s vyznačeným rozmezím jeho vrcholů, např. ovesná kaše 12–14,9) a kam s radou (druhý řádek). Žádné číslo z tabulky – jeho vlastní reakce z 4 a více zápisů.
2. **Jednu až dvě konkrétní rady** k tomu jídlu: porce zpět k obvyklé (jen před píchnutím, oběma směry), doplněk ze schváleného seznamu („plátek sýra nebo vejce“), pořadí („Snězte nejdřív zeleninu, potom zbytek jídla“), procházka 15 min. U každé, kolikrát mu pomohla („s doplňkem 0 ze 3 v cíli“), a rada, která nepomáhá, se po třech pokusech přestane nabízet.
3. **Po jídle** kartu „Jak to dopadlo“ (při jídle → nejvyšší, cíl do 10) a poděkování za čin, ne za číslo.
4. **Bezpečnost**: po menší porci s inzulinem hned pravidlo a za 60 min otázka na pokles; při „pod 4“ a „nad 15“ hned pravidlo.
5. **Lékař** dostane na kontrole, která jídla jsou opakovaně nad cílem a zda jde o dávku, nebo o jídlo – a změní dávku. To je pro tuto kohortu hlavní účinek: u modelové ovesné kaše (25 z 25 nad cílem) nepomohl doplněk ani pořadí, pomohl až návrh „posoudit dávku ke snídani“.

**Kroky a čas na jedno hlavní jídlo:**

| | NutriFee (naměřeno) | Vážení + aplikace na sacharidy a makra (odhad) |
|---|---|---|
| Pomůcky | telefon, senzor | telefon, kuchyňská váha, databáze potravin |
| Klepnutí | 9–13 | 25–35 (vyhledat 2–4 složky, vybrat, zadat gramy, potvrdit) |
| Psaní | 0 u známého jídla; 5–16 znaků u nového | 20–30 znaků (hledání složek + gramy) |
| Další úkony | 1–2 pohledy do senzoru (55 s) | tárovat talíř, navážit 2–4 složky (60–90 s), u vařeného jídla odhadnout podíl z hrnce |
| Čas | **2–3 min** (z toho senzor asi 1 min) | **3–5 min** doma; v restauraci, jídelně nebo u rodiny nelze vážit, odhad gramů má chybu desítky procent |
| Den (3 jídla) | 8–11 min, 37 klepnutí | 12–16 min, 90–110 klepnutí, 60–90 znaků |
| Úvodní naučení | zaučení u sestry 15–25 min | edukace počítání sacharidů obvykle několik hodin a procvičování |
| Co pacient zjistí | kam se **jeho** glukóza po **jeho** jídle dostane a co mu u něj pomohlo | kolik gramů sacharidů jídlo podle tabulky má |
| Co s tím při pevné dávce | rada před jídlem (porce k obvyklé, doplněk, pořadí, pohyb); dávku řeší lékař podle dat | držet stejné gramy k pevné dávce; vlastní reakci nezná, pokud si ji sám nedohledá v senzoru |

Věcně: NutriFee je asi o třetinu rychlejší a nepotřebuje váhu ani psaní, ale **neušetří pohledy do senzoru** – ty jsou cena za to, že se aplikace učí z reakce těla (bez napojení na senzor, `15` odst. 6a). Počítání sacharidů ve vlastním smyslu NutriFee nenahrazuje a nemá (zásada 2): u pevné dávky nepotřebuje pacient vědět gramy, ale zda jí „jako obvykle“ a co dělat u jídel, po kterých je opakovaně nad cílem. Slabé místo proti vážení: jídla, která pacient jí zřídka, se NutriFee nenaučí (B9), a u jídla pod stejným názvem s jinou přílohou rozezná rozdíl až nad 3,5 mmol/l.

---
*Skripty a výstupy měření (scratchpad, nepublikuje se):* `k4-real/lib.js`, `k4-real/day.js` (pacient), `k4-real/clinic.js` a `k4-real/rwords.js` (ordinace), výsledky `k4-real/out/results.json`, `k4-real/out/day.log`, snímky `k4-real/out/*.png`.
