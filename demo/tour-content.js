/* Vyprávění k průchodu tlačítkem Další. U každé kapitoly úvod a kroky, které se odehrají za roli.
   Krok: { do:[ {sel, act, val} | {sel, bind, val, type} | {sel} | {sel, fn} ], watch, list, t, co, vsimni, proc, dusledek, when(B) }
   Tempo (27. 10. 2026): jedno Dál = jeden děj, který vyprávění popisuje. Víc akcí v kroku jen jako seznam téže akce (list: true nebo stejná akce za sebou)
   nebo jako dvojice volba + potvrzení / přechod. Krok, který mění stav přes fn, má u fn cíl sel, aby bylo vidět, kde se obrazovka změní. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo;
var T = D.tour = {};
function foodId(name) { return function (B, S) { var f = S.foods.filter(function (x) { return x.name === name; })[0]; return f ? f.id : ''; }; }
function firstQuestion(B, S) {
  var html = ''; try { html = NF.screens.patient(S); } catch (err) { return ''; }
  var m = html.match(/data-action="toggleQuestion" data-value="([^"]*)"/); if (!m) return '';
  return m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function nar() { return !!(D.narrow && D.narrow()); }
/* Čísla ve vyprávění z parametrů registru (korektura 23. 10. 2026): po úpravě parametru garantem se text nerozejde. */
function param(S, id, key, fallback) { var it = S && NF.item ? NF.item(S, id) : null; return it && it.params && it.params[key] != null ? it.params[key] : fallback; }
function foodSel(name) { return function (B, S) { return '[data-action="mealFood"][data-value="' + foodId(name)(B, S) + '"]'; }; }

T.chapters = {
  prolog: {
    /* V3: pod 1100 px je panel dole, obsah nad ním – texty se řídí šířkou */
    intro: { t: 'Úvod',
      get co() { return (nar() ? 'Nahoře' : 'Vlevo') + ' je, k čemu NutriFee je a jak ukázku ovládat. Přečtěte si to a klepněte na „Začít ukázku“ dole v tomto panelu.'; },
      get vsimni() { return 'Ovládáte jen tento fialový panel. Obrazovku ' + (nar() ? 'nad ním' : 'vlevo') + ' odehrává ukázka sama.'; } },
    steps: []
  },
  enroll: {
    intro: { t: 'Ordinace, 5. října. Lékař zařazuje pacienta', co: 'Lékař zařazuje pacienta s diabetem 2. typu na inzulinu s pevnými dávkami, který dostal senzor.', vsimni: 'Nic se nepíše: karta se jen zobrazuje a podmínky se zaškrtávají.', proc: 'Lékař má na zařazení pár minut. Každé klepnutí má důsledek.' },
    steps: [
      { do: [{ sel: '.card:first-of-type' }], t: 'Karta pacienta', co: 'Z karty pacienta se načetla diagnóza, léčba, senzor, HbA1c 62 a souhrn ze senzoru za měsíc před zařazením (čas v cíli 58 %). Na kontrole je aplikace porovná s novými hodnotami.', vsimni: '„Inzulin v pevných dávkách“: na tom celý návrh stojí. Tablety nebo GLP-1 navíc nevadí, premixované inzuliny ne.', proc: 'Učit se z reakcí na jídlo má smysl jen tehdy, když se dávka mezi dny nemění.' },
      { do: [{ sel: '[data-value="adult"]', act: 'eligibility', val: 'adult' }, { sel: '[data-value="insulinOnly"]', act: 'eligibility', val: 'insulinOnly' }, { sel: '[data-value="regimen"]', act: 'eligibility', val: 'regimen' }, { sel: '[data-value="cgm"]', act: 'eligibility', val: 'cgm' }], watch: '.hint.ok',
        t: 'Čtyři podmínky zařazení', co: 'Lékař je postupně potvrdil. Dokud chyběla jediná, tlačítko „Pokračovat“ bylo zamčené.', vsimni: 'Potvrzení nese štítek položky „Podmínky zařazení“ (zatím „◌ ke schválení“); právě o ní teď rozhodujete.', proc: 'Aplikace nedovolí pokračovat s pacientem, pro kterého není určená.', dusledek: 'Spodní lišta říká, co je další krok.' },
      { do: [{ sel: '.nextbar .btn.primary', act: 'wizardGo', val: '1' }], t: 'Krok 2: dávky, návyky a pokyny', co: 'Otevřel se krok 2 zařazení. Lékař tu zadá dávky, projde návyky a pokyny.' }
    ]
  },
  doses: {
    intro: { t: 'Dávky voličem, návyky předvybrané, pokyny v plánu', co: 'NutriFee předvyplnila startovní sadu návyků, stejnou pro všechny pacienty; pokyny pro pacienta jsou v plánu automaticky ze schváleného registru. Dávky jsou prázdné: zadává je lékař.', vsimni: 'Tlačítko Pokračovat je zamčené, dokud nejsou všechny čtyři dávky zadané.', proc: 'Pevná dávka je základ celého návrhu: určuje ji lékař, aplikace ji jen zobrazí, připomene a zeptá se na podání. Směr ani výši nevymýšlí.' },
    steps: [
      { do: [{ sel: '.dose-grid' }], t: 'Dávky inzulinu voličem', co: 'Lékař tlačítky −/+ nastavil 8 j. ke snídani, 10 j. k obědu a 8 j. k večeři. Bazál 18 j. na noc ve 21:00 má samostatné tmavé pole.', vsimni: 'Aplikace dávky jen zobrazí pacientovi a připomene. Nikdy je nepočítá.', proc: 'Dávka je věc lékaře. Aplikace k ní sbírá kontext: byla podaná, včas, v předepsané výši?' },
      { do: [{ sel: '[data-bind="draft.medicationChecked"]', bind: 'draft.medicationChecked', val: true }], t: 'Ověření dávek s pacientem', co: 'Lékař s pacientem ověřil dávky a zaškrtl, zda bere i tablety nebo GLP-1. Je to jen záznam; na kontrole se ověří, že se léky neměnily.' },
      { do: [{ sel: '.habit-opt.on' }], t: 'Startovní sada návyků', co: 'Předvybrané jsou čtyři návyky se štítkem „startovní sada“: zapisovat hlavní jídla, držet obvyklou porci, potvrzovat inzulin a dávat bazál večer.', vsimni: 'U každého návyku je věta „proč“ – tu uvidí i pacient.', proc: 'Stejný start pro všechny umožní porovnat pacienty napříč studií. Personalizace přijde z dat na první kontrole.' },
      { do: [{ sel: '.instr-card' }], t: 'Pokyny pro pacienta jsou v plánu', co: function (B, S) { return 'V plánu je automaticky sedm pokynů ze schváleného registru: nízká glukóza pod 4, nevím, jestli byl inzulin píchnutý, méně jídla než obvykle (změřit za ' + param(S, 'I-MENE', 'v', 60) + ' min), nemoc zvlášť pro bazál a pro inzulin k jídlu, vysoká glukóza a kdy volat. Karta je sbalená. Lékař nic nevybírá ani nepíše, vydáním plánu pokyny podepisuje a hodnotu mění jen výjimečně. Cíle glukózy (3,9–10,0, ráno do 7,2, čas v cíli 70 %) nastavuje voličem.'; }, vsimni: '„Snězte víc“ nikdy neřekne aplikace; pokyn „méně jídla než obvykle“ pacient uvidí jako pokyn svého lékaře.', proc: 'Co dělat při nízké glukóze nesmí říkat software sám. Říká to plán podepsaný lékařem; znění schválil garant při vývoji.' },
      { do: [{ sel: '.nextbar .btn.primary', act: 'wizardGo', val: '2' }], t: 'Krok 3: shrnutí před vydáním', co: 'Vše je připravené, spodní lišta je odemčená a lékař pokračuje k vydání.' }
    ]
  },
  issue: {
    intro: { t: 'Vydání plánu', co: 'Lékař vidí na jedné obrazovce shrnutí dávek, cílů, návyků a pokynů a plán vydá jedním tlačítkem.', vsimni: 'U cílů glukózy i startovní sady je značka „✓“ položky registru.', proc: 'Vydání nejde vzít zpět, proto lišta jednou větou řekne, co se stane.' },
    steps: [
      { do: [{ sel: '.nextbar .btn.primary', act: 'issuePlan' }], t: 'Plán P1 vydán, obrazovka sestry', co: 'Plán je vydaný a obrazovka se přepnula k sestře.', vsimni: 'Lékař pacienta nezaučuje. Plán vydal a do příští kontroly už nic nedělá.', dusledek: 'Návyky pacientovi ještě neplatí. Začnou po zaučení a jedné otázce.' }
    ]
  },
  training: {
    intro: { t: 'Sestra zaučuje a vidí, co vidí pacient', co: 'Vlevo jsou body zaučení: tři pevné, jeden bod pro sestru (umí nahrát export ze senzoru při kontrole) a další podle návyků v plánu. Vpravo je živý náhled pacientova telefonu.', vsimni: 'U bodů k jídlu, porci a inzulinu přepne tlačítko „Náhled“ telefon na ukázkové jídlo.', proc: 'Zaučení bez pohledu na telefon by bylo jen odškrtávání.' },
    steps: [
      { do: [{ sel: '.phone-preview' }], t: 'Náhled telefonu', co: 'Sestra vidí obrazovku Dnes tak, jak ji má pacient před sebou.', vsimni: 'Klepnutí na bod zaučení přepne náhled na příslušnou obrazovku.' },
      { do: [{ sel: '[data-value="app"]', act: 'trainingCheck', val: 'app' }, { sel: '[data-value="safety"]', act: 'trainingCheck', val: 'safety' }, { sel: '[data-value="t-zapis"]', act: 'trainingCheck', val: 't-zapis' }], watch: '.phone-preview',
        t: 'Pacient prochází aplikaci sám', co: 'Pacient našel Dnes a Bezpečí a sám prošel tři kroky „Chystám se jíst“. Náhled se přepnul na obrazovku k poslednímu bodu.', proc: 'Body jsou konkrétní činy, které pacient udělal, ne otázky „rozumíte?“.' },
      { do: [{ sel: '[data-value="t-porce"]', act: 'trainingCheck', val: 't-porce' }, { sel: '[data-value="t-inzulin"]', act: 'trainingCheck', val: 't-inzulin' }, { sel: '[data-value="t-bazal"]', act: 'trainingCheck', val: 't-bazal' }, { sel: '[data-value=\"export\"]', act: 'trainingCheck', val: 'export' }, { sel: '[data-value="contacts"]', act: 'trainingCheck', val: 'contacts' }],
        t: 'Body podle návyků', co: 'Pacient ví, že se ho aplikace před každým jídlem zeptá na inzulin, kdy přijde rada k porci a jak potvrdit bazál. Sestra potvrdila, že umí stáhnout export z portálu senzoru a nahrát ho při kontrole.', vsimni: 'Tyhle body existují jen proto, že jsou v plánu příslušné návyky.', proc: 'Otázka na inzulin je jediná věc mezi radou a nízkou glukózou – pacient ji musí znát předem.' },
      { when: function (B) { return B.training !== 'failed'; }, do: [{ sel: '[data-action="finishTraining"][data-value="done"]', act: 'finishTraining', val: 'done' }], watch: '.hint.ok', t: 'Zaučení dokončeno', co: 'Do stopy se zapsalo, že zaučení dokončila sestra, i s časem.', dusledek: 'Pacient teď převezme plán.' },
      { when: function (B) { return B.training === 'failed'; }, do: [{ sel: '[data-action="finishTraining"][data-value="failed"]', act: 'finishTraining', val: 'failed' }], watch: '.hint.warn', t: 'Zaučení se nezdařilo', co: 'Plán je vydaný, návyky ale nezačnou platit.', dusledek: 'V dodatku následuje, co v tu chvíli vidí pacient.' }
    ]
  },
  handover: {
    intro: { t: 'Pacient přebírá plán na telefonu', co: 'Převzetí je průvodce o šesti stránkách: cíl, dávky, návyky, jak to funguje, co aplikace nedělá a kontrolní otázka.', vsimni: 'Na každé stránce je jedna akce; pokyny lékaře jsou jen názvy s odkazem do Bezpečí.', proc: 'Cíl je jíst ke své dávce pokaždé podobně. Aplikace se z jeho zápisů učí, jak tělo reaguje na jeho jídla; pacient nic nepočítá.' },
    steps: [
      { do: [{ sel: '[data-action="takeoverPage"][data-value="2"]', act: 'takeoverPage', val: '2' }], t: 'Dávky inzulinu', co: 'Pacient vidí dávky 8 j. ke snídani, 10 j. k obědu a 8 j. k večeři; bazál 18 j. na noc je zvlášť dole.', proc: 'Pacient vidí lékařův předpis. Aplikace ho bude připomínat.' },
      { do: [{ sel: '[data-action="doseReadback"][data-value="yes"]', act: 'doseReadback', val: 'yes' }], t: 'Dávky souhlasí s tím, co řekl lékař', co: 'Pacient potvrdí, že čísla v aplikaci odpovídají tomu, co mu lékař řekl. Při „Ne“ aplikace řekne „Ukažte telefon sestře“ a plán se nepřebírá.', proc: 'Je to jediná nezávislá kontrola, že lékař dávku zadal správně; aplikace nic nemění ani nenavrhuje.' },
      { do: [{ sel: '[data-action="takeoverPage"][data-value="3"]', act: 'takeoverPage', val: '3' }], t: 'Návyky', co: 'Třetí stránka ukazuje návyky ze startovní sady a u každého jednou větou, proč je důležitý.', proc: 'Pacient ví, co se od něj čeká, dřív než začne.' },
      { do: [{ sel: '[data-action="takeoverPage"][data-value="4"]', act: 'takeoverPage', val: '4' }], watch: '[data-anim="key"]', t: 'Stránka „Jak to funguje“', co: 'Čtvrtá stránka vysvětluje jediný princip, který má pacient pochopit. Animace se přehraje jednou sama.', proc: 'Obrázek v pohybu řekne, co by odstavec textu neřekl; text zůstává pro čtečky a pro toho, kdo chce číst.' },
      { do: [{ sel: '[data-anim="key"]', act: 'animReplay', val: 'key' }], t: 'Animace „Jak to funguje“', co: 'Dávka je klíč vyrobený na obvyklou porci: s obvyklou porcí glukóza zůstane v cíli, větší porce ji vyžene nad cíl, návrat k obvyklé ji vrátí. Ukázka ji pustila znovu, abyste ji viděli celou.', vsimni: 'Tlačítko pod animací ji spustí znovu. Při omezení pohybu v telefonu se ukáže rovnou konec.' },
      { do: [{ sel: '[data-action="takeoverPage"][data-value="5"]', act: 'takeoverPage', val: '5' }], t: 'Co neděláme', co: 'Pátá stránka má tři přeškrtnuté obrázky: nepočítáme sacharidy, neměníme dávku a mezi kontrolami zápisy nikdo nečte.', proc: 'Kdo ví, co aplikace nedělá, nečeká od ní pomoc, kterou nedá.' },
      { do: [{ sel: '[data-action="takeoverPage"][data-value="6"]', act: 'takeoverPage', val: '6' }], t: 'Závěrečná otázka', co: 'Šestá stránka položí kontrolní otázku.' },
      { do: [{ sel: '[data-value="yes"]', act: 'answerCheck', val: 'yes' }], watch: '.hint.over', t: 'Špatná odpověď nic nezkazí', co: 'Pacient odpověděl „Ano, hned“ a aplikace mu vysvětlila, že zápis není zpráva do ordinace. Tlačítko „Začít“ zůstává zamčené.', proc: 'Kdyby pacient čekal, že ho někdo sleduje, čekal by na pomoc, která nepřijde.' },
      { when: function (B) { return B.training !== 'failed'; }, do: [{ sel: '[data-value="no"]', act: 'answerCheck', val: 'no' }, { sel: '[data-action="confirmUnderstanding"]', act: 'confirmUnderstanding' }], t: 'Správná odpověď a plán platí', co: 'Pacient odchází z ordinace s aktivními návyky.', dusledek: 'Od zítřka otevírá aplikaci před snídaní.' },
      { when: function (B) { return B.training === 'failed'; }, do: [{ sel: '[data-value="no"]', act: 'answerCheck', val: 'no' }], watch: '.hint.over', t: 'Správně, ale bez zaučení to nejde', co: 'Tlačítko zůstává zamčené: zaučení u sestry nebylo dokončeno, návyky nezačnou platit.', proc: 'Aplikace nedovolí začít pacientovi, který ji neumí ovládat.', dusledek: 'Dodatek pokračuje variantami kontroly: pacient rady většinou nepřijal a „nemám to doma“.' }
    ]
  },
  firstMeal: {
    intro: { t: 'První snídaně: tři kroky', co: '6. října ráno. Krok 1 je vždy inzulin, krok 2 jídlo a porce, krok 3 rada a zápis.', vsimni: 'Tlačítko „Další“ je zamčené, dokud pacient neodpoví; nic se nepíše, jen se volí.', proc: 'Odpověď na inzulin rozhoduje, které rady jsou dovolené. Proto přichází dřív, než pacient něco vidí.' },
    steps: [
      { do: [{ sel: '.insulin' }], t: 'Připomínka předepsané dávky', co: 'Nahoře je dávka, kterou lékař předepsal ke snídani (8 j.), a otázka, jestli už je inzulin píchnutý.', proc: 'Aplikace dávku nepočítá. Zobrazí ji a zeptá se, jestli byla podaná.' },
      { do: [{ sel: '[data-action="mealBefore"][data-value="7"]', act: 'mealBefore', val: '7' }], t: 'Hodnota ze senzoru: 7', co: 'Pacient se podívá do aplikace senzoru a klepne na celé číslo, které ukazuje. Žádná klávesnice, žádná desetinná čárka. NutriFee na senzor napojená není.', vsimni: 'Aplikace není napojená na výrobce senzoru. Dvě opsaná celá čísla (teď a nejvyšší po jídle) stačí k učení i k radě a přesný průběh doplní sestra na kontrole z exportu. Tlačítko Další se odemkne až po volbě, i kdyby to bylo „nemám“.', proc: 'Napojení na senzor vyžaduje souhlas výrobce a certifikaci rozhraní; opsání hodnoty ne. Přesnost na celé číslo stačí: tolerance učení je 2,5 mmol/l.' },
      { do: [{ sel: '[data-action="mealBolus"][data-value="before"]', act: 'mealBolus', val: 'before' }, { sel: '[data-action="mealStep"][data-value="2"]', act: 'mealStep', val: '2' }], t: 'Krok 2: výběr jídla', co: 'Pacient odpověděl „Ještě ne“, inzulin si ještě nepíchl. Vybírá jídlo.' },
      { do: [{ sel: '[data-bind="meal.q"]', bind: 'meal.q', val: 'kaše', type: true, live: true }], watch: '.food-grid', t: 'Hledání napsáním pár písmen', co: 'Pacient napsal „kaše“ a vidí odpovídající jídla ze seznamu asi 200 českých jídel.', vsimni: 'Pod názvy jídel zatím nic není: „neznámé“ je výchozí stav a nepíše se. Stav učení se ukáže až po prvních zápisech.', proc: 'Žádná čísla, žádná makra. Jídlo se vybírá jménem.' },
      { do: [{ sel: foodSel('Ovesná kaše s mlékem a banánem'), act: 'mealFood', val: foodId('Ovesná kaše s mlékem a banánem') }, { sel: '[data-action="mealPortion"][data-value="usual"]', act: 'mealPortion', val: 'usual' }],
        t: 'Kaše v obvyklé porci', co: 'Pacient vybral ovesnou kaši a klepl na obvyklou porci. Na obvyklou porci je nastavená jeho dávka.', vsimni: 'Porce se volí slovem (menší, obvyklá, větší), ne gramy.' },
      { do: [{ sel: '[data-action="mealStep"][data-value="3"]', act: 'mealStep', val: '3' }],
        t: 'Krok 3: co o kaši víme', co: 'Krok 3 ukáže, co aplikace o kaši ví. Zatím nic.', vsimni: '„Zatím nic neodhadujeme – zapište ho 4×.“ Žádné číslo a prstenec učení je zatím prázdný.', proc: 'Kaše je zatím neznámé jídlo, nejnižší úroveň jistoty. Odhad bez dat by byl předpověď bez opory.' },
      { do: [{ sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: '„Ano, 8 j. · píchnuto“', co: 'Zápis uložený i s potvrzením inzulinu. Dole: „Zapsáno. Až u dalšího jídla opíšete nejvyšší hodnotu, uvidíte, kam se glukóza dostala.“ Pod návyky je karta „Cesta ke kontrole“: 91 dní, známá jídla 0 z 0.', vsimni: 'Pacient vždy ví, co bude dál: u dalšího jídla výsledek, za tři měsíce kontrola.', dusledek: 'Až se několik takových zápisů shoduje, bude aplikace kaši znát.' }
    ]
  },
  firstResult: {
    intro: { t: 'Před obědem: nejvyšší hodnota po snídani', co: '6. října ve 12:10 jde pacient na oběd. V kroku 1 je nahoře inzulin k obědu a hodnota teď, dole blok k minulému jídlu: nejvyšší hodnota po snídani za první dvě hodiny a potom otázka, jestli glukóza do 4 hodin neklesla pod 4. Obojí pacient zadá čipem.', vsimni: 'Jeden pohled do aplikace senzoru na jídlo: graf ukazuje posledních 8 hodin, pacient odečte obě čísla najednou. Žádná samostatná karta po dvou hodinách, žádná notifikace.', proc: 'Vrchol do 2 hodin je totéž číslo, které pacient vidí na kartách jídel a lékař v návrhu; hodnota přesně ve 2. hodině by ho podhodnotila. Celé číslo stačí.' },
    steps: [
      { do: [{ sel: '[data-action="peakChip"][data-value="E1:12"]', act: 'peakChip', val: 'E1:12' }], t: 'Nejvyšší po snídani: 12', co: 'Glukóza stoupla ze 7 na 12, tedy o 5 mmol/l a nad cíl. Aplikace to říká věcně, bez výčitky; výsledek „Jak to dopadlo“ čeká na Dnes a kaše se tím začíná poznávat.', vsimni: 'Čipy jsou po celých mmol/l a dost velké na prst, klávesnice není potřeba.', proc: 'Chyba opsání ±0,5 je proti rozptylu těla zanedbatelná (simulace 15. 10. 2026).' },
      { do: [{ sel: '[data-action="lowChip"][data-value="E1:no"]', act: 'lowChip', val: 'E1:no' }], t: 'Na otázku „Klesla pod 4?“ odpověď Ne', co: 'Druhá otázka k minulému jídlu: pokles pod 4 do čtyř hodin. Odpověď „ano“ by se počítala jako nízká hodnota pro lékaře i pro návrh „pod cílem“.', vsimni: 'Z opsaných hodnot by jinak nikdy nevznikl podklad „pod cílem“ – ten je klinicky důležitější než „nad cílem“.', proc: 'Bezpečnost má přednost před učením.' }
    ]
  },
  week: {
    intro: { t: 'Po týdnu: co už aplikace ví', co: 'Pacient zapsal sedm snídaní a šest obědů. Tři častá jídla už aplikace zná, mezi nimi kaši a chléb se sýrem.', vsimni: 'Známé jídlo má prstenec učení s fajfkou, štítek reakce a stupnici s rozmezím vrcholů, rozdělenou na pásmo v cíli a nad cílem.' },
    steps: [
      { do: [{ sel: '.food .peak' }], t: 'Kam se po kaši glukóza dostane', co: 'Okno na stupnici ukazuje rozmezí vrcholů ze započítaných zápisů; u kaše leží vpravo od čáry cíle. Nad stupnicí stojí, kolikrát byla kaše v cíli.', vsimni: 'Zápisy jsou 4 a všechny započítané: obvyklá porce, inzulin podle plánu. Rozmezí je ze 4 zápisů a s dalšími se upřesní.', proc: 'Bez potvrzeného inzulinu nejde říct, jestli vzestup způsobilo jídlo, nebo chybějící dávka.' },
      { do: [{ sel: '.food .tag.over,.food .tag.bad' }], t: 'Reakce: častěji nad cílem', co: 'Štítek říká, jak často po jídle pacient zůstane v cíli. Kaše: málokdy, proto „častěji nad cílem“. Kdy se stupeň ukáže a jak se počítá, říká položka „Stupeň reakce“.', proc: 'Žádné známky, žádné „špatné jídlo“. Jen podíl zápisů v cíli, vztažený k pacientovým vlastním jídlům.' },
      { do: [{ sel: '[data-action="foodBack"]', act: 'foodBack' }, { sel: '[data-action="foodsSeg"][data-value="all"]', act: 'foodsSeg', val: 'all' }], watch: '.food-list', t: 'Všechna jídla', co: 'Řízek s kaší už je známý (4×), svíčkovou a rýži teprve poznáváme („Učíme se“). Je tu i jablko ze svačiny: svačina se zapisuje bez inzulinu a učí se zvlášť.', vsimni: 'V seznamu má každé jídlo jen řádek s prstencem učení, názvem a štítkem reakce. Detail jídla je na vlastní obrazovce se Zpět, aby pacient nebyl zahlcený.' }
    ]
  },
  lateMeal: {
    intro: { t: 'Pacient otevřel aplikaci až v 10:00', co: '13. října. Tři sloty dne: snídaně, oběd, večeře. Snídaně je prázdná a dopoledne končí, proto se aplikace neptá „co budete jíst“, ale „byla dnes snídaně?“.', vsimni: 'Nahoře jsou tři jídla dne se stavem. Aplikace se řídí hrubou denní dobou a tím, co je zapsané; časová okna od lékaře nejsou.', proc: 'Aplikace položí správnou otázku; pacient se vždy může opravit sám („Snídaně už byla“, „Dnes bez snídaně“).' },
    steps: [
      { list: true, do: [{ sel: '[data-action="milestoneClose"]', act: 'milestoneClose', val: function (B, S) { var m = NF.pendingMilestone(S); return m ? m.id : ''; } }, { sel: '[data-action="weekClose"]', act: 'weekClose', val: function (B, S) { var w = NF.weekSummary(S); return w ? w.id : ''; } }],
        t: 'Milník a týdenní shrnutí', co: 'Na Dnes čekala karta „jídlo poznáno“ a týdenní shrnutí; pacient obě přečetl a zavřel. Za milník děkujeme jednou, pak karta nepřekáží.', vsimni: 'Chválí se čin, ne hodnota glukózy.' },
      { do: [{ sel: '[data-action="mealRetro"]', act: 'mealRetro', val: 'breakfast' }, { sel: '[data-action="mealBolus"][data-value="as"]', act: 'mealBolus', val: 'as' }],
        t: 'Snídaně už byla, inzulin podle plánu', co: 'Pacient klepl, že snídaně už byla, a potvrdil inzulin 8 j. podle plánu. Zpětný zápis začíná stejně jako před jídlem: inzulinem.', proc: 'Zmeškané jídlo s podaným inzulinem je bezpečnostní situace; řeší ji pokyn lékaře, ne aplikace.' },
      { list: true, do: [{ sel: '[data-action="mealAt"][data-value="7.5"]', act: 'mealAt', val: '7.5' }, { sel: '[data-action="mealTime"][data-value="-15"]', act: 'mealTime', val: '-15' }, { sel: '[data-action="mealBefore"][data-value="7"]', act: 'mealBefore', val: '7' }, { sel: '[data-action="mealPeak"][data-value="8"]', act: 'mealPeak', val: '8' }, { sel: '[data-action="mealLow"][data-value="no"]', act: 'mealLow', val: 'no' }], watch: '[data-action="mealStep"][data-value="2"]',
        t: 'Časy a hodnoty ze senzoru', co: 'Pacient klepl snídani v 7:30, inzulin 15 min před ní a z grafu senzoru hodnoty: při jídle 7, nejvyšší 8, pod 4 neklesla. Díky nim bude výsledek snídaně vidět hned.', vsimni: 'Časy i hodnoty jsou volby, nic se nepíše.' },
      { do: [{ sel: '[data-action="mealStep"][data-value="2"]', act: 'mealStep', val: '2' }, { sel: foodSel('Chléb se sýrem a zeleninou'), act: 'mealFood', val: foodId('Chléb se sýrem a zeleninou') }],
        t: 'Krok 2: chléb se sýrem', co: 'V kroku 2 pacient vybral chléb se sýrem a zeleninou. Jídlo už aplikace zná z dřívějších zápisů.' },
      { do: [{ sel: '[data-action="mealPortion"][data-value="usual"]', act: 'mealPortion', val: 'usual' }, { sel: '[data-action="mealStep"][data-value="3"]', act: 'mealStep', val: '3' }],
        t: 'Po jídle jen procházka', co: 'Pacient zvolil obvyklou porci a krok 3 nabídl jedinou radu: procházku. Snědené jídlo už nezměníte a glukóza bývá zvýšená ještě 2–3 hodiny.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="walk:yes"]', act: 'mealDecide', val: 'walk:yes' }, { sel: '[data-action="mealFinish"]', act: 'mealFinish', val: 'as' }], watch: '.result',
        t: 'Procházka přijata, zápis uložen', co: 'Pacient radu přijal a zápis uložil. Na Dnes je hned výsledek snídaně.', vsimni: 'Chválí se čin, ne hodnota glukózy.' },
      { do: [{ sel: '.path' }], t: 'Jak to dopadlo a Cesta ke kontrole', co: 'Výsledek je hned, protože pacient zadal i hodnoty ze senzoru: „Snídaně · Chléb se sýrem a zeleninou, s procházkou: nejvyšší hodnota 8 mmol/l, v cíli. Díky za pokus.“ Cesta ke kontrole: 84 dní do kontroly, častých jídel známe 3 ze 4 a tkanina posledních 7 dní ukazuje, co bylo zapsáno.', vsimni: 'Výsledek je věcný a poděkování patří činu. Čísla jsou ve tvaru „X z N“, bez procent a bez známek.', proc: 'Smyčka učení se uzavírá: pacient vidí výsledek svého činu i dlouhodobý cíl.' }
    ]
  },
  advice: {
    intro: { t: 'Před píchnutím: rada k porci', co: '14. října. Pacient má hlad a chystá si větší porci kaše. Inzulin si ještě nepíchl.', vsimni: 'Rada k porci nese štítek „mění množství jídla“ a přichází jen před píchnutím.', proc: 'Dávka je klíč vyrobený na obvyklou porci. Dokud není v těle, pacient ještě může porci upravit.' },
    steps: [
      { do: [{ sel: '.advice' }], t: 'Rada „obvyklá porce“ se štítkem „mění množství jídla“', co: '„Dejte si obvyklou porci. Vaše dávka inzulinu je nastavená na obvyklé množství – větší porce ho přesáhne.“', vsimni: 'Aplikace neradí jíst méně. Radí vrátit se k obvyklému.', proc: 'Při pevné dávce je cílem stejné množství jídla každý den.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="portion:yes"]', act: 'mealDecide', val: 'portion:yes' }, { sel: '[data-action="mealDecide"][data-value="addon:yes"]', act: 'mealDecide', val: 'addon:yes' }], t: 'Pacient přijme porci i doplněk', co: 'Obě rady zezelenaly. U doplňku: „U tohoto jídla to zatím nemáme vyzkoušené. Po prvním pokusu uvidíte, jestli to pomohlo.“', vsimni: 'Každá rada nese štítek schválené položky registru.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:no"]', act: 'mealDecide', val: 'order:no' }, { sel: '[data-action="mealReason"][data-value="order:nothome"]', act: 'mealReason', val: 'order:nothome' }], t: 'Třetí radu nechá být – s důvodem', co: 'Pacient klepl na „Tentokrát ne“ a jako důvod zvolil „Nemám to doma“. Důvod je nepovinný a stojí jedno klepnutí.', proc: 'Důvody odmítnutí řeknou lékaři, jestli pacient radu nechce, nebo je rada nepraktická.' },
      { do: [{ sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Píchne si a jde jíst', co: 'Zápis je uložený s obvyklou porcí, doplňkem a odmítnutým pořadím. Dole aplikace poděkuje: „Díky za návrat k obvyklé porci. Na ni je nastavená vaše dávka.“', dusledek: 'Až u dalšího jídla opíše nejvyšší hodnotu, karta „Jak to dopadlo“ ukáže, jestli jogurt pomohl – a poděkuje za pokus.' }
    ]
  },
  afterBolus: {
    intro: { t: 'Po píchnutí: co aplikace smí a nesmí', co: '16. října. Pacient si píchl dřív, než otevřel aplikaci. Ukážeme tři případy: větší porce, menší porce a „nevím, jestli byl inzulin píchnutý“.', vsimni: 'Stejná obrazovka, tři odpovědi: jednou rada, dvakrát jen pokyn lékaře.', proc: 'Inzulin už působí, ať pacient sní cokoli; k množství smí aplikace radit jen z větší porce zpět k obvyklé.' },
    steps: [
      { when: function (B) { return B.bolus === 'bigger'; }, do: [{ sel: '.advice' }], t: 'Z větší porce zpět k obvyklé radit smíme', co: '„Dejte si obvyklou porci. Inzulin, který už máte v těle, je nastavený na obvyklé množství.“', vsimni: 'Návrat z větší porce k obvyklé vrací jídlo k dávce, která už působí. To je bezpečný směr.', proc: 'Po píchnutí jen z větší porce zpět k obvyklé; nikdy „snězte víc“.' },
      { when: function (B) { return B.bolus === 'bigger'; }, do: [{ sel: '.advice', fn: function (S) { if (S.meal) S.meal.portion = 'smaller'; } }], watch: '.hint.neutral', t: 'Druhý případ: po menší porci žádná rada k množství', co: 'Pacient zvolil menší porci a aplikace odpověděla: „Inzulin už máte v těle. Když sníte méně než obvykle, řiďte se pokynem lékaře.“', vsimni: 'Pokyn lékaře s hodnotou (změřte za 60 min) je přímo v kartě; aplikace nic nepřidává.', proc: '„Snězte víc“ by učilo jíst podle inzulinu. Co dělat, říká lékař, ne aplikace.' },
      { when: function (B) { return B.bolus === 'bigger'; }, do: [{ sel: '.hint.neutral', fn: function (S) { if (S.meal) S.meal.bolus = 'unknown'; } }], watch: '.hint.neutral', t: 'Třetí případ: „nevím“ platí jako po píchnutí', co: 'Pacient neví, jestli si už píchl. Nejistota se řeší na stranu bezpečí: rada k množství jídla se nedá; nahoře je pokyn lékaře „nevím, jestli byl inzulin píchnutý“.', vsimni: 'Doplněk k jídlu se v obou případech nenabízí; zůstává pořadí a procházka.', proc: 'Kdo neví, jestli si píchl, nedostane radu, která mění množství sacharidů.' },
      { when: function (B) { return B.bolus === 'bigger'; }, do: [{ sel: '.hint.neutral', fn: function (S) { if (S.meal) { S.meal.bolus = 'as'; S.meal.portion = 'bigger'; } } }], watch: '.advice .cert', t: 'Zpět k prvnímu případu: rady bez změny množství zůstávají', co: 'Pořadí jídla a procházka se nabízejí dál, doplněk ne – má smysl jen před píchnutím, kdy pacient jídlo ještě skládá. U pořadí je zkušenost: „Vyzkoušeno 1×: 0 z 1 v cíli“ – po pravdě.', proc: 'Tyhle rady nemění množství sacharidů. Doplněk po píchnutí by jen posunul vrchol, který dávka nekryje.' },
      { when: function (B) { return B.bolus === 'smaller'; }, do: [{ sel: '.hint.neutral' }], t: 'Po menší porci žádná rada k množství', co: '„Když sníte méně než obvykle, řiďte se pokynem lékaře ‚méně jídla než obvykle‘.“', proc: '„Snězte víc“ by učilo jíst podle inzulinu. Co dělat, říká pokyn od lékaře, ne aplikace.' },
      { when: function (B) { return B.bolus === 'unknown'; }, do: [{ sel: '.hint.neutral' }], t: '„Nevím“ platí jako po píchnutí', co: 'Nejistota se řeší na stranu bezpečí: rada k množství jídla se nedá.', proc: 'Kdo neví, jestli si píchl, nedostane radu, která mění množství sacharidů.' },
      { when: function (B) { return B.bolus !== 'bigger'; }, do: [{ sel: '.advice .cert' }], t: 'Rady bez změny množství zůstávají', co: 'Pořadí jídla a procházka se nabízejí dál. Doplněk k jídlu ne – ten má smysl jen před píchnutím.', proc: 'Tyhle rady nemění množství sacharidů.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:no"]', act: 'mealDecide', val: 'order:no' }, { sel: '[data-action="mealReason"][data-value="order:nowant"]', act: 'mealReason', val: 'order:nowant' }], t: 'Dnes bez změny pořadí', co: 'Pacient klepl „Tentokrát ne“ a důvod neuvedl. Důvod je nepovinný.' },
      { do: [{ sel: '[data-action="mealFinish"]', act: 'mealFinish', val: function (B) { return B.bolus === 'unknown' ? 'unknown' : 'as'; } }], t: 'Zápis uložen i s odmítnutím', co: 'Zápis je uložený i s odmítnutou radou. I odmítnutí je užitečný údaj pro report.', dusledek: 'Lékař na kontrole uvidí, které rady pacient nepřijímá.' }
    ]
  },
  custom: {
    intro: { t: 'Nové jídlo jen názvem', co: '18. října, oběd u maminky. „Řízek s kaší od maminky“ v seznamu není; protože se název podobá jídlu ze seznamu, aplikace se hned ujistí, že nejde o totéž jídlo.', vsimni: 'Aplikace nechce složení, úpravu ani velikost – jen název a nepovinné „Je to jako…“. Porce se zadá až při jídle.', proc: 'Učíme se z reakce těla, ne z maker. Co v jídle je, se aplikace dozví z toho, jak pacient na rady odpovídá.' },
    steps: [
      { do: [{ sel: '[data-action="mealNotSame"]', act: 'mealNotSame' }], t: 'Nové jídlo: Řízek s kaší od maminky', co: 'Hned po napsání názvu se aplikace ujistila: „Je to stejné jídlo jako „Smažený řízek s bramborovou kaší“ ve vašem seznamu?“ Pacient klepl „Ne, přidat jako nové jídlo“ a otevřela se karta nového jídla. Nic se neslučuje ani nepřepisuje.', vsimni: 'V každém okamžiku je na obrazovce jedna akce: dotaz, nebo tlačítko Přidat, nebo karta. Duplicity se spojují dotazem, ne tichým sloučením.', proc: 'Zápisy téhož jídla pod dvěma názvy by se nikdy nesešly natolik, aby ho aplikace poznala.' },
      { do: [{ sel: '[data-action="mealLike"]', act: 'mealLike', val: function (B, S) { var f = S.foods.filter(function (x) { return x.name === 'Smažený řízek s bramborovou kaší'; })[0]; return f ? f.id : 'none'; } }, { sel: '[data-action="mealSaveFood"]', act: 'mealSaveFood' }],
        t: '„Je to jako…“', co: 'Pacient nepovinně označil, že jídlo je jako smažený řízek s kaší ze seznamu, a jídlo přidal. Jen pacient ví, čemu se jídlo podobá.', proc: 'Aplikace nehádá z názvu ani ze složení.' },
      { do: [{ sel: '[data-action="mealPortion"][data-value="usual"]', act: 'mealPortion', val: 'usual' }, { sel: '[data-action="mealStep"][data-value="3"]', act: 'mealStep', val: '3' }], watch: '.peak',
        t: 'Odhad podle podobného jídla', co: 'Pacient zvolil obvyklou porci a krok 3 ukázal široké rozmezí podle smaženého řízku s kaší. Dokud aplikace jídlo nezná z vlastních zápisů, číslo „přesně“ neukáže.', vsimni: 'Čárkované okno je odhad podle jídla, které pacient sám označil. Bez klepnutí na „Je to jako…“ by aplikace zatím mlčela.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:yes"]', act: 'mealDecide', val: 'order:yes' }, { sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Rada přijata, zápis uložen', co: 'Rady jsou zatím obecné, ze schválených pravidel. Kdyby v jídle nebylo co sníst napřed, pacient klepne „Tentokrát ne · V jídle to není“ a rada se u tohoto jídla už neukáže.', dusledek: 'Známým se jídlo stane, až se jeho vlastní zápisy shodnou. První zápis je „první dojem“, druhý „zatím to vypadá“ a potom přijde „známé“.' }
    ]
  },
  illness: {
    intro: { t: 'Není mi dobře', co: '20. října. Pacientovi není dobře. Na Dnes je nahoře přepínač „Nemoc · není mi dobře“ – viditelný, ne schovaný.', vsimni: 'Přepínač je hned pod hlavičkou, velký, s popisem, co se stane.', proc: 'Nemoc oznamuje člověk. Aplikace ji nehádá z čísel.' },
    steps: [
      { do: [{ sel: '.sick .toggle', act: 'illness', val: 'on' }], watch: '.card.ill', t: 'Režim nemoci', co: 'Nahoře se objevily pokyny lékaře pro nemoc: inzulin nevysazovat, pít, měřit glukózu každé 3 h a kdy volat ordinaci.', vsimni: 'Aplikace pomáhá dál, jen jinak. Dávky platí, jak řekl lékař.', proc: 'Pacient nesmí zůstat bezradný. Klinický obsah je ale z pokynů lékaře, ne z aplikace.' }
    ]
  },
  illnessMeal: {
    intro: { t: 'Jídlo během nemoci', co: 'Pacient si chystá menší porci kaše a inzulin si píchl podle plánu.', vsimni: 'Aplikace nedá žádnou radu k jídlu, ani doplněk, ani pořadí. Ukáže jen pokyn lékaře.', proc: 'V nemoci tělo reaguje jinak; rady postavené na běžných dnech by neseděly.' },
    steps: [
      { do: [{ sel: '.hint.neutral' }], t: 'Žádná rada k jídlu', co: '„Při nemoci k jídlu neradíme; platí pokyny lékaře nahoře na Dnes.“ Ani doplněk, ani pořadí, ani procházka – jen pokyn lékaře.', proc: 'Zápisy z nemoci se štítkují a do učení nevstupují; lékař je v reportu uvidí zvlášť.' },
      { do: [{ sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Zápis uložen se štítkem nemoci', co: 'Zápis má štítek „z doby nemoci – nezapočítáno“.' }
    ]
  },
  recovery: {
    intro: { t: 'Už je mi lépe', co: '22. října. Aplikace se každý den ptá; pacient sám režim nemoci ukončí.', vsimni: function (B, S) { return 'Po ' + param(S, 'P-NEMOC', 'dny', 3) + ' dnech nemoci (práh položky „Režim nemoci“) by pacient dostal kartu s pokynem lékaře k trvání nemoci.'; }, proc: 'Lékař mezi kontrolami nic neobnovuje. Nemoc ukončuje pacient.' },
    steps: [
      { do: [{ sel: '[data-action="illnessCheck"][data-value="better"]', act: 'illnessCheck', val: 'better' }], t: '„Už je mi lépe“', co: 'Režim nemoci skončil. Rady zase platí naplno.', dusledek: 'V reportu lékař uvidí 3 dny nemoci jako oddělený pruh.' }
    ]
  },
  registry: {
    intro: { t: 'Během studie: garant upraví pravidlo', co: '23. října, funkce ostré aplikace, ne vaše dnešní schvalování. Pacient pochopil radu k pořadí tak, že jogurtem nahradil část kaše, a garant ve studii radu hned opraví; úprava v této scéně je modelová a nepočítá se jako vaše rozhodnutí.', vsimni: 'Tentýž registr, který dnes používáte ke schválení první verze, bude během studie sloužit k úpravám pravidel. Dnes rozhodujete, zda má garant tuto možnost mít a jak má vypadat.', proc: 'Nejasná rada je bezpečnostní problém. Oprava platí okamžitě, historie zůstane.' },
    steps: [
      { do: [{ sel: '.reg-side .card' }], t: 'Položka „Rada: pořadí jídla“', co: 'Panel vpravo ukazuje, co rada dělá, jaký text pacient uvidí, kde se používá a jakou má historii rozhodnutí.', vsimni: 'Pod položkou jsou tlačítka Schválit, Upravit, Zamítnout a Uložit komentář. V ostré aplikaci je bude mít garant během studie; ukázka teď klepne na „Upravit“ za něj.' },
      { do: [{ sel: '.reg-side .box', fn: function (S) { var it = NF.item(S, 'R-PORADI'); it.text = 'Snězte nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávejte – snězte ji jako obvykle.'; it.version = 'v2'; } }], watch: '.reg-side .box',
        t: 'Nové znění rady', co: 'Ukázka za garanta přepsala text pro pacienta: „…potom zbytek obvyklého jídla. Přílohu nevynechávejte.“ Nové znění brání tomu, aby pacient radou nahrazoval přílohu.', vsimni: 'V ostré aplikaci garant text upraví ve formuláři položky.' },
      { do: [{ sel: '[data-bind="form.regcomment_R-PORADI"]', bind: 'form.regcomment_R-PORADI', val: 'Upřesněn text: příloha se nevynechává.', type: true }, { sel: '.reg-side .hist', act: 'regDecide', val: 'edited' }],
        watch: '.reg-side .hist', t: 'Upraveno s komentářem', co: 'Garant připsal komentář a úpravu uložil. Položka má stav „upraveno“ a historie ukazuje, kdo ji kdy změnil a z jakého znění na jaké.', proc: 'Změna platí v aplikaci okamžitě; původní znění zůstává v historii.' }
    ]
  },
  impact: {
    intro: { t: 'Pacient vidí radu s novým textem', co: 'Další den v poledne, řízek s kaší – jídlo, které aplikace už zná.', vsimni: 'Štítek položky u rady říká „upraveno“.', proc: 'Zamítnutá položka by radu odstranila a na jejím místě by stálo „Tahle část nefunguje“.' },
    steps: [
      { do: [{ sel: '.advice .text' }], t: 'Nový text rady', co: '„…potom zbytek obvyklého jídla. Přílohu nevynechávejte.“', vsimni: 'U rady je štítek položky „upraveno“.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="order:yes"]', act: 'mealDecide', val: 'order:yes' }, { sel: '[data-action="mealFinish"][data-value="as"]', act: 'mealFinish', val: 'as' }], t: 'Rada přijata, zápis uložen', co: 'Zápis je uložený.', dusledek: 'Přeskočíme dva měsíce ke kontrole.' }
    ]
  },
  preview: {
    intro: { t: 'Den před kontrolou', co: '4. ledna. Pacient si prohlíží, co zítra uvidí lékař – poděkování za dny zapisování, co fungovalo, a otázky na lékaře na jedno klepnutí.', vsimni: 'Čísla jsou sbalená pod „Podrobnosti v číslech“; obrazovka začíná tím podstatným. Navrženou otázku stačí klepnutím vybrat.' },
    steps: [
      { do: [{ sel: '.tile[data-value="adv"]', act: 'previewTile', val: 'adv' }], watch: '.hint.neutral', t: 'Rozklik dlaždice', co: 'Pod dlaždicí se rozbalilo vysvětlení: jaká bývala nejvyšší hodnota po jídle s radou a bez ní.', proc: 'Pacient má rozumět tomu, co lékař uvidí.' },
      /* P08 (21. 10. 2026): klepne na první navrženou otázku, která na obrazovce skutečně je */
      { do: [{ sel: '[data-action="toggleQuestion"]', act: 'toggleQuestion', val: firstQuestion }], t: 'Navržená otázka na lékaře', co: 'Navržené otázky vznikají z dat pacienta (třeba inzulin jinak než podle plánu nebo dny nemoci). Pacient první vybral jedním klepnutím; vlastní otázku lze napsat jako druhou možnost.', dusledek: 'Lékař ji uvidí v podkladech kontroly.' }
    ]
  },
  reviewSummary: {
    intro: { t: 'Kontrola: krok 1 – souhrn', co: '5. ledna. Lékař klepne na „Zahájit kontrolu“ a NutriFee sestaví report a návrhy. Nahoře jsou čtyři kroky kontroly.', vsimni: 'Dlaždice mají barvu, znak i slovo; pod nimi značky položek, z nichž vycházejí.', proc: 'Lékař má pár minut. Podstatné musí být pokaždé na stejném místě a bez čtení detailů.' },
    steps: [
      { do: [{ sel: '[data-action="startReview"]', act: 'startReview' }], watch: '.tiles', t: 'Kontrola zahájena: dlaždice souhrnu', co: 'Dlaždice se semaforem ukazují čas v cíli, čas pod 3,9, HbA1c, obvyklou porci, inzulin podle plánu, přijaté rady a zápisy mimo učení. U každé je hodnota dříve a teď; při první kontrole jsou „dříve“ hodnoty z měsíce před zařazením. Pod dlaždicemi je věta „co se dělo“ ze šablony.', vsimni: 'Věta je ze šablony podle pravidel, ne z generativní AI.' },
      { do: [{ sel: '[data-action="importDemo"]', act: 'importDemo' }], watch: '.tiles', t: 'Sestra nahrála export ze senzoru', co: 'V podkladech je část „Data ze senzoru“: sestra na kontrole nahraje export z portálu výrobce (v ukázce ho vytvoří maketa: posledních 14 dní před kontrolou). Doplní průběh k zápisům, které měly jen opsané hodnoty, a noci pro bazál; čas v cíli a čas pod 3,9 jsou spočítané z tohoto souboru – karta i dlaždice uvádějí stejné období, 22. 12. – 4. 1. (14 dní).', vsimni: 'Pacient export dělat nemusí; lékař mezi kontrolami dál nic nedělá. Dlaždice „Čas v cíli“ a návrh k bazálu stojí na tomto souboru.', proc: 'Export jsou pacientova data a umí ho ten, kdo s portálem pracuje – sestra, ne pacient.' },
      { do: [{ sel: '.tile[data-value="adv"]', act: 'reviewTile', val: 'adv' }], watch: '.card.tint', t: 'Rozklik dlaždice', co: 'Sloupce ukazují medián vrcholu u jídel, kde pacient radu přijal, nepřijal nebo neodpověděl. Pod nimi je nejčastější důvod odmítnutí.', proc: 'Neutrální srovnání: pacient si sám volí, kdy radu přijme, takže to není důkaz účinku. Report neříká „neposlechl“.' },
      { do: [{ sel: 'details.part:first-of-type summary' }], t: 'Podklady jen na vyžádání', co: 'Podklady jsou sbalené: reakce na jednotlivá jídla, rady, dávky a jejich potvrzení, senzor, pokyny a otázky pacienta.', proc: 'Na první pohled vidí lékař jen to, co potřebuje; podrobnosti si rozbalí.' },
      { do: [{ sel: '.nextbar .btn.primary', act: 'reviewStep', val: '2' }], t: 'Krok 2: návrhy', co: 'Lékař pokračoval tlačítkem ve spodní liště a otevřel se krok 2 kontroly.' }
    ]
  },
  reviewProposals: {
    intro: { t: 'Krok 2 – návrhy s důvodem a postupem', co: 'Otevřený je vždy jen jeden návrh, ostatní čekají. Každý má stejné části: proč návrh vznikl, co ho oslabuje, co ověřit s pacientem, co říká postup a rozhodnutí.', vsimni: 'Karta ukazuje čas v cíli, podíl času pod cílem a HbA1c. Návrh se týká jednoho jídla dne a rozpadá se na jednotlivá jídla.', proc: 'Lékař ověří body a postup řekne, která větev platí. Jednotky volí sám.' },
    steps: [
      { when: function (B) { return B.response === 'declines'; }, do: [{ sel: '.prop.current' }], t: 'Varianta kontroly: pacient rady většinou nepřijal', co: 'Podle postupu jde jídlo před dávkou, proto místo návrhu k dávce vznikne návrh probrat nebo vyměnit radu, kterou odmítal nejčastěji.', vsimni: 'Dávka se neposuzuje, dokud pacient rady nepřijal aspoň třikrát.', proc: 'Rady k jídlu jsou vždy první páka; dávka poslední.' },
      { when: function (B) { return B.response === 'impractical'; }, do: [{ sel: '.prop.current' }], t: 'Varianta kontroly: „nemám to doma“', co: 'Pacient u rady uvedl, že ji nemá čím plnit. Vznikne návrh vyměnit radu za jinou; výměna se rozepíše po jedné a pacient radu pak neuvidí.', vsimni: 'Důvod odmítnutí rozlišuje nepraktickou radu od neochoty.', proc: 'Nepraktická rada není pacientova chyba; mění se rada, ne dávka.' },
      { do: [{ sel: '.prop.current .why' }], t: 'Proč návrh vznikl', co: 'Důvod stojí na číslech z dat: kolik čistých snídaní bylo nad cílem a kolik rad pacient přijal. Pod „Co návrh oslabuje“ jsou vyřazené zápisy.', vsimni: 'Do návrhu vstupují jen „čistá“ jídla: obvyklá porce, dávka potvrzená podle plánu, mimo nemoc.', proc: 'Bez potvrzení dávky by signál ukazoval na dávku, přestože příčina je jinde.' },
      { do: [{ sel: '[data-action="propVerifyAll"]', act: 'propVerifyAll', val: function (B, S) { var n = NF.nextProposal(S); return n ? n.id : ''; } }],
        watch: '.prop.current .verify-box', t: 'Vše sedí – body ověřené s daty', co: 'Lékař klepl „Vše sedí“. Každý bod je věta, která musí platit, a u bodu je číslo z dat. Bod o celkovém vyrovnání se vyhodnotí z času v cíli i HbA1c: čas v cíli 72 % je nad cílovými 70 %, HbA1c 55 mmol/mol je ale nad cílem 53, takže bod platí. Štítek „data říkají jinak“ dostane jen bod, kterému data odporují celý; ten „Vše sedí“ nepřepne.', vsimni: 'Kterýkoli bod lze přepnout na „nesedí“; dokud některý chybí, postup větev neukáže.', proc: 'Hromadné potvrzení nesmí přeskočit právě ten bod, u kterého data říkají opak.' },
      { when: function (B) { return B.response === 'accepts'; }, do: [{ sel: function (B, S) { var n = NF.nextProposal(S), i = n ? n.verify.map(function (_, k) { return k; }).filter(function (k) { return NF.verifyAgainst(n, k); })[0] : null; return i == null ? '.prop.current .branch' : '.prop.current [data-action="propVerify"][data-value="' + n.id + ':' + i + ':yes"]'; },
          fn: function (S) { var n = NF.nextProposal(S); if (!n) return; var v = S.review.verify[n.id] = S.review.verify[n.id] || {}; n.verify.forEach(function (_, i) { if (NF.verifyAgainst(n, i) && v[i] === undefined) v[i] = true; }); } }],
        watch: '.prop.current .branch', t: 'Postup ukáže větev', co: 'Všechny body sedí a postup ukáže větev „zvýšit“. Kdyby lékař u bodu o vyrovnání zvolil „nesedí“, postup řekne „ponechat – celkově v cíli, zvažte riziko nízké glukózy“.', vsimni: 'Rozhodnutí je lékařovo; aplikace jen ukázala, kde data říkají jinak.', proc: '„Zvýšit“ je z postupu, který schválil garant; o kolik jednotek, aplikace neurčuje.' },
      { when: function (B) { return B.response === 'accepts'; }, do: [{ sel: '.prop.current .stepper button:last-child', act: 'propUnits', val: function (B, S) { return NF.nextProposal(S).id + ':1'; } }, { sel: '.prop.current .stepper button:last-child', act: 'propUnits', val: function (B, S) { return NF.nextProposal(S).id + ':1'; } }],
        t: 'O kolik – volí lékař', co: 'Novou dávku lékař nastaví voličem. Aplikace číslo nenavrhuje, a dokud je stejné jako dnes, tlačítko „Souhlasím“ je zamčené.' },
      { do: [{ sel: '.prop.current .decide .btn.primary', act: 'propDecide', val: function (B, S) { var n = NF.nextProposal(S); return n.id + ':' + (NF.screens.proposalBranch(S, n).action === 'keep' ? 'keep' : 'agree'); } }], t: 'Souhlas zapsán, další návrh', co: 'Rozhodnutí je zapsané do stopy. Otevřel se další návrh.', vsimni: 'Jiné rozhodnutí (ponechat, zamítnout s důvodem, komentář) je pod nenápadným odkazem.' },
      { do: [{ sel: '.prop.current .bar', fn: function (S) { D.decideSingles(S, S.branches || D.defaults); } }], watch: '.prop.group',
        t: 'Zbývající návrhy', co: 'Lékař rozhodl i ostatní návrhy, kde se něco mění (rady k obědu před dávkou).', proc: 'Návrh „vyměnit radu“ má skutečný účinek: plán nese vypnuté a nahrazené rady a jádro je podle toho nabízí.' },
      { do: [{ sel: '[data-action="propKeepAll"]', act: 'propKeepAll' }], watch: '.nextbar',
        t: 'Beze změny jedním klepnutím', co: 'Návrhy, které nic nemění (zachovat radu, pokyny pro pacienta beze změny), jsou jedna karta. Jedno potvrzení, každá položka se přesto zapíše do stopy zvlášť. Spodní lišta se odemkla.', proc: 'Lékař rozhoduje jen o tom, co se mění. Kontrola je tak zhruba 10 klepnutí místo 30.' }
    ]
  },
  reviewConfirm: {
    intro: { t: 'Krok 3 – potvrzení plánu', co: 'Lékař vidí shrnutí rozhodnutí a nový plán: změněné dávky zvýrazněné, návyky a pokyny. Plán vydá jedním tlačítkem.', vsimni: 'U změněné dávky je stará hodnota přeškrtnutá a vedle ní nová; u rad je stav „vypnuto“ nebo „nabízet přednostně“.', proc: 'Vydání nejde vzít zpět, proto mu předchází shrnutí a jedna věta o tom, co se stane.' },
    steps: [
      { do: [{ sel: '.nextbar .btn.primary', act: 'issueP2' }], t: 'Plán P2 vydán', co: 'Plán je vydaný. Po změně dávky začne učení k radám u jídel znovu.', dusledek: 'Pacient uvidí, co se změnilo a proč.' }
    ]
  },
  reviewHandover: {
    intro: { t: 'Krok 4 – předání pacientovi', co: 'Vpravo je náhled telefonu, na kterém pacient vidí změny a důvody lékaře. Tím kontrola končí.', vsimni: 'Tlačítko „Ukázat pacientovi“ jen přepne náhled; nic se neodesílá.', proc: 'Lékař do příští kontroly nic nedělá.' },
    steps: [{ do: [{ sel: '.phone-preview' }], t: 'Co pacient uvidí', co: 'Pacient uvidí změněné dávky s větou „Nová dávka: učíme se znovu“, případně „radu X vám už nenabízíme – lékař ji vypnul“, a pod rozbalením „Proč lékař rozhodl takto“.' }]
  },
  newplan: {
    intro: { t: 'Pacient: nový plán', co: 'Pacient vidí, co se změnilo a proč, a nový plán převezme tlačítkem „Rozumím, pokračuji“.', vsimni: 'U změněné dávky stojí věta „učíme se znovu“, u vypnuté rady věta, že ji lékař vypnul. Slovo „garant“ pacient nevidí.', proc: 'Pacient se nemá dozvědět, kdo pravidla schvaluje; má vědět, co se změnilo a proč.' },
    steps: [{ do: [{ sel: '[data-action="confirmUnderstanding"]', act: 'confirmUnderstanding' }], t: 'Rozumím, pokračuji', co: 'Nový plán platí. Smyčka se uzavřela: lékař vydal plán, pacient ho plnil, aplikace se učila a radila, lékař viděl, jestli s radou bývalo níž, a NutriFee mu navrhla další krok.', vsimni: 'Pacient potvrzuje převzetí jedním tlačítkem; „Proč lékař rozhodl takto“ je pod rozbalením.', proc: 'Převzetí je akce pacienta: plán platí, až když ho vzal na vědomí.' }]
  },
  trace: {
    intro: { t: 'Co jsme viděli a co potřebujeme od vás', co: 'Dávku určuje jen lékař. Pacient drží obvyklou porci, aplikace se učí z jeho jídel. Lékař na kontrole jen schvaluje; každé pravidlo je položka registru a stopa ji dokládá. Provozní pravidla (formát exportu ze senzoru, texty obrazovek, zaučení) schválil vlastník aplikace a v registru je nenajdete. K maketě patří i návrh účelu určení a osnova ochrany dat; pošleme je zvlášť.', vsimni: 'Stopa zaznamenává každý výpočet, radu, návrh a rozhodnutí i s jejich vstupy a výstupy.', proc: 'Dokládá, že do výpočtů nezasahuje generativní AI a že je vše dohledatelné.' },
    steps: [{ do: [{ sel: 'table' }], t: 'Stopa a výzva', co: 'Každý krok aplikace má ve stopě řádek: „Rada zobrazena“, „Návrh rozhodnut“, „Rozhodnutí o položce registru“. Tlačítko „Data“ rozbalí přesné vstupy.', vsimni: 'Od vás potřebujeme: rozhodnout položky registru (schválit, upravit, zamítnout, okomentovat). Rozhodnutí se ukládají průběžně, nic nemusíte posílat, a kdykoli je můžete změnit. Jsou neformální – pro ostrý provoz se vše podepisuje znovu.', dusledek: 'Hlavní linie končí. Dál je dodatek: zaučení se nezdařilo, pacient rady nepřijal, „nemám to doma“.' }]
  }
};

T.stepsFor = function (id, B) { var ch = T.chapters[id]; if (!ch) return []; return ch.steps.filter(function (s) { return !s.when || s.when(B || D.defaults); }); };

})(typeof window !== 'undefined' ? window : globalThis);
