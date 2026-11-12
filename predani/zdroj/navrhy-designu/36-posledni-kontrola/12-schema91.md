# 36 / 12 – SCHEMA 91: zbytek poslední kontroly

*11. 11. 2026 · podklady: `05-rozhodnuti.md` (body 13–15), `08`, `10`, `11` (oddíly „zbývá“), nálezy `01`–`05`, `07` · pracováno na kopii, pak přeneseno na Disk · nic necommitováno ani nepublikováno, `~/Documents/Nutrifee` ani Supabase se nevolaly, `maketa-rozhodovaci/predani/` beze změny.*

Změněné soubory (`maketa-rozhodovaci/`): `app/core.js`, `app/ui.js`, `app/screens.js`, `app/screens-clinic.js`, `app/data/registry.js`, `app/data/catalogs.js`, `app/design.css`, `app/tokens.css`, `demo/guide.js`, `demo/tour-content.js`, `demo/intro.js`, `demo/results.js`, `demo/sync-config.js` (`D.build`), `demo/scene-items.js` (generátorem), `nutrifee-rozhodovaci-maketa.html` a `design-system/index.html` (jen verze), testy (`schema90-jadro`, `schema84-jadro`, `rychle`, `zlate-vystupy`, `robustnost`, `tokeny`, `kontrola74-obsah`, `zaverecne80`, `nutrifee-rozhodovaci-maketa`), `zlate-vystupy/*.json` a `README.md`; `15-ZDROJ-PRAVDY-MAKETA.md` (odst. 4, 6a, 7, 8, 10, 16, 19).

---

## 1. Rozhodnutí 13–15

| Bod | Výsledek | Jak |
|---|---|---|
| 13 „Jako obvykle“ | **hotovo** | `NF.usualMeal(S, jídlo)`: posledních `S-DAVKA.obvykle_n` (3) zápisů téhož jídla dne v aktivním plánu je totéž **známé** jídlo v obvyklé porci s dávkou podle plánu, bez opravy, mimo nemoc a „neobvyklý den“, se stejnou dávkou v plánu. V kroku 1 je mezi odpověďmi o inzulinu rovnocenná volba „Jako obvykle · píchnuto 8 j. podle plánu · jídlo, obvyklá porce“ (nic předvybraného). Akce `mealUsual` zapíše inzulin podle plánu (právě teď), jídlo a obvyklou porci, stopa `jidlo.jako_obvykle`. Glukózu pacient vybírá dál posuvníkem, hlavní tlačítko „Další: rada a zápis“ přeskočí krok 2 (Zpět ho otevře); rady a pravidla v kroku 3 jsou stejné. Jiná odpověď o inzulinu, jiné jídlo nebo porce předvyplnění zruší. **Zvoleno nejopatrněji:** ne při nemoci, u svačiny, u zpětného zápisu a u jídla, které aplikace nezná. Práh je provozní parametr S-DAVKA (v2, bez stavu). |
| 14 Jeden čas otázky | **hotovo** | I-MENE a I-VYSSI nemají vlastní čas: katalog `linkParam: ['B-HYPO','pripominka_min']`, `fixed`; `NF.instructionValue`, `NF.instrValueOf` (i starší hodnota uložená v plánu říká aktuální čas); meze `I-MENE.v` a `I-VYSSI.v` z `NF.PARAM_BOUNDS` pryč. Po večeři `NF.addHypoWatch` založí dvojici sledování (`pair`): otázku za `pripominka_min` a ranní otázku na noc. Pokles se počítá jednou (`lowEvents` po jídle dne) a ranní „ne“ nepřepíše večerní „ano“ (`NF.answerHypoWatch`). Na Dnes „Potom: za 60 minut od jídla se zeptáme…, a ráno ještě na noc“, v kroku 3 „Co dál: za 60 minut … a ráno ještě na noc“ (`V.hypoNext`). Řeší klinika K13 a pacient S8. |
| 15 Jediná noc pod 3,0 | **hotovo** | `NF.proposals`: s exportem stačí `assessed >= minNoci` **nebo** noc pod `D-BAZAL.velmiNizka`; u krátkého exportu „Co návrh oslabuje“ řekne „posouzeno jen N nocí z exportu (návrh běžně od 10); karta vznikla kvůli noci pod 3,0 mmol/l, jedna taková noc stačí“. Řeší klinika K9. |

## 2. Zbylé nálezy

### Ordinace (`03-ordinace.md`)

| Nález | Výsledek |
|---|---|
| S3 zaokrouhlení času v cíli | **opraveno** – `NF.sensorSummaryFrom`: `tir = round(v cíli / n)` (dřív 100 − pod − nad) a `raw` s nezaokrouhlenými podíly; semafor (`tirState`), čas pod cílem (`tbrBlock`, dlaždice), bod o vyrovnání (`tirOk`) a vyprávění se řídí `NF.sensorRaw` (raw jen když odpovídá zobrazenému číslu, jinak zobrazené). **Modelový čas v cíli je 69 % (68,602 %), dřív chybně 68 %.** Upraveno: test hlavní sady (souhrn, dlaždice „dříve 58 → teď 69 · +11 p. b.“, věta „Čas v cíli byl 69 %“), `kontrola74-obsah`, `zaverecne80`, `15` odst. 6a a 16 (SCHEMA 80). Vyprávění cituje číslo dynamicky. V detailu dlaždice věta „Procenta jsou zaokrouhlená, semafor se řídí přesným podílem.“ |
| S6 jiný lék u karet k dávce | **opraveno** – `NF.reviewAlerts`, `NF.proposalWeak`: odpověď „Ano“ u jiného léku nebo změny zdravotního stavu (sestra nebo kontrola) je první položkou „Co návrh oslabuje“ každé karty i řádku k dávce; čte se při vykreslení, platí i pro odpověď po zahájení kontroly. Nic neblokuje. |
| S8 nepoužívání aplikace | **opraveno** – `NF.lowUsage` (S-SOUHRN v2, provozní `malo_zapisu_pct` 30): věta „Pacient aplikaci skoro nepoužíval: zapsal X z Y hlavních jídel období (Z %). Probrat s ním důvod a zda v NutriFee pokračovat.“ v „Co se dělo“ a nahoře v kroku 2 (upozornění, ne zámek); „Pacient za období nezapsal žádné jídlo“ bez „zatím“. **Zvoleno:** signál místo nové návrhové karty – karta by potřebovala větev D-POSTUP a rozhodnutí, které `15` neurčuje. |

### Klinika (`01-klinika.md`)

| Nález | Výsledek |
|---|---|
| K9 `minNoci` u noci pod 3,0 | **opraveno** (bod 15) |
| K13 I-MENE {v} vs `pripominka_min` | **opraveno** (bod 14) |
| K15 `advise` s `none` | **opraveno** – „bez inzulinu“ dá u porce „K tomuto jídlu nemáte zapsaný inzulin – radu k množství jídla nedáváme.“ místo „Inzulin už máte v těle“ (nejopatrnější: žádná rada k porci, věty R-PORCE mluví o dávce). `rady.json` beze změny. |

### Pacient (`02-pacient.md`)

| Nález | Výsledek |
|---|---|
| V5 | **opraveno** (bod 13) |
| V6 nemoc omylem | **opraveno** – první den nemoci je na Dnes tiché tlačítko „Zapnuto omylem, vypnout“; v Bezpečí přepínač popsaný „Není mi dobře · zapnuto od …“ / „· vypnuto“ a tlačítko „Už je mi dobře, vypnout“. |
| S1 krátká podoba nemoci a vysoké glukózy | **opraveno** – `coDal` I-NEMOC-JIDLO a I-VYSOKA obsahuje větu, kdy vyhledat lékařskou pomoc, doslova z celého znění (test to hlídá); nové verze v3. |
| S3 „Píchnuto jinak“ u čekajícího inzulinu | **opraveno** – volba s posuvníkem jednotek (`pendingOther`, `pendingUnitsSet`, `NF.confirmPendingInsulin(…, 'other', jednotky)`); vyšší dávka spustí I-VYSSI a sledování. |
| S7 „V cíli 0 ze 4“ | **opraveno** – hlavička jídla jen „Zapsáno 4×.“; „V cíli X z N zápisů“ je v rozbaleném detailu. |
| S8 | **opraveno** (bod 14) |
| S9 dvě otázky na Dnes | **opraveno** – blok k minulému jídlu je na Dnes jen, když dnes už žádné jídlo nezbývá; jinak ho nese krok 1. |
| N2 „Po obědu“ | **opraveno** – `prevLabel` z `NF.MEAL_PO` („Po obědě“). |
| N3 „záznam“ | **opraveno** – „Zápis ze včerejška chybí“, „zápis chybí“; S-PRIPOMINKY v3 „…a snídani zapište“. |
| N4 „NutriFee“ v oznámeních | **zapsáno** jako vědomá výjimka v `15` odst. 19 a v S-PRIPOMINKY. |
| N5 „min“ | **opraveno** – „minut“ celým slovem v I-HYPO (v3), I-NEVIM (v3), I-MENE, I-VYSSI a v „Potom/Co dál“. |
| N6 klíč na P02 | **opraveno** – „Dávky se značkou 🔑 určil lékař. My je jen připomínáme…“ přímo u první dávky. |
| N7 „Je to jako…“ | **opraveno** – `NF.likeCandidates(S, název)`: navíc nejvýš 3 jídla ze seznamu, jejichž název obsahuje slovo názvu (od 4 písmen); otázka „podobá se některému jídlu ze seznamu?“. |
| N8 slepá ulička | **opraveno** – „K tomuto jídlu plán nemá dávku“ s „Zapsat jako svačinu“. |

### Oprava jídla a hodnot (UI nad `NF.editEpisode`)

**Hotovo.** Panel „Opravit zápis“ na Dnes má pod porcí řádky „Jídlo / Glukóza před jídlem / Nejvyšší po jídle · Změnit“; vždy je otevřená jen jedna věc (P1): hledání nebo „naposledy“ (`mealEditFood`) nebo posuvník glukózy s „Uložit opravu“ (`mealEditValue`, `mealEditSub`). Jádro zapíše `jidlo.zapis.opraven` a zápis není čistý. Ověřeno v prohlížeči při 320 px s písmem 160 %: bez přetečení, nic pod 15 px.

### Přístupnost (`07-pristupnost.md`, `10` Zbývá)

| Nález | Výsledek |
|---|---|
| Detail jídla: „hranice cíle 10,0 mmol/l“ přečníval o 24 px | **opraveno** – popisek se zalomí (`--nf-goal-label-max` 7,5em), stojí nad čárou v místě nad řádky (`.peak .rows` padding a začátek čáry podle `--nf-fs-xs`), mezera ve slovech osy. Měřeno: 0 přetečení při 320 px / 160 % i 390 px. |
| Můj plán: „dnes“ přečníval o 5 px | **opraveno** – i dnešek zkratkou dne, dnešní sloupec zvýrazněný a v legendě „dnes“. Měřeno: 0 přetečení. |
| Nový prvek: dlouhá odpověď „Jako obvykle: … jídlo“ v kroku 1 | **ošetřeno** – `.qdone` s `minmax(0,1fr)` a zalomením, „Změnit“ se při 320 px / 160 % nevytlačí (dřív by přečníval o 50 px). |
| Text v SVG pod 15 px | **opraveno** – `--nf-fs-fig-xs…xl` 17 px (obrázek 300–320 jednotek na 288 px vyjde ≥ 15 px); test `tokeny` to hlídá. Pozn.: `V.insulinAxis` a `V.leverAnim` od SCHEMA 86 na obrazovkách pacienta nejsou (test hlavní sady), týká se katalogu. |

### Garant (`04-garant.md`, `11`)

| Nález | Výsledek |
|---|---|
| N7 dvojí „Pacient také ví“ | **opraveno** – scéna 5 krok 3: „Ze zaučení si odnesl i to, že před kontrolou pošle do ordinace export ze senzoru.“; mapa scén přegenerována. |
| Pevné „28“ | **opraveno** – `demo/intro.js` záloha počtu z katalogu jádra; `demo/results.js` popis otisku „pro všechny položky ke schválení“. |
| R-POKYNY „sedm“ (zadání koordinátora) | **opraveno** – R-POKYNY v2 „Osm bezpečnostních pravidel … vyšší dávka než v plánu …“; vyprávění scény 3 („osm“, čas I-MENE z B-HYPO); `15` odst. 4; průvodce už „osm“ měl, „Co schvalujete“ uvádí novou verzi. |

### Kód (`05-kod.md`)

| Nález | Výsledek |
|---|---|
| K16 testy, které nemohou selhat | **opraveno** – `rychle`: jádro jednotky nepočítá (i `units = units + 2`, `++/--`) a nové dávky na začátku kontroly = dávky plánu; blok poklesu nastaví **jádro z dat** (do období se doplní čistý pokles a návrhy se přepočítají); `zlate-vystupy`: přesně 32 scén i v uložených výstupech; hlavní sada: místo `… || true` skutečné ověření vyřazené větve; `robustnost`: vykreslení bez vedlejšího účinku přes 10 kapitol × 3 role × všechny stránky. |
| K10 velikost stavu | **částečně** – body průběhu z importu bez řetězce `at` (nikdo ho nečetl): stav po importu 92 dní 621 → 579 kB v měřeném vzorku. **Zbývá (vrstva):** komprese a rozdíly při posílání; body v modelových datech `demo/fixtures.js` `at` dál nesou. |
| K11 předformátované texty | **beze změny v jádře** – období senzoru je od SCHEMA 90 ISO. Texty rozpracované kontroly a stopy zůstávají (stopa je záznam; doporučení z `05` – připravit pacienta z kapitoly bez zahájené kontroly – je vrstva dema). |

## 3. Nové verze položek (vše ke schválení, provozní bez stavu)

| Položka | Verze | Co je nového |
|---|---|---|
| B-HYPO | v4 | jeden čas `pripominka_min` i pro pravidla; po večeři otázka za 60 min a ráno na noc |
| I-MENE | v3 | bez vlastního času (= `B-HYPO.pripominka_min`), „minut“ |
| I-VYSSI | v3 | bez vlastního času, „minut“, „po večeři i ráno“ |
| D-BAZAL | v3 | jediná noc pod `velmiNizka` stačí bez ohledu na `minNoci` |
| I-NEMOC-JIDLO, I-VYSOKA | v3 | krátká podoba s větou, kdy vyhledat lékařskou pomoc |
| I-HYPO, I-NEVIM | v3 | „minut“ celým slovem |
| R-POKYNY | v2 | „osm“ pravidel |
| S-DAVKA (provozní) | v2 | „Jako obvykle“, `obvykle_n` 3 |
| S-SOUHRN (provozní) | v2 | signál „skoro nepoužíval“, `malo_zapisu_pct` 30 |
| S-PRIPOMINKY (provozní) | v3 | „zapište“, otázka i po večeři, výjimka hlasu |

Registr dál **43 položek, 29 klinických, 14 provozních**; pravidel v plánu 8. Průvodce (`demo/guide.js`) má u všech nových verzí „Jak“ a „Co schvalujete“ (krátké podoby doslova z katalogu); `ucinek` R-PODOBNOST podle nové otázky.

## 4. Testy

Kopie `scratchpad/t91` (maketa, `15`, `CLAUDE.md`, `navrhy-designu/04-pohledy-2026-10-05`), stroj byl během práce silně vytížený (load 10–15), proto delší časy.

| Sada | Výsledek |
|---|---|
| **celá sada** `nutrifee-rozhodovaci-maketa.test.cjs` (konečný běh, výstup přečten celý) | **144 prošlo, 0 selhalo** (`EXIT 0`) |
| z toho podsady | zlaté výstupy 9/0, rychlá sada 15/0 (61 s), tokeny 8/0, obsah pacienta 9/0 (140 stavů), schema84-jadro 15/0, zaverecne80 22/0, faze2-jadro 32/0, faze2-pribeh 15/0, pravdivost 4/0, kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 18/0, ukládání 30/0, robustnost 14/0 |
| `schema90-jadro.test.cjs` (jádro + produkční sestavení bez `demo/`) | **43 prošlo, 0 selhalo** (37 dřívějších + 6 nových testů SCHEMA 91: body 13–15, ordinace S3/S6/S8, pacient S3/K15/oprava zápisu, texty S1/N5/N8) |

**První celý běh** (před dorovnáním testů) dal 133/11. Všech 11 selhání byly testy, které popisovaly staré chování a změnily se záměrně: otázka po večeři „ve 20:10 se neptáme“ (bod 14), počet sledování po vynechané večeři (+2), I-MENE s vlastní hodnotou (bod 14; zkouška přesunuta na I-NEVIM), „min“ → „minut“ (N5), „které už známe“ → „ze seznamu“ (N7), „Pacient zatím nezapsal“ (S8), čas v cíli 68 → 69 % (S3), „pravidla NutriFee v1“ → v2 (R-POKYNY), `ucinek` B-HYPO „za 60 minut“ a test tykání, který bral „zapište“ jako tykání „zapiš“ (`\b` bez příznaku u nezná písmena s diakritikou; opraveno na `\p{L}`). Každá změna testu má komentář SCHEMA 91.

**Zlaté výstupy přegenerované záměrně** (`zlate-vystupy/README.md`, oddíl „Přegenerováno záměrně“): `otisky.json` (12 nových verzí), `pribeh.json` (verze v registru scén, čas v cíli 69 % a `raw`), `kontrola.json` (69 %). `rady.json` a `stopa.json` beze změny. Po K10 (body bez `at`) přegenerováno znovu na zkoušku – beze změny.

**Mapa scén** `demo/scene-items.js` přegenerována (`scene-items.cjs`, 3 kola, pevný bod): rozhodovací scény všech položek beze změny (I-VYSSI dál scéna 3 krok 6, D-BAZAL 23/10, B-HYPO 13/5, I-MENE 12/2); změnily se jen vynechávané věty vyprávění („osm pravidel“, scéna 5 krok 3 po N7). Žádná položka nepotřebovala vlastní krok `D.itemScene`.

**Prohlížeč** (Playwright, kopie na 127.0.0.1:8930, `skripty/a11y.cjs`): při 320 px s písmem 160 % a při 390 px bez přetečení a bez textu pod 15 px v detailu jídla (P50), Mém plánu (P51), Dnes, panelu opravy jídla a hodnot, kroku 1 s „Jako obvykle“ (před i po volbě) a v kartě čekajícího inzulinu s „Píchnuto jinak“. Zbývá 1 px u tokenu dávky „10 j.“ v hlavičce inzulinu oběda při 320 px / 160 % (hlavička se SCHEMA 91 neměnila; jen zaznamenáno). Tabulka „Historie zápisů“ v detailu jídla roluje vodorovně ve vlastním rámečku (`.tablewrap{overflow:auto}`), stránka ne.

## 5. Kontrola panelu (panel-shoda.cjs)

Skript `navrhy-designu/32-overeni-cile-2026-11-04/panel-shoda.cjs` (kopie v `scratchpad/atlas87/br/`), server `python3 -m http.server 8930` z kopie, spuštěno samostatně (ne souběžně s testy):

| Velikost | Kroky | Zpět | Skoky | findings | selhaná klepnutí | chyby konzole |
|---|---|---|---|---|---|---|
| 1440 × 900 | 370 | 153 | 32 | **0** | 0 | 0 |
| 390 × 844 (dotyk) | 370 | 153 | 32 | **0** | 0 | 0 |

Kroků s nabídkou 85, citací 575 (v rámečku 304); bez štítku jen P-LEKAR (jako dřív). Žádné „mimo výřez“.

## 6. Obrazovky atlasu, které se proti SCHEMA 90 viditelně změnily

Odhad podle změn kódu (atlas jsem nepřefotil; ověřeno v prohlížeči jen P26, P50, P51, Dnes a panel opravy zápisu):

- **Pacient:** P02 (vysvětlení značky klíče), P09 (otevřený panel „Opravit zápis“ má řádky Jídlo / Glukóza před jídlem / Nejvyšší po jídle), P11 (bazál „zápis chybí“, „Po obědě“), P15 („za 60 minut“, u večeře „a ráno ještě na noc“), P17 a P30, P46 (I-HYPO „za 15 minut“), P19 („Zapnuto omylem, vypnout“; krátká pravidla nemoci s větou o lékařské pomoci), P24 („Píchnuto jinak“), P26 (u známého jídla volba „Jako obvykle“, pokud ji stav atlasu splňuje), P28 (I-NEVIM „60 minut“), P31 a P38 (I-VYSOKA: věta o lékařské pomoci v „Co dál“), P40 („ze seznamu“ a jídla podle slova názvu), P45 (I-MENE „60 minut“, „Co dál … minut“), P50 (hlavička bez „X z N“, popisek hranice cíle), P51 (tkanina bez „dnes“, legenda „dnes“), P54 a P55 (přepínač nemoci slovy, celá pravidla „minut“).
- **Ordinace:** O03 (pravidla: osm, I-MENE a I-VYSSI „pevně 60“), O12 a O13 (čas v cíli 69 %, věta o zaokrouhlení v detailu dlaždice), O14, O15, O17, O18 (bod o vyrovnání „69 %“; u odpovědi sestry „Ano“ první položka „Co návrh oslabuje“), O23 (pravidla „minut“), O24–O26 a O28 (nové verze a texty položek), O30 (nové události stopy `jidlo.jako_obvykle`).

## 7. Co `15` neurčovalo (zvoleno nejopatrněji, zapsáno v `15`)

- „Jako obvykle“ jen u známého jídla, 3× po sobě stejně, ne při nemoci, svačině a zpětném zápisu; volba je rovnocenná a nic se nepředvybírá; práh je provozní parametr S-DAVKA.
- Po večeři dvě otázky ke stejnému zápisu; pokles se počítá jednou a „ano“ má přednost.
- I-VYSSI stejně jako I-MENE bez vlastního času (stejný důvod jako K13).
- Jiný lék a změna stavu jen jako první bod „Co návrh oslabuje“ (`15` odst. 9: nic neblokuje).
- „Skoro nepoužíval“ jako upozornění v kroku 1 a 2, ne nová návrhová karta; práh 30 % je provozní parametr S-SOUHRN.
- „Bez inzulinu“ dá u porce žádnou radu.
- Dnešek ve tkanině zkratkou dne s legendou (místo slova „dnes“, které na 320 px / 160 % přečnívá).

## Shrnutí

SCHEMA 91 dodělává všechno, co z poslední kontroly zbylo. Rozhodnutí 13–15 jsou postavená: „Jako obvykle“ u známého jídla, jeden čas otázky po menší porci s otázkou po večeři i za 60 minut a karta k bazálu po jediné noci pod 3,0. Opravené jsou zbylé nálezy ordinace (S3 – modelový čas v cíli je teď správně 69 %, S6, S8), kliniky (K13, K15), pacienta (V5, V6, S1, S3, S7–S9, N2–N8), garanta (N7, pevné „28“) a kódu (K16, část K10). Doplněná je oprava jídla a hodnot a tři úpravy přístupnosti. Na pokyn koordinátora R-POKYNY nově mluví o osmi pravidlech. Nových verzí ke schválení je 9 a provozních 3, registr má dál 43 položek. Celá sada prošla 144/0, jádro 43/0 a kontrola panelu na obou velikostech nemá žádný nález. Nic není commitováno ani publikováno.
