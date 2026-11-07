# Nezávislá kontrola 02 – diabetolog s 15 minutami na kontrolu (SCHEMA 83, 4. 11. 2026)

Pracováno jen v kopii T84 (nic v `maketa-rozhodovaci/` neměněno). Jádro načteno v node (`br/dr-boot.cjs`, `dr-review.cjs`, `dr-episodes.cjs`, `dr-checks.cjs`), obrazovky ordinace prohlédnuty v prohlížeči 1440×900 (`br/dr-shots.cjs`, `dr-summary.cjs`, `dr-drive.cjs`, `dr-more.cjs`; snímky `br/runs/dr-*.png`, texty `br/runs/dr-*-text.txt`). Nezávislý přepočet z výpisu všech 256 zápisů (`br/runs/dr-episodes.json`) v Pythonu. Scény: 21 = krok 1 souhrn, 22 = krok 2 návrhy, 23 = potvrzení, 24 = předání, 25 = pacient nový plán, 29/30 = dodatky „nepřijal“ / „nemám to doma“. Řádky kódu: `app/core.js` (C), `app/screens-clinic.js` (SC), `app/data/registry.js` (R), `demo/fixtures.js` (F).

Co už je v dřívějších prověrkách a neopakuji: 15 minut nestačí na celou kontrolu (30/07 B7), osm ověřovacích bodů (30/07 B6), spolehlivost dat (30/07 B8 – vyřešeno „zapsáno 241 ze 276“), sestra a „pozdě večer“ (31/02 B1, B7), HbA1c bez data (31/02 B3), doplněk stažený (31/02 B4), export neproveditelný pro pacienta (30/07 A3), mírnější cíle (30/06 B14).

---

## 0. Shrnutí (verdikt)

1. **Report dává lékaři správný obraz a správně ukazuje hlavní problém (snídaně) i správnou větev (zvýšit snídani, bazál ponechat kvůli svátečním večerům, oběd ponechat).** Nezávislý přepočet souhlasí s čísly aplikace na jednotku; prahy jsou pro DM2 na pevných dávkách rozumné.
2. **Největší klinická slabina: lékař na kontrole nemůže změnit žádnou dávku, ke které aplikace nevytvoří kartu s větví „zvýšit/snížit“.** Večeře (49 % nad cílem, zhoršuje se), oběd s blokem po dvou poklesech z října, a ve větvi „pacient rady nepřijal“ ani snídaně (92 % nad cílem, vrcholy do 17 mmol/l) – u těch lékař nemá volič ani volbu „jiná dávka“. To je proti zásadě 1 (dávku určuje lékař) v praxi: aplikace sice směr nevymýšlí, ale lékaři rozhodnutí o dávce odepře. (A1, A2)
3. **Pravidlo „nejdřív rady“ je v této podobě klinicky nebezpečné:** pacient, který odmítá procházku, zůstane další 3 měsíce na dávce, po které má 65 ze 72 snídaní nad 10 mmol/l – a lékař to v kartě vidí jen jako „posílit radu“. (A2)
4. **Chybí vývoj v čase:** snídaně se od listopadu zhoršují (medián týdne 12 → 15,5 mmol/l), večeře 9,5 → 11,5; report dává jen průměr za 92 dní. Lékař, který by zhoršení viděl, by rozhodl jinak než z mediánu 12,0. (B1)
5. **Sloučení jídla přes dvě jídla dne při stejné dávce** („Chléb se sýrem“ snídaně+večeře = „většinou v cíli“) skryje, že tentýž chléb je u snídaně v 8 z 15 nad cílem a u večeře v 2 z 15. (B2)
6. Čitelné za 2 minuty: ano – dlaždice, věta „co se dělo“, 3–4 karty. Podklady rozbalené mají 7 600 px (≈ 8 obrazovek), ale jsou sbalené.
7. Edukace a chování pacienta: lékař vidí porce, potvrzení inzulinu, odpovědi na rady a důvody, poklesy, otázky pacienta. Nevidí: hmotnost, čísla k mezerám v zápisech po měsících (pruh dnů je jen vizuální, B4), nic o tom, že pacient 6× sám snížil dávku ke snídani na 6 j. – jen číslo v bodu 1 (B5).
8. Důvěra: nejvíc ji ohrozí (a) zamčená dávka, (b) „Nejdřív rady“ u zjevné hyperglykémie, (c) blok „zvýšit“ kvůli poklesům vysvětleným menší porcí před 11 týdny, (d) podpis plánu „jako celku“ se 7 pravidly, která lékař nečetl.

---

## 1. Co lékař dostane na kontrole

| Potřebuje (15 min) | Dostane | Kde (scéna / kód) | Chybí / poznámka |
|---|---|---|---|
| Vyrovnání: TIR, TBR, HbA1c dříve·teď | ano: 58→68 %, 3→2 %, 62→55 mmol/mol s daty odběru, semafor | sc. 21/22 dlaždice; `NF.summary` C1900 | TIR jen z 14 dní exportu (22. 12.–4. 1.), ne za celé období – dlaždice to říká |
| Která část dne je problém | ano, ale jen jako návrhové karty (snídaně, oběd); **večeře bez karty** (37 z 75 nad cílem, medián 10) | sc. 22; `NF.proposals` C2100 práh 2/3 | **chybí přehledná tabulka snídaně / oběd / večeře: n · % nad cílem · medián · trend** (B1, B3) |
| Vývoj v čase (zhoršuje se? kdy?) | ne | – | týdenní mediány snídaní 12 → 15,5 (F56 `MORNING_RISE` od 1. 11.); report mlčí (B1) |
| Vzorec dnů (víkend/všední, svátky) | ne | – | synteticky nic nevidět; v praxi důležité (Štědrý večer vysvětluje noční poklesy jen přes sestru) |
| Nestálá jídla | ano, štítek „pokaždé jinak“ v tabulce jídel | sc. 21 „Reakce na jednotlivá jídla“ | v modelu žádné; tabulka nemá sloupec „jídlo dne“ (B2) |
| Vynechaná jídla, zapomenuté zápisy | ano: „zapsáno 241 ze 276“ + pruh 92 dnů × 4 řádky (mezery 7.–23. 10. vidět) | dlaždice Mimo učení; pruh „Zápisy za období“ sc. 21 | pruh bez čísel po měsících / celé dny vs. jen večeře (B4, drobnost) |
| Poklesy a okolnosti | ano: datum, čas, jídlo, zdroj, porce (u vyřazených „pokles pod 4 · menší porce“), noci z exportu i čipu | Bezpečnost; karta oběd „Co návrh oslabuje“ | okolnost „alkohol/svátek“ jen přes sestru, a u nočních poklesů se odpověď sestry na kartu nedostane (B6) |
| Dávky: potvrzeno, včas, jiné | ano: 96 % podle plánu, 6× nižší (6 j.), 3× nevím, bazál 87 z 92 | Plán a dávky; bod 1 karet | **6× snížená dávka ke snídani** je klinicky „pacient se bojí/titruje sám“ – není nikde zvýrazněno ani v otázkách pacienta (B5) |
| HbA1c, váha, ledviny, léky | HbA1c ano; léky „beze změny / měnily se“ ano | sestra krok 1 | hmotnost (92 kg při zařazení) ani změna váhy nikde; po 3 měsících na inzulinu je to vstup pro bazál (B7) |
| Jak pacient používal aplikaci | ano: porce 98 %, rady 95/136 přijato, důvody „nebyl čas“, otázky pacienta, zaučení | dlaždice, Rady, Otázky | nevidí, kolik dní pacient aplikaci neotevřel; nevidí, že „nad 15“ pravidlo viděl 15× v prosinci (`pravidlo.vysoka` ve stopě jen jako událost) |
| Co dělat: plán | ano – karty s větví a volbou dávky | sc. 22–23 | lékař **nemůže** měnit dávky bez karty, návyky, cíle mimo větev „nesedí“ u pravidel (A1, B8) |

**Čitelnost za 2 minuty:** krok 1 sbalený = 2 174 px (≈ 2,5 obrazovky), 7 dlaždic + věta „co se dělo“ + 3 štítky; krok 2 = 4 karty + 3 „beze změny“. Ano, lékař za 2 minuty ví: v cíli těsně pod 70 %, HbA1c klesá, dva oběd-poklesy a dvě noci, snídaně a oběd nad cílem. Co ho ale v těch 2 minutách zmate: nadpis „Posoudit bazální dávku – noční hodnoty pod cílem“ jako první karta s „předností“, přestože obě noci jsou po Štědrém večeru a Silvestru (data to vědí jen díky sestře, karta ne – B6).

---

## 2. Nezávislý přepočet modelového pacienta vs. návrhy aplikace

Vstup: 256 zápisů 6. 10. 2026 – 3. 1. 2027 (`dr-episodes.json`), dávky 8/10/8 j. + bazál 18 j. ve 21:00, HbA1c 62 → 55, export 14 dní TIR 68 %, TBR 2 %.

| Jídlo dne | n (vrchol) | před jídlem medián | vrchol medián | > 10 mmol/l | ≥ 15 | s přijatou radou / bez | trend (medián týdne) |
|---|---|---|---|---|---|---|---|
| snídaně | 83 | 7 (1/83 > 7,2) | **13** | **76 (92 %)** | 15 | 13 / 13,15 | 12 (říjen) → 13 (listopad) → 14 (prosinec) → **15,5–15,8** (poslední 2 týdny) |
| oběd | 81 | 7 (12/81 > 7,2) | 11 | 54 (67 %) | 0 | 11 / 11 | 11,5 → 11 → 11 → 12,7 |
| večeře | 75 | 7 (12/75 > 7,2) | 10 | 37 (49 %) | 0 | 11 / 9 (zkresleno výběrem jídla) | 9,5 → 9,5 → 11 → 11,5 |
| svačina | 14 | 7 | 10 | 1 | 0 | – | – |

Co by diabetolog vyvodil:
- **Snídaně je problém, a je to problém dávky, ne jednoho jídla:** všech 6 snídaňových jídel je nad cílem (i chléb se sýrem 8/15), hodnota před snídaní je v cíli (7), takže bazál sedí a vzestup ~6 mmol/l jde za prandiální dávkou 8 j. (a od listopadu za přidaným ranním vzestupem, F56). Rady nepomáhají (13 vs 13,15). **Závěr: zvýšit inzulin ke snídani.** Aplikace: karta „Posoudit prandiální dávku ke snídani“, všech 9 bodů sedí, větev „zvýšit“, lékař volí 10 j. – **shoda.**
- **Hypo riziko:** 2 poklesy po obědě 16. a 17. 10. při **menší porci** s plnou dávkou (před 11 týdny), 2 noční poklesy 25. 12. a 1. 1. (3,6 mmol/l, 2–5 h) po svátečních večerech; TBR 2 %. **Závěr: nejde o předávkování; jde o chování (menší porce s plným inzulinem, alkohol/pozdní jídlo).** Bazál ponechat, poučit. Aplikace: bazál – větev „bod 2 nesedí: ponechat, řešit večeře“ (jen díky sestře), **shoda**; ale karta má „přednost“ a nadpis, který lékaře nejdřív vede k snižování bazálu, přestože ranní hodnoty jsou 6–7 a snídaně vysoké (snížení bazálu by snídaně dál zhoršilo). Diabetolog by chtěl, aby karta sama řekla „obě noci po svátcích, ranní hodnoty v cíli“ – to v kartě není (B6).
- **Oběd:** 67 % nad cílem, medián 11 – hraniční. Diabetolog by nejdřív změnil jen snídani („jedna změna najednou“) a oběd nechal; **shoda s výsledkem**, ale ne s důvodem: aplikace oběd ponechá **kvůli dvěma poklesům po menší porci z října**, což diabetolog za důvod nepovažuje – a kdyby chtěl oběd zvýšit, nemůže (A1).
- **Večeře:** 49 % nad cílem, medián 10, od prosince 11,5; kebab/pizza/těstovinový salát 100 % nad cílem, losos/salát v cíli. Diabetolog: „rady k porci a výběru u večeře“, dávku zatím nechat. Aplikace mlčí úplně (práh 2/3). Mlčení je obhajitelné prahem, ale lékař nemá ani řádek „večeře: 37 z 75 nad cílem, bez návrhu“ (B3).
- **Dávky snížené pacientem:** 6× 6 j. místo 8 j. ke snídani, 4× bazál 16 j. místo 18 (každých 13 resp. 17 dní – syntetický vzor). Diabetolog se zeptá proč (strach z hypo? zapomíná?). Aplikace: číslo v bodu 1, nic víc (B5).
- **HbA1c 62 → 55 při TIR 58 → 68 %** je konzistentní; bod „vyrovnání nedosahuje cíle“ sedí (68 < 70 a 55 > 53) – správně.

**Prahy v registru (R):** D-PRAND 28 dní / ≥ 8 čistých jídel / 2/3 nad 10,0 / medián > 10,5 – rozumné pro pevné dávky (lékař stejně mění dávku až po týdnech). Hranice 4 (čipy) vs 3,9 (cíle) – sjednoceno, OK. „Nad 15“ jako čip + pravidlo I-VYSOKA – rozumné. D-BAZAL 10 nocí ze 14 – rozumné, ale **14denní okno znamená, že bazál se posuzuje jen z exportu před kontrolou**; ranní hodnoty z opsaných „před snídaní“ za 92 dní (83 hodnot) se pro bazál nepoužijí (B9). S-SEMAFOR 80 %/60 % pro porce a inzulin – rozumné. Co je klinicky sporné: **D-POSTUP `poklesy_od` = 1 za celé období bez ohledu na příčinu a stáří** (A1) a **D-PRAND `radyPrve` = 3 / `odmitnutiPodil` 0,6 jako tvrdý blok návrhu k dávce** (A2).

---

## 3. Nálezy

### A – zásady, bezpečnost, nepravdivý návrh

**A1 · Lékař nemůže na kontrole změnit dávku, pro kterou aplikace neukáže větev „zvýšit/snížit“.**
- Kde: sc. 22 karta oběd po „Vše sedí“ (`br/runs/dr-drive-text.txt`, část „LUNCH“): „Postup říká: Bod 8 nesedí: ponechat dávku, řešit jídlo“, tlačítka jen „Souhlasím · ponechat dávku, řešit jídlo“ / „Jiné rozhodnutí“ = „Ponechat beze změny“ + 4 důvody zamítnutí. Volič jednotek se vykreslí jen pro větev up/down nebo bez postupu: SC480 `showStepper = !wait && (br.action === 'up' || br.action === 'down' || (free && pr.kind === 'dose'))`; v „Jiné rozhodnutí“ není volba „jiná dávka“ (SC521–523). Krok 3 je jen souhrn bez voličů (SC536–545). Večeře nemá kartu vůbec (C2100: `above/eps < 2/3 → return`), bazál „ponechat“ – nikde volič.
- Co se děje: lékař, který po rozhovoru usoudí, že říjnové poklesy po obědě byly z menší porce a oběd chce zvýšit, nebo chce snížit bazál o 2 j. kvůli nocím, nebo upravit večeři, to v aplikaci **nemůže udělat**. Kód s tím počítá jen bez schváleného postupu (C2276 `lowBlock && units > cu → againstData`), ta cesta je ale se schváleným D-POSTUP nedosažitelná.
- Proč to vadí: zásada 1 říká, že dávku určuje lékař; tady ji určuje práh registru. Lékař buď plán vydá s dávkou, se kterou nesouhlasí, nebo dávku změní mimo aplikaci – a pacient pak bude mít v aplikaci jinou dávku než na papíře (přesně situace, kterou vlastník 1. 11. zrušil jako „jiný lékař“). 15 odst. 10 slibuje „Upravit (jiné řešení z nabídky)“ – nabídka jinou dávku neobsahuje.
- Návrh: u každé dávky v kroku 3 (a u karet s větví „ponechat“) volič „jiná dávka“ se zápisem „rozhodnuto jinak než postup“ (+ u jídla s poklesem „proti datům“, jak kód už umí). Větev „ponechat“ zůstane doporučením, ne zámkem. U večeře bez karty aspoň řádek s čísly a týmž voličem.

**A2 · „Nejdřív rady“ blokuje posouzení dávky i při zjevné, dlouhodobé hyperglykémii.**
- Kde: sc. 29 (dodatek „pacient rady většinou nepřijal“): „Nejdřív rady ke snídani – dávka až po radách: 65 z 72 snídaní skončilo nad cílem, ale rada k jídlu byla přijata jen u 11 z nich“; větve jen „posílit radu / vyměnit radu / probrat důvody“, žádný volič. C2117–2127 (`acceptedAdvice.length < radyPrve || declinedN/offered ≥ 0.6 → return` před vznikem karty k dávce). R D-PRAND summary to potvrzuje jako záměr; 15 odst. 10 tabulka „Rady k jídlu první“.
- Co se děje: tatáž data (92 % snídaní nad 10, vrcholy 15–17, HbA1c 55 nad cílem) – a protože pacient odmítá procházku po snídani („nebyl čas“), aplikace tři měsíce dávku neposoudí a lékař ji (A1) nemůže změnit ani sám.
- Proč to vadí: u DM2 na pevných dávkách je odmítnutá procházka důvod k edukaci, ne k odložení úpravy inzulinu; 3 měsíce hyperglykémie navíc jsou reálná škoda. Lékař-garant tenhle postup zamítne nebo ho po první kontrole přestane brát vážně. Rozhodnutí vlastníka (rady první) nezpochybňuji jako pořadí – zpochybňuji ho jako **výlučný blok**.
- Návrh: „Nejdřív rady“ ponechat jako první kartu, ale karta k dávce ať vznikne vždy, když jsou splněny prahy nad cílem, s bodem „Pacient rady zkoušel (≥ 3×)“ – když nesedí, větev „ponechat, posílit radu“ jako doporučení a volič dávky dostupný (A1). Alternativně: u mediánu vrcholu ≥ 13 nebo ≥ 3 čipů „nad 15“ se blok „rady první“ neuplatní (parametr D-PRAND, návrh autora).

**A3 · Blok „zvýšit“ počítá každý pokles za celé období bez ohledu na příčinu a stáří.**
- Kde: C2140–2147 `lowEv = NF.lowEvents(S).filter(meal && at >= since)` (since = vydání plánu, 92 dní), `block: lowEv.length >= 1`; karta oběd: „2 poklesy pod 4 po obědě (16. 10., 17. 10.) · nesedí podle dat · Nepřepíná se“. Oba poklesy jsou ve vyřazených zápisech s důvodem „pokles pod 4 · menší porce než obvykle“ – aplikace příčinu **zná** a přesto blokuje.
- Proč to vadí: rozhodnutí vlastníka 27. 10. (bezpečnost, bez dotazu) respektuji; ale pokles s plnou dávkou po poloviční porci před 11 týdny neříká nic o dávce k obvyklé porci. Lékař uvidí „nepřepíná se“ u bodu, který podle rozhovoru s pacientem nesedí, a postup přestane číst. Tohle vede k reálné škodě jen ve spojení s A1 (nemůže rozhodnout jinak) – proto to uvádím výslovně.
- Návrh: blok ponechat jen pro poklesy při obvyklé porci a potvrzené dávce (= skutečný signál o dávce) nebo pro poklesy ≤ 28 dní; poklesy po menší porci vypsat jako varování („2 poklesy po menší porci – poučit“), ne jako zámek. Parametry D-POSTUP `poklesy_od`, nové `poklesy_jen_ciste` (návrh autora).

**A4 · Nadpis „Posoudit bazální dávku – noční hodnoty pod cílem“ s předností, aniž karta ví, co ví sestra.**
- Kde: R D-POSTUP `bazalLow` nemá `sestraBody` (jen `bazalHigh` má `vecer`); C2033 `pr.nurse = ps.sestra || []` → u PR-BAZAL prázdné; karta sc. 22: bod 2 „Večeře v těch nocích byly obvyklé, bez alkoholu a nočního jídla“ bez „sestra s pacientem: nesedí“, ačkoli sestra „Pozdě večer a v noci pacient nic nejí“ zaškrtla „Nesedí“ (F138 `nurseStory.vecer:false`). V příběhu bod 2 předvyplní jen prezentační vrstva (F341 `D.storyVerify … i !== 1`), v produkci by lékař začínal od „0 ze 3“.
- Proč to vadí: první karta kontroly nese „přednost“ a větev „snížit bazál“, přitom ranní hodnoty jsou 6–7 a snídaně 13–17; snížení bazálu by situaci zhoršilo. Lékař musí sám dojít k tomu, že 25. 12. a 1. 1. jsou noci po svátcích. (Souvisí s 31/02 B1/B7, ale tam šlo o rozpor sestra–lékař; tady o to, že odpověď sestry k nocím vůbec nedoteče.)
- Návrh: `bazalLow.sestraBody = [null, 'vecer', null]` a k bodu 2 přidat fakt z dat: „ranní hodnoty 6,3 (v cíli), noci 24.→25. 12. a 31. 12.→1. 1.“; v „Co návrh oslabuje“ větu „obě noci následují po dnech, které sestra označila jako jídlo pozdě večer“.

### B – lékař rozhodne hůř nebo ztratí důvěru

**B1 · Žádný vývoj v čase.** Snídaně: medián po týdnech 12 → 15,5 (F56 `MORNING_RISE 1,6 od 1. 11.`), 12 z 15 čipů „nad 15“ v posledních 14 dnech; večeře 9,5 → 11,5. Report ukazuje jen „medián 12,0“ za 92 dní (C2155) a „dříve·teď“ jen u dlaždic. Lékař, který vidí, že se snídaně **zhoršují**, zvolí jiný krok (a zeptá se na váhu, léky, spánek) než ten, kdo vidí stabilní 12,0. Návrh: u každé karty k dávce dva mediány „první polovina období · poslední 4 týdny“ a slovo směru (S-SEMAFOR `smer_pb` obdoba v mmol/l, návrh autora: od 1,0 mmol/l). Graf křivek vlastník zavrhl (odst. 18) – tohle jsou dvě čísla, ne graf.

**B2 · Sloučení jídla přes jídla dne skrývá ranní efekt.** R-REAKCE: „Stejné jídlo u dvou jídel dne se slévá jen při stejné dávce“ – snídaně i večeře mají 8 j., takže „Chléb se sýrem a zeleninou 30× · většinou v cíli · 4 z posledních 8“ (sc. 21 tabulka). Přepočet: u snídaně 8 z 15 nad cílem (medián 11), u večeře 2 z 15 (medián 9). Lékař i pacient dostanou „většinou v cíli“ u jídla, které ráno v cíli není. Tabulka „Reakce na jednotlivá jídla“ nemá sloupec „jídlo dne“. Návrh: učit a zobrazovat vždy podle jídla dne (slot je už jednotka návrhu k dávce); sloučení jen jako volitelné zobrazení.

**B3 · Večeře bez jediného řádku.** 37 z 75 nad cílem, 3 jídla 100 % nad cílem, trend nahoru – a lékař se to dozví jen z tabulky jídel po rozbalení. Návrh: v kroku 2 řádek „Večeře: 37 z 75 nad cílem (49 %) · bez návrhu (práh 2/3)“ s voličem (A1) – lékař ví, že aplikace večeři neviděla jako problém a proč.

**B4 · Pruh „Zápisy za období“ – funguje, ale bez čísel (přeřazeno na C).** Ověřeno v DOM i na snímku `br/runs/dr-strip.png`: 92 sloupců × 4 řádky, 334 „zapsáno“, 36 „bez zápisu“ (všechny mezery v říjnu, od 24. 10. úplné) – odpovídá přepočtu (15 dnů s chybějícím hlavním jídlem, všechny 7.–23. 10.). Lékař vidí vzorec, ale ne číslo: kolik hlavních jídel chybí v kterém měsíci a jestli chybí celé dny (pacient aplikaci neotevřel) nebo jen večeře. Návrh: pod pruh jeden řádek „říjen: 36 bez zápisu (12 celých dnů) · listopad 0 · prosinec 0“.

**B5 · Pacient 6× snížil dávku ke snídani na 6 j. a 4× bazál na 16 j. – nikde jako téma rozhovoru.** Karta snídaně bod 1: „včas 74 z 83 zápisů · 6× nižší dávka (6 j.) · 3× nevím“ – správně, ale v souhrnu je dlaždice „Inzulin podle plánu 96 % ✓“ zelená, a otázka pacienta „Inzulin byl někdy jinak než podle plánu (6×). Je to problém?“ je jen nabídka, kterou pacient nemusí zvolit. Klinicky je opakované vlastní snížení dávky (strach z hypo? zapomněl?) důležitější než 96 %. Návrh: v „Co se dělo“ věta „Pacient si 6× dal nižší dávku ke snídani (6 j.) a 4× nižší bazál (16 j.)“ a u karty snídaně v „Co návrh oslabuje“ – zvýšení dávky u pacienta, který ji sám snižuje, je k ověření.

**B6 · Noční poklesy bez okolností v kartě.** Karta bazál uvádí jen „2 ze 14 nocí … 3,6 mmol/l“. Lékař chce vedle toho: ranní hodnota po té noci (6,3), hodnota před spaním (z exportu je), co bylo k večeři, čas bazálu. Data v exportu jsou (`S.nights[].fasting`, body 21–24 h), karta je neukazuje. Návrh: řádek u každé noci „večeře 18:30 Pizza · bazál 21:05 · před spaním X · ráno 6,3“.

**B7 · Hmotnost chybí úplně.** Karta pacienta nese 92 kg (BMI 29,7) při zařazení (F28), kontrola se na váhu neptá, sestra ji nevybere. Změna hmotnosti o 3–4 kg za 3 měsíce mění potřebu bazálu i prandiálu a je to nejlevnější údaj v ordinaci. Návrh: do „Sestra · S pacientem před lékařem“ volič hmotnosti (mřížka jako HbA1c), dlaždice „Hmotnost dříve·teď“.

**B8 · Na kontrole nejde měnit návyky ani cíle (kromě větve „nesedí“ u pravidel).** Krok 3 vypisuje návyky bez přepínače (SC539 `habitsHtml` jen `<li>`); katalog má „Snídaně ve stejném čase“ a „Procházka po večeři“, které by diabetolog u tohoto pacienta právě teď přidal (snídaně 7:05/7:10 je stálá, ale večeře kebab/pizza by procházku snesla; A1 ukazuje, že procházka po večeři dává 11 vs 13). Cíle (TIR 70 %, HbA1c 53) jde změnit jen přes „Bezpečnostní pravidla beze změny? → nesedí → upravit“ – to lékař neuhodne. Návrh: v kroku 3 sekce Návyky s přepínači z katalogu (jako při zařazení) a cíle s voličem; „Beze změny“ zůstane výchozí.

**B9 · Bazál se posuzuje jen z 14 dní exportu; 83 opsaných hodnot před snídaní leží ladem.** C2064 `nights = S.nights.filter(≥ clock − 14 dní)`, `fastMed` z `n.fasting` exportu. Pacient přitom 92 dní opisuje hodnotu před snídaní (medián 7, jen 1/83 > 7,2). Lékař se ranní hodnoty za období dozví jen nepřímo. Návrh: do karty bazál (obou větví) a do souhrnu „ranní hodnoty před snídaní za období: medián 7,0 · nad 7,2: 1 z 83“ – bez exportu je to jediný údaj o bazálu.

**B10 · Pořadí karet: bazál s „předností“ před snídaní.** C2069 priority 0 pro noční pokles (záměr: nízké před vysokými). U tohoto pacienta je výsledek „ponechat“ a lékař stráví první 3–4 minuty na kartě, která nic nemění, zatímco snídaně (jediná změna) je druhá. Návrh: přednost ponechat jen tehdy, když noc nebyla po dnu, který sestra označila „jídlo pozdě večer“, nebo když je noc < 3,0; jinak kartu zařadit, ale bez „přednosti“ v textu.

**B11 · „S radou bývalo níž“ u procházky (12 vs 14) je pooled přes jídla dne.** Přepočet: snídaně 13 vs 14, večeře 11 vs 13, oběd 11 vs 12 – směr drží, ale velikost 2 mmol/l vzniká i tím, že procházku pacient přijímá spíš po večeři (lehčí jídla). Text „Srovnání … ukazuje směr, nedokazuje účinek“ je v podkladech – v kartě „Zachovat radu“ ne. Návrh: „S radou bývalo níž (12,0 vs 14,0; po jídlech dne 13/14, 11/12, 11/13)“.

**B12 · Podpis plánu jako celku se 7 pravidly, která lékař na kontrole nečte.** Sc. 23 „Bezpečnostní pravidla – potvrzeno beze změny“ po jednom klepnutí „Potvrdit vše beze změny“. Rozhodnutí vlastníka (21. 10.) nezpochybňuji; ale lékař, který podepisuje „vyhledejte ještě ten den lékařskou pomoc“ a „volejte záchrannou službu“ u pacienta, jehož pravidla nikdy neotevřel, ztratí důvěru v okamžiku, kdy pacient pravidlo ocituje. Návrh: v kroku 3 u pravidel ne „potvrzeno beze změny“, ale „platí obecná pravidla NutriFee v1 · beze změny u pacienta“ – aby bylo zřejmé, co lékař podepisuje (že nic nezměnil), ne že pravidla schválil.

### C – drobnosti

- **C1 · Bazál 87 vs 88.** Stopa `kontrola.zahajena` nese `basalAs: 87`, karta a podklady „87 z 92“, `NF.summary` ve stejné scéně dává 88 (`dr-checks.cjs`: at start 88 – tj. záznam 4. 1. se do stavu dostal až po zahájení kontroly; domněnka: pořadí `basal()`/`startReview` ve fixtures). Lékař vidí dvě čísla podle místa.
- **C2 · „Pacient má akutní problém“** (SC45, 243) je ve všech čtyřech krocích a otevře jen pravidla a kontakty (SC764). Název slibuje víc, než dává; pro lékaře s 15 minutami je to rušivé tlačítko. Návrh: „Pravidla a kontakty“ v záhlaví.
- **C3 · Karta oběd: „54 z 79 … i když rada k jídlu byla přijata u 31 z nich“** – u oběda je rada jen „pořadí“ (11 vs 11, „podobně“). Věta sugeruje, že rady selhaly; přesnější: „rada „pořadí“ přijata u 31, bez rozdílu“.
- **C4 · Dlaždice „Přijaté rady 95 ze 136 · s radou bývalo níž“** – stav slovem chybí (žádné ✓/!), jediná dlaždice bez stavu; a „s radou bývalo níž“ platí jen pro procházku (order „same“, addon „few“), C `adv.works = 'yes'` z jedné páky.
- **C5 · Otázky pacienta: jen 1 z 3 navržených** se dostane do reportu (ta, kterou pacient klepl) – v pořádku, ale lékař neví, že aplikace nabídla i „inzulin 6× jinak“; nabídnuté a neklepnuté otázky by mohly být v podkladech šedě.
- **C6 · Tabulka jídel řadí podle počtu zápisů**, ne podle problému; „Jablko“ (svačina) je čtvrtá. Řadit podle „nad cílem“ sestupně, svačiny na konec.
- **C7 · Krok 1 rozbalený = 7 607 px.** Sbalený je v pořádku; ale tabulka jídel (20 řádků × 7 sloupců) rozbalená je pro 15 minut nečitelná – stačí 5 jídel + „Další (15)“ jako u S-SILNA.
- **C8 · Sestra: „Změnil se zdravotní stav (těhotenství, ledviny, hospitalizace)“** – u 58letého muže v modelu; v ostré aplikaci volba podle pohlaví.
- **C9 · Platnost P2 „do 7. 4. 2027 (příští kontrola)“** – pevně 92 dní; lékař termín nevolí. Ve 15 minutách často chce 6 týdnů po změně dávky.

---

## 4. Co funguje (pro lékaře)

- Čísla sedí na jednotku s nezávislým přepočtem (65/72, 54/79, mediány 12,0 a 11,0, 2 ze 14 nocí, 87–88/92, 98 %, 96 %).
- Hlavní závěr (zvýšit snídani, nic jiného neměnit) je klinicky správný a lékař k němu dojde za 2–3 minuty; „Vše sedí“ + volič + Souhlasím = 4 klepnutí.
- Vyřazené zápisy s důvodem (menší porce, nepotvrzený inzulin, nemoc, chybějící data) a „Co návrh oslabuje“ (61 ze 72 jen opsaných; shoda s exportem 12 z 12) jsou přesně to, co diabetolog v hlavě dělá ručně.
- Dříve·teď·rozdíl s datem odběru u HbA1c; hlášené poklesy odděleně od procent času; noci se zdrojem (export / zápis pacienta).
- Sestra před lékařem: léky, HbA1c, 4 body – a lékař vidí „sestra s pacientem: sedí“ u bodů karty snídaně/oběd.
- Pacient v novém plánu vidí důvod každé změny i „neměny“ („Po obědě glukóza klesla pod 4; lékař dávku ponechal a probral to s vámi“) a potvrzuje novou dávku otázkou „Souhlasí?“.
- Varování „Měníte 2 dávky najednou“ bez zámku; „ponechat“ a „zamítnout“ bez dokončeného ověření.

---

## 5. Co chybí / co vyhodit

**Chybí (pořadí podle klinické váhy):** (1) volič „jiná dávka“ u každé dávky na kontrole (A1); (2) karta k dávce i při „rady první“ (A2); (3) trend za období u snídaně/oběda/večeře (B1); (4) řádek pro večeři (B3); (5) hmotnost (B7); (6) ranní hodnoty z opsaných zápisů do bazálu (B9); (7) návyky a cíle měnitelné na kontrole (B8); (8) okolnosti nočních poklesů v kartě (B6); (9) termín příští kontroly volitelný (C9).

**Vyhodit / zjednodušit:** tlačítko „Pacient má akutní problém“ (C2); „přednost“ nočních poklesů v textu karty, když noc následuje po svátečním večeru (B10); tabulka 20 jídel v podkladech → 5 + „Další“ (C7); dvě dlaždice bez stavu (Přijaté rady, Mimo učení „– v normě“) sloučit do jednoho řádku „spolehlivost dat“.

**Dlouhodobý mechanismus (otázka 5):** směr je správný – konzistence porce + pevná dávka + jedna změna za kontrolu je to, co u DM2 funguje, a 3 měsíce opisování dvou čísel je únosné. Slabiny: (a) jen vrchol do 2 h – pozdní vzestup po tučném jídle (řízek, pizza) a pokles ve 3.–4. hodině po jídle aplikace nevidí, export ano, ale jen 14 dní; (b) noc jen z exportu + čip – bez exportu lékař o bazálu neví nic kromě ranních hodnot, které aplikace nepoužívá (B9); (c) export csv dá lékaři TIR/TBR za 14 dní a noci – ne víc, než má v portálu výrobce; přidaná hodnota je spárování s porcí a dávkou, což report dělá; (d) HbA1c 62 → 55 v modelu je syntetické; realisticky je zisk z konzistence porce 3–6 mmol/mol, hypo riziko klesá hlavně díky pravidlu k menší porci a otázce za 60 min – to je nejcennější bezpečnostní prvek celé aplikace.

**Důvěra (otázka 6):** lékař aplikaci začne ignorovat při první kontrole, kde nemůže změnit dávku, kterou změnit chce (A1), nebo kde mu „Nejdřív rady“ zakáže řešit hyperglykémii (A2). Zamítnuté položky garanta („Tahle část nefunguje“) jsou pro lékaře-garanta v první studii srozumitelné; pro běžného lékaře v ostré aplikaci nemají co dělat (nebude je vidět – vlastník: v ostré aplikaci jsou položky schválené).

---

## Co jsem nestihl ověřit

- Obrazovky pacienta „Plán“ a „Dnes“ po převzetí P2 (moje akce `newplanUnderstood`/`planAgree` neměly účinek – jiné názvy akcí); hodnotil jsem jen obrazovku „Nový plán“ (sc. 25) a text v `15` odst. 7a/7b.
- Dodatek sc. 30 („nemám to doma“) jen zběžně – karta „Vyměnit radu“ s výběrem náhrady vypadá správně.
- Chování při zamítnutém D-POSTUP (volná větev s voličem) – jen z kódu (SC475–480), ne během.
- Tour (vyprávění) ke kontrole jsem nečetl celé; jen `reviewSummary` kroky (soulad s obrazovkou vypadá v pořádku).
