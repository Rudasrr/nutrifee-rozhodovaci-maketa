# Pohled: skutečný lidský život pacienta

*4. 11. 2026 · maketa SCHEMA 83 (kopie T84), nic v maketě neměněno · úhel: člověk 58–68 let s DM2 na pevných dávkách inzulinu, se senzorem, běžný život (rodina, víkendy, návštěvy, nemoc, dovolená, únava z nemoci, malá chuť klikat). Doloženo kódem (`app/core.js`, `app/data/*.js`, `app/screens.js`), průchodem makety v prohlížeči (390 × 844, skript `br/walk.cjs`, texty `br/runs/walk.json`, snímky `br/runs/w-*.png`, `br/runs/page-*.png`) a simulací 12 týdnů nad jádrem bez prezentační vrstvy (`br/sim12.cjs`, výsledky `br/runs/sim-*.json`; 14 dní nepoužívání `br/gap14.cjs`). Neopakuji, co už má `30/07-realny-provoz.md` (klepnutí, čas, ordinace) – navazuji na to.*

## 0. Shrnutí

1. **Ulehčí život? Ne – přidá práci; za podmínek je ta práce snesitelná.** Jedno hlavní jídlo = 10–12 klepnutí a 1 pohled do grafu senzoru (měření 07 potvrzeno v průchodu); den 33–40 klepnutí, 6 odečtů ze senzoru, 8–11 min; týden ≈ 60–80 min. Dnes bez aplikace dělá pacient 0 klepnutí a dívá se na senzor, kdy chce. Aplikace nic z jeho dosavadní práce neodstraňuje (inzulin, senzor, jídlo zůstávají), jen přidává zápis. Snesitelné to je díky tomu, že zápis nevyžaduje psaní, váhu ani desetiny.
2. **Povede ke zlepšení stavu? U reálného člověka spíš ne během prvních 12 týdnů; pravděpodobně ano přes lékaře na kontrole, ne přes rady.** Simulace 12 týdnů s realistickou adherencí (zapsáno 74 % jídel, inzulin podle plánu 85 %, obvyklá porce 85 %, rozptyl reakce SD 1,6 mmol/l): **do učení vstoupí jen 47 % zapsaných jídel (87 ze 187)**, první „známe ho“ přijde mezi 16. a 40. dnem, první rada opřená o vlastní zkušenost mezi 29. a 66. dnem, po 12 týdnech jsou známá **4–6 jídla z 28–31 jedených** a karta Cesta ke kontrole hlásí „známe 4 z 28“. Rady se nabídly u 89–146 jídel, ale u obědů (pestrá strava) jen 6–14×; pacient je přijal u 21–46 jídel. Mechanismus změny chování stojí na radách k 2–3 jídlům a na pochvale za zápis; hlavní účinek na glukózu může přinést až lékařova změna dávky na kontrole – a tu u obědů **blokuje brána „nejdřív rady“**, i když aplikace rady k obědům skoro nenabízela (nález A1).
3. **Edukace:** pacient se dozví pravdivě a srozumitelně jediný princip (dávka = klíč na obvyklou porci), svá 4–6 „známá“ jídla a bezpečnostní pravidla. Nedozví se nic, co by mu změnilo rozhodování u 80 % jídel, která nikdy nebudou „známá“. Texty nelžou a nepoučují svrchu; vysvětlivky „Proč tohle radíme“ jsou dobré.
4. **Bezpečnost:** pravidla I-* jsou věcně správná a fungují i při zamítnutí rad. Dvě reálné mezery: kohorta připouští tablety včetně derivátů sulfonylurey bez záznamu (zvyšují riziko poklesu, aplikace o tom neví – A2), a pacientovi se slabou chutí k jídlu aplikace před píchnutím systematicky říká „dejte si obvyklou porci“ (B1).
5. **Proti vážení a počítání sacharidů** je srovnání v `29/02` nadsazené: tahle kohorta sacharidy nepočítá, její alternativa je „nic + aplikace senzoru“. Skutečná výhoda NutriFee je paměť po jídlech a report pro lékaře, ne úspora klepnutí.
6. **Drop-out:** opisování nejvyšší hodnoty z grafu, „do učení nejde“ u každého druhého jídla, nemoc (aplikace i při nemoci chce doplnit včerejšek), pestrá strava (nikdy žádná rada), kolísání štítku „známe ho“ → „pokaždé jinak“ u nejčastějšího jídla. Po 2 týdnech nepoužívání se nic neztratí a nic netrestá; jen „včera chybí“ a připomínky běží dál.

## 1. Den a týden v životě

Pacient: 63 let, DM2 12 let, bazál 24 j. ve 21:00, k jídlům 10/12/10 j., senzor na paži, částečný důchod, manželka vaří, oběd 2× týdně v závodní jídelně, v neděli u dětí.

**Všední den (doloženo texty obrazovek `walk.json` 6/0–7/2, 9/13, 12/2):**
- 7:00 oznámení „Chystáte se ke snídani? Otevřete NutriFee…“. Otevře Dnes → „Chystám se jíst“ (1). Krok 1: „Je inzulin k tomuto jídlu už píchnutý?“ – klepne „Ještě ne“ (2); podívá se do aplikace senzoru, klepne „7“ (3); u snídaně je navíc čip „V noci klesla glukóza pod 4“ (jen když ano); „Další“ (4). Krok 2: jídlo z „naposledy“ (5), „obvyklá“ (6), „Další“ (7). Krok 3: u známého jídla stupnice + 1–3 rady (odpovídat nemusí, 0–3 klepnutí), píchne si, „Píchnuto · uložit snídani“ (8). Obrazovka kroku 3 má 2 837 px = 3,4 výšky telefonu (snímek `w-10-04.png`).
- 12:10 oběd: totéž + blok „Po snídani · 7:05–9:05: nejvyšší hodnota za první dvě hodiny“ – musí v grafu senzoru najít okno 7–9 h a odečíst vrchol (nejtěžší úkon dne, už 07 B2) + otázka „Klesla glukóza do 4 hodin po jídle pod 4?“ (+2 klepnutí). Celkem 10–12.
- 18:30 večeře: totéž.
- 21:00 bazál: potvrdit (1) + nejvyšší hodnota po večeři + pokles (2–3).
- Mezi tím: karta „Jak to dopadlo“ ke snídani se objeví až po obědě (feedback se zpožděním ≈ 5 h, zatímco aplikace senzoru mu křivku ukázala hned).
- **Den: 33–40 klepnutí, 6 pohledů do senzoru, 4 otevření, 8–11 min** (07; moje průchody dávají stejné povinné volby).

**Víkend / návštěva:** v neděli u dětí jídlo, které v seznamu není → „nové jídlo jen názvem“ (+5–16 znaků psaní, nepovinné „je to jako“), žádná rada (neznámé jídlo). Jídlo u dětí se za 12 týdnů nezopakuje 4× → nikdy „známé“. Simulace: neděle zapsané z 62 %.

**Nemoc (4 dny):** přepínač „Není mi dobře“ (1 klepnutí), pravidla pro nemoc nahoře – dobré. Ale hned pod nimi karta „Včera chybí snídaně, oběd a večeře – doplnit?“ se třemi tlačítky (`walk.json` 14/2, snímek `w-14-02.png`): nemocný člověk je vyzván doplnit tři zpětné zápisy z grafu (každý ≈ 12 klepnutí). Zápisy z nemoci jdou mimo učení – takže ta práce je pro učení k ničemu, jen pro report (B2).

**První den (`walk.json` 6/8):** ráno po převzetí plánu (předán 5. 10. v 9:55) je na Dnes „Včera chybí oběd a večeře – doplnit?“. První dojem: „už něco dlužím“ (C1).

**Týden v rutině:** ≈ 265 klepnutí, 42 pohledů do senzoru, 60–80 min (07). Plus: týdenní karta „Váš týden“ (v simulaci bezny: „zapsáno 17–21 z 21, obvyklá porce 12–18, nejlepší rada –“ – v 8 z 11 týdnů bez „co pomohlo“, protože rada nebyla ani jednou v cíli nebo nebyla nabídnuta), milník zhruba jednou za 10 dní.

**Co dělá dnes bez aplikace:** píchá podle předpisu, dívá se na senzor 5–15× denně kdy chce, nic nezapisuje, na kontrole lékař vidí křivku bez kontextu. NutriFee **nic z toho neubírá**; přidává 8–11 min a 3 strukturované odečty grafu denně. Úleva, kterou slibuje (nepočítat sacharidy, nevážit), se týká práce, kterou tento pacient dnes nedělá.

## 2. Simulace 12 týdnů (jádro bez prezentační vrstvy)

Skript `br/sim12.cjs`: skutečný plán vydaný přes `NF.issuePlan`, zaučení, převzetí; 84 dní; jídelníček 5 snídaní / 15 obědů / 10 večeří s různou četností (nejčastější chléb se sýrem 55 % snídaní); skutečná reakce = střední vzestup jídla + šum SD (výchozí 1,6 mmol/l, *domněnka: skutečná variabilita vrcholu po stejném jídle u téhož člověka bývá řádově 1–2 mmol/l; k tomu zaokrouhlení obou hodnot na celé čipy ±0,5*) + porce + nemoc + nepíchnutý inzulin; rady, když je jádro nabídne, pacient přijímá s pravděpodobností 30–45 % (vzorný 50–70 %) a v simulaci opravdu snižují vzestup (procházka −1,0, pořadí −0,7, doplněk −0,5 – optimisticky). Adherence „bezny“: zápis ve všední den 82 %, o víkendu 62 %, nejvyšší hodnota opsána u 85 % zápisů, inzulin podle plánu 85 %, včas 85 %, obvyklá porce 85 %, svačina do 2 h po obědě 20 % dnů, nemoc 4 dny, dovolená 8 dní bez zápisu, zpětný zápis u 30 % zapomenutých.

| běh | zapsáno jídel (z 252) | do učení | známá · učíme se · nestálá · neznámá | 1. rada | 1. „známe ho“ | 1. rada s vlastní zkušeností | otázky „co bylo jinak“ | karty opak. poklesů | rady nabídnuto / přijato |
|---|---|---|---|---|---|---|---|---|---|
| bezny SD 1,6 seed 7 | 187 | 87 (47 %) | 4 · 21 · 1 · 5 | den 17 | den 40 | **den 66** | 7 | 0 | 89 / 26 |
| bezny SD 1,6 seed 3 | 187 | 87 | 6 · 19 · 1 · 4 | 12 | 32 | 32 | 3 | 2 | 146 / 46 |
| bezny SD 1,6 seed 11 | 198 | 89 | 5 · 22 · 0 · 3 | 12 | 16 | 29 | 7 | 2 | 90 / 21 |
| bezny SD 0,8 | 177 | 70 | 7 · 16 · 0 · 6 | 8 | 24 | 24 | 0 | 1 | 118 / 39 |
| bezny SD 2,2 | 183 | 64 | 4 · 14 · 0 · 10 | 17 | 34 | 34 | 7 | 2 | 115 / 27 |
| pestrá strava SD 1,6 | 181 | 76 | **3 · 31 · 0 · 12** | 25 | 44 | 44 | 4 | 0 | 119 / 35 |
| vzorný (100 %) SD 1,6 | 252 | 222 | 16 · 12 · 3 · 0 | 4 | 9 | 9 | 14 | 3 | 277 / 185 |
| vzorný SD 2,4 | 252 | 216 | 14 · 17 · 1 · 0 | 4 | 9 | 9 | **35** | 2 | 268 / 174 |

**Co z toho plyne:**
- **Polovina práce pacienta nejde do učení.** `NF.usableEp` (`core.js:877`) chce zároveň úplné hodnoty, inzulin „podle plánu“, včas (−30/+15 min), obvyklou porci, stejnou dávku, bez svačiny do 120 min, mimo nemoc a neobvyklý den. Každá podmínka sama o sobě splněná z 85 % dává 0,85⁴ ≈ 52 %. Pacient to vidí u každého druhého jídla jako „Jak to dopadlo · do učení nejde“ (text S-VYSLEDEK `excluded`, `walk.json` 9/14).
- **Rady se u běžného člověka nabídnou jen u snídaní a chlebových večeří.** `NF.advise` (`core.js:1241–1247`) nabízí radu jen u jídla s ≥ 2 započítanými zápisy a podílem v cíli < 50 %, nebo u známého. Obědy (15 jídel, každé 1–7× za čtvrt roku): 52 zápisů, **6 nabídek rad** (seed 7), 11 (seed 11), 14 (pestrá). Přitom 19 z 27 čistých obědů bylo nad cílem.
- **Důsledek na kontrole (A1):** jádro vyrobí kartu „Nejdřív rady k obědu – dávka až po radách: 19 z 27 obědů skončilo nad cílem, ale rada k jídlu byla přijata jen u 2 z nich (nejčastěji odmítnutá rada „Procházka po jídle“)“ (`core.js:2119–2130`). Lékař čte „pacient rady nepřijímá“, skutečnost je „aplikace je u obědů nenabízela“. Dávka k obědu zůstane další 3 měsíce beze změny.
- **„Známé“ není stálé.** Nejčastější jídlo (chléb se sýrem, 42×, 17 započítaných, vzestupy `[5,2,5,4,2,−1,0,0,5,3,3,5,6,−1,2,2,5]`) bylo od 64. dne „Známe ho · většinou v cíli“ a od 72. dne „pokaždé jinak“ (nestálé) – shoda se hodnotí jen z posledních 6 zápisů (`foodStatsRaw`, `core.js:935–937`) bez hystereze. Pacient nic nezměnil; štítek se změnil. Lékař ho uvidí mezi „nestálými jídly“.
- **Pravděpodobnost, že 6 zápisů téhož jídla projde jako „známé“** (čipy celá čísla, shoda 2,5 na 4 ze 6; výpočet v `br/`): SD vzestupu 0,8 → 100 %, 1,2 → 97 %, 1,6 → 88 %, 2,0 → 73 %, 2,4 → 59 %. Modelový pacient v `demo/fixtures.js` má šum ±0,36 mmol/l (`curve`, `(((k*37)%7)−3)*0.12`) – proto v příběhu „zná 19 z 21 jídel“. Reálný člověk tolik mít nebude.
- **Otázka „co bylo jinak“** u vzorného pacienta s SD 2,4: 35× za 12 týdnů (každý 7. zápis), a v 75 % odpoví „stejné jídlo“ – odpověď bez účinku („Dobře. Měříme dál“). Při SD 1,6 u běžného 3–7×, snesitelné.
- **Co jádro po 12 týdnech umí říct běžnému pacientovi:** u 4–6 jídel „kam se glukóza dostávala“ a stupeň; u jednoho až dvou z nich „Vyzkoušeno 1×: 1 z 1 v cíli (bez toho 6 z 12)“ (den 66). Věta „s radou bývalo níž“ pro jedno jídlo chce 8 + 8 zápisů (S-SOUHRN `min_n`) – žádné jídlo v žádném běhu „bezny“ ji nedosáhlo. Lékaři umí říct víc (souhrn rad za všechna jídla: „procházka: medián 11,0 vs. 13,5, n = 14/10“) – to je skutečný výstup.
- **Vzorný pacient** dostane první „známe ho“ 9. den a 16 známých jídel – příběh makety odpovídá vzornému pacientovi s nízkým rozptylem, ne běžnému.

## 3. Nálezy

### A – koncept pro člověka selhává / bezpečnost / nepravda

**A1. Brána „nejdřív rady“ trestá pacienta za to, že aplikace rady nenabídla.** Kde: `core.js:2112–2130` (návrh `prandAdviceFirst`), `advise` `core.js:1241–1247`. Co: u jídla dne s pestrou stravou (typicky oběd) jádro rady nabídne jen u jídel s ≥ 2 započítanými zápisy nad cílem; při 15 obědových jídlech za čtvrt roku to je 6–14 nabídek na 52 obědů. Podmínka `acceptedAdvice.length < radyPrve (3)` pak zablokuje návrh k dávce a lékař dostane větu „rada k jídlu byla přijata jen u 2 z nich (nejčastěji odmítnutá rada …)“, která zní jako nespolupráce. Proč to člověku vadí: obědy nad cílem (19 z 27) zůstanou 3 další měsíce bez řešení a pacient je v reportu nepravdivě vykreslen jako odmítající. Návrh: (a) do podmínky přidat počet nabídek – když bylo nabídek méně než `odmitnutiMin` (5), brána neplatí a návrh k dávce vznikne s větou v „Co návrh oslabuje“: „rady se u tohoto jídla dne skoro nenabízely (pestrá strava)“; (b) text karty „Nejdřív rady“ musí říkat „nabídnuto N×, přijato M×“ (fakt `radyFakt` už to má – dát ho do „Proč“, ne jen do bodu); (c) zvážit obecnou radu (procházka) u jídla dne, kde je nad cílem ≥ 2/3 čistých zápisů, i když jednotlivá jídla známá nejsou.

**A2. Kohorta připouští derivát sulfonylurey, aplikace o něm neví.** Kde: `core.js:405` (`ELIGIBILITY` „tablety nebo GLP-1 navíc nevadí“), `registry.js` K-KRITERIA, rada R-PROCHAZKA, I-MENE. Co: lékař zaškrtne „bere i tablety“, druh se nezaznamená. Deriváty sulfonylurey u DM2 na inzulinu výrazně zvyšují riziko poklesu pod 4 (zejména u starších, při vynechaném jídle a po námaze). Aplikace nabízí 15 min svižné chůze po jídle s plnou dávkou v těle, sleduje pokles jen po menší porci a lékař v „Co návrh oslabuje“ ani v Bezpečnosti nevidí, že pacient tabletu zvyšující riziko bere. Proč to vadí: první poklesy přijdou bez varování a bez souvislosti; karta po opakovaných poklesech říká „dávku si neměňte“ – správně, ale příčina může být v tabletě, o které NutriFee nemluví. Návrh (rozhodnutí vlastníka, mění K-KRITERIA): při zařazení druhá volba „tablety: derivát sulfonylurey / jiné“ (jen záznam); u pacienta s derivátem sulfonylurey přidat do I-MENE větu o tabletách (I-NEMOC-JIDLO ji už má) a v reportu u poklesů uvést „bere derivát sulfonylurey“. Pokud vlastník nechce aplikaci o tabletách mluvit, pak aspoň bod zaučení pro sestru.

**A3. Nepravda v tom, komu se ulehčuje (srovnání s počítáním sacharidů).** Kde: `29/02-vyhody-nutrifee.md` odd. 5 a shrnutí; `07` odd. 8. Co: srovnává se 9–13 klepnutí NutriFee proti 25–35 klepnutím vážení a aplikace na sacharidy. Pacient na pevných dávkách dnes neváží ani nepočítá – jeho dnešní zátěž je 0 klepnutí. Pravdivé srovnání: **NutriFee přidává 33–40 klepnutí a 6 odečtů ze senzoru denně proti ničemu**; získá za to paměť po 4–6 jídlech a report lékaři. Tvrzení „pacient se dozví, kam se jeho glukóza po jeho jídle dostane“ je u člověka se senzorem nadsazené – křivku po každém jídle vidí v aplikaci senzoru hned, NutriFee mu ji ukáže až u dalšího jídla a jen jako celé číslo. Návrh: v podkladu pro ven psát „místo vážení a počítání“ jen tam, kde jde o pacienty, kteří to dělali; jinak „přidává 8–11 min denně; výměnou dostane …“.

### B – funguje, ale stojí moc, zkresluje nebo míjí účinek

**B1. „Dejte si obvyklou porci“ u menší porce před píchnutím = „snězte víc“ pro člověka bez chuti.** Kde: R-PORCE `texts.smaller` (`registry.js`, „Dejte si obvyklou porci. Menší porce při stejné dávce inzulinu může vést k nízké glukóze.“), `advise` `core.js:1226–1231`. Co: zásada 3 to před píchnutím dovoluje a důvod v `15` odst. 18 platí (dávka je klíč). Pro 65letého člověka s dlouhodobě menší chutí k jídlu (častý stav u seniorů, při nemoci, v létě) je ale jediná věta, kterou dostane, „sněz tolik, kolik nechceš“ – alternativu (menší dávka) smí vyslovit jen lékař na kontrole za 3 měsíce. Výsledek: buď jí přes chuť, nebo radu ignoruje a dostává I-MENE a otázky na pokles. Návrh (ke schválení garantem, nemění zásadu): k textu `smaller` doplnit „Když vám chuť k jídlu chybí často, řekněte to na kontrole – dávka se nastavuje na porci, kterou opravdu jíte.“ a v reportu počítat „menší porce plánovaná před píchnutím N×“ jako samostatný signál pro lékaře (dnes je jen v „obvyklá porce X %“).

**B2. Nemocný pacient dostává „Včera chybí snídaně, oběd a večeře – doplnit?“** Kde: `NF.yesterdayGaps` (`core.js:2421`), obrazovka Dnes při nemoci (`walk.json` 14/2). Co: karta se ukazuje i v režimu nemoci; zápisy z nemoci jdou mimo učení (`inIllness`), takže doplnění ničemu v učení nepomůže. Návrh: při aktivní nemoci kartu nenabízet (nebo jen řádek „Při nemoci nic nedoplňujte“).

**B3. Štítek „Známe ho“ se může po týdnu změnit na „pokaždé jinak“ bez změny chování.** Kde: `foodStatsRaw` `core.js:935–937`, `confidence` `core.js:1023–1024`. Co: shoda se počítá jen z posledních 6 započítaných zápisů; jedno sváteční nebo stresové jídlo s odpovědí „stejné jídlo“ může jídlo z „známé“ shodit na „nestálé“ (viz simulace, chléb se sýrem po 17 zápisech). Pacient ztratí stupnici i rady s vlastní zkušeností; lékař uvidí nejčastější jídlo v nestálých. Návrh: hystereze jako u stupně reakce – jednou známé jídlo zůstane známé, dokud shoda neselže ve dvou po sobě jdoucích oknech; nebo „nestálé“ až po `maxUceni` zápisů bez shody od posledního stavu „známé“.

**B4. „Do učení nejde“ u každého druhého jídla.** Kde: `usableEp` (`core.js:877`), S-VYSLEDEK `excluded`. Co: 47 % zapsaných jídel u běžného pacienta nikdy nevstoupí do učení (kombinace sedmi podmínek). Pacient si přečte důvod („inzulin mimo čas“, „svačina do 120 min“, „menší porce“), ale nedozví se, že jeho práce s opisem hodnot k ničemu nevedla. Návrh: přijmout vědomě a říct to v zaučení („zhruba polovina zápisů se do učení nepočítá, i tak je lékař uvidí“); u „inzulin mimo čas“ zvážit tolerantnější mez pro učení (ne pro návrh k dávce), např. 45/30 min – D-CISTA už rozlišuje učení a dávku.

**B5. Zpětná vazba přichází až s dalším jídlem; aplikace senzoru ji dává hned.** Kde: `lastResult` (`core.js:1423`), hodnota se objeví po `setManualPeak` u dalšího jídla. Co: karta „Jak to dopadlo“ ke snídani přijde ve 12:10. Učební smyčka „co jsem snědl → co to udělalo“ je u senzoru okamžitá; NutriFee ji zpožďuje o 5 h a zúží na celé číslo. Je to důsledek rozhodnutí 15. 10. (bez napojení), ne chyba kódu; vadí ale pro „edukaci“ – pacient se učí z grafu senzoru, ne z NutriFee. Návrh: v kartě „Jak to dopadlo“ pracovat s tím, že pacient křivku už viděl („Vy jste křivku viděli; my jsme si zapsali vrchol 12“), a hlavně do zaučení dát jednu obrazovku „jak číst graf senzoru po jídle“ (okno 2 h, vrchol) – dnes se to nikde neučí, jen se chce.

**B6. Cesta ke kontrole „známe 4 z 28“ tři měsíce.** Kde: `pathStats` (`core.js:1744`), karta na Dnes. Co: čísla jsou poctivá, ale u běžného pacienta ukazují od 5. týdne „3 z 20“, „4 z 28“ – vypadá to jako neúspěch, i když text říká „nehodnotíme“. Milník „všechna častá jídla známe“ (`checkMilestones` `allknown`) je u pestré stravy nedosažitelný. Návrh: ukazovat jen počet známých („Známe už 4 vaše jídla“) a jmenovatel nechat lékaři.

**B7. Otázka na nejvyšší hodnotu 3–5 h zpětně bez vysvětlení, jak ji najít.** Kde: krok 1 blok „Po snídani · 7:05–9:05“ (`walk.json` 7/0). Co: pod nadpisem je jen „Podle grafu v aplikaci senzoru.“ Pro člověka se slabším zrakem je najít v grafu okno 7–9 h a odečíst vrchol nejtěžší úkon dne (07 B2) – a nikde v zaučení ani v „Proč se ptáme“ se neukazuje, jak na to. Návrh: bod zaučení „pacient našel v grafu senzoru nejvyšší hodnotu po zkušebním jídle“ s náhledem; v bloku věta „V grafu senzoru najděte 7:05–9:05 a klepněte na nejvyšší číslo, které tam křivka dosáhla.“

**B8. Pestrá strava = žádná rada, žádné známé jídlo, ale plná zátěž.** Kde: `advise`, `confidence`. Co: člověk, který vaří pestře nebo chodí do jídelny, zapisuje 12 týdnů (≈ 180 zápisů, 540 odečtů ze senzoru) a dostane 3 známá jídla a 0–14 nabídek rad u obědů. Jeho jediný užitek je report lékaři. Návrh: v zaučení ukázat „Je to jako …“ jako hlavní cestu u jídel, která jí zřídka (už 07 B9), a při rozchodu „jiná příloha“ nezakládat nové jídlo automaticky, když ho pacient jí zřídka (každé rozdělení dál ředí data).

**B9. Týdenní shrnutí bez obsahu.** Kde: `weekSummary` (`core.js:1785`). Co: u běžného pacienta v 8 z 11 týdnů „nejlepší rada –“, protože rada nebyla nabídnuta nebo nebyla v cíli; karta pak jen zopakuje „zapsáno 17 z 21, obvyklá porce 14“. Návrh: když není co říct o radách, říct věc, která je pravdivá a užitečná: kolik zápisů šlo do učení a které jídlo je nejblíž k „známé“ („u guláše chybí 1 zápis“).

**B10. Export ze senzoru před kontrolou zůstává pro tohoto pacienta nejtěžší úkol celé aplikace** (07 A3, rozhodnutí vlastníka 30. 10., bod 5 beze změny). Nepřidávám argumenty, jen důsledek pro člověka: bez exportu lékař nemá čas v cíli ani noci; karta „Před kontrolou pošlete do ordinace export ze senzoru“ pacientovi neříká jak a sestra ho v zaučení jen „ústně“ ověří. Očekávám, že u části pacientů 65+ export nebude, a report má na to větu (`Z-IMPORT.nociChybi`) – to je v pořádku. Riziko pro zdraví: noční poklesy se bez exportu dozví lékař jen z čipu u snídaně, a ten pacient klepne jen tehdy, když ho pokles vzbudil.

### C – drobnosti

- **C1.** První ráno po převzetí plánu: „Včera chybí oběd a večeře – doplnit?“ (`walk.json` 6/8; `yesterdayGaps` – sloty po 9:55 převzetí). Návrh: den převzetí z doptávání vynechat celý.
- **C2.** Karta jídla u neznámého jídla: „Zatím nic neodhadujeme – zapište ho 4×“ (`walk.json` 6/7). U jídla, které pacient jí jednou za měsíc, je to slib na rok. Návrh: „zapište ho 4× – u jídel, která jíte zřídka, nám pomůže „Je to jako …““.
- **C3.** „Odpovězte na otázku k inzulinu.“ pod zamčeným „Další“ zůstává i po odpovědi, když chybí hodnota ze senzoru (text se nemění podle toho, co chybí) – ověřeno v průchodu `taps.cjs` (po klepnutí na čip zůstal stejný text); může být artefakt zámku prezentace, viz „nestihl ověřit“.
- **C4.** Karta „Glukóza vám za posledních 7 dní klesla pod 4 dvakrát“ + celé pravidlo I-HYPO (`walk.json` 12/5) = 230 slov nad otázkou „Byla dnes snídaně?“. Pravidlo sbalit do řádku „Pravidlo k nízké glukóze ›“, když ho pacient už viděl.
- **C5.** Při 14 dnech nepoužívání (`gap14.cjs`) se nic neztratí: známá jídla zůstanou (bez stárnutí dat), otázka na pokles po menší porci skončí „bez odpovědi“ pro lékaře, „včera chybí“ jen za poslední den, připomínky běží dál, žádná výčitka. Rada po návratu „Vyzkoušeno …“ stojí na 3 týdny starých datech – přijatelné. Chybí jen jedna věta po návratu („Vítejte zpět, pokračujeme tam, kde jste skončili“) – dnes je návrat tichý.
- **C6.** Modelová data: šum ±0,36 mmol/l a 19 z 21 známých jídel ukazují garantovi nejlepší případ; v prezentaci by jedna věta („u běžného pacienta čekáme 4–8 známých jídel za čtvrt roku“) předešla zklamání ve studii.

## 4. Co funguje (pro člověka)

- **Zápis bez psaní a bez čísel s desetinami**: čipy celá čísla, porce slovem, „naposledy“, 10–12 klepnutí – pro 65+ zvládnutelné (ověřeno obrazovkami, 07).
- **Bezpečnostní větev je nezávislá na učení** (`advise` počítá `lowNow`/`smallerInBody` před bránou rad, `core.js:1212–1218`): pod 4 → žádná rada, jen pravidlo; menší porce po píchnutí → I-MENE hned a otázka za 60 min; „Nevím“ → „pro jistotu počítáme, že už je“ + I-NEVIM „znovu ho nepíchejte“. To jsou správné reakce na reálné situace.
- **Pravidla I-*** jsou klinicky věcná, úplná (co když je pořád pod 4, kdy záchranná služba, glukometr při nesouladu se senzorem, alkohol a námaha) a bez svrchu – nejlepší texty v aplikaci.
- **„Proč tohle radíme“ / „Proč se ptáme“** (`screens.js:1019–1023, 930`): krátké, pravdivé („Odkud to víme: jen z vašich vlastních zápisů“), bez žargonu.
- **Nemoc**: jedno klepnutí, dvě pravidla vedle sebe, denní otázka, konec určuje pacient.
- **Pochvala za čin, ne za číslo** – a hlavně žádné série s trestem; po 2 týdnech výpadku žádná výčitka (ověřeno `gap14.cjs`).
- **Report lékaři** je skutečný přínos i u běžného pacienta: „procházka: medián vrcholu 11,0 vs. 13,5 (n = 14/10)“, poklesy s datem, obvyklá porce %, inzulin podle plánu %, blok větve „zvýšit“ při poklesu.

## 5. Co chybí / co vyhodit

**Chybí, aby to v životě fungovalo:**
1. Náprava brány „nejdřív rady“ pro pestrou stravu (A1) – jinak u obědů nic nezmění ani lékař.
2. Záznam derivátu sulfonylurey (A2).
3. Zaučení „jak najít v grafu senzoru nejvyšší hodnotu po jídle“ (B7) a věta v zaučení „polovina zápisů do učení nepůjde a je to v pořádku“ (B4).
4. Hystereze u „známé“ (B3).
5. Ztišení aplikace při nemoci (B2) a v den převzetí (C1).
6. Pro lékaře: signál „menší porce plánovaná před píchnutím N×“ (B1) a „nabídek rad u jídla dne N“ v kartě Nejdřív rady (A1).

**Co by šlo vyhodit nebo zeštíhlit (bez ztráty pro pacienta):**
- Jmenovatel v „známe X z N“ na Dnes (B6) – číslo N je pro pacienta jen výčitka.
- Celé znění I-HYPO uvnitř karty po opakovaných poklesech (C4) – stačí odkaz, pacient ho už četl.
- Týdenní shrnutí v týdnech, kdy nemá co říct (B9) – nebo mu dát jiný obsah.
- Otázka „co bylo jinak“ s odpovědí „stejné jídlo“ bez důsledku – u člověka s vyšším rozptylem (SD ≥ 2) přijde každý 7. zápis; zvážit ptát se až při druhém rozchodu za sebou.
- Karta jídla „Zatím nic neodhadujeme – zapište ho 4×“ u jídel jedených zřídka (C2).

## Co jsem nestihl ověřit

- Skutečné klepání do obrazovky přes zámek prezentace (`br/taps.cjs`): zámek část klepnutí pohltil, proto počet klepnutí na jídlo beru z povinných voleb na obrazovkách (`walk.json`) a z měření 07 (10–12), ne z vlastního měření; C3 může být artefakt téhož.
- Chování při chybě (pád, nepřečtený stav, změna verze) – jen z `robustnost.test.cjs` a `15` odst. 18 („rozehraný průchod se po nové verzi nepřevádí“); nezkoušel jsem v prohlížeči.
- Cestování a změna času: sloty jdou podle hodin zařízení (`DAYPART_END`), nezkoušel jsem posun pásma.
- Skutečnou variabilitu vrcholu po stejném jídle u DM2 na pevných dávkách jsem nedohledával v literatuře; SD 1,6 je odhad (označeno jako domněnka); výsledky pro SD 0,8–2,4 jsou v tabulce.
- Noční čip u snídaně a otázka po večeři v simulaci (`sim12.cjs` noc nemodeluje) – ověřeno jen čtením `lowEvents`/`nightLows`.
