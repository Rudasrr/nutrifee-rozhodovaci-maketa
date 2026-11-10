/* Vysvětlující bubliny pro lékaře-garanta (vlastník 26. 10. 2026): prvek, ke kterému je vysvětlení, má v ukázce jemné fialové
   tečkování; klepnutí (nebo Enter a mezerník) otevře bublinu s nadpisem, jednou až třemi větami a položkou registru, ze které prvek vychází.
   Jen prezentační vrstva: jádro o katalogu neví, třídy a atributy se přidávají po každém vykreslení (jako zvýraznění kroku v presenter.js).
   Texty jsou pro garanta, smějí mluvit o „aplikaci“; čísla a prahy se čtou z registru. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
var doc = global.document;

/* ---------- čtení z registru ---------- */
function prm(S, id, k) { var r = NF.item(S, id); return r && r.params ? r.params[k] : undefined; }
function n(v) { return String(v).replace('.', ','); }
function dec(v) { var x = Number(v); return isFinite(x) ? n(x.toFixed(1)) : n(v); }
function pct(v) { return Math.round(Number(v) * 100) + ' %'; }
/* Cíle glukózy pacienta: z platného plánu, jinak výchozí hodnoty z registru (C-CILE). */
function tg(S, k) { var p = NF.activePlan ? NF.activePlan(S) : null, t = p && p.targets; return t && t[k] != null ? t[k] : prm(S, 'C-CILE', k); }
function role(S) { return S && S.role; }
function txt(el) { return el ? String(el.textContent || '') : ''; }
function up(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (err) { return null; } }
function down(el, sel) { try { return el && el.querySelector ? el.querySelector(sel) : null; } catch (err) { return null; } }
function attr(el, a) { return el && el.getAttribute ? el.getAttribute(a) : null; }

/* ---------- katalog: selektor → { nadpis, text, položka registru } ----------
   sel   CSS selektor (jen třídy, značky a atributy, mezera jako potomek); has = musí obsahovat; not = nesmí odpovídat.
   box   tečkovaný obrys (dlaždice, karty) místo podtečkování (čísla, slova).
   item  id položky registru (nebo funkce); provozní položky garant nevidí, proto se sem nedávají.
   Pořadí rozhoduje: prvek dostane první položku katalogu, která na něj sedí; při klepnutí platí nejbližší vysvětlený prvek. */
D.explain = [
  /* ----- pacient ----- */
  { id: 'dose', sel: '.dose', not: '.was,.new', box: true, title: 'Dávka inzulinu',
    text: 'Pilulka s číslem je dávka, kterou předepsal lékař. Aplikace ji pacientovi jen připomíná a ptá se, jestli byla podaná; sama ji nikdy nepočítá ani nemění. Změnit ji může jen lékař na kontrole.',
    item: null }, /* C22: bez slova „klíč“; C10 (nezávislá kontrola 27. 10. 2026): dávku žádná položka registru neřídí – určuje ji lékař, proto bez odkazu */
  { id: 'peak-goal', sel: '.peak .goal', box: true, title: 'Hranice cíle',
    text: function (S) { return 'Svislá čárkovaná čára je horní cíl glukózy po jídle, u tohoto pacienta ' + dec(tg(S, 'high')) + ' mmol/l. Co skončí vlevo od ní, počítáme jako v cíli. Hranici nastavuje lékař v cílech glukózy.'; },
    item: 'C-CILE' },
  { id: 'peak-win', sel: '.peak .win', box: true, title: 'Kam se glukóza po jídle dostane',
    text: function (S) { return 'Okno ukazuje rozmezí nejvyšších hodnot do ' + prm(S, 'R-REAKCE', 'okno_min') + ' minut po tomto jídle. Do ' + prm(S, 'R-REAKCE', 'minQuantile') + ' zápisů je to nejnižší až nejvyšší zápis, potom 10. až 90. percentil, aby jeden výkyv rozmezí nerozhodil. S každým dalším zápisem se rozmezí upřesňuje.'; },
    item: 'R-REAKCE' },
  { id: 'ring', sel: '.emoji', box: true, title: 'Prstenec učení',
    text: function (S) { var k = prm(S, 'R-REAKCE', 'minKnown'); return 'Každý oblouk je jeden započítaný zápis tohoto jídla. Po ' + k + ' shodných zápisech se prstenec uzavře, objeví se fajfka a jídlo je známé. Zápisy z nemoci, s jinou porcí nebo bez dat ze senzoru oblouk nepřidají.'; },
    item: 'R-REAKCE' },
  { id: 'learning', sel: '.badges .tag.similar', box: true,
    title: function (S, el) { return /Podobné/.test(txt(el)) ? 'Podobné jídlo' : 'Učíme se'; },
    text: function (S, el) {
      if (/Podobné/.test(txt(el))) return 'Pacient jídlo přirovnal ke svému známému jídlu. Do třetího vlastního zápisu ukážeme jen směr podle toho jídla, slovem a ikonou (spíš v cíli, nebo spíš nad cílem), bez čísla; bez označení pacientem nic neodhadujeme.'; /* A15 */
      var k = Number(prm(S, 'R-REAKCE', 'minKnown')); return 'Jídlo má zatím méně než ' + k + ' ' + (k >= 2 && k <= 4 ? 'započítané zápisy' : 'započítaných zápisů') + '; číslo říká, kolik jich už máme. Dokud jich není dost, aplikace o reakci na jídlo nic netvrdí.'; /* C23 (03/K2) */
    },
    item: function (S, el) { return /Podobné/.test(txt(el)) ? 'R-PODOBNOST' : 'R-REAKCE'; } },
  { id: 'reaction', sel: '.badges .tag.over,.badges .tag.ok', box: true, title: 'Reakce na jídlo',
    text: function (S) { return '„Většinou v cíli“ znamená, že aspoň ' + pct(prm(S, 'R-SKORE', 'mirna')) + ' započítaných zápisů skončilo s nejvyšší hodnotou v cíli, jinak je jídlo „častěji nad cílem“. Štítek se ukáže od ' + prm(S, 'R-SKORE', 'odKolika') + ' zápisů a počítá se z posledních ' + prm(S, 'R-SKORE', 'oknoZapisu') + '. Je to srovnání s pacientovými vlastními jídly, ne známka.'; },
    item: 'R-SKORE' },
  { id: 'glu-low', sel: '.vslider.glu .vs-end.low', box: true, title: 'Pokles pod 4',
    text: function (S) { return 'Klepnutí na „pod 4“ hned ukáže pravidlo k nízké glukóze a v tomto zápisu aplikace neradí vůbec. Když se pokles zopakuje ' + prm(S, 'B-HYPO', 'poklesy') + '× za ' + prm(S, 'B-HYPO', 'dny') + ' dní, ukáže na Dnes kartu s obecnou radou, co dělat. K volání do ordinace aplikace nevyzývá; poklesy uvidí lékař na kontrole.'; },
    item: 'B-HYPO' },
  { id: 'glu-high', sel: '.vslider.glu .vs-end.high', box: true, title: 'Hodnota nad stupnicí',
    text: 'Senzor ukazuje víc, než čipy nabízejí, a zápis si to pamatuje. Klepnutí na „nad 15“ hned ukáže pravidlo k vysoké glukóze a zapíše se do stopy; v Bezpečí ho má pacient vždy. Živou glukózu aplikace nesleduje, na vysoké hodnoty upozorňuje aplikace senzoru.',
    item: 'I-VYSOKA' },
  { id: 'glu-none', sel: '.vslider.glu .vs-none', box: true, title: 'Nemám hodnotu',
    text: 'Zápis se uloží i bez čísla, třeba když senzor zrovna nejde přečíst. Do učení se ale nezapočítá, dokud chybějící hodnotu nedoplní export ze senzoru, který nahraje sestra na kontrole.',
    item: 'Z-GLUKOZA' },
  { id: 'glu', sel: '.vslider.glu .vs-track', box: true, title: 'Opsaná glukóza',
    text: 'Pacient klepne na celé číslo, které právě ukazuje aplikace senzoru. Na senzor nejsme napojení, proto stačí jeden pohled na jídlo a nic se nepíše. Přesný průběh později doplní export ze senzoru.',
    item: 'Z-GLUKOZA' },
  { id: 'daystrip', sel: '.daystrip', box: true, title: 'Pás dne',
    text: 'Tři hlavní jídla a bazál v pořadí, jak jdou za sebou. Na řadě je vždy první nezapsané jídlo, ne podle hodin, takže pozdní snídaně nic nerozbije. U jídla na řadě je vidět předepsaná dávka.',
    item: 'R-NAVYKY' },
  { id: 'weave', sel: '.weave', box: true, title: 'Pruh zápisů',
    text: function (S) {
      if (role(S) === 'doctor') return 'Celé období mezi kontrolami na jednom obrázku: sloupec je den, řádky jsou snídaně, oběd, večeře a bazál. Hned uvidíte, jestli pacient zapisoval průběžně, nebo jen chvílemi, a kde byla nemoc.';
      return 'Každý sloupec je jeden den a každé políčko jedno hlavní jídlo nebo bazál. Plné políčko je zapsané, prázdné je bez zápisu. Mezery nejsou chyba; zápisy lékař otevře až s pacientem na kontrole.';
    },
    item: null }, /* C10: tkaninu žádná garantová položka neřídí (provozní S-CESTA) */
  { id: 'result', sel: '.card.result', box: true, title: 'Jak to dopadlo',
    text: function (S) { return 'Když pacient opíše nejvyšší hodnotu po jídle, ukážeme mu věcný výsledek: v cíli znamená nejvýš ' + dec(tg(S, 'high')) + ' mmol/l. Za přijatou radu poděkujeme jednou, hodnotu glukózy nikdy nechválíme ani nekáráme. Opsané hodnoty později upřesní export ze senzoru.'; },
    item: 'R-REAKCE' },
  /* SCHEMA 86 (33/06 odd. 3): štítek „mění množství jídla“ zrušen – vysvětlení je u hlavní rady, když je to rada k porci */
  { id: 'advice-portion', sel: '.advice-card .advice.main', has: '[data-value="portion:yes"]', box: true, title: 'Rada, která mění množství jídla',
    text: 'Rada k porci má nejpřísnější pravidla. Před píchnutím vede k obvyklé porci oběma směry, po píchnutí a při „nevím“ jen z větší porce zpět k obvyklé. Nikdy neřekne „snězte víc“.',
    item: 'R-PORCE' },
  { id: 'advice', sel: '.advice .text', box: true, title: 'Rada před jídlem',
    text: 'Rada vychází z toho, jak tělo na toto jídlo reagovalo dřív. Je nepovinná a dávku inzulinu nikdy nemění; cílem je jíst k pevné dávce pokaždé podobně.',
    item: function (S, el) { var a = down(up(el, '.advice'), '[data-action=openItem]'); return attr(a, 'data-value') || 'R-PORCE'; } },
  { id: 'advice-answer', sel: '.advice .choice-row', box: true, title: 'Zkusím to, nebo Tentokrát ne',
    text: 'Pacient odpoví, jestli radu zkusí; odpovídat nemusí. Z odpovědí a následné glukózy se na kontrole ukáže, jestli s radou bývalo níž. Když pacient odpoví, že to v jídle není, rada se u toho jídla už nenabídne.',
    item: function (S, el) { var a = down(up(el, '.advice'), '[data-action=openItem]'); return attr(a, 'data-value') || 'R-PORCE'; } },
  { id: 'appr', sel: '.appr[data-action=openItem]', box: true, noTapNote: true,
    title: function (S, el) { return el && el.classList && el.classList.contains('pend') ? 'Štítek „ke schválení“' : 'Štítek položky registru'; },
    text: 'Takový štítek je u všeho, co aplikace počítá, radí nebo navrhuje. „Ke schválení“ znamená, že o položce ještě nerozhodl garant; maketa se zatím chová, jako by byla schválená. Po zamítnutí se na tomto místě ukáže, že tahle část nefunguje.',
    item: function (S, el) { return attr(el, 'data-value'); } },
  { id: 'doc-voice', sel: '.doc-voice', box: true, title: 'Bezpečnostní pravidlo',
    text: 'Obecné pravidlo NutriFee, stejné pro všechny pacienty, schválené garantem. Nemá uvozovky ani podpis lékaře, protože ho lékař nepíše ani nevybírá. Aplikace k němu nic nepřidává; hodnotu lze změnit jen u konkrétního pacienta při vydání plánu.',
    item: 'R-POKYNY' },
  { id: 'path', sel: '.card.path', box: true, title: 'Cesta ke kontrole', /* SCHEMA 86: karta je v Mém plánu (příběh tam zajde ve scéně „otevřel aplikaci až v 10:15“) */
    text: 'V Mém plánu pacient vidí, kolik dní zbývá do kontroly a jak mu přibývají zápisy. Připomíná mu, proč zapisuje: data otevře lékař až s ním v ordinaci. Mezi kontrolami je nikdo nečte.',
    item: null }, /* C10: karta je provozní (S-CESTA) */
  { id: 'sick', sel: '.sick-chip', box: true, title: 'Není mi dobře', /* SCHEMA 86: malé tlačítko v řádku pozdravu */
    text: function (S) { return 'Tlačítko vedle pozdravu zapíná pacient sám. Během nemoci aplikace k jídlu neradí, ukazuje jen pravidla pro nemoc a zápisy se nepočítají do učení ani do návrhů k dávce. Po ' + prm(S, 'P-NEMOC', 'dny') + ' dnech přidá kartu s pravidlem k nemoci; nemoc ukončuje zase pacient.'; },
    item: 'P-NEMOC' },

  /* ----- lékař: zařazení a plán ----- */
  { id: 'eligibility', sel: '.check', has: '[data-action=eligibility]', box: true, title: 'Podmínka zařazení',
    text: 'Aplikace stojí na pevné dávce inzulinu, proto pacient musí splnit všech pět podmínek, mezi nimi i léčbu bez korekčního schématu. Údaje předvyplní karta pacienta, potvrzení je vaše. Pacienta s premixem zařadit nelze, protože jeho dávku nejde přiřadit k jídlu.',
    item: 'K-KRITERIA' },
  { id: 'baseline', sel: '.dose-row', has: '[data-action=baselineSet]', box: true, title: 'Výchozí hodnoty ze senzoru',
    text: function (S) { return 'Čas v cíli a čas pod ' + dec(prm(S, 'C-CILE', 'low')) + ' mmol/l za měsíc před zařazením se načtou z karty pacienta; lékař je jen potvrdí voličem, nic nepíše. Při další kontrole tyto hodnoty porovnáme a uvidíte, jestli se zlepšily.'; },
    item: 'S-SEMAFOR' },
  { id: 'targets', sel: '.dose-row', has: '[data-action=targetSet]', box: true, title: 'Cíle glukózy',
    text: function (S) { var c = function (k) { return prm(S, 'C-CILE', k); }; return 'Výchozí cíle jsou glukóza ' + dec(c('low')) + ' až ' + dec(c('high')) + ' mmol/l, ráno nalačno do ' + dec(c('fastingHigh')) + ' mmol/l, čas v cíli alespoň ' + c('tirGoal') + ' % a HbA1c do ' + c('hba1cGoal') + ' mmol/mol. Podle nich aplikace počítá, co je v cíli, a barví dlaždice na kontrole. U konkrétního pacienta je můžete změnit.'; },
    item: 'C-CILE' },
  { id: 'dose-grid', sel: '.dose-grid', box: true, title: 'Dávky inzulinu',
    text: 'Dávky zadáváte voličem podle svého předpisu; aplikace žádnou výši nenabízí ani nepředvyplní. Pacientovi je bude připomínat a ptát se na podání. Změnit je můžete jen vy, na kontrole.',
    item: null }, /* C10: dávku při zařazení žádná položka neřídí */
  { id: 'habit', sel: '.habit-opt', box: true, title: 'Startovní návyk',
    text: 'Sada je stejná pro všechny pacienty a vy ji můžete škrtnout nebo doplnit. Pod každým návykem je věta, kterou pacient uvidí, aby věděl, proč ho dělá. Návyky začnou platit až po zaučení u sestry.',
    item: 'R-NAVYKY' },

  /* ----- lékař: kontrola ----- */
  { id: 'tile-tir', sel: '.tiles.report .tile[data-value=tir]', box: true, title: 'Čas v cíli (TIR)',
    text: function (S) { return 'Podíl času, kdy byla glukóza podle senzoru mezi ' + dec(tg(S, 'low')) + ' a ' + dec(tg(S, 'high')) + ' mmol/l, spočítaný z exportu, který nahrála sestra. Zelená je od cíle pacienta ' + NF.targets(S).tirGoal + ' %, oranžová od ' + prm(S, 'S-SEMAFOR', 'tir_zluta') + ' %, pod tím červená.'; }, /* kontrola 4 (C15): zelená hranice z cílů pacienta (C-CILE) */
    item: 'S-SEMAFOR' },
  { id: 'tile-below', sel: '.tiles.report .tile[data-value=below]', box: true,
    title: function (S) { return 'Čas pod ' + dec(tg(S, 'low')) + ' mmol/l'; },
    text: function (S) { return 'Podíl času pod dolním cílem podle exportu ze senzoru. Pod ' + NF.targets(S).tbrGoal + ' % (cíl pacienta) je to v pořádku; od této hranice je semafor červený bez ohledu na čas v cíli.'; },
    item: 'S-SEMAFOR' },
  { id: 'tile-hba', sel: '.tiles.report .tile[data-value=hba]', box: true, title: 'HbA1c',
    text: function (S) { return 'Poslední HbA1c z karty pacienta proti cíli do ' + tg(S, 'hba1cGoal') + ' mmol/mol z plánu. Aplikace hodnotu jen přebírá a porovnává s tou při zařazení; sama nic neměří.'; },
    item: 'C-CILE' },
  { id: 'tile-usual', sel: '.tiles.report .tile[data-value=usual]', box: true, title: 'Obvyklá porce',
    text: 'Jak často pacient jedl obvyklou porci, tedy množství, na které je nastavená dávka. Čím častěji, tím spolehlivěji se dá posoudit, jestli dávka sedí. Hranice barvy je napsaná přímo na dlaždici.',
    item: 'S-SEMAFOR' }, /* C10: hranice barvy řídí S-SEMAFOR */
  { id: 'tile-ins', sel: '.tiles.report .tile[data-value=ins]', box: true, title: 'Inzulin podle plánu',
    text: function (S) { return 'Podíl jídel, u kterých pacient potvrdil dávku v předepsané výši a včas, tedy nejvýš ' + prm(S, 'D-CISTA', 'pred_min') + ' minut před jídlem a ' + prm(S, 'D-CISTA', 'po_min') + ' minut po něm. Jídla s jinou, pozdní nebo nepotvrzenou dávkou se do návrhů k dávce nepočítají.'; },
    item: 'D-CISTA' },
  { id: 'tile-adv', sel: '.tiles.report .tile[data-value=adv]', box: true, title: 'Přijaté rady',
    text: function (S) { var k = Number(prm(S, 'D-PRAND', 'radyPrve')); return 'U kolika jídel pacient radu před jídlem přijal. Pod číslem je neutrální srovnání, jestli s radou bývala nejvyšší glukóza po jídle níž než bez ní; dlaždice nemá barvu, protože nejde o hodnocení pacienta ani o důkaz účinku. Návrh k dávce vznikne až poté, co pacient přijal aspoň ' + NF.plural(k, 'radu', 'rady', 'rad') + ' k jídlu.'; }, /* B11 */
    item: 'D-PRAND' },
  { id: 'tile-ill', sel: '.tiles.report .tile[data-value=ill]', box: true, title: 'Mimo učení',
    text: 'Dny nemoci a zápisy bez dat ze senzoru. Do učení ani do návrhů k dávce se nepočítají, aby nemoc nezkreslila obraz. Delší nemoc najdete v podkladech zvlášť.',
    item: 'P-NEMOC' },
  { id: 'tile-cmp', sel: '.tiles.report .tile[data-value="tir"] .d, .tiles.report .tile[data-value="below"] .d, .tiles.report .tile[data-value="hba"] .d', /* jen dlaždice se srovnáním dříve · teď (26. 10. 2026: méně podtečkování) */ title: 'Dříve, teď a rozdíl',
    text: 'Řádek porovnává toto období s předchozím: dříve je hodnota z minulé kontroly nebo ze zařazení, teď je toto období a za ní rozdíl. U obvyklé porce a inzulinu je při první kontrole napsáno „bez srovnání“, protože tyto údaje vznikají až s aplikací.',
    item: 'S-SEMAFOR' },
  { id: 'tir-bar', sel: '.tiles.report .tir', box: true, title: 'Pruh rozmezí',
    text: function (S) { return 'Pruh dělí čas na tři části: vlevo červeně čas pod ' + dec(tg(S, 'low')) + ' mmol/l, uprostřed zeleně v cíli, vpravo oranžově nad ' + dec(tg(S, 'high')) + ' mmol/l. Přesná čísla jsou v legendě pod pruhem.'; },
    item: 'C-CILE' },
  { id: 'prop-why', sel: '.prop .why', box: true, title: 'Proč návrh vznikl',
    text: 'Věta shrnuje, co aplikace v čistých zápisech pozorovala a který práh se překročil. Do návrhu jdou jen jídla s obvyklou porcí a dávkou podanou podle plánu a včas, mimo nemoc. Směr ani velikost dávky aplikace nenavrhuje.',
    item: function (S, el) { return /bazál/i.test(txt(down(up(el, '.prop'), 'h3'))) ? 'D-BAZAL' : 'D-PRAND'; } },
  { id: 'v-fact', sel: '.verify .v-fact', title: 'Číslo z dat',
    text: 'Údaj, který aplikace k bodu spočítala ze zápisů pacienta za toto období. Pomůže vám rozhodnout Sedí, nebo Nesedí; rozhodnutí je ale vždy vaše.',
    item: 'D-CISTA' },
  { id: 'verify', sel: '.verify-box', box: true, title: 'Ověřit s pacientem',
    text: 'Body projdete s pacientem v ordinaci a u každého zvolíte Sedí, nebo Nesedí. Z toho, které body sedí, plyne větev vašeho postupu. Dokud nejsou ověřené všechny body, Souhlasím zůstane zamčené.',
    item: 'D-POSTUP' },
  { id: 'branch', sel: '.branch', box: true, title: 'Postup říká',
    text: 'Podle toho, které body sedí, se zvýrazní větev vašeho schváleného postupu: zvýšit, snížit, nebo ponechat. Větev říká jen směr; o kolik dávku změnit, volíte vy.',
    item: 'D-POSTUP' },
  { id: 'dose-diff', sel: '.decide .diff,.decide .prog', title: 'Dnešní dávka a rozdíl',
    text: 'Nahoře je dnešní dávka, u voliče nová a rozdíl mezi nimi. Výši nové dávky nastavujete sami, aplikace žádné číslo nenabízí. Do plánu se změna zapíše až po Souhlasím.',
    item: 'D-POSTUP' },
  { id: 'decide', sel: '.decide [data-action=propDecide],.decide [data-action=propOther]', box: true, title: 'Souhlasím, nebo jiné rozhodnutí',
    text: 'Souhlasím přijme větev vašeho postupu, kterou určilo ověření. Jiné rozhodnutí zvolíte, když chcete postupovat jinak; do stopy se zapíše jako rozhodnutí jinak než postup. Obojí je vaše rozhodnutí, aplikace ho jen zaznamená.',
    item: 'D-POSTUP' },
  { id: 'keep', sel: '.keep-list', box: true, title: 'Beze změny',
    text: 'Návrhy, které nic nemění, jen připomínají, že rada nebo bezpečnostní pravidla zůstávají. Potvrdíte je najednou a každý se do stopy zapíše zvlášť. Kterýkoli můžete rozhodnout i samostatně.',
    item: 'R-POKYNY' },
  { id: 'dose-pair', sel: '.dose-pair', has: '.was', box: true, title: 'Stará a nová dávka',
    text: 'Přeškrtnuté číslo je dávka z minulého plánu, za šipkou nová dávka, kterou zvolil lékař. Pacient ji při převzetí plánu potvrdí a učení u jídla se změněnou dávkou začíná znovu.',
    item: 'D-POSTUP' },
  { id: 'trace', sel: '.trace-tbl', box: true, title: 'Stopa',
    text: 'Každý výpočet, rada, návrh a rozhodnutí se zapíše s časem a se skutečným aktérem. Tlačítko Data ukáže vstupy a výstupy výpočtu. Vše je deterministické, bez generativní AI, takže se dá zpětně ověřit.',
    item: null }, /* C10: stopa není položka garanta */

  /* ----- sestra ----- */
  { id: 'training', sel: '.train-row', box: true, title: 'Bod zaučení',
    text: 'Sestra bod odškrtne, až ho pacient udělá sám na svém telefonu. Návyky začnou platit až po zaučení a jedné závěrečné otázce pacientovi. Tlačítko Náhled ukáže obrazovku, kterou má pacient právě otevřít.',
    item: 'R-NAVYKY' },
  { id: 'preview', sel: '.phone-preview', box: true, title: 'Náhled telefonu',
    text: 'Takto právě vypadá telefon pacienta. Sestra v náhledu nic neovládá; slouží k tomu, aby pacientovi ukázala, kam klepnout.',
    item: 'R-NAVYKY' },

  /* ----- registr ----- */
  { id: 'reg-state', sel: '.reg-row .tag', box: true, title: 'Stav položky',
    text: 'Ke schválení znamená, že o položce ještě nerozhodl garant. Schválená položka platí hned; zamítnutou aplikace nepoužije a na jejím místě maketa ukáže, že tahle část nefunguje. Rozhodnutí lze kdykoli změnit.',
    item: function (S, el) { return attr(up(el, '.reg-row'), 'data-value'); } },
  { id: 'reg-hist', sel: '.reg-side .hist', box: true, title: 'Historie rozhodnutí',
    text: 'Každé rozhodnutí, poznámka i nová verze položky zůstává v historii s časem a autorem; kroky, které odehrála ukázka, jsou označené „model (příběh)“. Nic se nepřepisuje, takže je vždy vidět, kdo co a kdy schválil.',
    item: function (S, el) { return attr(down(up(el, '.reg'), '.reg-row.on'), 'data-value'); } }
];
D.explainById = {}; D.explain.forEach(function (x) { D.explainById[x.id] = x; });
function val(v, S, el) { return typeof v === 'function' ? v(S, el) : v; }
/* Hotové vysvětlení pro prvek: nadpis, text a položka registru (jen ta, kterou garant vidí). */
D.explainContent = function (x, el, S) {
  S = S || NF.getState();
  var id = val(x.item, S, el), r = id ? NF.item(S, id) : null;
  if (r && r.scope === 'provozni') r = null;
  return { title: String(val(x.title, S, el) || ''), text: String(val(x.text, S, el) || ''), item: r ? r.id : null, itemTitle: r ? r.title : '' };
};

/* ---------- výběr prvků ---------- */
D.CONTROL_SEL = 'button,a,input,select,textarea,label,summary,[data-action],[data-bind],[role=button],[role=switch],[role=tab]';
/* Prvek k vysvětlení: odpovídá selektoru, ne vyloučení „not“, obsahuje „has“ a neleží uvnitř náhledu telefonu (náhled má vysvětlení jako celek). */
D.explainOk = function (x, el) {
  try {
    if (x.not && el.matches(x.not)) return false;
    if (x.has && !el.querySelector(x.has)) return false;
    var pv = el.closest('.phone-preview'); if (pv && pv !== el) return false;
    return true;
  } catch (err) { return false; }
};
function isControl(el) { try { return !!(el && el.matches && el.matches(D.CONTROL_SEL)); } catch (err) { return false; } }
function inControl(el) { try { var p = el && el.parentElement; return !!(p && p.closest && p.closest(D.CONTROL_SEL)); } catch (err) { return false; } }

/* ---------- dekorace po vykreslení ---------- */
var HINT_ID = 'nf-explain-hint';
function hintEl() {
  var el = doc && doc.getElementById ? doc.getElementById(HINT_ID) : null;
  if (!el && doc && doc.createElement && doc.body && doc.body.appendChild) {
    el = doc.createElement('span'); el.id = HINT_ID; el.className = 'sr-only'; el.setAttribute('aria-hidden', 'true'); el.textContent = 'Má vysvětlení: Enter nebo mezerník otevře bublinu.'; doc.body.appendChild(el); /* kontrola 4 (C6): jen popis přes aria-describedby, ne samostatný text mimo orientační body */
  }
  return el;
}
D.explainDecorate = function () {
  if (!doc || typeof doc.querySelector !== 'function') return;
  /* SCHEMA 84 (32/03): vysvětlivky i v panelu vyprávění a v zásuvkách (průvodce položkou, karta), ne jen v obrazovce aplikace */
  var roots = ['main', 'tour', 'overlay'].map(function (id) { return doc.getElementById ? doc.getElementById(id) : null; }).filter(function (r) { return r && r.querySelectorAll; }); if (!roots.length) return;
  hintEl();
  D.explain.forEach(function (x) {
    var list = []; roots.forEach(function (root) { try { Array.prototype.push.apply(list, Array.prototype.slice.call(root.querySelectorAll(x.sel))); } catch (err) { } });
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.hasAttribute('data-nf-explain') || !D.explainOk(x, el)) continue;
      el.setAttribute('data-nf-explain', x.id);
      el.classList.add('nf-x', x.box ? 'nf-x-box' : 'nf-x-line');
      var desc = el.getAttribute('aria-describedby'); if (!desc || desc.indexOf(HINT_ID) < 0) el.setAttribute('aria-describedby', (desc ? desc + ' ' : '') + HINT_ID);
      if (!isControl(el) && !inControl(el) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    }
  });
  if (open && open.anchor && (!doc.contains || !doc.contains(open.anchor))) D.explainHide(false); /* prvek po překreslení zmizel */
  else if (open) place(open.anchor, null, null);
};

/* ---------- bublina ---------- */
var open = null;
function bubbleEl() {
  var el = doc && doc.getElementById ? doc.getElementById('explain-bubble') : null;
  if (!el && doc && doc.createElement && doc.body && doc.body.appendChild) {
    el = doc.createElement('div'); el.id = 'explain-bubble'; el.className = 'lock-bubble explain'; el.setAttribute('role', 'dialog'); el.hidden = true; doc.body.appendChild(el); /* kontrola 4 (C7): prázdný dialog skrytý, dokud není otevřený */
  }
  return el;
}
function cls(el, add, rem) { if (!el || !el.classList) return; if (rem) el.classList.remove.apply(el.classList, rem); if (add) el.classList.add.apply(el.classList, add); }
function place(anchor, x, y) {
  var el = bubbleEl(); if (!el || !el.style || !el.style.setProperty) return;
  var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
  var vh = global.innerHeight || 0, vw = global.innerWidth || 0;
  if (x == null && open) { x = open.x; y = open.y; }
  var big = !!(r && r.height > 160), cx = x != null && big ? x : r ? r.left + r.width / 2 : (x != null ? x : vw / 2);
  var ref = big && y != null ? { top: y, bottom: y } : r || { top: y || vh / 2, bottom: y || vh / 2 };
  var above = !!(vh && ref.bottom > vh * 0.6);
  el.style.setProperty('--x', Math.round(cx) + 'px'); var yv = above ? ref.top : ref.bottom; if (vh) yv = Math.max(0, Math.min(vh, yv));
  el.style.setProperty('--y', Math.round(yv) + 'px');
  if (el.classList) el.classList.toggle('above', above);
  if (open) open.big = big;
}
D.explainShow = function (anchor, x, y, tapNote, fromKey) {
  var id = anchor && anchor.getAttribute ? anchor.getAttribute('data-nf-explain') : null, x0 = D.explainById[id];
  var el = bubbleEl(); if (!x0 || !el) return false;
  if (D.hideLockBubble) D.hideLockBubble();
  var c = D.explainContent(x0, anchor), S = NF.getState();
  if (x0.noTapNote) tapNote = false;
  el.innerHTML = '<button type="button" class="xb-close" data-xb="close" aria-label="Zavřít vysvětlení">×</button>' +
    '<p class="xb-t">' + e(NF.nbspText(c.title)) + '</p><p class="xb-p">' + e(NF.nbspText(c.text)) + '</p>' +
    (tapNote ? '<p class="xb-p xb-note">' + e(NF.nbspText('Tohle tlačítko za vás v příběhu klepne ukázka.')) + '</p>' : '') +
    (c.item ? '<p class="xb-item">Vychází z položky registru <button type="button" class="xb-link" data-action="explainItem" data-value="' + e(c.item) + '">' + e(NF.nbspText(c.itemTitle)) + '</button>' + (S && NF.itemState && NF.itemState(S, c.item) === 'rejected' ? ' (zamítnuto)' : '') + '</p>' : '');
  if (el.setAttribute) el.setAttribute('aria-label', 'Vysvětlení: ' + c.title);
  open = { anchor: anchor, id: id, x: x, y: y };
  el.hidden = false; place(anchor, x, y); cls(el, ['on']);
  if (fromKey) { var b = el.querySelector && el.querySelector('.xb-close'); if (b && b.focus) { try { b.focus({ preventScroll: true }); } catch (err) { } } }
  return true;
};
D.explainHide = function (refocus) {
  var el = bubbleEl(), a = open && open.anchor; open = null; if (!el) return;
  cls(el, null, ['on', 'above']); el.innerHTML = ''; el.hidden = true;
  if (refocus && a && a.focus) { try { a.focus({ preventScroll: true }); } catch (err) { } }
};
D.explainOpen = function () { return open ? open.id : null; };

/* Klepnutí mimo zamčení: vysvětlí neovládací prvek; u ovládacích má přednost akce aplikace. V zamčené obrazovce rozhoduje D.lockedTap (presenter.js). */
var OUT = '.pres-bar,.lock-bubble,.gsum-page'; /* SCHEMA 84: panel vyprávění a zásuvky vysvětlivky mají (dřív jen obrazovka aplikace) */
D.explainTap = function (ev) {
  var t = ev && ev.target; if (!t || !t.closest) return false;
  if (t.closest(OUT)) return false;
  var ex = t.closest('[data-nf-explain]'); if (!ex) return false;
  var inRoot = ['main', 'tour', 'overlay'].some(function (id) { var r = doc.getElementById ? doc.getElementById(id) : null; return !!(r && r.contains && r.contains(ex)); }); if (!inRoot) return false;
  if (t.closest(D.CONTROL_SEL)) return false;
  return D.explainShow(ex, ev.clientX, ev.clientY, false);
};
/* Odkaz v bublině otevře průvodce položkou v plném znění pro garanta (i na obrazovce pacienta) bez skoku ze scény. */
NF.demoActions = NF.demoActions || {};
NF.demoActions.explainItem = function (v) { if (!NF.item(NF.getState(), v)) return; D.explainHide(false); NF.openDrawer('explain-item:' + v); };
var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (s, name) {
  if (String(name).indexOf('explain-item:') === 0) {
    var r = NF.item(s, String(name).slice(13)); if (!r) return '';
    var st = NF.itemState(s, r.id), tagCls = st === 'rejected' ? 'bad' : st === 'pending' ? '' : 'ok';
    var html = '<p class="eyebrow">Položka registru · ' + e(r.id) + '</p><h2>' + e(r.title) + '</h2><p><span class="tag ' + tagCls + '">' + e(NF.stateLabel ? NF.stateLabel(s, r.id) : st) + '</span></p>' +
      '<p class="small muted">' + e(r.summary) + '</p>' + (D.itemGuideHtml ? D.itemGuideHtml(s, r) : NF.screens.itemGuide(s, r)) +
      (r.scope === 'provozni' ? '' : '<div class="actions mt-3">' + NF.screens.btn('Rozhodnout o položce', 'garantChange', r.id) + '</div>');
    return D.nbspHtml ? D.nbspHtml(html) : html;
  }
  return prevDrawer ? prevDrawer(s, name) : '';
};

/* Klepnutí řídí jeden posluchač v presenter.js (zachytávací fáze): nejdřív D.explainClick (uvnitř bubliny / zavření mimo ni),
   pak D.lockedTap (zamčená obrazovka) a nakonec D.explainTap (mimo zamčení). */
D.explainClick = function (ev) {
  var t = ev && ev.target, bub = doc && doc.getElementById ? doc.getElementById('explain-bubble') : null;
  if (bub && t && bub.contains && bub.contains(t)) {
    if (t.closest && t.closest('[data-xb=close]')) D.explainHide(true);
    return true; /* odkaz na položku vyřídí akce explainItem */
  }
  if (open) D.explainHide(false);
  return false;
};
if (doc && doc.addEventListener) {
  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && open) { D.explainHide(true); return; }
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var a = doc.activeElement; if (!a || !a.getAttribute || !a.getAttribute('data-nf-explain') || isControl(a)) return;
    ev.preventDefault(); ev.stopPropagation();
    if (open && open.anchor === a) { D.explainHide(true); return; }
    D.explainShow(a, null, null, false, true);
  }, true);
  /* Rolování: malý prvek bublina následuje, u velkého (karta) se zavře, aby neukazovala jinam. Rolování uvnitř bubliny ji nechá být. */
  if (global.addEventListener) global.addEventListener('scroll', function (ev) {
    if (!open) return; var bub = bubbleEl(); if (bub && ev.target && (ev.target === bub || (bub.contains && bub.contains(ev.target)))) return;
    if (open.big) D.explainHide(false); else place(open.anchor, null, null);
  }, true);
  if (global.addEventListener) global.addEventListener('resize', function () { if (open) place(open.anchor, null, null); });
}
var prevAfter = NF.slots.afterRender;
NF.slots.afterRender = function (s) { if (prevAfter) prevAfter(s); D.explainDecorate(); };
bubbleEl();
if (NF.render) { try { NF.render(); } catch (err) { } }
})(typeof window !== 'undefined' ? window : globalThis);
