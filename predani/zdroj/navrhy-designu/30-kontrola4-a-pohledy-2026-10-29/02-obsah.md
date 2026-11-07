# Kontrola 4 – obsah a logika očima garanta (SCHEMA 77, 29. 10. 2026)

*Nezávislý kontrolor. Nic v maketě neměněno. Hlavní test před kontrolou: `node nutrifee-rozhodovaci-maketa.test.cjs` → 126 prošlo, 0 selhalo.*

## Jak se kontrolovalo

- Příběh přehrán v Node zaváděním z `maketa-rozhodovaci/pravdivost.test.cjs` (`variantWalk`, `walkStory`): schválený běh (157 zastavení, 31 scén), 28 běhů se zamítnutím každé garantové položky předem a 8 dvojic (B-HYPO+I-HYPO, R-POKYNY+P-NEMOC, I-MENE+B-HYPO, R-REAKCE+R-SKORE, D-POSTUP+B-HYPO, R-PORADI+I-MENE, C-CILE+S-SEMAFOR, D-PRAND+D-BAZAL). Navíc „realistické“ běhy, kde garant položku zamítne až v kroku, kde se mu nabídne (např. D-POSTUP ve scéně 22, krok 7).
- U každého zastavení porovnáno: vyprávění, které panel opravdu ukazuje (`D.shownNarration`), nabídnuté položky (`D.offeredNow`), hláška v panelu, text obrazovky. Registr (28 klinických položek: shrnutí, detail, texty, parametry, postupy) a průvodce (Proč · Jak · Kde · Co schvalujete · Co se stane při zamítnutí, `dopadSceny`).
- Rady „pořadí“ a „doplněk“ vygenerovány šablonou pro všech 171 jídel ze seznamu (`NF.leverFits`, `NF.leverText`) a pro nové jídlo.
- Hledání skutečných jmen výrobců, produktů, osob a institucí v `app/`, `demo/`, HTML a testech.
- Klinické prahy věcně nehodnoceny; co `15` výslovně určuje, není hlášeno jako chyba.

Scény jsou číslované jako v přehledu scén (1 Úvod … 26 Souhrn, 27–31 dodatek). „k = n“ = po n stisknutích Dál ve scéně.

**Souhrn:** A 0 · B 12 · C 16. Zásady odst. 2 ve schváleném běhu porušené nejsou. Problémy jsou hlavně v tom, co vyprávění tvrdí po zamítnutí, a v průvodci, který o zamítnutí říká něco jiného, než obrazovka dělá.

---

## A – porušení zásad, nebezpečné nebo zásadně nepravdivé

Žádný nález. Ve schváleném běhu ani v běhu se zamítnutím aplikace neříká „snězte víc“, nenavrhuje směr ani výši dávky a k volání do ordinace nevyzývá. Bezpečnostní větev (I-MENE, I-HYPO, věta o nemoci) se ukáže i se zamítnutou R-REAKCE nebo R-SKORE.

---

## B – věcné rozpory, které garant uvidí nebo podle nich rozhodne špatně

### B1 · Po zamítnutí rady vyprávění tvrdí přijatou radu, obvyklou porci a poděkování, které nenastaly
- **Kde:** sc. 11 k=5, sc. 12 k=6, sc. 14 k=6, sc. 19 k=2. Nastane po zamítnutí R-PORCE, R-DOPLNEK, R-PODOBNOST, R-REAKCE nebo R-SKORE. Realistická cesta: R-PORCE a R-DOPLNEK garant rozhoduje ve sc. 11 (k=1, k=2), R-PODOBNOST ve sc. 14 (k=2), tedy před těmito kroky.
- **Co:** Kroky s radami se přeskočí („Přeskočili jsme krok „Pacient přijme porci i doplněk““). Závěrečný krok ale běží v režimu „run“ s původním textem.
- **Důkaz:** Při zamítnuté R-PORCE ukazuje sc. 11 k=5 text „Zápis je uložený s obvyklou porcí a doplňkem. Dole aplikace poděkuje za návrat k obvyklé porci. Pacient přijal dvě rady najednou…“. V panelu je přitom jen „Zapsáno. Až u dalšího jídla…“ a na Dnes „Obvyklá porce 0 / 1 jídlo v obvyklé porci“: zápis má větší porci. Ve sc. 12 k=6 stojí „Zápis je uložený s obvyklou porcí a přijatou radou“, ve sc. 14 k=6 „Pacient přijal pořadí a zápis uložil“ (panel ukazuje „Zapsáno“, ne „Díky za pokus“) a ve sc. 19 k=2 „Pacient radu přijal“.
- **Návrh:** Do mapy závislostí doplnit závěrečné kroky s uložením (`zavisi` + věta `jinak`, např. „Zápis je uložený s větší porcí, rada k porci se nenabídla“). Generátor by měl brát jako závislost i hlášku panelu, která se po zamítnutí změní („Díky za pokus“ → „Zapsáno“).

### B2 · Režim „note“ nahradí celé vyprávění kroku, i když se v něm garantovi nabízí jiná položka
- **Kde a kdy:**
  - Sc. 3 k=4–6 při zamítnutí kterékoli I-*: nabízí se R-POKYNY, C-CILE a I-KONTAKT.
  - Sc. 13 k=5 po zamítnutí I-HYPO v k=4 (realistické) nebo R-POKYNY: nabízí se B-HYPO.
  - Sc. 12 k=2 po zamítnutí R-PROCHAZKA ve sc. 11 (realistické) nebo R-SKORE: nabízí se I-MENE.
  - Sc. 21 k=2 při zamítnuté B-HYPO nebo D-CISTA: nabízí se S-SEMAFOR.
  - Sc. 10 k=7 při zamítnuté B-HYPO: nabízí se I-VYSOKA.
  - Sc. 15 k=2: nabízí se I-NEMOC-*.
- **Co:** Místo vysvětlení kroku zní jen obecná věta, ve sc. 3 třikrát po sobě stejná. Garant rozhoduje o cílech glukózy, kontaktech, kartě po opakovaných poklesech nebo pravidle I-MENE bez vyprávění o tom, co vidí.
- **Důkaz:** Při zamítnuté I-HYPO zní ve sc. 3 k=5 („Cíle glukózy“, nabídka C-CILE) jen „Krok ukazuje obrazovku jen zčásti: položku „Pravidlo: nízká glukóza“ jste zamítli…“. Ve sc. 13 k=5 (nabídka B-HYPO) zní jen „Ukázka krok provedla, ale položku „Pravidlo: nízká glukóza“ jste zamítli, a tak ji obrazovka neukazuje.“
- **Návrh:** V režimu „note“ ponechat původní „Co se děje / Čeho si všímat“ a větu o zamítnuté části připojit (`noteText` jako doplněk, ne náhrada). Alespoň tehdy, když `offeredNow` obsahuje jinou položku než zamítnutou.

### B3 · Zamítnutá R-NAVYKY: zaučení a převzetí si odporují
- **Kde:** sc. 5 k=4 a sc. 6 k=3 a k=9.
- **Co:**
  - Sc. 5 přeskočí „Pacient prochází aplikaci sám“, „Body podle návyků“ i „Zaučení dokončeno“ s větou „obrazovka ukázat nemůže“. Pevné body přitom zůstávají („Pacient umí (0 ze 3) … Zbývá 4 body zaučení“) a podle `15` odst. 4.4 je sestra odškrtá.
  - Sc. 6 pak bez vysvětlení počítá se zaučením jako dokončeným: převzetí jde přes 6 stránek, kulisy nastaví `training.result: done`.
  - Vyprávění sc. 6 k=3 říká „Třetí stránka ukazuje návyky ze startovní sady…“, obrazovka ukazuje „✕ Tahle část nefunguje“.
  - Sc. 6 k=9 říká „Pacient odchází z ordinace s aktivními návyky.“
- **Návrh:** Kroky s pevnými body a „Zaučení dokončeno“ v sc. 5 nepřeskakovat. Sc. 6 k=3 a k=9 dostanou závislost na R-NAVYKY s větou `jinak` („Na místě návyků je oznámení; plán platí bez startovních návyků“).

### B4 · Zamítnutý D-POSTUP: přeskočí se i to, co podle průvodce a `15` zůstává, včetně bezpečnostní pojistky
- **Kde:** sc. 22. Realisticky: D-POSTUP se nabízí v k=7, garant ho zamítne a další krok je k=11 „Kroky přeskočeny … „Návrh k obědu: poklesy pod 4“, „Pokles blokuje větev „zvýšit““…“. Při zamítnutí předem se přeskočí 10 kroků včetně „Proč návrh vznikl“.
- **Co:** Průvodce D-POSTUP slibuje: „lékař vidí důvod návrhu, co ho oslabuje a čísla z dat … U jídla, kde byl v období pokles pod 4, se zvýšení dávky i tak zapíše jako rozhodnutí proti datům.“ `15` odst. 10 navíc říká: „karta to předem řekne (`pr.lowBlock`)“. Garant právě tuto pojistku nikdy neuvidí. Dávka 10 j. nastavená v k=7 bez vysvětlení zmizí (sc. 23: „dávky beze změny“).
- **Návrh:** Kroky s „Proč návrh vznikl“ a s kartou oběda nepřeskakovat, jen je přepsat (`jinak`): „Postup nic neříká, lékař rozhoduje sám; u oběda karta upozorní, že zvýšení by šlo proti datům.“ Říct, že lékař dávku ke snídani nakonec nezměnil.

### B5 · Zamítnutá B-HYPO: vyprávění sc. 14 mluví o kartě, která nevznikla
- **Kde:** sc. 14 k=6, v běhu se zamítnutou B-HYPO beze změny.
- **Důkaz:** „Kartu s radou po dvou poklesech pacient po minulé scéně přečetl a zavřel; znovu by se ukázala až s dalším poklesem.“ Se zamítnutou B-HYPO karta nevznikne (sc. 13 k=3–5 přeskočeny, průvodce B-HYPO: „karta s radou po opakovaných poklesech nevznikne“).
- **Návrh:** Větu podmínit `NF.usable(S,'B-HYPO')` nebo krok označit `zavisi: ['B-HYPO']` s větou `jinak`.

### B6 · Průvodce tvrdí „obrazovka na pravidlo neodkazuje“, ale odkazy zůstávají
- **Kde:** I-MENE „Co se stane při zamítnutí“, I-HYPO a I-VYSOKA.
- **Důkaz:**
  - Se zamítnutou I-MENE je ve sc. 13 k=5 v kartě B-HYPO „Když sníte méně než obvykle, řiďte se pravidlem „Méně jídla než obvykle““ a ve sc. 19 k=1 v radě k pořadí v2 „…řiďte se pravidlem „Méně jídla než obvykle““. Průvodce I-MENE přitom říká: „obrazovka na pravidlo neodkazuje“.
  - Pravidlo I-NEVIM („…řiďte se pravidlem k vysoké nebo nízké glukóze“) zůstává se zamítnutou I-HYPO i I-VYSOKA, na obrazovce v 16 zastaveních. Průvodce I-HYPO jmenuje jen I-MENE a B-HYPO. Průvodce I-VYSOKA říká „obrazovka na pravidla v Bezpečí neodkazuje“.
  - Pacient tak dostane odkaz na pravidlo, které v Bezpečí není.
- **Návrh:** Buď texty B-HYPO `opakovane`, R-PORADI v2 a I-NEVIM skládat s podmínkou (`NF.hasInstruction`) jako u `lowNowBez`, nebo průvodce I-MENE, I-HYPO a I-VYSOKA doplnit o úplný výčet položek, které na pravidlo odkazují dál, jako to dělá `15` odst. 12 u I-HYPO. Bezpečnější je první varianta.

### B7 · Stažení doplňku: registr a kód počítají jinak
- **Kde:** registr R-DOPLNEK („Stažení: počítají se všechny zápisy jídla (k témuž jídlu dne), u kterých pacient doplněk přijal a je známá nejvyšší hodnota“) proti `NF.addonWithdrawn` (`leverStats().st.n` = jen započítané zápisy).
- **Důkaz:** U „Loupák s máslem“ pacient doplněk přijal 30. 10. (inzulin jinak, nejvyšší 13), 6. 11. (11), 13. 11. (11) a 20. 11. (11). Podle registru byly po 13. 11. tři neúspěchy a doplněk se 20. 11. nabízet neměl. Kód 30. 10. nepočítá (`eaten 4, n 3`) a nabídl ho počtvrté.
- **Návrh:** Sjednotit. Buď text registru změnit na „počítají se započítané zápisy“, nebo kód na všechny zápisy se známou nejvyšší hodnotou. Druhá varianta odpovídá `15` B7 („přijal aspoň 3×“).

### B8 · Nové jídlo „jako smažený řízek“ dostane radu přidat jogurt nebo vejce
- **Kde:** sc. 14 k=5 (obrazovka).
- **Důkaz:** „Řízek s kaší od maminky · Podobné: Smažený řízek s bramborovou kaší … Doplněk k jídlu: Přidejte k jídlu bílý jogurt, plátek sýra nebo vejce. Z jídla nic neubírejte.“ Řízek ze seznamu má `bilkovina` a doplněk se u něj nenabízí. Aplikace o podobnosti ví, rada ji ignoruje. Vyprávění doplněk nezmíní.
- **Pozn.:** `15` odst. 7 dává novému jídlu bez údajů obecný doplněk, případ „Je to jako X“ ale neřeší. Je to mezera, na kterou je potřeba rozhodnutí vlastníka.
- **Návrh (k rozhodnutí vlastníka):** Nové jídlo s „Je to jako X“ převezme strukturované údaje X (`bilkovina`, `jednolite`, `slozky`, `doplnek`) pro šablonu rad. Jinak doplněk u nového jídla nabízet až po prvním zápisu.

### B9 · Zásuvka položky u pacienta (produkční sestavení) mluví o lékaři a „aplikaci“
- **Kde:** `app/screens-clinic.js` `V.itemDetail`, větev `S.role === 'patient'`. Pacient ji otevře klepnutím na štítek.
- **Důkaz:** Štítek „schválil lékař“ / „ke schválení lékařem“ a věta „Každá rada a každý výpočet v aplikaci vychází z pravidla, které schvaluje lékař. Aplikace si nic nevymýšlí.“ To odporuje `15` odst. 4.5 a B16 (pacient čte „schválil je odborník, který za NutriFee odborně ručí“, ne lékař) a Hlasu 1 (u pacienta „my“, nikdy „aplikace“).
- **Návrh:** „Schválil odborník, který za NutriFee odborně ručí“ a „Každá rada vychází ze schváleného pravidla. Nic si nevymýšlíme.“ Pro „ke schválení“ u pacienta zvolit neutrální text bez role.

### B10 · Hranice 4 a 3,9 u pacienta
- **Kde:** obrazovka Plán (pacient) „Cíle glukózy: V cíli 3,9–10,0 mmol/l“ proti průvodci C-CILE („pacient vidí všude pevnou hranici 4 mmol/l z čipů a pravidla k nízké glukóze“) a `15` odst. 4.5 a 19.
- **Co:** Pacient má na čipech, v pravidlech, otázkách i kartě poklesů 4, v Plánu 3,9. Garant čte v průvodci, že tomu tak není.
- **Návrh:** U pacienta v Plánu „4–10 mmol/l“ (nebo jen horní cíl a „pod 4 je nízká glukóza“). Lékař dál vidí 3,9. Případně opravit průvodce.

### B11 · Návyk „Procházka po večeři“ odkazuje na pravidlo, které neexistuje
- **Kde:** `app/data/catalogs.js` H-PROCHAZKA, bod zaučení `t-prochazka`: „Pacient ví, kdy je pohyb po píchnutí v pořádku (podle bezpečnostních pravidel)“.
- **Co:** Žádné ze sedmi pravidel I-* o pohybu nemluví. Omezení procházky (pod 4, menší porce s inzulinem, nemoc) je jen v R-PROCHAZKA a uplatní se jen u rady. Sestra by ověřovala znalost, kterou aplikace pacientovi nikde nedává. Mimo příběh, ale v katalogu, ze kterého lékař vybírá.
- **Návrh:** Bod přepsat na znění R-PROCHAZKA („Pacient ví, že procházku nabízíme jen před jídlem a ne po menší porci s inzulinem ani při glukóze pod 4“) a štítek bodu svázat s R-PROCHAZKA. Jinak návyk z katalogu vyřadit.

### B12 · Přeskočené kroky schovají chování, které zamítnutí nemění
- **Kde:** sc. 12 k=4 „Nejistý inzulin: radíme jako po píchnutí“ se přeskočí při zamítnuté I-NEVIM (realisticky: I-NEVIM se rozhoduje v k=3) i R-POKYNY. Sc. 12 k=2 „Druhý případ: menší porce“ se přeskočí při zamítnuté I-MENE.
- **Co:** Věta „Bez položky … ho obrazovka ukázat nemůže“ neplatí.
  - V k=4 je rada k porci při „nevím“ (R-PORCE `biggerUnknown`) na obrazovce dál.
  - V k=2 zůstává „Obvyklá porce: teď neradíme“ a „Procházka po jídle: teď neradíme“, tedy jádro zásady 3 po píchnutí. Garant ho po zamítnutí pravidla neuvidí.
- **Návrh:** Krok nepřeskakovat, jen označit „note“ s větou, co chybí (pravidlo), a nechat vyprávění o radě k porci. Výřez cíle kroku zúžit na radu, ne na kartu pravidla.

---

## C – drobnosti, srozumitelnost, pojmy

**C1 · sc. 9 k=2.** Vyprávění „Kaše: málokdy, proto „častěji nad cílem““, obrazovka „v cíli 0 ze 4“. → „ani jednou ze 4“.

**C2 · sc. 9 k=3.** „…svíčkovou a rýži teprve poznáváme“. Jídlo se jmenuje „Kuřecí maso na kari s rýží“. → „svíčkovou a kuře na kari“.

**C3 · sc. 14 k=5.** Vyprávění „U jídla s přílohou se nabízí i pořadí: nejdřív sníst maso nebo zeleninu, přílohu až potom“. U nového jídla se pořadí nabízí bez ohledu na přílohu a obrazovka říká „Snězte nejdřív zeleninu nebo maso, pokud jsou v jídle, potom zbytek jídla.“ Současně nabídnutý doplněk (B8) vyprávění nezmíní. → Citovat skutečné znění a zmínit obě rady.

**C4 · sc. 8 a 9.** Sc. 8 začne oběd 6. 10. ve 12:10, v datech ale žádný oběd 6. 10. není (zápisy 6. 10.: snídaně 7:05, večeře 18:30). Tkanina má ten den mezeru. → Doplnit oběd 6. 10. do modelových dat.

**C5 · Seznam jídel.** „Koblihy“ jsou smažené, nemají ale `bilkovina` a dostanou doplněk. Registr R-DOPLNEK přitom říká, že u jídel s tukem („…smažené“) se nenabízí. „Bramborák“ příznak má, kobliha ne. → Sjednotit údaje jídel s pravidlem v registru.

**C6 · Seznam jídel.** Polévky (bramboračka, kulajda, čočková…) jsou ve skupině „slané studené jídlo (chléb, salát, polévka, svačina)“. Název skupiny („studené“) u teplé polévky mate garanta v přehledu vět. → Skupinu přejmenovat na „slané jídlo bez přílohy (chléb, salát, polévka, svačina)“.

**C7 · Seznam jídel.** „Kuřecí nugety mražené“ (bez přílohy) → „Snězte nejdřív maso, potom zbytek jídla.“ Maso je v obalu a nic jiného v jídle není. Obdobně „Smažený sýr s hranolkami“ a „nejdřív sýr“ (sýr v obalu). → Nugetám bez přílohy dát `jednolite`, nebo prázdné `slozky`.

**C8 · Registr S-SILNA (shrnutí).** „…oba nad cílem se vzestupem aspoň 6,0 mmol/l (3,0 + 3,0)“ se dá číst jako součet 6,0. JAK a parametr znamenají „u každého aspoň 3,0“. → „u obou se vzestupem aspoň 3,0 mmol/l“.

**C9 · Registr R-REAKCE (shrnutí).** „Rozmezí vrcholů je do 8 zápisů od nejnižší po nejvyšší“. Platí „pod 8 zápisů (1–7)“, jak píše JAK a `15`. → Sjednotit.

**C10 · Milník „Deset jídel po sobě v obvyklé porci“** (`core.js`, `usual10`) počítá i svačiny. Slovník (`15` odst. 19): svačina se do obvyklé porce nepočítá a text milníku říká „Na ni je nastavená vaše dávka“. V příběhu milník padl 9. 10. díky svačině. → Filtrovat `!NF.isSnack`.

**C11 · Milník „jídlo poznáno“.** „…takže vám k němu od teď umíme poradit.“ U jídla „většinou v cíli“ (chléb se sýrem) se rady nenabízejí. → „…od teď víme, kam se po něm glukóza dostává.“

**C12 · Přehled před kontrolou (sc. 20).** „U jídla „Müsli s mlékem a medem“ vám pomohl doplněk k jídlu: 5 ze 7 v cíli.“ Bez doplňku má müsli jen 3 zápisy. `15` odst. 7b.1 dovoluje větu „tohle u vás funguje“ až od 4 zápisů s radou a 4 bez ní a Hlas 4 říká „říkáme, co víme“. → Stejný práh 4 + 4, jinak věcně „s doplňkem 5 ze 7 v cíli“.

**C13 · Zamítnutá P-NEMOC, sc. 15 úvod.** „Pacient by v nemoci neměl v aplikaci pravidla pro nemoc“. Pravidla I-NEMOC-* zůstávají v Bezpečí. Sc. 16 k=2 má při tomtéž nadpis „Zápis uložen se štítkem nemoci“ a text „bez štítku nemoci“. → „neměl by je nahoře na Dnes, jen v Bezpečí“; doplnit `tJinak`.

**C14 · Zamítnutá R-REAKCE, sc. 21 k=5.** „…řeší je aplikace radami k porci, pořadí, doplňku a procházce“. Se zamítnutou R-REAKCE aplikace neradí vůbec. → Věta `jinak`.

**C15 · Dva parametry pro jeden práh.** C-CILE `tirGoal` 70 (lékař ho mění u pacienta) a S-SEMAFOR `tir_zelena` 70. Po změně cíle u pacienta se semafor dlaždice a bod 6 postupu rozejdou. → Semafor číst z C-CILE, nebo v průvodci říct, že jde o dvě hodnoty.

**C16 · D-POSTUP „Co schvalujete“.** Garant rozhoduje ve sc. 22 k=7, větev „pokles blokuje zvýšit“ (nejdůležitější bezpečnostní část postupu) uvidí až v k=10. Průvodce B-HYPO to říká, D-POSTUP ne. → Doplnit „Blokaci větve zvýšit poklesem uvidíte ještě u návrhu k obědu v této scéně.“

**Zásada 9:** Ve zdrojích makety žádná jména výrobců senzorů, inzulinů ani léků, osob ani institucí (hledání v `app/`, `demo/`, HTML, testech). Jediná sporná položka: jídlo „Nakládaný hermelín s chlebem“ (`app/data/foods.js`). „Hermelín“ je v ČR registrovaná ochranná známka. → „Nakládaný sýr s bílou plísní s chlebem“. Ikony Lucide jsou uvedené kvůli licenci, v pořádku.

---

## Co sedí (pro úplnost)

- Schválený běh: žádná citace ani tvrzení vyprávění neodporuje obrazovce. Čísla kontroly sedí:
  - 52 ze 72 snídaní, medián 12,0;
  - rozpad 25 / 9 / 8 a „65 %“ u bodu 7;
  - 74 ze 83 včas, 11 vyřazených = 83 − 72;
  - 236 ze 239 v obvyklé porci, 9 jinak nebo neví = 96 %;
  - TIR 58 → 72, HbA1c 62 → 55 proti cíli 53;
  - noci 25. 12. a 1. 1. 3,6;
  - 3 dny nemoci; „Další (9)“ = 12 − 3; 91 / 84 / 83 / 81 dní do kontroly.
- Rady ze šablony (171 jídel): pořadí nikdy nejmenuje složku mimo `slozky`, doplněk je vždy ze seznamu povolených, jednolitá jídla pořadí nedostanou, žádná věta neříká jíst víc. Rada v2 neprojde `NF.talksAmount` jen proto, že o množství mluví podmíněně („Když budete mít dost dřív…“), a nevybízí jíst víc.
- Zamítnutí B-HYPO ve sc. 22 (k=9–11) je popsané pravdivě podle obrazovky, jak ukládá `15` odst. 18 (C12).
