# Kontrola 4 – průchod v prohlížeči (garant a správce), SCHEMA 77

*29. 10. 2026 · nezávislý kontrolor · maketa beze změny (kopie v scratchpadu `k4-browser/m/`, server na portu 8771) · Chrome for Testing přes Playwright.*

Snímky jsou ve složce scratchpadu
`/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/k4-browser/snimky/`
(dál jen `snimky/…`); kompletní běhy po krocích v `k4-browser/runs/` (`d1440`, `d1440c`, `m390a`, `m360b`, `rej-<ID>.json`).

Číslování scén je tak, jak ho vidí garant v liště („scéna N z 26“), kroky podle panelu („Krok k z n“).

## Co jsem prošel

| Průchod | Okno | Animace | Zamítnutí a poznámky |
|---|---|---|---|
| `d1440` | 1440×900 | ne | vše schváleno, celý příběh, souhrn, dodatek, Skončit |
| `d1440c` | 1440×900 | ano | zamítnuto K-KRITERIA, C-CILE, R-SKORE, R-PODOBNOST, S-SILNA, D-BAZAL, I-KONTAKT; 2 poznámky |
| `m390a` | 390×844 (dotyk) | ano | zamítnuto R-POKYNY, Z-GLUKOZA, R-PORCE, B-HYPO, D-POSTUP (navazující); 4 poznámky |
| `m360b` | 360×740 (dotyk) | ne | zamítnuto R-REAKCE, D-CISTA, I-MENE, R-PORADI, P-NEMOC, D-PRAND (navazující); 2 poznámky |
| `rej-<ID>` ×28 | 1440×900 | ne | každá garantová položka zamítnutá zvlášť; text obrazovky v každém kroku porovnán se schváleným během |

Cílené zkoušky: Zpět přes hranici scény a přes přeskočené úseky, F5 uprostřed animace, F5 s rozepsanou poznámkou, Přehled scén a skok, sbalený panel a Dál ze sbaleného panelu, klepnutí do obrazovky (bublina „Tohle za vás klepne ukázka“), vysvětlivky (100 bublin na 1440, 79 na 360 – žádná mimo okno, žádný zástupný text), zásuvka „Vaše rozhodnutí“ (otevření karty, změna, poznámka), souhrn (rozhodnutí v řádku, „Potvrdit přesto“, změna po potvrzení, „Potvrdit souhrn znovu“, F5), konec ukázky a F5 po něm, výpadek ukládání (POST 503), správce na 1440/390/360.

**Bez nálezu:** chyby konzole (žádné ve všech během, mimo záměrně vyvolané 503), zástupky `{…}`, `undefined`, `NaN`, interní kódy nálezů v textech, vodorovné přetečení, bubliny mimo okno, štítek nabízené položky mimo výřez v okamžiku rozhodování (po rozhodnutí první položky obrazovka správně odroluje ke štítku druhé), Zpět nikdy nejde dopředu, F5 drží krok i rozepsanou poznámku, „Potvrdit souhrn znovu“ po změně, „Ukázka skončila“ přežije F5, Přehled scén a „Výsledky garanta“ na telefonu.

Počty: **blokující 1 · matoucí 8 · kosmetické 12.**

---

## Blokující

### B1. Výpadek ukládání garant nepozná, konec ukázky přesto tvrdí „rozhodnutí jsou uložená“

- **Kde:** celá ukázka; nejvíc telefon (≤ 600 px) a konec ukázky.
- **Co se stane:** když server zápis odmítne (zkoušeno odpovědí 503 na každý POST), na počítači lišta ukáže „neuloženo: N · Zkusit znovu“ – ale **jen když už garant něco rozhodl** (`glog.length`). Na telefonu stav ukládání **není vidět vůbec**: odznak je ve třídě `bar-wide`, která se na úzké liště skrývá, a v nabídce „⋯“ ani jinde na stránce se neobjeví. Poděkování po souhrnu říká „Děkujeme, máme vaše rozhodnutí“ a obrazovka „Ukázka skončila“ říká „Vaše rozhodnutí jsou uložená; můžete okno zavřít“ **bez ohledu na frontu** – v testu byla na serveru nula řádků. Fronta se pak znovu odešle jen při dalším otevření ve stejném prohlížeči (nebo při události `online`).
- **Co by mělo:** stav ukládání vidět na každé šířce (aspoň v nabídce „⋯“ a v panelu); poděkování a „Ukázka skončila“ podle fronty – při neodeslaných zápisech věta „Rozhodnutí zatím nejsou odeslaná – zůstaňte prosím online“ a tlačítko Zkusit znovu, „můžete okno zavřít“ až po vyprázdnění fronty.
- **Příčina:** `demo/presenter.js:274` (odznak jen s `glog.length` a jen `bar-wide`), `demo/presenter.js:936` („máme vaše rozhodnutí“), `demo/presenter.js:1046` („jsou uložená“ natvrdo), `demo/sync.js:96–115` (opakování jen ručně, při startu a při `online`).
- **Snímky:** `snimky/B1-lista-neulozeno-1440.png`, `snimky/B1-telefon-lista-pri-vypadku-360.png`, `snimky/B1-konec-ulozeno-pri-vypadku-1440.png`, `snimky/B1-konec-ulozeno-pri-vypadku-390.png`.

---

## Matoucí

### M1. Zásuvka „Vaše rozhodnutí“: klepnutí na řádek nebo rozhodnutí vyskočí na začátek seznamu

- **Kde:** zásuvka z lišty („Ke schválení · zbývá N“), 1440 i telefon.
- **Co se stane:** garant odroluje k položce (např. „Startovní sada návyků“ ve skupině Rozhodnuto, nebo „Návrh: posoudit postup…“ dole v Nerozhodnuto) a klepne na řádek. Zásuvka se překreslí a **odroluje na úplný začátek**; rozbalená karta je 1 800–2 800 px pod okrajem. Totéž po Schválit/Zamítnout a po opuštění pole poznámky – změněný řádek zmizí z dohledu, žádná hláška. Garant nevidí, že se něco stalo, a musí položku hledat znovu.
- **Co by mělo:** zásuvka drží polohu; po rozbalení a po rozhodnutí odroluje k té kartě (jako souhrn, kde řádek zůstává na místě – M6 kontroly 74).
- **Příčina:** `app/ui.js:134` (zásuvka se překresluje přes `innerHTML`, `scrollTop` `.drawerpanel` se ztratí), `demo/presenter.js:1124` (`garantOpen` v zásuvce nenastaví `drawerFocus`), `demo/presenter.js:174–196` (`garantDecide` v kontextu zásuvky také ne); `drawerAfterRender` (`presenter.js:1334`) by to umělo.
- **Snímky:** `snimky/M1-zasuvka-skok-nahoru-1440.png` (po klepnutí na řádek v dolní části), `snimky/M1-zasuvka-po-zamitnuti-390.png`.

### M2. Zamítnutí jedné položky nahradí vyprávění kroku, ve kterém se rozhoduje o jiné (i bezpečnostní) položce

- **Kde / co se stane:** v režimu „note“ panel místo celého vyprávění kroku ukáže jen větu „Ukázka krok provedla, ale položku „…“ jste zamítli…“. Když je ve stejném kroku nabídnutá **jiná** položka, garant o ní rozhoduje bez výkladu kroku:
  - zamítnutá „Rada: procházka po jídle“ nebo „Stupeň reakce“ → scéna 12, krok 2 „Druhý případ: menší porce“: nabízí se **I-MENE**, vyprávění o menší porci po píchnutí chybí;
  - zamítnuté „Pravidlo: nízká glukóza“ nebo „Bezpečnostní pravidla jsou součást plánu“ → scéna 13, krok 5: nabízí se **B-HYPO**, chybí výklad karty po druhém poklesu;
  - zamítnutá B-HYPO → scéna 21, krok 2: nabízí se S-SEMAFOR bez výkladu dlaždic;
  - zamítnuté R-POKYNY → scéna 3, krok 5: nabízí se C-CILE bez výkladu cílů.
  Se zamítnutými R-POKYNY má scéna 13 všech pět kroků jen touto větou (garant se nedozví, co dělá karta po poklesu, a I-HYPO se mu ve scéně vůbec nenabídne).
- **Co by mělo:** věta o zamítnuté části se **přidá** k vyprávění (nebo nahradí jen větu, která zamítnutou část popisuje); vyprávění zůstane, zvlášť když se v kroku rozhoduje.
- **Příčina:** `demo/presenter.js:556–560` (text režimu note), `D.shownNarration` (`presenter.js:594`) – note nahrazuje `co`/`vsimni` celé; závislosti z `demo/scene-items.js` (`deps`).
- **Snímek:** `snimky/M2-note-misto-vypraveni-I-MENE.png`.

### M3. Zamítnuté „Cíle glukózy“ (jen záznam nesouhlasu) vyřadí S-SEMAFOR z příběhu a smaže výklad dlaždic

- **Kde:** scéna 21 „Lékař – kontrola, krok 1: souhrn“, kroky 2–6, po zamítnutí C-CILE.
- **Co se stane:** oznámení správně říká, že aplikace s cíli dál počítá a dlaždice se semaforem fungují (zelená/oranžová je vidět). Přesto štítek „Semafor času v cíli (TIR)“ u dlaždic zmizí (místo něj je štítek C-CILE), S-SEMAFOR se ve scéně nenabídne a v souhrnu stojí „V příběhu jsme ji nenabídli: zamítli jste „Cíle glukózy“, a tak její místo na obrazovce zmizelo“ – což neplatí, semafor na obrazovce je. Krok 2 má místo výkladu dlaždic jen větu „Krok proběhl jako v hlavní linii…“.
- **Co by mělo:** u položky, jejíž zamítnutí je záznam nesouhlasu (C-CILE, K-KRITERIA, Z-GLUKOZA), se nic neskrývá a vyprávění se nemění; S-SEMAFOR se nabízí jako ve schváleném běhu.
- **Příčina:** obrazovka reportu nahrazuje štítek semaforu oznámením C-CILE (`app/screens-clinic.js`, řádek „Dlaždice vycházejí z:“), generátor mapy to pak počítá jako závislost (`demo/scene-items.js`, `deps`/`alt`).
- **Snímek:** `snimky/M3-C-CILE-skryva-S-SEMAFOR.png`.

### M4. Vyprávění po zamítnutí popisuje obrazovku, která není (režim „run“, bez upozornění)

Porovnání textu obrazovky v každém kroku se schváleným během (28 průchodů):

| Zamítnuto | Kde | Vyprávění říká | Obrazovka ukazuje |
|---|---|---|---|
| R-REAKCE nebo R-SKORE | scéna 9, krok 3 „Všechna jídla“ | „Řízek s kaší už je známý (4×)… každé jídlo jen řádek s prstencem učení, názvem a štítkem reakce“ | „Známá · 0“, „Učíme se · 6“, u každého jídla „Bez vyhodnocení“, žádný štítek reakce |
| I-NEVIM | scéna 12, krok 5 „Zpět k prvnímu případu: rada přijata“ | „Radu přijal: dá si obvyklou porci.“ | krok 1 ze 3 (otázka na inzulin, nic nevybráno) – po přeskočeném úseku se obrazovka nevrátila na krok 3 |
| R-NAVYKY | scéna 6, krok 3 „Návyky“ | „Třetí stránka ukazuje návyky ze startovní sady a u každého jednou větou, proč…“ | jen oznámení „Tahle část nefunguje“ |
| D-BAZAL | scéna 22, kroky 4 a 9 | „Druhý návrh se týká dávky ke snídani“, „Třetí návrh … k obědu“ | „Rozhodněte 2 návrhy“ – snídaně je první, oběd druhý |
| R-PORCE | scéna 11, krok 2 | „Druhá rada přidá k jídlu…“ | první rada (obvyklá porce) je oznámení |

- **Co by mělo:** krok s obsahem, který zamítnutí změní, má větu `jinak` nebo režim note; pořadová čísla z dat.
- **Příčina:** `demo/tour-content.js:162` (Všechna jídla), `:221` (I-NEVIM; navíc po skip úseku `11.4` stav obrazovky zůstane na kroku 1), `:122` (návyky), `:370`/`:383–385` (pořadí návrhů natvrdo), `:202` („Druhá rada“). Generátor `deps` tyto změny nezachytil – změna je jinde než ve výřezu cíle se štítkem.
- **Snímky:** `snimky/M4-R-REAKCE-vsechna-jidla.png`, `snimky/M4-I-NEVIM-krok1-misto-rady.png`, `snimky/M4-D-BAZAL-druhy-navrh.png`.

### M5. Nabídnutá položka po zamítnutí jiné potichu zmizí a panel hlásí „Vše rozhodnuto“

- **Kde:** scéna 22, krok 5 „Vše sedí – body ověřené s daty“: nabízí se D-CISTA a D-PRAND.
- **Co se stane:** garant zamítne D-CISTA; D-PRAND z panelu zmizí (bez rozhodnutí), panel napíše „Vše rozhodnuto; změnit lze kdykoli“ a vyprávění kroku se zpětně změní na větu o zamítnutí. Že D-PRAND přešla do souhrnu, nikde nestojí. (Stejně při jiných dvojicích v jednom kroku.)
- **Co by mělo:** u zmizelé položky věta „O položce „…“ rozhodnete v souhrnu, protože…“; „Vše rozhodnuto“ jen když opravdu.
- **Příčina:** `demo/presenter.js` `pendingNow`/`approvalsList` (nabídka se přepočítá po rozhodnutí), hláška v `garantDecide` (`presenter.js:174–196`).
- **Snímek:** `snimky/M5-D-PRAND-zmizel.png`.

### M6. „Podobá se smaženému řízku“ – zvýrazněná (a v animaci klepnutá) je ovesná kaše

- **Kde:** scéna 14, krok 2, všechny šířky, s animací i bez.
- **Co se stane:** vyprávění: „Pacient nepovinně označil, že jídlo se podobá smaženému řízku…“; vybraný je řízek, ale fialový rámeček kroku (a ruka animace) je na první volbě „Ovesná kaše s mlékem a banánem“. Garant vidí rámeček na kaši u věty o řízku.
- **Co by mělo:** cíl kroku je volba řízku.
- **Příčina:** `demo/tour-content.js:252` – `sel: '[data-action="mealLike"]'` bez `data-value`, chytí první volbu.
- **Snímek:** `snimky/M6-mealLike-zvyrazni-kasi.png`.

### M7. Správce: „Výsledky garanta“ se otevřou na vlastním (prázdném) účtu správce

- **Kde:** pohled správce, 1440 i telefon.
- **Co se stane:** i správcova vlastní návštěva makety zapisuje průchod, výsledky řadí účty podle poslední aktivity, a tak je předvybraný účet správce: „0 z 28 rozhodnuto“, „nejdál: Úvod“, všechny scény „nenavštívena“. Výsledky garanta jsou až po klepnutí na jeho e-mail.
- **Co by mělo:** předvybraný účet s rolí garant (nebo s nejvíc rozhodnutími); průchod správce se nezapisuje nebo se v seznamu nenabízí.
- **Příčina:** `demo/results.js:36` (řazení podle poslední aktivity), záznam průchodu bez ohledu na roli (`demo/sync.js` `event`, volané z `presenter.js`).
- **Snímek:** `snimky/M7-spravce-vychozi-ucet.png`.

### M8. Poznámka napsaná před rozhodnutím vytvoří dva záznamy; správce ji vidí jako druhé „schváleno“

- **Kde:** panel, zásuvka i souhrn; pohled správce.
- **Co se stane:** garant napíše poznámku a hned klepne Schválit. Opuštěním pole se uloží záznam „poznámka“ a vzápětí „rozhodnutí“ se stejným textem; historie položky ukáže 2 položky. Ve „Výsledcích garanta“ je záznam poznámky vypsaný jako „později: schváleno 18:49 (v panelu) · „…““, takže to vypadá, že garant rozhodl dvakrát.
- **Co by mělo:** poznámka uložená v téže chvíli jako rozhodnutí je jeden záznam; u správce se záznam poznámky jmenuje „poznámka“.
- **Příčina:** `demo/presenter.js:164–172` (`saveNote` při opuštění pole) + `:174` (`garantDecide` zapíše komentář znovu); popis v `demo/results.js` (~ř. 121) bere `status` záznamu poznámky.

---

## Kosmetické

1. **Zvýrazněná je první volba místo otázky.** Scéna 7, krok 5 „Ovesná kaše“: rámeček na „Menší než obvykle“, ačkoli pacient porci teprve vybírá (příští krok volí obvyklou). Stejně scéna 10, krok 4 (rámeček na „Ano, 8 j. podle plánu“ před odpovědí) a scéna 13, krok 3 (rámeček na „Ano, pod 4“ u otázky, na kterou pacient ještě neodpověděl). Příčina: `watch: '[data-action="mealPortion"]'` (`tour-content.js:140`), `'[data-action="mealBolus"]'` (`:174`), `'[data-action="hypoAnswer"]'` (`:241`). Snímek `snimky/K-watch-prvni-volba.png`.
2. **Dva děje na jedno Dál:** scéna 10, krok 7 „Nejvyšší hodnota nad 15“ – vybere hodnotu při jídle (7) i nejvyšší (nad 15) a ukáže kartu s pravidlem (`tour-content.js:181`; akce `mealBefore` + `mealPeak`).
3. **Hláška po rozhodnutí v souhrnu:** „Zamítnuto… Příběh pokračuje; rozhodnutí změníte kdykoli tady v panelu…“ – v souhrnu žádný příběh nepokračuje (`presenter.js:212–213`).
4. **Souhrn po skoku:** panel říká „Potvrzení říká autorovi makety, že jste ukázku prošli celou“ i garantovi, který na souhrn skočil přes Přehled scén (správce pak vidí „prošel celou: ne“).
5. **Zásuvka otevřená během animace** říká „Příběh stojí“, ale běžící krok se za ní dohraje – garant ho neuvidí.
6. **Po rozhodnutí v zásuvce se karta sbalí** i s polem poznámky; kdo chce k zamítnutí připsat důvod až po klepnutí, musí kartu znovu otevřít (a viz M1).
7. **Historie v textu položky pro první posouzení:** R-REAKCE „(od 21. 10. 2026; dřív u jídla vzestup ≤ 3,0…)“ a R-SKORE „(tři stupně… proto od 18. 10. 2026 dva)“ – `app/data/registry.js:14` a `:19`.
8. **Po zamítnutí D-CISTA** scéna 24, krok 1: „Pacient uvidí, že se dávky nemění a pod „Proč lékař rozhodl takto“ důvody lékaře u každé změny“ – změna žádná (`tour-content.js:418`).
9. **Telefon 360×740:** po rozbalení listu panelu zbývá z obrazovky ~170–300 px; při rozhodování panel odroluje ke kartě položky, takže vyprávění kroku je nad výřezem listu a cíl kroku bývá nad horní lištou (scéna 7, krok 2: čip „7“ je mimo, vidět je jen „Vybráno teď: 7 mmol/l“; scéna 14, krok 2). Snímek `snimky/K-360-cil-kroku-nad-listou.png`.
10. **Telefon, scény lékaře se sbaleným panelem:** spodní lišta lékaře „Další krok: … / Pokračovat →“ je napůl pod sbaleným panelem; vyprávění přitom mluví o „spodní liště, která se odemkla“ (scéna 3, krok 7; scéna 22, krok 12).
11. **Drobnost ve vyprávění I-KONTAKT/R-POKYNY:** se zamítnutými kontakty scéna 5, krok 3 dál cituje, že pacient ví, „kam se obrátit s technickým problémem a kam se zdravotním“, ačkoli blok Kontakty z náhledu zmizel.
12. **Přehled scén po kroku Zpět** označí scénu, ze které se garant vrátil, jako „hotové“ (scéna 4 při pobytu ve scéně 3) – správné podle „nejdál“, ale s „▶ tady“ o řádek výš působí rozporně.

---

## Poznámky k metodě

- „Prázdná Dál“: kroky bez změny textu obrazovky jsou všechny „podívej se“ kroky se zvýrazněním a odpovídajícím vyprávěním – žádné prázdné Dál jsem nenašel. Nejdelší krok s animací 5,7 s (scéna 5, krok 3 na 390).
- Klepnutí do zamčené obrazovky dá bublinu „Tohle za vás klepne ukázka. Pokračujte v panelu vpravo/dole“; štítek „ke schválení“ otevře vysvětlivku a z ní detail položky v zásuvce – nic nevede pryč z příběhu bez návratu.
- Zamítnutí, která z příběhu vyřadí víc položek do souhrnu (R-REAKCE 9, R-POKYNY 7), jsou podle návrhu; souhrn u každé píše proč (kromě případu M3, kde je důvod nepravdivý).
