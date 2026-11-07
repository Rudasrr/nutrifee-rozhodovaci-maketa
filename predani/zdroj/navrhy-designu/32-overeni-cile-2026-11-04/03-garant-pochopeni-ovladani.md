# Kontrola 5 · pohled: garant vidí maketu poprvé – pochopení a ovládání (SCHEMA 83, 4. 11. 2026)

Kontrolor pracoval jen v kopii T84 (`scratchpad/t84`), Supabase byl falešný (`br/lib.js` zachycuje zápisy do pole), na Disk se nesahalo. Skripty: `T84/br/ga-*.cjs`, záznamy a snímky `T84/br/runs/ga-*`. Prohlížeč Chrome 1243 přes Playwright, 1440×900 (notebook) a 390×844 (telefon, dotyk).

## 0. Shrnutí

- **Verdikt: maketa se ovládá spolehlivě (0 chyb konzole, 0 selhaných klepnutí, 0 nedosazených hodnot, 0 vodorovných přetečení na obou velikostech; 133 testů prošlo), ale garant se 45 minutami ji nedokončí a při zamítnutí „Vyhodnocení reakce na jídlo“ mu příběh zatají chování, které aplikace ve skutečnosti má.**
- Hlavní linie = **153 kroků** (celkem 174 s dodatkem), vyprávění hlavní linie **7 741 slov** → při 200 slovech/min **39 min čtení** + **4,7 min animací** (změřeno s pohybem) + 28 rozhodnutí. Úvod slibuje „sledování asi 15 minut, celkem 45–60“; reálně je to **~60 min bez otevření jediného průvodce** (průvodci všech 28 položek mají dalších 12 943 slov ≈ 65 min). Garant se 45 minutami skončí někde ve scéně 13–15 z 27, tedy před kontrolou a před všemi položkami k dávce.
- **A1:** po zamítnutí R-REAKCE panel ve scéně 23 přeskočí 10 kroků s větou „obrazovka ukázat nemůže“, zatímco obrazovka vedle ukazuje „Rozhodněte 3 návrhy“ se štítkem „Návrhy k prandiální dávce · ke schválení“; D-CISTA a D-PRAND jdou do souhrnu. **A2:** tamtéž se přeskočí krok s bezpečnostním pravidlem „Méně jídla než obvykle“ (I-MENE), ačkoli `15` odst. 2.3 říká, že bezpečnostní větev na vyhodnocení nezávisí; garant pravidlo nikdy nevidí a rozhoduje ho v souhrnu naslepo.
- **Telefon:** při nabídce položky zabere panel 506 z 844 px (60 %); u 13 z 28 položek je štítek „◌ ke schválení“ v okamžiku nabídky pod panelem; po rozhodnutí zbyde na rolovací tělo panelu **110 px**.
- Co funguje dobře: ukládání poznámky samo (do DB za 3,5 s bez opuštění pole, 2,6 s po opuštění), F5 i návrat za týden (stejný i jiný prohlížeč) vrátí scénu, krok, rozhodnutí i poznámku; změna rozhodnutí v zásuvce zachová poznámku; souhrn s nerozhodnutými se ptá; správce vidí poslední znění poznámky i historii úprav.

## 1. Průchod (měření)

Celý příběh tlačítkem Dál, všechny položky schváleny, animace zapnuté (`ga-walk.cjs`, běhy `ga-A1440`, `ga-B390`); třetí běh na 1440×900 bez animací se zamítnutím C-CILE, D-POSTUP, B-HYPO, R-REAKCE, S-SEMAFOR a dvěma poznámkami (`ga-C1440rej`).

| Měření | 1440×900 | 390×844 | 1440×900, 5 zamítnutí |
|---|---|---|---|
| Kroků celkem (hlavní linie + dodatek) | 174 (153 + 21) | 174 (153 + 21) | 154 (134 + 20): 12 úseků přeskočeno, 19 kroků v režimu „note“ |
| Slov vyprávění hlavní linie / celkem | 7 741 / 8 685 | 7 741 / 8 685 | 6 171 / 6 883 |
| Čtení při 200 slov/min (hlavní linie) | 39 min | 39 min | 31 min |
| Součet animací (hlavní linie / celkem) | 284 s / 326 s | 305 s / 353 s | bez animací |
| Nejdelší krok | 5,5 s | 5,9 s (sc. 5 k. 3) | – |
| Slov v panelu celkem (vyprávění + karty) | 18 725 | 17 979 | 16 081 |
| Kroky, kde panel vyžaduje rolování | 34 ze 174 | **166 ze 174** | 25 ze 154 |
| Chyby a varování konzole | 0 | 0 | 0 |
| Selhaná klepnutí / nerozhodnutelné položky | 0 | 0 | 0 |
| Citace ve vyprávění, které nejsou na obrazovce | 0 | 0 | 0 |
| `{…}` / undefined / NaN na obrazovce | 0 | 0 | 0 |
| Vodorovné přetečení | 0 | 0 | 0 |
| Štítek rozhodované položky mimo výřez v kroku nabídky | 2 (B-HYPO 13:5 štítek na y 911 > 900; I-NEMOC-JIDLO 15:2 y 1145) | **13 pod panelem** (K-KRITERIA, R-REAKCE, I-VYSOKA, R-PORCE, I-MENE, I-HYPO, B-HYPO, I-NEMOC-JIDLO, S-SEMAFOR, S-SILNA, D-CISTA, D-PRAND, D-POSTUP) | 1 (I-NEMOC-JIDLO) |
| Požadavky mimo falešný server | 0 | 0 | 0 |
| Souhrn na konci | 28 schváleno | 28 schváleno | 16 schváleno, 4 zamítnuto, **8 nerozhodnuto** (do souhrnu spadlo 9 položek, viz A1/A2) |

Nejdelší scény (kroků / slov / animace, 1440): sc. 10 „otevřel aplikaci až v 10:15“ 16 k / 680 slov / 34 s; sc. 23 „návrhy s důvodem a postupem“ 15 k / 1 059 slov / 33 s; sc. 22 „kontrola zahájena“ 12 k / 741 slov / 24 s; sc. 6 „převzetí plánu“ 10 k / 319 slov / 18 s.

Odhad skutečného času garanta (hlavní linie): 39 min čtení + 5 min animací + 28 rozhodnutí (přečíst „Co schvalujete“ ~1 000 slov = 5 min, klepnout, případně poznámka) ≈ **55–60 min bez otevření průvodce**; s průvodcem u poloviny položek přes 90 min.

Ovládání (`ga-ui.cjs`, `ga-interact.cjs`): autosave poznámky do DB 3 546–3 636 ms od dopsání bez opuštění pole (1 s klid + fronta), 2 627–2 643 ms po opuštění pole; pod polem „Uloženo HH:MM na serveru.“ F5 ve scéně 6: scéna, krok, rozhodnutí, poznámka i souhrn beze změny. Návrat „za týden“ ve stejném prohlížeči (localStorage 9 klíčů, stav 178 kB): pokračuje ve scéně 6 krok 0 se vším. V jiném prohlížeči (jen server): začíná na úvodu, panel říká „Načteno 10 dřívějších rozhodnutí z vašeho přihlášení“, rozhodnutí i poznámka načtené; průchod (`progress`) ale začíná od nuly (`max: 0`) – správce pak uvidí „nejdál“ jen z posledního zařízení. Souhrn s 22 nerozhodnutými: „Potvrdit souhrn“ → dotaz „Ještě rozhodnout / Potvrdit přesto“ → potvrzeno, poděkování říká „6 schváleno · 0 zamítnuto · 22 nerozhodnuto“ a „Jde o neformální podklad“. Správce (`open(..., {role:'admin'})`): „Výsledky garanta“ ukazují průchod, 6 z 28, „Po scénách“ se záznamem „zamítnuto „Zkušební poznámka A + dodatek“ · později: schváleno 4. 11. 11:52 (v zásuvce) · poznámka … „… Změněno po 3 scénách.““ a v záložce Registr „historie (6)“ u změněné položky; volič účtů garant/správce; export JSON/CSV.

## 2. Tabulka pochopení položek

Známky 1–5 (5 = lékař bez znalosti aplikace pochopí sám z vyprávění + karty + obrazovky): **a** co pravidlo dělá · **b** co konkrétně schvaluje · **c** dopad zamítnutí. Karta v panelu ukazuje z „Co schvalujete“ jen **první větu** (`demo/presenter.js:981`, `firstSentence(g.co)`); zbytek a oddíl „Co se stane při zamítnutí“ jsou ve sbaleném průvodci. Známku c proto snižuji všude, kde je dopad vidět až po rozbalení; výjimkou jsou položky, u nichž otevřená zamítnutá karta nebo oznámení na obrazovce dopad řekne samo.

| ID | a | b | c | Poznámka |
|---|---|---|---|---|
| K-KRITERIA | 5 | 3 | 3 | Karta: „čtyři podmínky … tablety nevadí, premixy ne.“ Obrazovka má ale pátý bod „Pacient nemá žádné vylučovací kritérium: těhotenství…, akarbóza, potíže s chůzí…“ – vylučovací kritéria jsou jen ve skryté druhé větě. Lékař schválí „čtyři podmínky“ a neví, že schvaluje i akarbózu a pohyb jako vyloučení. Návrh: první věta „Čtyři podmínky zařazení a sedm vylučovacích kritérií, jak je vidíte v zařazení.“ |
| C-CILE | 5 | 5 | 3 | Čísla na kartě i na obrazovce. Že zamítnutí je „jen záznam nesouhlasu“, je až ve skryté větě; otevřená zamítnutá karta pak řekne „Váš nesouhlas je zapsaný.“ |
| R-NAVYKY | 5 | 4 | 4 | Jasné; dopad popisuje oznámení na Dnes. |
| R-REAKCE | 3 | 3 | 2 | Nabídne se spolu s R-SKORE v kroku „Kam se po kaši glukóza dostane“ (9:1): dvě položky s 9 + 4 parametry najednou. Karta: „vrchol proti hornímu cíli s oknem 120 minut, shoda zápisů se měří vzestupem, „známé“ až při 4 shodných zápisech z 6, otázka při rozdílu 3,5 mmol/l“ – hutné, ale „způsob výpočtu rozmezí“ nevysvětlí. Dopad (nic se neradí, karty bez stupně) není na kartě. Návrh: rozdělit nabídku – R-SKORE v 9:1, R-REAKCE o krok dřív u otázky „Jak to dopadlo“, a na kartu přidat větu „Při zamítnutí aplikace nevyhodnocuje reakci a neradí.“ |
| Z-GLUKOZA | 5 | 4 | 3 | Jasné z obrazovky (čipy). Dopad „jen záznam nesouhlasu“ skrytý. |
| B-HYPO | 4 | 4 | 3 | Nabídka u karty po druhém poklesu – dobré. Na 1440×900 je štítek těsně pod okrajem (y 911). Že pokles blokuje větev „zvýšit“, je ve skryté větě. Bezpečnostní dotaz před zamítnutím dopad vysvětlí – ale jen tomu, kdo zamítá. |
| R-PODOBNOST | 5 | 5 | 3 | Vyprávění 14:2 vysvětlí; dopad skrytý. |
| R-SKORE | 4 | 4 | 3 | „Hranici 50 % v cíli, stupeň od 4 zápisů a slova…“ – stručné a srozumitelné. |
| R-PORCE | 5 | 5 | 4 | Text rady je na obrazovce v telefonu, karta jmenuje čtyři věty. |
| R-DOPLNEK | 5 | 3 | 3 | Karta: „Seznam povolených doplňků a jejich přiřazení k druhům jídel (tím schvalujete všechny věty…)“ – seznam sám je až v průvodci (1 042 slov). Lékař vidí jen jogurt/ořechy u kaše. Návrh: na kartu vypsat doplňky (bílý jogurt, ořechy, vejce, sýr …) v jedné větě. |
| R-PORADI | 5 | 4 | 3 | Text na obrazovce; „seznam složek“ opět jen v průvodci (991 slov). |
| R-PROCHAZKA | 5 | 5 | 4 | Jasné. |
| D-CISTA | 3 | 2 | 2 | Nabídne se v kroku 23:5 „Vše sedí – body ověřené s daty“, jehož vyprávění je o ověřovacích bodech (D-POSTUP), ne o vyřazených zápisech. Karta „Toleranci 30/15 minut, okno svačiny 120 minut, 60 minut na opravu inzulinu…“ bez kontextu, co je „čistý zápis“. Návrh: nabídnout u řádku „vyřazené zápisy“ s vlastním krokem („Do návrhu vstupuje 57 z 63 snídaní; 6 vyřazeno: svačina do 2 h, pozdní zápis…“). |
| D-PRAND | 3 | 2 | 2 | Tentýž krok 23:5. Karta vyjmenuje 10 prahů v závorce („28 dní, 8 jídel, 67 %, +0,5 mmol/l, 3 přijaté rady, 60 % odmítnutých z 5, 67 % u jednoho či dvou jídel, 2 poklesy / 15 % / 6 jídel, pokles pod 3,0“) bez slov, co která znamená. Lékař bez průvodce neví, čeho je 67 %. Návrh: na kartě tři věty: „Návrh vznikne, když za 28 dní je nad cílem aspoň 67 % z nejméně 8 jídel. Nejdřív rady: když rada ještě nebyla přijata 3×. Pokles blokuje: 2 poklesy nebo 15 % jídel.“ |
| D-BAZAL | 5 | 4 | 4 | Vyprávění 23:1 s daty nocí – vzor, jak to má vypadat. |
| D-POSTUP | 3 | 2 | 3 | Nabídka v 23:7 „O kolik – volí lékař“ (krok o voliči dávky). Karta: „Znění ověřovacích bodů a větví všech sedmi postupů a to, že pokles pod 4 … zablokuje (práh 1).“ Sedm postupů viděl lékař v tu chvíli jeden; prahy 90 % a 5 mmol/mol (rozhodnutí 2. 11.) jsou skryté. Průvodce 1 459 slov. Návrh: nabídnout až po kroku „Pokles blokuje větev zvýšit“ (23:10) a na kartě říct „Větve: zvýšit / snížit / ponechat; blokace poklesem; viděli jste 2 ze 7 postupů, zbylých 5 je v průvodci.“ Už C16 v 30/02 to navrhovala, platí dál. |
| R-POKYNY | 4 | 4 | 4 | Jasné; bezpečnostní dotaz dopad říká. |
| I-HYPO | 5 | 4 | 4 | Text pravidla na obrazovce; karta shrne obsah. Věta o akarbóze a pevné hranici 4 skrytá. |
| I-MENE | 5 | 5 | 4 | Jasné – pokud krok proběhne (viz A2). |
| I-NEVIM | 5 | 5 | 4 | Jasné. |
| I-NEMOC-BAZAL | 4 | 4 | 4 | Nabídka spolu s I-NEMOC-JIDLO v 15:2, obě pravidla nahoře na Dnes. |
| I-NEMOC-JIDLO | 4 | 4 | 4 | Štítek při nabídce mimo výřez na obou velikostech (y 1145 na 1440×900; pod panelem na telefonu). |
| I-VYSOKA | 5 | 5 | 4 | Jasné. |
| I-KONTAKT | 5 | 5 | 4 | Jasné. |
| S-SILNA | 4 | 4 | 4 | Práh „oba nad cílem se vzestupem aspoň 3,0“ v průvodci; karta jen „práh, počet jídel“. |
| S-SEMAFOR | 4 | 3 | 4 | Karta je jedna věta o 60 slovech s pěti prahy; na obrazovce dlaždice. |
| P-NEMOC | 5 | 5 | 4 | Jasné. |
| P-LEKAR | 5 | 5 | 5 | Zásada bez výpočtu; karta i dopad („nic nevypne, záznam nesouhlasu“) srozumitelné. |

Průřezové otázky:

- **Jen klinické položky, ne provoz:** garant se to nikde nedozví. Úvod mluví o „28 pravidlech“, registr v příběhu (sc. 18) ukazuje i sbalený oddíl „Pravidla aplikace bez schvalování“, ale panel nikdy neřekne „export ze senzoru, milníky, poděkování … neschvalujete“. Lékař, který ve scéně 7 vidí štítek-less kartu „Milník“ nebo ve scéně 22 „Export nahrán“, neví, proč o nich nerozhoduje. Návrh: jedna věta v úvodu („Provozní pravidla – formáty, texty obrazovek, milníky – neschvalujete; v registru jsou jen popsaná.“).
- **Maketa předstírá schválení:** úvod to říká (bod 5 „Jak ukázku ovládat“) a štítky nesou „◌ ke schválení“ – srozumitelné; ale obrazovky říkají „ze schváleného registru“ a sestra „Tato pravidla posoudil lékař“, takže lékař na notebooku bez čtení úvodu si to musí domyslet.
- **„Tahle část nefunguje“:** oznámení na obrazovce vypíše celý oddíl „Co se stane při zamítnutí“ (u R-NAVYKY 90 slov, u R-REAKCE 140 slov v rámečku telefonu – snímek `ga-reakce-12-2.png`) a tlačítko „Změnit rozhodnutí“. Pochopitelné; jen dlouhé.
- **Neformálnost:** říká ji souhrn („Jde o neformální podklad, ne podpis“) a poděkování; úvod jen „Nic neposíláte.“ – před prvním rozhodnutím se garant nedozví, že nejde o podpis. Návrh: do úvodního pruhu bod 2 doplnit „(neformální podklad pro autora, ne podpis)“.
- **Poznámka se ukládá sama – vidí to?** Ano: pod polem „Ukládá se…“ → „Uloženo 11:52 na serveru.“ a v liště „✓ Uloženo“. Bez poznámky řádek „Poznámka se ukládá sama už při psaní.“ Dobře.
- **Kde v příběhu je, kolik zbývá:** „Průběh: Scénář 3 ze 6 · scéna 13 z 27“ + pruh po scénářích a lišta „Ke schválení · zbývá N“. Chybí odhad času; „asi 4 minuty“ je jen u dodatku. Po 45 minutách tak garant neví, že má před sebou ještě 20+ minut.
- **Návrat k dřívějšímu rozhodnutí:** zásuvka „Vaše rozhodnutí“ z lišty funguje (příběh stojí, karta s poznámkou a historií). Z rozhodnuté karty v panelu zmizí odkaz na zásuvku; garant to ví jen z úvodu (bod 7) nebo z hlášky po rozhodnutí.
- **Když něčemu nerozumí:** jediná cesta je poznámka u položky; není „nerozumím / zeptat se“ ani odkaz na kontakt na autora. Ikona „i“ v hlavičce panelu zobrazí jen dvě věty o barvách tlačítek (`presenter.js:1266`). Vysvětlivky (podtečkované) fungují jen v obrazovce aplikace, ne v panelu.

## 3. Nálezy

### A – garant rozhodne špatně, maketa lže, rozbité ovládání, ztráta rozhodnutí

**A1 · Po zamítnutí R-REAKCE panel tvrdí, že obrazovka návrhy k dávce „ukázat nemůže“, zatímco je ukazuje; D-CISTA a D-PRAND jdou do souhrnu.**
Kde: scéna 23 krok 13 (`demo/scene-items.js`, scéna 23 `deps` 4–13: `R-REAKCE: skip`), běh `ga-C1440rej`, `ga-reakce.cjs`, snímek `runs/ga-reakce-23-13.png`.
Co: panel: „Přeskočili jsme 10 kroků: „Proč návrh vznikl“, „Vše sedí“, „Postup ukáže větev“, „O kolik – volí lékař“, …, „Pokles blokuje větev „zvýšit““ … Bez položky „Vyhodnocení reakce na jídlo“, kterou jste zamítli, je obrazovka ukázat nemůže. Položky „Čistá data…“, „Návrhy k prandiální dávce a radám“ … rozhodnete v souhrnu na konci.“ Obrazovka vlevo ve stejnou chvíli: „Rozhodněte 3 návrhy a potvrďte 1 položku beze změny“, otevřený návrh 2 „Nejdříve rady ke snídani – dávka až po radách“, „Proč návrh vznikl: 57 z 63 snídaní skončilo nad cílem“, štítek „Návrhy k prandiální dávce a radám · ke schválení“, „Ověřit s pacientem 0 ze 2“, „Postup říká“. Krok 14 pak hlásí „4 ze 4“ rozhodnuto. Průvodce R-REAKCE sám říká: „Report pro lékaře dál počítá zápisy nad cílem a návrhy k dávce podle vlastních položek“.
Proč vadí: garant, který zamítl definici učení pacienta (klidně jen kvůli oknu 120 min), nikdy neuvidí nejdůležitější lékařskou část (návrhy, body ověření, blokaci „zvýšit“ poklesem) a rozhodne D-CISTA, D-PRAND i to, co ještě spadne do souhrnu, bez obrazovky; vyprávění navíc tvrdí nepravdu. Rozpor s `15` odst. 15 („Krok závisí na položce, když po jejím zamítnutí zmizí cíl kroku…“ – cíl nezmizel) a s T3/T4 duchem.
Návrh: generátor `navrhy-designu/04-…/scene-items.cjs` vyhodnotil cíl kroku jako změněný, protože návrh 2 je ve stejném kroku jiný (bez vyhodnocení se mění obsah výřezu, ne existence). Pro scénu 23 by měl rozlišovat „obsah výřezu se změnil“ (= note) od „cíl zmizel“ (= skip) i u `watch`; ruční pojistka: v `demo/presenter.js` `D.itemScene` / `needs` pro kroky 23:4–13 nechat R-REAKCE jen v režimu note. Test T3 pro R-REAKCE doplnit o „scéna reviewProposals má po zamítnutí stejný počet návrhů“.

**A2 · Po zamítnutí R-REAKCE se přeskočí krok s bezpečnostním pravidlem „Méně jídla než obvykle“; I-MENE se rozhoduje v souhrnu naslepo.**
Kde: scéna 12 krok 2 (`demo/tour-content.js:259` „Druhý případ: menší porce“; `demo/scene-items.js` scéna 12 `deps["2"]: {R-REAKCE: "skip", I-MENE: "note", …}`), běh `ga-reakce.cjs` (po celé scéně 12 není na obrazovce text „Méně jídla než obvykle“ ani jednou), snímek `runs/ga-reakce-12-2.png`.
Co: panel: „Přeskočili jsme 2 kroky: „Z větší porce zpět k obvyklé radit smíme“, „Druhý případ: menší porce“. Bez položky „Vyhodnocení reakce na jídlo“ … je obrazovka ukázat nemůže. Položku „Pravidlo: méně jídla než obvykle“ … rozhodnete v souhrnu na konci.“ `15` odst. 2.3: „Bezpečnostní větev nezávisí na radách: pravidlo k nízké glukóze, pravidlo „Méně jídla než obvykle“ a věta o nemoci se v kroku 3 ukážou i se zamítnutým vyhodnocením reakce“ a text kroku sám (`NF.usable(S,'I-MENE') ? 'Pacient zvolil menší porci… obrazovka ukáže pravidlo' : …`) s takovou situací počítá.
Proč vadí: zkušený diabetolog bude pravidla k menší porci a nízké glukóze zkoumat nejpozorněji; tady o pravidle I-MENE rozhodne v tabulce souhrnu, aniž je viděl v akci, a vyprávění mu řekne, že ho obrazovka bez učení ukázat neumí – což podle `15` není pravda. Totéž hrozí I-HYPO (13:4 závisí přes scénu 12).
Návrh: krok „Druhý případ: menší porce“ má mít cíl na kartu pravidla (`.instr-card` / `[data-item="I-MENE"]`), ne na blok rad; pak generátor zamítnutí R-REAKCE vyhodnotí jako note. Do T3 přidat: „se zamítnutou R-REAKCE se I-MENE a I-HYPO nabídnou ve scénách 12 a 13“.

**A3 · Garant se 45 minutami ukázku nedokončí; úvod slibuje třetinu skutečného času.**
Kde: `demo/intro.js:20` („Sledování hlavní části trvá asi 15 minut; … celkem 45–60 minut“); měření v oddílu 1.
Co: 7 741 slov vyprávění hlavní linie = 39 min při 200 slov/min (31 min při 250), animace 4,7–5,1 min, 28 karet („Co schvalujete“ ≈ 1 000 slov) a 28 klepnutí; bez průvodce ≈ 55–60 min, s průvodcem u poloviny položek > 90 min. Průchod bez čtení (jen klepání Dál s animací) trvá 5 min, což je asi původ čísla „15 minut“.
Proč vadí: garant si vyhradil 45 minut; v 45. minutě je ve scéně 13–15 (zbývá kontrola, návrhy k dávce, D-* položky). Nedozví se to – nikde není odhad zbývajícího času. Výsledkem bude buď nedokončený průchod (správce uvidí „nenavštívené scény“), nebo rozhodnutí 10+ položek v souhrnu bez obrazovky. Tohle je rozhodnutí vlastníka o rozsahu, ne o kódu – ale úvod musí říkat pravdu.
Návrh: (1) úvod: „Hlavní linie má 27 scén a 153 kroků; čtení vyprávění zabere asi 40 minut, rozhodování dalších 15–20; počítejte s 60–75 minutami, nebo si ukázku rozdělte – stav se ukládá.“ (2) V patičce panelu k „Průběh“ přidat „zbývá asi N min“ (slova zbývajících kroků / 200). (3) Zvážit „zkrácený průchod“: kroky `t`-only (bez `co`) a kroky s `dusledek` jen jako jedna věta – 31 kroků je „intro“ (mezititulky scén) a dalších ~40 má < 20 slov; sloučením by hlavní linie klesla pod 100 kroků.

### B – nepochopí bez pomoci, zdržení, zmatení

**B1 · Telefon: panel při nabídce položky zabere 60 % výšky, štítek rozhodované položky je u 13 z 28 položek pod ním; po rozhodnutí zbyde tělu panelu 110 px.**
Kde: `demo/demo.css:224–226` (`.tour-panel{max-height:var(--nf-demo-sheet-h)}`, `.tour-pending{max-height:var(--nf-demo-sheet-h-decide)}`), měření `ga-ui390` (panel top 338, výška 506 z 844; po zamítnutí top 464, výška 380, tělo mezi hlavičkou 522 a patičkou 632 = 110 px), `ga-int390` (geometrie pole: tělo 110 px), snímky `runs/ga-ui390/pending.png`, `runs/ga-int390/1-pole.png`, `runs/ga-B390/047-s8-1.png` (R-REAKCE pod panelem).
Co: při nabídce vidí garant z obrazovky aplikace 261 px (lišta 77 px + panel 506 px); štítek „◌ ke schválení“, který mu má říct, kde pravidlo působí, leží pod panelem (K-KRITERIA, R-REAKCE, I-VYSOKA, R-PORCE, I-MENE, I-HYPO, B-HYPO, I-NEMOC-JIDLO, S-SEMAFOR, S-SILNA, D-CISTA, D-PRAND, D-POSTUP). Po rozhodnutí patička (hláška „Zamítnuto: … rozhodnutí změníte kdykoli…“ 4 řádky + „Dál:“ + tlačítka + Průběh) má 212 px a tělo panelu, v němž je pole poznámky, tlačítka Schválit/Zamítnout a průvodce, se roluje ve 110 px.
Proč vadí: na telefonu garant buď rozhoduje bez pohledu na místo, kde pravidlo působí, nebo panel sbalí (▾) a ztratí tlačítka; po rozhodnutí píše poznámku v okénku o dvou řádcích a nevidí, že nad ním je ještě „Tahle část nefunguje“ a průvodce.
Návrh: na telefonu po rozhodnutí hlášku v patičce zkrátit na jeden řádek („Zamítnuto · změnit lze kdykoli“) a „Průběh“ schovat do hlavičky; při nabídce položky posunout obrazovku aplikace tak, aby štítek byl nad panelem (`panelToCard` řeší jen panel, ne obrazovku); nebo panel ve stavu „pending“ dočasně snížit na 45 % a štítek nechat nad ním.

**B2 · Zásuvka „Vaše rozhodnutí“ nabízí k rozhodnutí všech 22 položek z budoucích scén.**
Kde: `demo/presenter.js:1658` (`openDecisions`), snímek `runs/ga-int1440/2-zasuvka.png` (ve scéně 6: „Nerozhodnuto (22) – Scéna 7 · Hodnoty glukózy…, Scéna 9 · Stupeň reakce…, Scéna 11 · Rada: obvyklá porce…“ s rozbalovacími kartami a tlačítky Schválit/Zamítnout).
Co: lišta „Ke schválení · zbývá 22“ láká ke klepnutí; zásuvka ukazuje nerozhodnuté nahoře včetně položek, které garant ještě neviděl, s plnou kartou a tlačítky. Nic neříká „tuto položku uvidíte ve scéně 11“.
Proč vadí: netrpělivý nebo časově tísněný garant (A3) rozhodne v zásuvce položky bez obrazovky; správce to pozná jen z „v zásuvce“ u scény.
Návrh: položky z dosud neprošlých scén v zásuvce zobrazit jen řádkem „uvidíte ve scéně N“ bez tlačítek (nebo s tlačítky až po rozbalení s větou „Rozhodujete bez obrazovky“); lišta ať počítá jen položky, které už byly nabídnuty („zbývá 1 z nabídnutých · 21 přijde“).

**B3 · Karta ukazuje jen první větu „Co schvalujete“; u čtyř položek je v druhé větě podstatný obsah.**
Kde: `demo/presenter.js:981` (`firstSentence(g.co)`), `demo/guide.js` K-KRITERIA, D-POSTUP, B-HYPO, I-HYPO (`co`), výpis `runs/ga-guide.md`.
Co: K-KRITERIA – vylučovací kritéria (těhotenství, těžké poklesy, ledviny/játra, akarbóza, pohyb, zrak/paměť) jsou jen ve skryté větě, ačkoli na obrazovce je lékař právě zaškrtl; D-POSTUP – prahy 90 % a 5 mmol/mol (rozhodnutí 2. 11.) a věta „dva postupy příběh neukazuje“; B-HYPO – „rada neradí jíst víc ani obvyklou porci“ a věta o blokaci; I-HYPO – akarbóza a pevná hranice 4.
Proč vadí: garant schválí „čtyři podmínky“ a netuší, že tím schvaluje i sedm vylučovacích kritérií; u D-POSTUP neví, že schvaluje i prahy, které nikde neviděl.
Návrh: na kartě ukázat celé `co` (jsou to 2–4 věty) a sbalit jen průvodce; nebo u těchto čtyř položek přepsat první větu tak, aby obsáhla vše, co se schvaluje.

**B4 · D-CISTA a D-PRAND se nabízejí v kroku, jehož vyprávění je o něčem jiném; D-POSTUP v kroku o voliči dávky.**
Kde: scéna 23 krok 5 „Vše sedí – body ověřené s daty“ (`demo/tour-content.js:446`), krok 7 „O kolik – volí lékař“; `demo/scene-items.js` targets scény 23; `D.itemScene['D-POSTUP'] = { ch: 'reviewProposals', step: 7 }` (`presenter.js:139`).
Co: v 23:5 vyprávění: „Lékař potvrdil body najednou a obrazovka ukazuje „9 z 9 sedí“ …“ a panel k tomu nabídne „Čistá data pro návrhy k dávce – Toleranci 30/15 minut, okno svačiny 120 minut…“ a „Návrhy k prandiální dávce – Všechny prahy (28 dní, 8 jídel, 67 %, +0,5 mmol/l, 3 přijaté rady, 60 % odmítnutých z 5 nabídek, 67 % u jednoho či dvou jídel, 2 poklesy / 15 % / 6 jídel, pokles pod 3,0)“. Nic na obrazovce ani ve vyprávění těch 10 čísel nevysvětluje. Na telefonu jsou obě karty zároveň a štítky pod panelem.
Proč vadí: tři nejnáročnější položky (průvodce 310 + 530 + 1 459 slov) se rozhodují během čtyř kroků, dvě najednou, mimo kontext; zkušený lékař je buď zamítne „pro jistotu“, nebo schválí bez čtení.
Návrh: D-PRAND nabídnout v kroku „Proč návrh vznikl“ (23:4), kde je na obrazovce „57 z 63 snídaní nad cílem“ a dá se k tomu napsat „= 90 % ≥ práh 67 %, 63 ≥ 8 jídel“; D-CISTA ve vlastním kroku u řádku vyřazených zápisů; kartu D-PRAND přepsat do vět s významem (viz tabulka).

**B5 · Garant se nedozví, že provozní položky neschvaluje, ani že rozhodnutí je neformální, dřív než na konci.**
Kde: `demo/intro.js` (pruh i „Jak ukázku ovládat“ bez zmínky o provozních položkách; „Nic neposíláte.“ až v bodu 8), poděkování (`presenter.js` `thanksBlock`: „Jde o neformální podklad“).
Co: ve scéně 7 vidí garant kartu „Milník“, ve scéně 9 „Váš 1. týden“, ve scéně 22 „Export nahrán a převeden“ – bez štítku a bez slova, proč o nich nerozhoduje. Neformálnost se dozví až po potvrzení souhrnu.
Návrh: do úvodního pruhu: „Rozhodujete o 28 klinických pravidlech; provozní (formáty, texty obrazovek, milníky) jsou v registru jen popsané. Jde o neformální podklad pro autora, ne o podpis.“

**B6 · Návrat v jiném zařízení začne od úvodu a „průchod“ se počítá znovu.**
Kde: `ga-interact.cjs` oddíl 4b: po přihlášení v jiném prohlížeči `progress = {max: 0, done: null}`, panel na úvodu „Načteno 10 dřívějších rozhodnutí z vašeho přihlášení.“
Co: garant, který na notebooku došel do scény 6 a pokračuje na telefonu, začíná scénou 1 a musí klepat Dál (nebo přes „Přehled scén“ skočit – což úvod neučí). Správce pak u „nejdál“ vidí maximum z posledního zařízení.
Návrh: s rozhodnutími načíst ze serveru i poslední řádek `scene`/`progress` a nabídnout „Pokračovat scénou 6“; `prog.max` brát jako maximum přes všechna zařízení (řádky `progress` na serveru už jsou).

**B7 · V přeskočeném úseku zmizí i rozhodnutí o bezpečnostních položkách a panel to řekne jen jednou větou.**
Kde: `ga-C1440rej`: 12:2 („Položku „Pravidlo: méně jídla než obvykle“ … rozhodnete v souhrnu“), 14:6 (R-PORADI), 23:13 (D-CISTA, D-PRAND); souhrn pak s 9 položkami bez obrazovky, 8 zůstalo nerozhodnuto.
Co: ve finále tabulka „Nerozhodnuto (8)“ bez vysvětlení, proč tam jsou; vyprávění souhrnu: „Nerozhodnuto 8. Jsou v tabulce vlevo…“. Z karty v souhrnu není vidět, že položka nikdy neměla obrazovku.
Návrh: v souhrnu u takových položek řádek „nenabídla se: zamítli jste „Vyhodnocení reakce na jídlo““ a odkaz „Změnit to rozhodnutí“.

### C – drobnosti

**C1 · Dodatek, scéna 31 krok 5 „Ostatní návrhy“: v režimu note je vyprávění prázdné.** `ga-C1440rej` 31:5: `co: ""`, panel: „Po vašem zamítnutí: Ukázka krok provedla, ale položku „Vyhodnocení reakce na jídlo“ jste zamítli, a tak ji obrazovka neukazuje. · Čeho si všímat: Dávka se v této variantě nemění vůbec.“ – věta `drop` vynechala celé „Co se děje“. Doplnit větu `jinak`.

**C2 · Klepnutí na řádek registru ve scéně 18 nedá žádnou odezvu.** `ga-lock.cjs`: klik na `main [data-action="regOpen"][data-value="C-CILE"]` → stav beze změny, bublina zámku se neukáže (u tlačítek Schválit/Zamítnout modelu a u navigace se ukáže „Tohle za vás klepne ukázka“). Garant, který si chce v registru prohlédnout jinou položku, neví, proč nejde. Buď bublinu i tady, nebo řádky v příběhu nechat otevřít (jen čtení).

**C3 · „Tahle část nefunguje“ vypíše celý oddíl „Co se stane při zamítnutí“ (až 140 slov) v rámečku telefonu** (`runs/ga-reakce-12-2.png`, `runs/ga-int390/1-pole.png`). Stačí první věta + „Více“.

**C4 · Dvě položky v jednom kroku: R-REAKCE + R-SKORE (9:1), D-CISTA + D-PRAND (23:5), I-NEMOC-BAZAL + I-NEMOC-JIDLO (15:2).** Na telefonu to znamená dvě rozbalené karty v 506 px. Rozložit do sousedních kroků (štítky tam jsou).

**C5 · Vyprávění kroku 23:7 „O kolik – volí lékař“ nemá „Čeho si všímat“, ačkoli se v něm rozhoduje D-POSTUP** (`ga-A1440`: `vs: ''`). Aspoň věta „Právě o postupu (body, větve, blokace) teď rozhodujete.“ jako u K-KRITERIA a P-LEKAR.

**C6 · Ikona „i“ v hlavičce panelu vysvětlí jen barvy tlačítek** (`presenter.js:1266`). Na telefonu je to jediná nápověda bez návratu na úvod; doplnit „Zpět k úvodu“ a tři věty: nabídka v panelu, zásuvka z lišty, souhrn na konci.

**C7 · Ovládací prvky lišty 36 px vysoké** („Ke schválení · zbývá N“ 172×36, „Přehled scén“ 110×36, „Odhlásit“ 136×36; na telefonu „Zbývá N“ 318×36), odkazy v panelu „Více k tomuto kroku“ 127×32, „Rozhodněte 1 položku výše ↑“ 182×32. Nad minimem 24 px, pod 44 px pro seniora na dotyku (30/04 C3 už u „i“). Kontrast textů v panelu a tlačítek: žádný prvek pod 4,5 : 1 (měřeno `ga-ui.cjs`).

**C8 · Po skoku v jiném prohlížeči panel říká „Načteno 10 dřívějších rozhodnutí“**, ale v souhrnu je jich 6 (počítá řádky včetně poznámek a změn). Říct „6 rozhodnutí a 1 poznámku“.

**C9 · Fokus po „Dál“ jde na nadpis kroku bez viditelného rámečku (`outline: none`)**; Tab pak vede na „← Zpět“ a „Dál ▶“ s rámečkem 3 px – v pořádku pro čtečku, pro klávesnici bez čtečky není po Dál vidět, kde fokus je.

## 4. Co funguje (ověřeno)

- Průchod celé hlavní linie i dodatku na obou velikostech bez chyby konzole, bez selhaného klepnutí, bez `{…}`/undefined/NaN, bez vodorovného přetečení, bez citace, která by nebyla na obrazovce (0 ve všech třech bězích), bez požadavku mimo falešný server.
- Tempo: žádný krok nad 5,6 s na notebooku; na telefonu jeden 5,9 s (sc. 5 k. 3).
- Rozhodnutí: Schválit/Zamítnout jsou rovnocenná, po klepnutí hned pole s otázkou podle rozhodnutí; bezpečnostní položky se ptají „Opravdu zamítnout?“ s důsledkem; poznámka se uloží sama (do DB za 3,5 s bez opuštění pole, za 2,6 s po opuštění) a stav pod polem to říká; změna rozhodnutí poznámku zachová a přepne popisek; historie na kartě i ve výsledcích správce.
- Trvanlivost: F5 uprostřed scény vrátí scénu, krok, rozhodnutí, poznámku; návrat ve stejném prohlížeči pokračuje přesně tam; v jiném prohlížeči se rozhodnutí i poznámky načtou ze serveru (s výhradou B6).
- Zásuvka „Vaše rozhodnutí“: příběh stojí, karta s polem a historií, po zavření pokračuje tam, kde byl.
- Souhrn: nerozhodnuté nahoře, „Potvrdit souhrn“ s nerozhodnutými → dotaz → „Potvrdit přesto“ → poděkování s čísly a větou o neformálnosti; „Souhrn zůstává vlevo a rozhodnutí v něm můžete dál měnit.“
- Správce: výsledky s voličem účtů, průchod („nejdál“, „prošel celou maketu: ne“, nenavštívené scény), čísla, „Po scénách“ se stavem při opuštění a „později: …“ i s místem změny (v panelu / v zásuvce), záložka Registr s historií a poslední poznámkou, export JSON/CSV.
- Zámek obrazovky v příběhu: tlačítka aplikace a navigace ukážou bublinu „Tohle za vás klepne ukázka“ a stav se nezmění (výjimka C2).
- Dopady zamítnutí, které jsem viděl ve vyprávění v režimu „note“ a v hláškách (C-CILE: „Váš nesouhlas je zapsaný“; B-HYPO 20:0: čip nočního poklesu chybí a na jeho místě je oznámení; S-SEMAFOR 22:5: dlaždice bez semaforu), odpovídají průvodci. Obrazovky k nim jsem po jednom nekontroloval (viz „Co jsem nestihl ověřit“).

## 5. Testy

`node nutrifee-rozhodovaci-maketa.test.cjs` na kopii T84 (`T84/out/testy.log`, 148 řádků, přečteno celé): **Prošlo: 133, selhalo: 0.** Dílčí sady: tokeny 7/0, zaverecne80 22/0, faze2-jadro 32/0, faze2-pribeh 15/0, pravdivost 4/0, kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 9/0, ukladani 29/0. Nálezy A1 a A2 testy T3/T4 nezachytí: T4 kontroluje citace a děj, ne to, že věta „obrazovka ukázat nemůže“ nesedí s obrazovkou; T3 kontroluje dopad zamítnutí na obrazovku, ne to, že příběh dopad zatají.

## Co jsem nestihl ověřit

- Zamítnutí R-NAVYKY, R-POKYNY, P-NEMOC a jednotlivých I-* v celém průchodu (jen C-CILE, D-POSTUP, B-HYPO, R-REAKCE, S-SEMAFOR; A2 ukazuje, že závislosti přes R-REAKCE zasahují i I-HYPO, netestoval jsem kombinaci R-REAKCE + B-HYPO zvlášť).
- Zvětšení prohlížeče 150–200 % (30/04 A1) a čtečku obrazovky.
- Export JSON/CSV správce obsahově (jen že tlačítka jsou).
- Zda „historie (6)“ ve výsledcích správce po rozbalení ukazuje každou úpravu poznámky s časem (viděl jsem jen sloučený řádek „Po scénách“ a počet).
- Reálné tempo čtení garanta; 200 slov/min je odhad pro odborný text v panelu o šířce 360 px.
