/* Vyprávění k průchodu tlačítkem Další. U každé kapitoly úvod a kroky, které se odehrají za roli.
   Krok: { do:[ {sel, act, val} | {sel, bind, val, type} | {sel} | {fn} ], watch, t, co, vsimni, proc, dusledek, when(B) } */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo;
var T = D.tour = {};
function foodId(name) { return function (B, S) { var f = S.foods.filter(function (x) { return x.name === name; })[0]; return f ? f.id : ''; }; }
function foodSel(name) { return function (B, S) { return '[data-action="mealFood"][data-value="' + foodId(name)(B, S) + '"]'; }; }

T.chapters = {
  enroll: {
    intro: { t: 'Ordinace, 5. října. Lékař zařazuje pacienta', co: 'Pacient s diabetem 2. typu na inzulinu s pevnými dávkami dostal senzor. Lékař zvažuje NutriFee.', vsimni: 'Vlevo nabídka lékaře na celou šířku monitoru. Nic se nepíše — karta pacienta se jen zobrazuje.', proc: 'Lékař nemá čas psát. Každé jeho kliknutí musí mít důsledek.' },
    steps: [
      { do: [{ sel: '.card:first-of-type' }], t: 'Karta pacienta', co: 'Diagnóza, léčba, režim, senzor, HbA1c 62 — načteno z karty.', vsimni: '„Jen inzulin, pevné dávky“ — na tom celý návrh stojí.', proc: 'Učit se z reakcí na jídlo má smysl jen tehdy, když se dávka mezi dny nemění.' },
      { do: [{ sel: '[data-value="adult"]', act: 'eligibility', val: 'adult', quick: true }, { sel: '[data-value="insulinOnly"]', act: 'eligibility', val: 'insulinOnly', quick: true }, { sel: '[data-value="regimen"]', act: 'eligibility', val: 'regimen', quick: true }, { sel: '[data-value="cgm"]', act: 'eligibility', val: 'cgm', quick: true }], watch: '.hint.ok',
        t: 'Čtyři podmínky zařazení', co: 'Lékař je postupně potvrdil. Dokud chyběla jediná, tlačítko „Pokračovat“ bylo zamčené.', vsimni: 'Zelené potvrzení nese štítek „✓ Podmínky zařazení“ — odkaz do schvalovacího registru.', proc: 'Aplikace nedovolí pokračovat s pacientem, pro kterého není určená.', dusledek: 'Spodní lišta říká, co je další krok.' },
      { do: [{ sel: '.nextbar .btn.primary', act: 'wizardGo', val: '1' }], t: 'Další krok', co: 'Otevřel se krok 2: dávky, návyky a pokyny.' }
    ]
  },
  doses: {
    intro: { t: 'Dávky voličem, návyky předvybrané, pokyny připravené', co: 'NutriFee předvyplnila startovní sadu návyků, stejnou pro všechny pacienty studie, a základní osobní pokyny. Lékař potvrzuje, škrtá nebo volí hodnoty.', proc: 'NutriFee navrhuje, lékař schvaluje. Nikdy naopak.' },
    steps: [
      { do: [{ sel: '.dose-grid' }], t: 'Dávky inzulinu voličem', co: 'Ke snídani 8, k obědu 10, k večeři 8 j. — a odděleně, tmavě, bazál 18 j. na noc ve 21:00. Lékař je nastaví tlačítky −/+.', vsimni: 'Aplikace dávky jen zobrazí pacientovi a připomene. Nikdy je nepočítá.', proc: 'Dávka je věc lékaře. Aplikace k ní sbírá kontext: byla podaná, včas, v předepsané výši?' },
      { do: [{ sel: '[data-bind="draft.medicationChecked"]', bind: 'draft.medicationChecked', val: true }], t: 'Ověření dávek s pacientem', co: 'Lékař potvrdil, že pacient bere jen inzulin.', quick: true },
      { do: [{ sel: '.habit-opt.on' }], t: 'Startovní sada návyků', co: 'Zapisujte hlavní jídla · obvyklá porce · potvrzujte inzulin · bazál večer. Předvybrané, se štítkem „startovní sada“.', vsimni: 'U každého návyku je věta „proč“ — tu uvidí i pacient.', proc: 'Stejný start pro všechny umožní porovnat pacienty napříč studií. Personalizace přijde z dat na první kontrole.' },
      { do: [{ sel: '.instr' }], t: 'Osobní pokyny s hodnotami', co: 'Nízká glukóza pod 3,9 · snědl jsem méně → změřte za 60 min · nemoc → měřte každé 3 h · kdy volat. Hodnoty lékař mění voličem; pod pokyny jsou voličem i cíle glukózy (3,9–10,0, ráno do 7,2, čas v cíli 70 %).', vsimni: 'Pokyn „snědl jsem méně“ je důležitý: aplikace nikdy neřekne „snězte víc“, to je pokyn od lékaře.', proc: 'Aplikace radí k jídlu, ale co dělat při nízké glukóze, určuje lékař.' },
      { do: [{ sel: '[data-bind="draft.instructionsChecked"]', bind: 'draft.instructionsChecked', val: true }, { sel: '.nextbar .btn.primary', act: 'wizardGo', val: '2' }], t: 'Pokyny probrány → shrnutí', co: 'Vše je připravené, spodní lišta se odemkla a lékař pokračuje k vydání.' }
    ]
  },
  issue: {
    intro: { t: 'Vydání plánu', co: 'Shrnutí na jedné obrazovce: dávky, cíle, návyky, pokyny. Jedno tlačítko.', proc: 'Nevratný krok má potvrzení jednou větou, co se stane.' },
    steps: [
      { do: [{ sel: '.nextbar .btn.primary', act: 'issuePlan' }], t: 'Lékař vydá plán P1', co: 'Plán je vydaný a obrazovka se přepnula k sestře.', vsimni: 'Lékař nic nezaučuje. Rozhodl, vydal — a do kontroly už nic nedělá.', dusledek: 'Návyky pacientovi ještě neplatí. Začnou po zaučení a jedné otázce.' }
    ]
  },
  training: {
    intro: { t: 'Sestra zaučuje a vidí, co vidí pacient', co: 'Vlevo body zaučení — tři pevné a další podle návyků v plánu. Vpravo živý náhled pacientova telefonu.', proc: 'Zaučení bez pohledu na telefon by bylo jen odškrtávání.' },
    steps: [
      { do: [{ sel: '.phone-preview' }], t: 'Náhled telefonu', co: 'Sestra vidí obrazovku Dnes tak, jak ji má pacient před sebou.', vsimni: 'Klepnutí na bod zaučení přepne náhled na příslušnou obrazovku.' },
      { do: [{ sel: '[data-value="app"]', act: 'trainingStep', val: 'app', quick: true }, { sel: '[data-value="safety"]', act: 'trainingStep', val: 'safety', quick: true }, { sel: '[data-value="t-zapis"]', act: 'trainingStep', val: 't-zapis', quick: true }], watch: '.phone-preview',
        t: 'Pacient prochází aplikaci sám', co: 'Našel Dnes, Bezpečí a prošel tři kroky „Chystám se jíst“ — náhled se přepnul.', proc: 'Body jsou konkrétní úkony, které pacient udělal, ne otázky „rozumíte?“.' },
      { do: [{ sel: '[data-value="t-porce"]', act: 'trainingStep', val: 't-porce', quick: true }, { sel: '[data-value="t-inzulin"]', act: 'trainingStep', val: 't-inzulin', quick: true }, { sel: '[data-value="t-bazal"]', act: 'trainingStep', val: 't-bazal', quick: true }, { sel: '[data-value="contacts"]', act: 'trainingStep', val: 'contacts', quick: true }],
        t: 'Body podle návyků', co: 'Pacient ví, že se ho aplikace před každým jídlem zeptá na inzulin, kdy přijde rada k porci a jak potvrdit bazál.', vsimni: 'Tyhle body existují jen proto, že jsou v plánu příslušné návyky.', proc: 'Otázka na inzulin je jediná věc mezi radou a nízkou glukózou — pacient ji musí znát předem.' },
      { when: function (B) { return B.training !== 'failed'; }, do: [{ sel: '[data-action="finishTraining"][data-value="done"]', act: 'finishTraining', val: 'done' }], watch: '.hint.ok', t: 'Zaučení dokončeno', co: 'Zaznamenáno na sestru s časem.', dusledek: 'Pacient teď převezme plán.' },
      { when: function (B) { return B.training === 'failed'; }, do: [{ sel: '[data-action="finishTraining"][data-value="failed"]', act: 'finishTraining', val: 'failed' }], watch: '.hint.warn', t: 'Zaučení se nezdařilo', co: 'Plán je vydaný, návyky ale nezačnou platit.', dusledek: 'Další scéna ukáže, co v tu chvíli vidí pacient; pak se vracíme k hlavní linii.' }
    ]
  },
  handover: {
    intro: { t: 'Pacient přebírá plán na telefonu', co: 'Rámeček telefonu: karta „Co teď“, cíl do kontroly, dávky, návyky s „proč“, pokyny lékaře.', vsimni: 'Pacient vždy ví, co má udělat — karta „Co teď“ je na každé obrazovce. Pod ní jedna věta, kam to celé směřuje: aplikace pozná jeho jídla, dávky řeší lékař.' },
    steps: [
      { do: [{ sel: '.patient .glass:nth-of-type(2)' }], t: 'Dávky inzulinu', co: 'Snídaně 8, oběd 10, večeře 8 j.; bazál 18 j. na noc odděleně dole.', proc: 'Pacient vidí lékařův předpis. Aplikace ho bude připomínat.' },
      { do: [{ sel: '[data-action="page"][data-value="understand"]', act: 'page', val: 'understand' }], t: 'Plán jsem převzal', co: 'Otevřela se jedna kontrolní otázka.' },
      { do: [{ sel: '[data-value="yes"]', act: 'answerCheck', val: 'yes' }], watch: '.hint.warn', t: 'Špatná odpověď nic nezkazí', co: '„Ano, hned“ — aplikace vysvětlí, že zápis není zpráva do ordinace. Tlačítko „Hotovo“ zůstává zamčené.', proc: 'Kdyby pacient čekal, že ho někdo sleduje, čekal by na pomoc, která nepřijde.' },
      { when: function (B) { return B.training !== 'failed'; }, do: [{ sel: '[data-value="no"]', act: 'answerCheck', val: 'no' }, { sel: '[data-action="confirmUnderstanding"]', act: 'confirmUnderstanding' }], t: 'Správně → plán platí', co: 'Pacient odchází z ordinace s aktivními návyky.', dusledek: 'Od zítřka otevírá aplikaci před snídaní.' },
      { when: function (B) { return B.training === 'failed'; }, do: [{ sel: '[data-value="no"]', act: 'answerCheck', val: 'no' }], watch: '.hint.warn', t: 'Správně, ale bez zaučení to nejde', co: 'Tlačítko zůstává zamčené: zaučení u sestry nebylo dokončeno, návyky nezačnou platit.', proc: 'Aplikace nedovolí začít pacientovi, který ji neumí ovládat.', dusledek: 'Odbočka končí; další scéna pokračuje hlavní linií, kde zaučení proběhlo.' }
    ]
  },
  firstMeal: {
    intro: { t: 'První snídaně: tři kroky', co: '6. října ráno. Krok 1 je vždy inzulin, krok 2 jídlo a porce, krok 3 rada a zápis.', proc: 'Odpověď na inzulin rozhoduje, které rady jsou dovolené. Proto přichází dřív, než pacient něco vidí.' },
    steps: [
      { do: [{ sel: '.insulin' }], t: 'Připomínka předepsané dávky', co: '„Lékař předepsal · 8 j. k snídani · my jen připomínáme.“', proc: 'Aplikace dávku nepočítá. Zobrazí ji a zeptá se, jestli byla podaná.' },
      { do: [{ sel: '[data-action="mealBolus"][data-value="before"]', act: 'mealBolus', val: 'before' }, { sel: '[data-action="mealStep"][data-value="2"]', act: 'mealStep', val: '2' }], t: '„Ještě ne“ → krok 2', co: 'Pacient si ještě nepíchl. Přechází na výběr jídla.' },
      { do: [{ sel: '[data-bind="meal.q"]', bind: 'meal.q', val: 'kaše', type: true, live: true }], watch: '.food-grid', t: 'Hledání napsáním pár písmen', co: 'Napíše „kaše“ a vidí jídla ze seznamu ~200 českých jídel.', vsimni: 'U každého jídla štítek úrovně: teď všude NEZNÁMÉ · zapsáno 0×.', proc: 'Žádná čísla, žádná makra. Jídlo se vybírá jménem.' },
      { do: [{ sel: foodSel('Ovesná kaše s mlékem a banánem'), act: 'mealFood', val: foodId('Ovesná kaše s mlékem a banánem') }, { sel: '[data-action="mealPortion"][data-value="usual"]', act: 'mealPortion', val: 'usual' }, { sel: '[data-action="mealStep"][data-value="3"]', act: 'mealStep', val: '3' }],
        t: 'Kaše, obvyklá porce → krok 3', co: 'Aplikace ukáže, co o kaši ví: nic.', vsimni: '„Nic neodhadujeme.“ Žádné číslo. Prstenec učení 0/3.', proc: 'Třetí úroveň jistoty — neznámé jídlo. Odhad bez dat by byl předpověď bez opory.' },
      { do: [{ sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: '„Píchl jsem si 8 j. a jdu jíst“', co: 'Zápis uložený i s potvrzením inzulinu. Dole: „Zapsáno. Za dvě hodiny uvidíte, kam se glukóza dostala.“ Pod návyky je karta „Cesta ke kontrole“: 91 dní, známá jídla 0 z 0.', vsimni: 'Pacient vždy ví, co bude dál: za dvě hodiny výsledek, za tři měsíce kontrola.', dusledek: 'Po třech takových zápisech bude aplikace kaši znát — a poděkuje.' }
    ]
  },
  week: {
    intro: { t: 'Po týdnu: co už aplikace ví', co: 'Pacient zapsal sedm snídaní a šest obědů. Kaše i chléb se sýrem jsou ZNÁMÉ JÍDLO.', vsimni: 'Prstenec 3/3 s fajfkou, štítek reakce a rozmezí na stupnici zelená → červená.' },
    steps: [
      { do: [{ sel: '.food .peak' }], t: 'Kam se po kaši glukóza dostane', co: 'Okno na stupnici: rozmezí vrcholů z započítaných zápisů, vpravo od čáry cíle. Vpravo nahoře „X z N v cíli“.', vsimni: 'Zápisů je 5, započítané 4 — jeden má u inzulinu „nevím“.', proc: 'Bez potvrzeného inzulinu nejde říct, jestli vzestup způsobilo jídlo, nebo chybějící dávka.' },
      { do: [{ sel: '.food .tag.bad,.food .tag.warn' }], t: 'Silná reakce', co: 'Štítek říká, jak často po jídle pacient zůstane v cíli. Kaše: málokdy.', proc: 'Žádné známky, žádné „špatné jídlo“. Jen podíl zápisů v cíli, vztažený k pacientovým vlastním jídlům.' },
      { do: [{ sel: '[data-action="foodsSeg"][data-value="all"]', act: 'foodsSeg', val: 'all' }], t: 'Všechna jídla', co: 'Řízek s kaší už je známý (3×), svíčkovou a rýži teprve poznáváme — „Učím se: 1 ze 3“. Je tu i jablko ze svačiny: svačina se zapisuje bez inzulinu a učí se zvlášť.', vsimni: 'Detail každého jídla je až po rozbalení, aby pacient nebyl zahlcený.' }
    ]
  },
  lateMeal: {
    intro: { t: 'Pacient otevřel aplikaci až v 10 hodin', co: '13. října. Den má tři sloty: snídaně, oběd, večeře. Slot snídaně je prázdný a dopoledne končí — aplikace se tedy neptá „co budete jíst“, ale „snídal jste?“.', vsimni: 'Nahoře tři sloty dne se stavem. Žádná okna od lékaře; jen hrubá denní doba a to, co je zapsané.', proc: 'Pacient nemá přemýšlet, co má udělat. Aplikace mu položí správnou otázku a vždy se může opravit sám („Už jsem jedl“, „Vynechal jsem“).' },
    steps: [
      { do: [{ sel: '.milestone' }], t: 'Milník: jídlo poznáno', co: '„Smažený řízek s bramborovou kaší už známe (3 zápisy se všemi údaji). Od teď vám k němu umíme poradit.“ Jednorázová karta s poděkováním.', vsimni: 'Pochvala je za čin — tři zápisy se všemi údaji — ne za hodnotu glukózy. Štítek položky R-MILNIKY.', proc: 'Hodnota glukózy není pacientova zásluha ani vina; chválit ji by učilo honit čísla. Chválíme snahu a návyk (15, odst. 7b).' },
      { do: [{ sel: '[data-action="milestoneClose"]', act: 'milestoneClose', val: function (B, S) { var m = NF.pendingMilestone(S); return m ? m.id : ''; } }], watch: '.week', t: 'Zavřít → Tvůj týden', co: 'Po milníku se ukáže týdenní shrnutí: 11 z 21 jídel zapsáno, všechna v obvyklé porci, díky za týden.', proc: 'Mezi kontrolami jsou tři měsíce; týdenní karta je jediný pravidelný rytmus, kde pacient vidí postup.' },
      { do: [{ sel: '[data-action="weekClose"]', act: 'weekClose', val: function (B, S) { var w = NF.weekSummary(S); return w ? w.id : ''; } }], t: 'Zavřít shrnutí', co: 'Karta zmizí a znovu se neukáže. Nahoře zůstává jen to, co je teď na řadě.' },
      { do: [{ sel: '.glass.soft' }], t: '„Snídal jste dnes?“', co: 'Dvě velké volby: Ano, snídal jsem · Ne, vynechal jsem. Při „Ne“ se ještě zeptá, zda si píchl inzulin, a při ano ukáže pokyn lékaře „snědl jsem méně“. Slot snídaně má stav „chybí zápis“.', proc: 'Zmeškané jídlo s podaným inzulinem je bezpečnostní situace; řešení je z pokynů lékaře, ne z aplikace.' },
      { do: [{ sel: '[data-action="mealRetro"]', act: 'mealRetro', val: 'breakfast' }], t: 'Ano, snídal jsem → zpětný zápis', co: 'Krok 1: píchl jste si inzulin? kolik? v kolik jste snídal?', vsimni: 'Časy jsou chipy (v 6, v 6:30 … až do teď). Nic se nepíše.' },
      { do: [{ sel: '[data-action="mealBolus"][data-value="as"]', act: 'mealBolus', val: 'as', quick: true }, { sel: '[data-action="mealAt"][data-value="7.5"]', act: 'mealAt', val: '7.5', quick: true }, { sel: '[data-action="mealTime"][data-value="-15"]', act: 'mealTime', val: '-15', quick: true }, { sel: '[data-action="mealStep"][data-value="2"]', act: 'mealStep', val: '2' }], t: '8 j. podle plánu, snídaně v 7:30, inzulin 15 min před', co: 'Odpovědi klepnutím; zápis dostane správný čas a data ze senzoru k tomu času.' },
      { do: [{ sel: foodSel('Chléb se sýrem a zeleninou'), act: 'mealFood', val: foodId('Chléb se sýrem a zeleninou') }, { sel: '[data-action="mealPortion"][data-value="usual"]', act: 'mealPortion', val: 'usual', quick: true }, { sel: '[data-action="mealStep"][data-value="3"]', act: 'mealStep', val: '3' }], watch: '.advice', t: 'Co jste jedl → co pomůže teď', co: 'K jídlu, které už je snědené, se radit nedá. Aplikace poradí to jediné, co teď pomůže: procházka. Snídaně byla před 165 minutami, takže rada říká po pravdě: vzestup už nezměníš, ale glukóza bývá po jídle zvýšená ještě 2–3 hodiny a procházka ji sníží. Po třech hodinách už aplikace pohyb nenabízí.', proc: 'Rada se řídí časem: před jídlem porce a složení, po jídle pohyb — a jen dokud má smysl.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="walk:yes"]', act: 'mealDecide', val: 'walk:yes', quick: true }, { sel: '[data-action="mealFinish"]', act: 'mealFinish', val: 'as' }], t: 'Jdu na to, uložit', co: 'Snídaně je zapsaná k 7:30 s potvrzeným inzulinem. Dole: „Díky za doplnění. I zpětný zápis se počítá do učení.“', dusledek: 'Slot snídaně je zapsaný; na řadě je oběd — u něj aplikace nabídne „Chystám se jíst“ i „Už jsem obědval“.' },
      { do: [{ sel: '.result' }], t: 'Jak to dopadlo', co: 'Snídaně byla v 7:30, data ze senzoru už k ní jsou: „Chléb se sýrem s procházkou: vrchol v cíli. Bez toho u vás bývá… Díky, že jste to zkusil — tohle u vás funguje.“', vsimni: 'Výsledek věcně, poděkování za čin. „Rozumím“ kartu zavře, „Zobrazit jídlo“ otevře kartu jídla.', proc: 'Tím se uzavírá smyčka učení: pacient vidí, jak dopadlo to, co udělal, ve chvíli, kdy je to známé. Bez toho by neměl důvod radu příště přijmout.' },
      { do: [{ sel: '.path' }], t: 'Cesta ke kontrole', co: 'Do kontroly 84 dní, známá jídla 3 z 3, tento týden 3 z 6 jídel zapsáno a inzulin potvrzen u všech. Pod tím věta, co lékař na kontrole uvidí.', vsimni: 'Čísla „X z N“, žádná procenta ani známky. Pruh je jen čas do kontroly.', proc: 'Dlouhodobý cíl musí být vidět: aplikace se učí pacientova jídla a lékař z toho na kontrole rozhodne. Pacient nic nepočítá.' }
    ]
  },
  advice: {
    intro: { t: 'Před píchnutím: rada k porci', co: '14. října. Pacient má hlad a chystá si větší porci kaše. Inzulin si ještě nepíchl.', proc: 'Dávka je klíč vyrobený na obvyklou porci. Dokud není v těle, pacient ještě může porci upravit.' },
    steps: [
      { do: [{ sel: '.advice' }], t: 'Rada „obvyklá porce“ se štítkem „mění množství jídla“', co: '„Dej si obvyklou porci. Tvoje dávka je nastavená na obvyklé množství — větší porce ho přesáhne.“', vsimni: 'Aplikace neradí jíst méně. Radí vrátit se k obvyklému.', proc: 'Při pevné dávce je cílem stejné množství jídla každý den.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="portion:yes"]', act: 'mealDecide', val: 'portion:yes', quick: true }, { sel: '[data-action="mealDecide"][data-value="addon:yes"]', act: 'mealDecide', val: 'addon:yes', quick: true }], t: 'Pacient přijme porci i doplněk', co: 'Obě rady zezelenaly. U doplňku: „ještě jste to nezkoušel — až to zkusíte, uvidíte, jestli pomohlo“.', vsimni: 'Každá rada nese štítek schválené položky registru.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:no"]', act: 'mealDecide', val: 'order:no', quick: true }, { sel: '[data-action="mealReason"][data-value="order:nothome"]', act: 'mealReason', val: 'order:nothome', quick: true }], t: 'Třetí radu nechá být — s důvodem', co: '„Tentokrát ne“ a „Nemám to doma“. Jedno klepnutí navíc, nepovinné.', proc: 'Důvody odmítnutí řeknou lékaři, jestli pacient radu nechce, nebo je rada nepraktická.' },
      { do: [{ sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Píchne si a jde jíst', co: 'Zápis je uložený s obvyklou porcí (radu přijal), doplňkem a odmítnutým pořadím. Dole: „Vrátil jste se k obvyklé porci — přesně na tu je vaše dávka. Díky.“', dusledek: 'Za dvě hodiny karta „Jak to dopadlo“ ukáže, jestli jogurt pomohl — a poděkuje za pokus.' }
    ]
  },
  afterBolus: {
    intro: { t: 'Po píchnutí: co aplikace smí a nesmí', co: '16. října. Pacient si píchl dřív, než otevřel aplikaci. V panelu prezentujícího lze zvolit: větší porce, menší porce, nebo „nevím“.', proc: 'Inzulin už působí 3–5 hodin, ať sní cokoli. Radit k množství jídla je teď zásah do léčby — až na jednu výjimku.' },
    steps: [
      { when: function (B) { return B.bolus === 'bigger'; }, do: [{ sel: '.advice' }], t: 'Větší porce → zpět k obvyklé je dovolené', co: '„Dejte si obvyklou porci. Inzulin, který už máte v těle, je nastavený na obvyklé množství.“', vsimni: 'Návrat z větší porce k obvyklé vrací jídlo k dávce, která už působí. To je bezpečný směr.', proc: 'Zásada 3 v dokumentu 15: po píchnutí jen z větší zpět k obvyklé.' },
      { when: function (B) { return B.bolus === 'smaller'; }, do: [{ sel: '.hint.warn' }], t: 'Menší porce → žádná rada k množství', co: '„Radu ‚snězte víc‘ nedáváme nikdy. Sníte-li méně, řiďte se pokynem lékaře ‚snědl jsem méně‘.“', proc: '„Snězte víc“ by učilo jíst podle inzulinu — přesně to, čemu se vyhýbáme. Co dělat, říká pokyn od lékaře, ne aplikace.' },
      { when: function (B) { return B.bolus === 'unknown'; }, do: [{ sel: '.hint.warn' }], t: '„Nevím“ = jako po píchnutí', co: 'Nejistota se řeší na stranu bezpečí: rada k množství jídla se nedá.', proc: 'Kdo neví, jestli si píchl, nedostane radu, která mění množství sacharidů.' },
      { do: [{ sel: '.advice .cert' }], t: 'Rady bez změny množství zůstávají', co: 'Doplněk k jídlu se nabízí dál — a už s pacientovou zkušeností: „Zkusil jste to 1×: 1 z 1 v cíli“.', proc: 'Tyhle rady nemění množství sacharidů, a tak jsou bezpečné kdykoli.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="addon:no"]', act: 'mealDecide', val: 'addon:no', quick: true }, { sel: '[data-action="mealReason"][data-value="addon:nothome"]', act: 'mealReason', val: 'addon:nothome', quick: true }, { sel: '[data-action="mealFinish"]', act: 'mealFinish', val: function (B) { return B.bolus === 'unknown' ? 'unknown' : 'as'; } }], t: 'Dnes bez doplňku, uložit', co: 'Jogurt nemá doma. Zápis je uložený i s odmítnutím.', dusledek: 'I odmítnutí je užitečný údaj pro report.' }
    ]
  },
  custom: {
    intro: { t: 'Vlastní jídlo třemi klepnutími', co: '18. října, oběd u maminky. „Řízek s kaší od maminky“ v seznamu není.', proc: 'Pacient hotová a domácí jídla nezná složením, ale jménem a rutinou. Učíme se z opakování, ne z maker.' },
    steps: [
      { do: [{ sel: '[data-action="mealTag"][data-value="side:brambory"]', act: 'mealTag', val: 'side:brambory', quick: true }, { sel: '[data-action="mealTag"][data-value="prep:smazene"]', act: 'mealTag', val: 'prep:smazene', quick: true }, { sel: '[data-action="mealTag"][data-value="size:velke"]', act: 'mealTag', val: 'size:velke', quick: true }], t: 'Příloha · příprava · velikost', co: 'Brambory / kaše, smažené, velké. Tři klepnutí, žádná čísla.', proc: 'Štítky slouží jen k „podobné jídlo“. Samotné učení běží z opakování stejného jídla.' },
      { do: [{ sel: '[data-action="mealSaveFood"]', act: 'mealSaveFood' }, { sel: '[data-action="mealPortion"][data-value="usual"]', act: 'mealPortion', val: 'usual' }, { sel: '[data-action="mealStep"][data-value="3"]', act: 'mealStep', val: '3' }], watch: '.peak',
        t: 'Uloženo → PODOBNÉ JÍDLO', co: 'Aplikace ho ještě nezná, ale zná řízek s kaší ze seznamu (stejné štítky). Ukáže široké rozmezí z podobných jídel, bez čísla „přesně“.', vsimni: 'Čárkované okno = odhad z podobných. S každým vlastním zápisem se zúží.', proc: 'Druhá úroveň jistoty. Číslo by u jídla, které pacient nikdy nejedl, vypadalo jako předpověď.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:yes"]', act: 'mealDecide', val: 'order:yes', quick: true }, { sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Obecná rada, přijata, uložit', co: '„Obecná rada ze schváleného pravidla. Jak zabere právě u vás, zatím nevíme.“', dusledek: 'Po třech zápisech se z podobného stane známé s vlastním rozmezím.' }
    ]
  },
  illness: {
    intro: { t: 'Jsem nemocný', co: '20. října. Pacientovi není dobře. Na Dnes je přepínač „Jsem nemocný“ — viditelný, ne schovaný.', proc: 'Nemoc oznamuje člověk. Aplikace ji nehádá z čísel.' },
    steps: [
      { do: [{ sel: '.sick .toggle', act: 'illness', val: 'on' }], watch: '.glass.soft', t: 'Režim nemoci', co: 'Nahoře se objevily pokyny lékaře pro nemoc: inzulin nevysazujte, pijte, měřte každé 3 h, kdy volat.', vsimni: 'Aplikace pomáhá dál, jen jinak. Dávky platí, jak řekl lékař.', proc: 'Pacient nesmí zůstat bezradný. Klinický obsah je ale z pokynů lékaře, ne z aplikace.' }
    ]
  },
  illnessMeal: {
    intro: { t: 'Jídlo během nemoci', co: 'Pacient si chystá menší porci kaše, píchl si podle plánu.', proc: 'V nemoci tělo reaguje jinak; rady postavené na běžných dnech by neseděly.' },
    steps: [
      { do: [{ sel: '.hint.sand' }], t: 'Jen bezpečné rady', co: '„Jsi nemocný. Nabízíme jen rady, které nemění množství jídla.“ K menší porci žádná rada — jen odkaz na pokyn lékaře.', proc: 'Zápisy z nemoci se štítkují a do učení nevstupují; lékař je v reportu uvidí zvlášť.' },
      { do: [{ sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Uložit', co: 'Zápis má štítek „z doby nemoci — nezapočítáno“.' }
    ]
  },
  recovery: {
    intro: { t: 'Už je mi lépe', co: '22. října. Aplikace se každý den ptá; pacient sám režim nemoci ukončí.', proc: 'Lékař mezi kontrolami nic neobnovuje. Nemoc ukončuje pacient.' },
    steps: [
      { do: [{ sel: '[data-action="illnessCheck"][data-value="better"]', act: 'illnessCheck', val: 'better' }], t: '„Už je mi lépe“', co: 'Režim nemoci skončil. Rady zase platí naplno.', dusledek: 'V reportu lékař uvidí 3 dny nemoci jako oddělený pruh.' }
    ]
  },
  registry: {
    intro: { t: 'Lékař-garant: podnět a úprava pravidla', co: 'Při testu pacient pochopil radu „snězte nejdřív jogurt“ tak, že jogurt nahradí část kaše — a kaši nedojedl. Při pevné dávce snědl méně, než má.', vsimni: 'Schvalovací registr: vše, na čem aplikace stojí, v kategoriích, s filtrem a hledáním. V maketě je vše schválené předem.', proc: 'Nejasný text rady je bezpečnostní problém. Garant ho musí umět opravit hned — a historie musí zůstat.' },
    steps: [
      { do: [{ sel: '.reg-side .card' }], t: 'Položka R-PORADI', co: 'Co dělá, text pro pacienta, kde se používá, historie rozhodnutí.', vsimni: 'Tlačítka Schválit / Upravit / Zamítnout, komentář nepovinný. Rozhodnutí se uloží okamžitě.' },
      { do: [{ sel: '[data-bind="form.regcomment_R-PORADI"]', bind: 'form.regcomment_R-PORADI', val: 'Upřesněn text: příloha se nevynechává.', type: true }, { fn: function (S) { var it = NF.item(S, 'R-PORADI'); it.text = 'Snězte nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávejte — množství sacharidů má zůstat stejné.'; it.version = 'v2'; } }, { sel: '[data-action="regDecide"][data-value="edited"],[data-action="regEdit"]', act: 'regDecide', val: 'edited' }],
        watch: '.reg-side .hist', t: 'Upravit s komentářem', co: 'Text rady má novou verzi: „…zbytek obvyklého jídla. Přílohu nevynechávejte.“ Stav „schváleno s úpravou“, v historii kdo, kdy, z čeho na co.', proc: 'Změna platí v aplikaci okamžitě. My vývojáři výsledek vidíme v exportu JSON.' }
    ]
  },
  impact: {
    intro: { t: 'Pacient vidí radu s novým textem', co: 'Další den v poledne, řízek s kaší — jídlo, které aplikace už zná.', proc: 'Zamítnutá položka by radu úplně odstranila; upravená ji jen změní.' },
    steps: [
      { do: [{ sel: '.advice .text' }], t: 'Nový text rady', co: '„…potom zbytek obvyklého jídla. Přílohu nevynechávejte.“', vsimni: 'Štítek položky je oranžový: „schváleno s úpravou“.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:yes"]', act: 'mealDecide', val: 'order:yes', quick: true }, { sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Přijmout a uložit', co: 'Zápis uložený.', dusledek: 'Přeskočíme dva měsíce ke kontrole.' }
    ]
  },
  preview: {
    intro: { t: 'Den před kontrolou', co: '4. ledna. Pacient si prohlíží, co zítra uvidí lékař — poděkování za dny zapisování, co fungovalo, a otázky na lékaře k zaklepnutí.', vsimni: 'Čísla jsou sbalená pod „Podrobnosti v číslech“; obrazovka začíná tím podstatným. Navržené otázky stačí zaklepnout.' },
    steps: [
      { do: [{ sel: '.tile[data-value="adv"]', act: 'previewTile', val: 'adv' }], watch: '.hint.sand', t: 'Rozklik dlaždice', co: 'Vysvětlení, co číslo znamená: medián vrcholu glukózy, když radu přijal vs. nepřijal.', proc: 'Pacient má rozumět tomu, co lékař uvidí.' },
      { do: [{ sel: '[data-action="toggleQuestion"]', act: 'toggleQuestion', val: function (B, S) { var b = S.foods.filter(function (f) { return f.name.indexOf('kaše') >= 0; })[0]; return 'Mám pokračovat s tím, že si k ' + b.name.toLowerCase() + ' dávám doplněk k jídlu?'; } }], t: 'Navržená otázka na lékaře', co: 'Otázka z dat, jedno klepnutí. Vlastní otázku lze napsat jako druhou možnost.', dusledek: 'Lékař ji uvidí v reportu.' }
    ]
  },
  reviewSummary: {
    intro: { t: 'Kontrola: krok 1 — souhrn', co: '5. ledna. Lékař klepne „Zahájit kontrolu“ a NutriFee sestaví report a návrhy. Nahoře čtyři kroky.', proc: 'Lékař má pár minut. Podstatné musí být pokaždé na stejném místě a bez čtení detailů.' },
    steps: [
      { do: [{ sel: '[data-action="startReview"]', act: 'startReview' }], watch: '.tiles', t: 'Zahájit kontrolu', co: 'Dlaždice se semaforem: čas v cíli, obvyklá porce, inzulin podle plánu, rady fungovaly, mimo učení. Pod nimi věta „co se dělo“ ze šablony.', vsimni: 'Věta je z pravidla S-SOUHRN, ne z AI.' },
      { do: [{ sel: '.tile[data-value="adv"]', act: 'reviewTile', val: 'adv' }], watch: '.card.soft', t: 'Rozklik dlaždice', co: 'Sloupce: přijato / nepřijato / bez odpovědi s mediánem vrcholu. Nejčastější důvod odmítnutí.', proc: 'Jediné číslo, které lékaři řekne, jestli rady fungují. Report neříká „neposlechl“.' },
      { do: [{ sel: 'details.part:first-of-type summary' }], t: 'Podklady jen na vyžádání', co: 'Reakce na jednotlivá jídla, rady, dávky a potvrzení, senzor, pokyny, otázky pacienta — sbalené.', proc: 'Text až po rozbalení. Na první pohled jen to, co lékař potřebuje.' },
      { do: [{ sel: '.nextbar .btn.primary', act: 'reviewStep', val: '2' }], t: 'K návrhům', co: 'Spodní lišta vede dál.' }
    ]
  },
  reviewProposals: {
    intro: { t: 'Krok 2 — návrhy s důvodem a postupem', co: 'NutriFee připravila návrhy. Jen jeden je otevřený, ostatní čekají. Každý má: proč vznikl, co ho oslabuje, 1 ověřte s pacientem, 2 váš schválený postup říká, 3 rozhodnutí.', proc: 'Lékař nepřemýšlí, co má udělat. Ověří body a postup mu řekne, která větev platí. Jednotky volí sám.' },
    steps: [
      { do: [{ sel: '.prop.now .why' }], t: 'Proč návrh vznikl', co: 'Čísla z dat: kolik čistých snídaní bylo nad cílem i po přijatých radách. Co návrh oslabuje: vyřazené zápisy.', vsimni: 'Do návrhu vstupují jen „čistá“ jídla: obvyklá porce, dávka potvrzená podle plánu, mimo nemoc.', proc: 'Bez potvrzení dávky by signál ukazoval na dávku, přestože příčina je jinde.' },
      { do: [{ sel: '[data-action="propVerifyAll"]', act: 'propVerifyAll', val: function (B, S) { var n = NF.nextProposal(S); return n ? n.id : ''; } }],
        watch: '.prop.now .branch', t: 'Ověření řídí větev postupu', co: 'Lékař ověřil body s pacientem a klepl „Vše sedí“; kterýkoli bod může přepnout na „nesedí“. Dokud některý chybí, postup čeká. Když vše sedí: „zvýšit“. Kdyby bod 1 neseděl: „ponechat, řešit podání“.', vsimni: 'Body jsou tvrzení („dávky potvrzeny a čas sedí“), aby „sedí / nesedí“ dávalo smysl.', proc: 'Věta „zvýšit“ je z postupu D-POSTUP, který schválil lékař-garant. Aplikace ji nevymyslela. „Vše sedí“ je jen zkratka — trojstav zůstává.' },
      { when: function (B) { return B.response === 'accepts'; }, do: [{ sel: '.prop.now .stepper button:last-child', act: 'propUnits', val: function (B, S) { return NF.nextProposal(S).id + ':1'; }, quick: true }, { sel: '.prop.now .stepper button:last-child', act: 'propUnits', val: function (B, S) { return NF.nextProposal(S).id + ':1'; }, quick: true }],
        t: 'O kolik — volí lékař', co: 'Volič jednotek. Aplikace číslo nenavrhuje; dokud je stejné jako dnes, „Souhlasím“ je zamčené.' },
      { do: [{ sel: '.prop.now .decide .btn.primary', act: 'propDecide', val: function (B, S) { var n = NF.nextProposal(S); return n.id + ':' + (NF.screens.proposalBranch(S, n).action === 'keep' ? 'keep' : 'agree'); } }], t: 'Souhlasím', co: 'Rozhodnutí je zapsané do stopy. Otevřel se další návrh.', vsimni: 'Jiné rozhodnutí (ponechat, zamítnout s důvodem, komentář) je pod nenápadným odkazem.' },
      { do: [{ fn: function (S) { D.decideSingles(S, S.branches || D.defaults); } }], watch: '.prop.group',
        t: 'Zbývající návrhy', co: 'Lékař rozhodl i ostatní návrhy, kde se něco mění (rady k obědu před dávkou; v odbočce „nemám to doma“ výměnu rady za jinou — pacient pak doplněk už neuvidí).', proc: 'Návrh „vyměnit radu“ má skutečný účinek: plán nese vypnuté a nahrazené rady a jádro je podle toho nabízí.' },
      { do: [{ sel: '[data-action="propKeepAll"]', act: 'propKeepAll' }], watch: '.nextbar',
        t: 'Beze změny jedním klepnutím', co: 'Návrhy, které nic nemění (zachovat radu, pokyny platí), jsou jedna karta. Jedno potvrzení, každá položka se přesto zapíše do stopy zvlášť. Spodní lišta se odemkla.', proc: 'Lékař rozhoduje jen o tom, co se mění. Kontrola je tak zhruba 10 kliknutí místo 30.' }
    ]
  },
  reviewConfirm: {
    intro: { t: 'Krok 3 — potvrzení plánu', co: 'Shrnutí rozhodnutí a nový plán: dávky se změnou zvýrazněnou, návyky, pokyny. Jedno tlačítko.', proc: 'Nevratný krok má shrnutí a jednu větu, co se stane.' },
    steps: [
      { do: [{ sel: '.nextbar .btn.primary', act: 'issueP2' }], t: 'Vydat plán P2', co: 'Plán je vydaný. Po změně dávky začne učení k radám u jídel znovu.', dusledek: 'Pacient uvidí, co se změnilo a proč.' }
    ]
  },
  reviewHandover: {
    intro: { t: 'Krok 4 — předání pacientovi', co: 'Vpravo náhled telefonu: pacient vidí změny a důvody lékaře. Kontrola končí.', proc: 'Lékař do příští kontroly nic nedělá.' },
    steps: [{ do: [{ sel: '.phone-preview' }], t: 'Co pacient uvidí', co: 'Dávky se změnou, věta „Změna dávky = učíme se znovu“, případně „radu X vám už nenabízíme — lékař ji vypnul“, rozbalovací „Proč lékař rozhodl takto“.' }]
  },
  newplan: {
    intro: { t: 'Pacient: nový plán', co: 'Co se změnilo, proč, a jedno tlačítko „Rozumím, pokračuji“.' },
    steps: [{ do: [{ sel: '[data-action="confirmUnderstanding"]', act: 'confirmUnderstanding' }], t: 'Rozumím, pokračuji', co: 'Nový plán platí. Smyčka se uzavřela: lékař vydal plán, pacient ho plnil, aplikace se učila a radila, lékař viděl, jestli rady fungovaly, a NutriFee mu navrhla další krok.' }]
  },
  trace: {
    intro: { t: 'Verze a stopa: důkaz pro studii', co: 'Každý výpočet, rada, návrh a rozhodnutí se vstupy a výstupy. Export JSON.', proc: 'Doložení, že do výpočtů nezasahuje žádná generativní AI a všechno je dohledatelné.' },
    steps: [{ do: [{ sel: 'table' }], t: 'Stopa', co: 'Řádky „rada.zobrazena“, „navrh.rozhodnut“, „registr.rozhodnuti“ — u každého tlačítko „data“ rozbalí přesné vstupy.', dusledek: 'Konec ukázky. Všechny odbočky jste prošli cestou; co zbývá potvrdit, je pod „Ke schválení“ v liště.' }]
  }
};

T.stepsFor = function (id, B) { var ch = T.chapters[id]; if (!ch) return []; return ch.steps.filter(function (s) { return !s.when || s.when(B || D.defaults); }); };

})(typeof window !== 'undefined' ? window : globalThis);
