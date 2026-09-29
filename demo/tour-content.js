/* Automatický průchod maketou — obsah. Součást demonstrační vrstvy.
   U každé kapitoly: úvod scény a kroky, které tlačítko „Další“ postupně odehraje
   za lékaře, sestru nebo pacienta. Každý krok má vyprávění:
     co      — co se právě děje
     vsimni  — čeho si má divák všimnout
     proc    — proč je to navržené takhle
     dusledek — co z toho plyne dál
   Operace (do):
     { sel, act, val }        klik na prvek a spuštění akce aplikace
     { sel, bind, val, type } vyplnění pole (type: true = postupné psaní)
     { sel }                  jen zvýraznění prvku
     { fn }                   krok, který v aplikaci proběhne bez klepnutí uživatele
   when(B) — krok platí jen pro danou odbočku příběhu. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo;
var T = D.tour = {};

var R = D.retireReasons, RS = D.resumeReasons;
function resumeReason(B) { return B.disruption === 'illness' ? RS[0] : RS[1]; }

T.chapters = {

  /* ================= Dějství 1 — V ordinaci ================= */
  enroll: {
    intro: {
      t: 'Ordinace, 5. října. Lékař zařazuje pacienta',
      co: 'Pacient s diabetem 2. typu sedí u lékaře. Dostal senzor glukózy a lékař zvažuje, jestli mu NutriFee pomůže.',
      vsimni: 'Na obrazovce není jediné pole, do kterého by se psalo. Všechno, co lékař o pacientovi ví, je už na kartě.',
      proc: 'Lékař nemá na kontrole čas psát texty. Kdyby zařazení znamenalo přepisovat údaje, aplikace by mu práci přidala.'
    },
    steps: [
      { do: [{ sel: '.plan-basics' }],
        t: 'Lékař si prohlédne kartu pacienta',
        co: 'Diagnóza, léčba, režim inzulinu, senzor a poslední HbA1c se načetly z karty.',
        vsimni: 'Řádek „Jen inzulin — bez perorálních antidiabetik“ a „pevné dávky“.',
        proc: 'Celý návrh stojí na tom, že dávka inzulinu k jídlu je pevná. Jen tehdy má smysl učit se z toho, jak glukóza reaguje na jídlo.' },
      { do: [{ sel: '[data-action="setCompensation"][data-value="insufficient"]', act: 'setCompensation', val: 'insufficient' }],
        t: 'Lékař označí kompenzaci jedním klepnutím',
        co: 'Lékař zvolil „nedostatečná kompenzace“.',
        vsimni: 'Je to jen jedno tlačítko, žádný text.',
        proc: 'Lékař to o pacientovi ví dřív, než se posadí. Aplikace z toho nic nepočítá.',
        dusledek: 'Označení se objeví v reportu na příští kontrole jako výchozí stav.' },
      { do: [
          { sel: '[data-action="eligibility"][data-value="adult"]', act: 'eligibility', val: 'adult' },
          { sel: '[data-action="eligibility"][data-value="insulinOnly"]', act: 'eligibility', val: 'insulinOnly' },
          { sel: '[data-action="eligibility"][data-value="regimen"]', act: 'eligibility', val: 'regimen' },
          { sel: '[data-action="eligibility"][data-value="cgm"]', act: 'eligibility', val: 'cgm' }],
        watch: '.eligibility + .hint',
        t: 'Lékař potvrdí čtyři podmínky zařazení',
        co: 'Dospělý s DM2, jen inzulin, pevné dávky ke třem jídlům, senzor. Lékař je postupně odškrtl.',
        vsimni: 'Dokud nebyly odškrtnuté všechny čtyři, tlačítko „Pokračovat k plánu“ nešlo použít. Teď se objevilo zelené potvrzení.',
        proc: 'Pacientovi, který má flexibilní dávky nebo tablety na diabetes, by rady postavené na pevné dávce nesedily.',
        dusledek: 'Pacient patří do první skupiny studie a lékař může připravit plán.' },
      { do: [{ sel: '.wizard-footer [data-action="wizardGo"][data-value="1"]', act: 'wizardGo', val: '1' }],
        t: 'Lékař pokračuje k plánu',
        co: 'Otevřel se druhý krok: výběr úkolu a vydání plánu.',
        dusledek: 'V další kapitole lékař vybere úkol z katalogu.' }
    ]
  },

  plan: {
    intro: {
      t: 'Lékař vybírá úkol z katalogu',
      co: 'Úkoly jsou připravené předem. Každý má hotovou otázku pacienta a odhad, kolik práce pacientovi dá.',
      vsimni: 'U každého úkolu je uvedené pravidlo, na kterém stojí, a jestli ho garant schválil.',
      proc: 'Ručně psané úkoly by nešlo porovnat napříč studií a nikdo by je neschválil.'
    },
    steps: [
      { do: [{ sel: '.module-option:disabled' }],
        t: 'Jeden úkol vybrat nejde',
        co: '„Procházka po večeři“ je v katalogu vidět, ale je zašedlá.',
        vsimni: 'U úkolu stojí „návrh — čeká na schválení garantem“.',
        proc: 'Garant zatím neurčil, jaký pohyb po píchnutí inzulinu je bezpečný. Neschválené pravidlo se k pacientovi nesmí dostat ani omylem — proto ho nejde ani vybrat.' },
      { do: [{ sel: '.module-option.chosen', act: 'selectTask', val: 'T-SNIDANE' }],
        watch: '.plan-proposal',
        t: 'Lékař vybere „Snídaně: aplikace se učí a radí“',
        co: 'Pod katalogem se ukázal vybraný úkol a co bude pacient dělat.',
        vsimni: 'Otázka pacienta je součástí úkolu. Lékař ji nepíše.',
        dusledek: 'Pacient bude před snídaní zapisovat jídlo a aplikace se z toho bude učit.' },
      { do: [{ sel: '[data-bind="draft.medicationChecked"]', bind: 'draft.medicationChecked', val: true }],
        t: 'Lékař potvrdí seznam léčby',
        co: 'Odškrtl, že pacient bere jen inzulin a žádné tablety na diabetes.',
        vsimni: 'Dávky inzulinu jsou na obrazovce jen jako text z karty.',
        proc: 'NutriFee dávku nikdy nepočítá, nenavrhuje ani nemění. To je první neporušitelné pravidlo celé aplikace.' },
      { do: [{ sel: '[data-bind="draft.safetyChecked"]', bind: 'draft.safetyChecked', val: true }],
        watch: '.wizard-body .hint.success',
        t: 'Lékař potvrdí, že předal bezpečnostní plán',
        co: 'Poslední podmínka je splněná. Upozornění na chybějící náležitosti zmizelo.',
        proc: 'Aplikace radí k jídlu. Co dělat při nízké glukóze, musí mít pacient od lékaře dřív, než dostane první radu.' },
      { do: [{ sel: '[data-action="issuePlan"]', act: 'issuePlan' }],
        t: 'Lékař vydá plán',
        co: 'Plán P1 je vydaný a obrazovka se přepnula k sestře.',
        vsimni: 'Lékař nic nezaučuje. Rozhodl a vydal plán — edukaci dělá sestra.',
        dusledek: 'Úkol ale ještě neplatí. Začne platit až po zaučení a kontrolní otázce.' }
    ]
  },

  training: {
    intro: {
      t: 'Sestra zaučuje pacienta a předává zařízení',
      co: 'Sestra vidí, jaký plán lékař vydal, a s pacientem projde konkrétní úkony.',
      vsimni: 'Seznam nejsou otázky „rozumíte tomu?“, ale věci, které pacient opravdu udělal.',
      proc: 'Zaučení, které se dá odškrtnout bez obsahu, by nic nezaručilo.'
    },
    steps: [
      { do: [{ sel: '.next-step' }],
        t: 'Senzor je jen simulovaný',
        co: 'Obrazovka říká přímo, že připojení senzoru je v ukázce jen naznačené.',
        proc: 'Maketa nesmí vzbudit dojem, že propojení se senzorem existuje.' },
      { do: [
          { sel: '[data-action="trainingStep"][data-value="app"]', act: 'trainingStep', val: 'app' },
          { sel: '[data-action="trainingStep"][data-value="record"]', act: 'trainingStep', val: 'record' },
          { sel: '[data-action="trainingStep"][data-value="bolus"]', act: 'trainingStep', val: 'bolus' },
          { sel: '[data-action="trainingStep"][data-value="safety"]', act: 'trainingStep', val: 'safety' },
          { sel: '[data-action="trainingStep"][data-value="contacts"]', act: 'trainingStep', val: 'contacts' }],
        t: 'Sestra odškrtává, co pacient zvládl',
        co: 'Pacient našel úkol, zapsal zkušební jídlo, našel bezpečnostní plán a ví, kam volat.',
        vsimni: 'Třetí bod: pacient ví, že se ho aplikace před každou radou zeptá, jestli si už píchl inzulin k jídlu.',
        proc: 'Ta otázka je jediné, co stojí mezi radou a nízkou glukózou. Pacient ji musí znát předem.' },
      { when: function (B) { return B.training !== 'failed'; },
        do: [{ sel: '[data-action="finishTraining"][data-value="done"]', act: 'finishTraining', val: 'done' }],
        watch: '.card .hint.success',
        t: 'Sestra potvrdí dokončené zaučení',
        co: 'Zaučení je zaznamenané na sestru s časem.',
        dusledek: 'Pacient teď převezme plán a odpoví na kontrolní otázku.' },
      { when: function (B) { return B.training === 'failed'; },
        do: [{ sel: '[data-action="finishTraining"][data-value="failed"]', act: 'finishTraining', val: 'failed' }],
        watch: '.card .hint.warn',
        t: 'Zaučení se nezdařilo',
        co: 'Sestra zaznamenala, že si pacient ovládáním zatím není jistý.',
        vsimni: 'Plán je vydaný, ale úkol pacientovi nezačne platit a pacient se nepočítá mezi zařazené.',
        dusledek: 'V této odbočce příběh dál nepokračuje — pacienta čeká nové zaučení.' }
    ]
  },

  handover: {
    intro: {
      t: 'Pacient přebírá plán',
      co: 'Pacient poprvé vidí svůj plán v telefonu.',
      vsimni: 'Horní proužek ukazuje, který plán platí a do kdy.'
    },
    steps: [
      { do: [{ sel: '.plan-basics' }],
        t: 'Kdo plán vydal a do kdy platí',
        co: 'Pacient vidí lékaře, datum začátku a konec platnosti.',
        proc: 'Rady se vážou k platnému plánu. Pacient má vždy vědět, z čeho aplikace vychází.' },
      { do: [{ sel: '.card .hint' }],
        t: 'Hranice služby',
        co: 'NutriFee pacienta průběžně nesleduje, nic neposílá do ordinace a samo na nebezpečné hodnoty neupozorní.',
        proc: 'Pacient nesmí čekat pomoc, která nepřijde. Upozornění dává aplikace výrobce senzoru.' },
      { do: [{ sel: '[data-action="page"][data-value="understand"]', act: 'page', val: 'understand' }],
        t: 'Pacient potvrdí převzetí',
        co: 'Otevřela se kontrolní otázka.',
        dusledek: 'Převzetí samo úkol nespustí. Nejdřív se ověří, že pacient rozumí hranicím služby.' }
    ]
  },

  understanding: {
    intro: {
      t: 'Jedna kontrolní otázka',
      co: '„Znamená zápis v aplikaci, že ho lékař hned uvidí?“',
      proc: 'Kdyby si pacient myslel, že ho někdo sleduje, mohl by čekat na reakci, která nepřijde.'
    },
    steps: [
      { do: [{ sel: '[data-action="answerCheck"][data-value="yes"]', act: 'answerCheck', val: 'yes' }],
        watch: '.card .hint',
        t: 'Co se stane při špatné odpovědi',
        co: 'Pacient odpověděl „Ano“. Aplikace mu vysvětlila, že zápis není zpráva do ordinace.',
        vsimni: 'Nikdo pacienta nehodnotí. Může se vrátit a odpovědět znovu. Tlačítko „Hotovo“ zatím nejde použít.' },
      { do: [
          { sel: '[data-action="answerCheck"][data-value="reset"]', act: 'answerCheck', val: 'reset' },
          { sel: '[data-action="answerCheck"][data-value="no"]', act: 'answerCheck', val: 'no' }],
        watch: '.card .hint.success',
        t: 'Pacient odpoví správně',
        co: 'Odpověď „Ne“ je správná. Tlačítko „Hotovo“ je teď aktivní.',
        vsimni: 'Pod otázkou jsou oddělené dvě cesty pomoci: technická podpora a zdravotní kontakt.' },
      { do: [{ sel: '[data-action="confirmUnderstanding"]', act: 'confirmUnderstanding' }],
        t: 'Úkol začíná platit',
        co: 'Pacient odchází z ordinace s aktivním úkolem.',
        dusledek: 'Od zítřka bude před snídaní otevírat aplikaci. Tím začíná dějství 2.' }
    ]
  },

  /* ================= Dějství 2 — Doma: aplikace se učí ================= */
  firstMeal: {
    intro: {
      t: 'První snídaně doma',
      co: '6. října ráno. Pacient se chystá snídat a otevře aplikaci.',
      vsimni: 'U všech jídel stojí „Neznámé jídlo · zapsáno 0×“. Aplikace o pacientovi zatím nic neví.',
      proc: 'Aplikace se učí jen z pacientových vlastních dat. Na začátku žádná nemá, a tak si nic nevymýšlí.'
    },
    steps: [
      { do: [{ sel: '[data-action="mealFood"][data-value="kase"]', act: 'mealFood', val: 'kase' }],
        watch: '.level-card',
        t: 'Pacient vybere ovesnou kaši',
        co: 'Aplikace ukáže, co o jídle ví: nic.',
        vsimni: '„Proto nic neodhadujeme.“ Žádné číslo, žádný odhad vzestupu glukózy.',
        proc: 'To je třetí úroveň jistoty — neznámé jídlo. Odhad bez dat by byl předpověď bez opory.' },
      { do: [{ sel: '[data-action="mealBolus"][data-value="before"]', act: 'mealBolus', val: 'before' }],
        t: 'Aplikace se ptá na inzulin',
        co: 'Pacient odpověděl, že inzulin k jídlu si ještě nepíchl.',
        vsimni: 'Radu nedostal — k neznámému jídlu v obvyklé porci aplikace nemá co říct.',
        proc: 'Na inzulin se aplikace ptá před každou radou, i když pak žádnou nedá. Pacient si otázku zvykne brát jako součást každého jídla.' },
      { do: [
          { sel: '[data-action="mealInsulin"][data-value="per-plan"]', act: 'mealInsulin', val: 'per-plan' },
          { sel: '[data-bind="meal.insulinTime"]', bind: 'meal.insulinTime', val: '07:05', type: true }],
        t: 'Pacient zapíše inzulin a čas',
        co: 'Zvolil „Podal jsem podle plánu“ a napsal čas 07:05.',
        vsimni: 'Popis jídla je předvyplněný. Pacient ho může upravit, ale nemusí nic psát.',
        proc: 'Bez údaje o inzulinu by se zápis nemohl započítat do učení.' },
      { do: [{ sel: '[data-action="saveMeal"]', act: 'saveMeal' }],
        t: 'Jídlo je uložené',
        co: 'Aplikace uložila zápis a senzor k němu doplnil průběh glukózy.',
        vsimni: 'V přehledu „Moje jídla“ je kaše zapsaná 1× a pruh učení je na třetině.',
        dusledek: 'Po třech zápisech se všemi údaji bude aplikace kaši znát.' }
    ]
  },

  learning: {
    intro: {
      t: 'O týden později: co už aplikace ví',
      co: '12. října večer. Pacient za týden zapsal sedm snídaní — kaši a chléb se sýrem.',
      vsimni: 'Obě jídla mají štítek „Známé jídlo“.',
      proc: '„Aplikace se učí“ musí být vidět, ne jen slíbené. Proto je u každého jídla počet zápisů.'
    },
    steps: [
      { do: [{ sel: '.food-list li' }],
        t: 'Kaše: zapsaná 4×, započítaná 3×',
        co: 'U kaše aplikace ví, že po obvyklé porci glukóza stoupne přibližně o 4,7 mmol/l.',
        vsimni: 'Zápisů jsou čtyři, ale započítané jen tři.',
        proc: 'Jeden zápis nemá údaj o inzulinu — pacient zvolil „nevím“. Bez něj nejde říct, jestli vzestup způsobilo jídlo, nebo chybějící inzulin.' },
      { do: [{ sel: '.food-list li:nth-child(2)' }],
        t: 'Chléb se sýrem stoupá méně',
        co: 'Po chlebu se sýrem glukóza stoupá přibližně o 2,5 mmol/l.',
        vsimni: 'Obě jídla mají podobně sacharidů, a přesto reagují jinak.',
        dusledek: 'Právě takové rozdíly aplikace využije k radám: u kaše bude mít co doporučit.' },
      { do: [{ sel: '.tag.warn' }],
        t: 'Nezapočítaný zápis zůstává vidět',
        co: 'Zápis bez údaje o inzulinu má štítek „chybí údaj — nezapočítáno“.',
        proc: 'Nic se nemaže a chybějící údaj se nepřepisuje na nulu. Pacient i lékař vidí, z čeho aplikace vychází.' }
    ]
  },

  /* ================= Dějství 3 — Rada před jídlem ================= */
  advice: {
    intro: {
      t: 'Rada před inzulinem',
      co: '14. října. Pacient má hlad a chystá si větší porci kaše, než je obvyklé.',
      vsimni: 'Kaše je teď „Známé jídlo“ a aplikace ukazuje graf posledních průběhů glukózy.',
      proc: 'Tohle je první úroveň jistoty: známé jídlo. Aplikace říká, co se stalo minule — jako minulost, ne jako předpověď.'
    },
    steps: [
      { do: [{ sel: '.level-card' }],
        t: 'Co aplikace o kaši ví',
        co: 'Po obvyklé porci stoupne glukóza přibližně o 4,7 mmol/l. Pod tím je pravidlo, podle kterého se to počítá, i s verzí.',
        proc: 'Každý výpočet musí pocházet ze schváleného pravidla a na obrazovce musí být vidět, ze kterého.' },
      { do: [{ sel: '[data-action="mealBolus"][data-value="before"]', act: 'mealBolus', val: 'before' }],
        watch: '.advice-list',
        t: 'Pacient ještě nemá inzulin — objeví se rady',
        co: 'Aplikace nabídla tři rady: obvyklou porci, doplněk k jídlu a pořadí jídla.',
        vsimni: 'Rada k porci má žlutý štítek „mění množství sacharidů — jen před inzulinem“. U každé rady je její pravidlo a stav „schváleno garantem“.',
        proc: 'Radu, která mění množství sacharidů, smí aplikace dát jen před píchnutím inzulinu k jídlu. Po píchnutí už je dávka daná.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="portion:yes"]', act: 'mealDecide', val: 'portion:yes' }],
        t: 'Pacient přijme obvyklou porci',
        co: 'Rada „Dej si obvyklou porci“ se podbarvila zeleně.',
        vsimni: 'Aplikace neradí jíst méně. Radí vrátit se k obvyklému množství.',
        proc: 'Při pevné dávce je cílem stejné množství sacharidů každý den. „Dej si menší porci“ by při stejné dávce mohlo vést k nízké glukóze.' },
      { do: [{ sel: '[data-action="mealDecide"][data-value="addon:yes"]', act: 'mealDecide', val: 'addon:yes' }],
        t: 'Pacient přidá jogurt',
        co: 'Přijal radu přidat bílý jogurt nebo ořechy.',
        vsimni: '„U tohoto jídla jsi to ještě nezkoušel.“ Aplikace zatím neví, jestli to u něj zabere.',
        dusledek: 'Po tomhle zápisu už to vědět bude.' },
      { do: [
          { sel: '[data-action="mealDecide"][data-value="order:no"]', act: 'mealDecide', val: 'order:no' },
          { sel: '[data-action="mealReason"][data-value="order:nothome"]', act: 'mealReason', val: 'order:nothome' }],
        t: 'Třetí radu pacient nechá být',
        co: 'U pořadí jídla zvolil „Tentokrát ne“ a jako důvod „Nemám to doma“.',
        vsimni: 'Důvod není povinný. Je to jedno klepnutí.',
        proc: 'Důvody odmítnutí pomohou lékaři poznat, jestli pacient radu nechce, nebo jestli je rada nepraktická.' },
      { do: [
          { sel: '[data-action="mealInsulin"][data-value="per-plan"]', act: 'mealInsulin', val: 'per-plan' },
          { sel: '[data-bind="meal.insulinTime"]', bind: 'meal.insulinTime', val: '07:05', type: true },
          { sel: '[data-action="saveMeal"]', act: 'saveMeal' }],
        t: 'Pacient si píchne inzulin a uloží jídlo',
        co: 'Zápis je uložený i s tím, které rady pacient přijal a kterou ne.',
        vsimni: 'Porce se v zápisu změnila na obvyklou, protože pacient radu přijal.',
        dusledek: 'Za dvě hodiny dorazí data ze senzoru a aplikace se dozví, jestli jogurt pomohl.' }
    ]
  },

  afterBolus: {
    intro: {
      t: 'Rada po inzulinu',
      co: '16. října. Pacient spěchal: nejdřív si píchl inzulin, pak otevřel aplikaci. Chystá si zase větší porci kaše.',
      vsimni: 'Na otázku „Už sis píchl inzulin?“ je už odpovězeno.',
      proc: 'Tohle je situace, kvůli které se aplikace na inzulin ptá. Rada k porci teď může být nebezpečná.'
    },
    steps: [
      { do: [{ sel: '.bolus-q' }],
        t: 'Odpověď na otázku o inzulinu',
        co: 'Pacient odpověděl „Už ano“ (nebo v odbočce „Nevím“).',
        vsimni: 'Při „Nevím“ se aplikace chová, jako by inzulin už byl píchnutý.',
        proc: 'Nejistota se řeší na stranu bezpečí. Kdo neví, jestli si píchl, nedostane radu, která mění množství sacharidů.' },
      { do: [{ sel: '.hint.warn' }],
        t: 'Rada k porci se nedává',
        co: 'Místo rady k porci je vysvětlení, proč ji aplikace teď nedává.',
        vsimni: 'Aplikace neradí ani „dej si méně“, ani „dej si obvyklou porci“. Odkazuje jen na bezpečnostní plán.',
        proc: 'Po píchnutí je dávka daná. Jakákoli rada k množství sacharidů by už byla zásahem do léčby.' },
      { do: [{ sel: '.advice-list' }],
        t: 'Rady bez sacharidů zůstávají',
        co: 'Doplněk k jídlu a pořadí jídla se nabízejí i po inzulinu.',
        vsimni: 'U doplňku už je vidět zkušenost: „Zkusil jsi to 1×. Glukóza ti tehdy stoupla přibližně o 3,1 mmol/l, bez toho obvykle o 4,7 mmol/l.“',
        proc: 'Tyhle rady nemění množství sacharidů, a tak jsou bezpečné kdykoli. A aplikace se z předchozího zápisu už naučila, že jogurt u kaše pomáhá.' },
      { do: [
          { sel: '[data-action="mealDecide"][data-value="addon:no"]', act: 'mealDecide', val: 'addon:no' },
          { sel: '[data-action="mealReason"][data-value="addon:nothome"]', act: 'mealReason', val: 'addon:nothome' },
          { sel: '[data-action="mealDecide"][data-value="order:no"]', act: 'mealDecide', val: 'order:no' }],
        t: 'Dnes pacient nepřijme nic',
        co: 'Jogurt nemá doma a pořadí dnes neřeší.',
        proc: 'I odmítnutí je užitečný údaj. Na kontrole se ukáže, jak glukóza stoupala, když rady přijal, a když ne.' },
      { when: function (B) { return B.bolus !== 'unknown'; },
        do: [
          { sel: '[data-bind="meal.insulinTime"]', bind: 'meal.insulinTime', val: '07:25', type: true },
          { sel: '[data-action="saveMeal"]', act: 'saveMeal' }],
        t: 'Pacient uloží jídlo',
        co: 'Zápis je uložený i s odmítnutými radami.',
        dusledek: 'Tenhle zápis se do učení započítá — údaj o inzulinu i data ze senzoru jsou kompletní.' },
      { when: function (B) { return B.bolus === 'unknown'; },
        do: [
          { sel: '[data-action="mealInsulin"][data-value="unknown"]', act: 'mealInsulin', val: 'unknown' },
          { sel: '[data-action="saveMeal"]', act: 'saveMeal' }],
        t: 'Pacient uloží jídlo s „nevím“',
        co: 'Zápis je uložený, ale bez údaje o inzulinu.',
        dusledek: 'Do učení se nezapočítá. Zůstane ale vidět pacientovi i lékaři.' }
    ]
  },

  similar: {
    intro: {
      t: 'Nové jídlo, podobné známému',
      co: '19. října. Pacient si poprvé dává müsli s jogurtem a medem.',
      vsimni: 'Müsli má štítek „Podobné jídlo“, i když ho pacient ještě nikdy nezapsal.',
      proc: 'Tohle je druhá úroveň jistoty. Aplikace jídlo nezná, ale podobá se jinému, které zná.'
    },
    steps: [
      { do: [{ sel: '.level-card' }],
        t: 'Směr ano, číslo ne',
        co: '„Podobá se jídlům, po kterých ti glukóza stoupá víc. Nejvíc se podobá jídlu: ovesná kaše.“',
        vsimni: 'Žádné číslo. Jen směr.',
        proc: 'Podobnost se počítá z obsahu porce (sacharidy, bílkoviny, tuk, vláknina) a formy, ne z názvu. Číslo by u jídla, které pacient nikdy nejedl, vypadalo jako předpověď — a na tu aplikace nemá data.' },
      { do: [{ sel: '[data-action="mealBolus"][data-value="before"]', act: 'mealBolus', val: 'before' }],
        watch: '.advice-list',
        t: 'Obecné rady ze schválených pravidel',
        co: 'Aplikace nabídla doplněk a pořadí jídla.',
        vsimni: '„Obecná rada ze schváleného pravidla. Jak zabere právě u tebe, zatím nevíme.“',
        proc: 'U podobného jídla aplikace nemá vlastní zkušenost pacienta. Říká to otevřeně.' },
      { do: [
          { sel: '[data-action="mealDecide"][data-value="addon:yes"]', act: 'mealDecide', val: 'addon:yes' },
          { sel: '[data-action="mealInsulin"][data-value="per-plan"]', act: 'mealInsulin', val: 'per-plan' },
          { sel: '[data-bind="meal.insulinTime"]', bind: 'meal.insulinTime', val: '07:00', type: true },
          { sel: '[data-action="saveMeal"]', act: 'saveMeal' }],
        t: 'Pacient přidá jogurt a uloží jídlo',
        co: 'Müsli je teď zapsané 1×.',
        dusledek: 'Po třech zápisech se z „podobného“ stane „známé“ jídlo s vlastním číslem.' },
      { do: [{ sel: '.food-list' }],
        t: 'Přehled po dvou týdnech',
        co: 'U kaše je teď i řádek „Co pomohlo“: doplněk, kolikrát ho pacient zkusil a o kolik glukóza stoupla.',
        proc: 'Tohle je jádro celé aplikace: učí se z vlastních dat pacienta, co u něj funguje.' }
    ]
  },

  /* ================= Dějství 4 — Když něco nesedí ================= */
  unclear: {
    intro: {
      t: 'Něco nesedí',
      co: '20. října. Senzor od půl deváté neposlal žádná data a pacientovi není dobře.',
      vsimni: 'Pacient vybírá, čeho se jeho problém týká. Aplikace to netřídí sama podle čísel.',
      proc: 'Každá cesta má jiného adresáta: otázka na kontrolu, problém teď, nebo nemoc.'
    },
    steps: [
      { do: [{ sel: '[data-action="unclear"][data-value="now"]', act: 'unclear', val: 'now' }],
        watch: '.card .hint',
        t: 'Problém právě teď',
        co: 'Aplikace posílá pacienta do bezpečnostního a kontaktního plánu.',
        proc: 'Aplikace sama nic neřeší a nikomu nic neposílá. Postup dodává lékař.' },
      { do: [{ sel: '[data-action="page"][data-value="safety"]', act: 'page', val: 'safety' }],
        t: 'Bezpečnostní plán',
        co: 'Sekce pro nízkou glukózu, snědení menší porce, nemoc, vysoké hodnoty i akutní situaci.',
        vsimni: 'Konkrétní hodnoty a postupy doplní garant. Aplikace sama žádné nepřidává.',
        dusledek: 'Plán je dostupný vždy, i bez připojení k internetu.' }
    ]
  },

  disruption: {
    intro: {
      t: 'Nemoc, nebo výpadek dat',
      co: 'V hlavní lince pacient oznamuje nemoc. V panelu prezentujícího lze místo toho zvolit tři varianty výpadku dat.',
      proc: 'Nemoc oznamuje člověk. Aplikace ji sama nepozná a nehádá ji z čísel.'
    },
    steps: [
      { when: function (B) { return B.disruption === 'illness'; },
        do: [{ sel: '[data-action="reportIllness"]', act: 'reportIllness' }],
        watch: '.card .hint.warn',
        t: 'Pacient oznámí nemoc',
        co: 'Nemoc je označená od tohoto okamžiku. Úkol se pozastavil.',
        vsimni: 'Aplikace přestala radit k jídlu.',
        proc: 'Při nemoci se tělo chová jinak a rady postavené na běžných dnech by neseděly. Zápisy z doby nemoci se do učení nezapočítají.' },
      { when: function (B) { return B.disruption !== 'illness'; },
        do: [{ sel: '[data-action="page"][data-value="today"]', act: 'page', val: 'today' },
          { sel: '[data-action="page"][data-value="datastate"]', act: 'page', val: 'datastate' }],
        watch: '.card .hint',
        t: 'Chybí data ze senzoru',
        co: 'Pacient popsal, co vidí v aplikaci výrobce senzoru.',
        vsimni: 'Aplikace nehádá příčinu a netvrdí, že je senzor rozbitý.',
        proc: 'Zápis s mezerou v datech se do učení nezapočítá a mezera se nedopočítává.' },
      { when: function (B) { return B.disruption !== 'illness'; },
        do: [{ fn: function (S) { NF.pauseTask(S, 'data', 'Chybí nám data ze senzoru od ' + NF.fmtTime(S.dataState.lastValueAt) + '. Úkol je do ověření pozastavený.'); } }],
        t: 'Úkol se pozastaví',
        co: 'Dokud lékař neověří, že data zase chodí, úkol stojí a aplikace neradí.' },
      { do: [{ sel: '[data-action="page"][data-value="today"]', act: 'page', val: 'today' }],
        watch: '.card .hint.warn',
        t: 'Co pacient vidí na obrazovce Dnes',
        co: 'Proč je úkol pozastavený, co to neznamená a co bude dál.',
        vsimni: '„Tvoje dávky inzulinu se nemění a inzulin nevysazuješ.“',
        proc: 'Pozastavení úkolu nesmí vypadat jako pokyn k léčbě.' }
    ]
  },

  resume: {
    intro: {
      t: 'Lékař úkol znovu spustí',
      co: '21. října. Pacient je zdravý a data ze senzoru zase chodí.',
      vsimni: 'Úkol se sám neobnovil — ani uplynutím času, ani návratem dat.',
      proc: 'Znovu spustit úkol je rozhodnutí lékaře.'
    },
    steps: [
      { when: function (B) { return B.disruption === 'illness'; },
        do: [{ sel: '[data-action="endIllness"]', act: 'endIllness' }],
        t: 'Lékař označí konec nemoci',
        co: 'Dokud byla nemoc označená jako trvající, obnovit úkol nešlo.' },
      { do: [{ sel: function (B) { return '[data-value="resumeReason:' + resumeReason(B) + '"]'; }, act: 'formSet', val: function (B) { return 'resumeReason:' + resumeReason(B); } }],
        t: 'Lékař vybere důvod',
        co: 'Důvod obnovení je z připravených. Uvidí ho pacient.',
        proc: 'Ani tady lékař nic nepíše.' },
      { do: [{ sel: '[data-action="resumeTask"]', act: 'resumeTask' }],
        t: 'Úkol znovu platí',
        co: 'Úkol je obnovený a ve stopě ukázky je zaznamenané, kdo a proč ho obnovil.',
        dusledek: 'Aplikace zase radí. Zápisy z doby nemoci zůstávají vidět, ale do učení se nepočítají.' }
    ]
  },

  /* ================= Dějství 5 — Správa pravidel ================= */
  catalog: {
    intro: {
      t: 'Garant dostane podnět',
      co: '22. října. Při testu pacient pochopil radu „sněz nejdřív jogurt“ tak, že jogurt nahradí část kaše — a kaši nedojedl.',
      vsimni: 'Katalog je rozdělený na výpočty, rady a úkoly. Každé pravidlo má stav a verzi.',
      proc: 'Při pevné dávce inzulinu pacient takhle snědl méně sacharidů, než měl. Nejasný text rady je bezpečnostní problém.'
    },
    steps: [
      { do: [{ sel: '.hint.warn' }],
        t: 'Podnět k posouzení',
        co: 'Hlášený problém se týká pravidla R-PORADI verze 1.',
        vsimni: 'Podnět není automaticky závažná nežádoucí příhoda. Posoudí ho garant.' },
      { do: [{ sel: '[data-action="openRetire"][data-value="R-PORADI|v1"]', act: 'openRetire', val: 'R-PORADI|v1' }],
        t: 'Garant pravidlo vyřazuje',
        co: 'Otevřel se výběr důvodu vyřazení.',
        proc: 'Nejasnou radu je potřeba vypnout hned, ne až bude hotová oprava.' },
      { do: [
          { sel: '[data-value="retireReason:' + R[0] + '"]', act: 'formSet', val: 'retireReason:' + R[0] },
          { sel: '[data-action="retireRule"]', act: 'retireRule', val: 'R-PORADI|v1' }],
        watch: '.tablewrap',
        t: 'Pravidlo je vyřazené',
        co: 'Garant zvolil důvod a potvrdil vyřazení. Pod katalogem se ukázal dopad.',
        vsimni: '„Rada Pořadí jídla se přestane nabízet. Úkol běží dál a ostatní rady platí.“ Předpis inzulinu se nemění.',
        dusledek: 'Hned v další kapitole to uvidí pacient.' }
    ]
  },

  impact: {
    intro: {
      t: 'Co vidí pacient',
      co: 'O hodinu později otevře pacient aplikaci.',
      proc: 'Vyřazené pravidlo nesmí vytvořit radu ani omylem. Zbytek aplikace ale funguje dál.'
    },
    steps: [
      { do: [{ sel: '.hint.warn' }],
        t: 'Pacient ví, proč jednu radu nedostane',
        co: '„Některé rady teď nedostaneš. Pořadí jídla — pravidlo garant vyřadil.“',
        vsimni: 'V odbočce „offline“ místo toho aplikace oznámí, že bez připojení neradí vůbec.',
        proc: 'Bez připojení aplikace neví, jestli garant mezitím pravidlo nevyřadil. Proto raději neradí.' },
      { when: function (B) { return B.offline !== 'offline'; },
        do: [
          { sel: '[data-action="startMeal"]', act: 'startMeal' },
          { sel: '[data-action="mealFood"][data-value="kase"]', act: 'mealFood', val: 'kase' },
          { sel: '[data-action="mealBolus"][data-value="before"]', act: 'mealBolus', val: 'before' }],
        watch: '.advice-list',
        t: 'Rada o pořadí zmizela',
        co: 'U kaše zůstala jen rada k doplňku.',
        vsimni: 'Rada z vyřazeného pravidla není ani zašedlá. Prostě tam není.' }
    ]
  },

  fix: {
    intro: {
      t: 'Garant zaznamená incident a schválí opravu',
      co: 'Verze 2 pravidla má upřesněný text: „…potom zbytek obvyklého jídla. Přílohu nevynechávej.“',
      proc: 'Schválit novou verzi lze až po projití testovacích příkladů.'
    },
    steps: [
      { do: [{ sel: '[data-action="createIncident"]', act: 'createIncident' }],
        watch: '.rule-card',
        t: 'Záznam incidentu',
        co: 'Incident je zaznamenaný s dotčenou verzí pravidla, zdrojem a odpovědnou rolí.',
        vsimni: 'Klinický dopad i technická náprava zatím nejsou posouzené.' },
      { do: [{ fn: function (S) { var i = S.incidents[S.incidents.length - 1]; if (i) { NF.act('assessIncident', i.id + ':clinical'); NF.act('assessIncident', i.id + ':technical'); } } }],
        t: 'Posouzení a náprava',
        co: 'Garant zaznamenal posouzení klinického dopadu i technickou nápravu. Incident je uzavřený.',
        vsimni: 'Zda se musí událost hlásit úřadům, maketa neurčuje.' },
      { do: [
          { sel: '[data-action="page"][data-value="catalog"]', act: 'page', val: 'catalog' },
          { sel: '[data-bind="ruleExamples.R-PORADI|v2"]', bind: 'ruleExamples.R-PORADI|v2', val: true, open: true },
          { sel: '[data-action="approveRule"][data-value="R-PORADI|v2"]', act: 'approveRule', val: 'R-PORADI|v2' }],
        t: 'Garant schválí verzi 2',
        co: 'Garant prošel testovací příklady a novou verzi schválil.',
        vsimni: 'Schválením pravidla se nevydává žádný nový plán a nemění se inzulin.',
        dusledek: 'Rada o pořadí se pacientovi vrací — už s novým textem.' }
    ]
  },

  /* ================= Dějství 6 — Kontrola a nový plán ================= */
  preview: {
    intro: {
      t: 'Den před kontrolou',
      co: '4. ledna. Uplynuly dva a půl měsíce. Pacient si prohlíží, co zítra uvidí lékař.',
      proc: 'Na kontrole nemá být žádné překvapení a žádné hodnocení poslušnosti.'
    },
    steps: [
      { do: [{ sel: '.review-facts' }],
        t: 'Co pacient zkusil',
        co: 'Počet zápisů, kolik rad pacient zkusil a kolik nechal být.',
        vsimni: '„Neuvidí žádné hodnocení, jestli jsi poslechl.“' },
      { do: [{ sel: '[data-bind="form.question"]' }],
        t: 'Otázka na kontrolu',
        co: 'Pacient si uložil otázku: „Je v pořádku, že si ke kaši dávám jogurt skoro pokaždé?“',
        dusledek: 'Otázka bude lékaři na očích v reportu.' }
    ]
  },

  onepage: {
    intro: {
      t: 'Kontrola: report pro lékaře',
      co: '5. ledna. Lékař otevře report o tom, jak plán probíhal.',
      vsimni: 'Report má šest částí v pevném pořadí, ať jsou data jakákoli.',
      proc: 'Lékař má na kontrole pár minut. Musí najít to podstatné pokaždé na stejném místě.'
    },
    steps: [
      { when: function (B) { return B.review === 'C'; },
        do: [{ sel: '[data-action="resumeVisit"]', act: 'resumeVisit' }],
        t: 'Aktuální problém během návštěvy',
        co: 'V odbočce C měl pacient problém přímo v ordinaci. Aplikace ukázala jen bezpečnostní postup; teď se lékař vrací ke kontrole.' },
      { do: [{ sel: '.onepage section:nth-of-type(1)' }],
        t: '1. Bezpečnost a úplnost dat',
        co: 'Nahlášené události a kolik zápisů se dá použít.',
        proc: 'Lékař nejdřív potřebuje vědět, jestli se něco stalo a jak spolehlivá jsou čísla pod tím.' },
      { do: [{ sel: '.onepage section:nth-of-type(2)' }],
        t: '2. Jak plán probíhal',
        co: 'Mezi jiným: v jakém rozmezí se mezi dny pohybovalo množství sacharidů ve snídani a kolikrát byla porce jiná než obvyklá.',
        proc: 'To je přesně to, co po pacientovi s pevnou dávkou lékař chce: jíst každý den podobně.' },
      { do: [{ sel: '.onepage section:nth-of-type(4)' }],
        t: '4. Jak glukóza reagovala na jednotlivá jídla',
        co: 'Kolikrát pacient které jídlo zapsal, o kolik po něm glukóza obvykle stoupla a co pomohlo.',
        vsimni: 'U výpočtu je pravidlo, ze kterého pochází.' },
      { do: [{ sel: '.onepage section:nth-of-type(5)' }],
        t: '5. Fungovaly rady, když je pacient přijal?',
        co: 'Dvě čísla vedle sebe: o kolik glukóza stoupla, když pacient radu přijal, a když ne.',
        vsimni: 'Pod tím je nejčastější důvod odmítnutí. V odbočkách „většinou nepřijal“ se objeví signál k rozhovoru — a u důvodu „nemám to doma“ upozornění, že rada může být nepraktická.',
        proc: 'Tohle je jediné číslo, které lékaři řekne, jestli rady fungují. Report neříká „pacient neposlechl“ — říká, co zkusil a jak to dopadlo.' },
      { do: [{ sel: '[data-action="page"][data-value="decide"]', act: 'page', val: 'decide' }],
        t: 'Lékař pokračuje k rozhodnutí',
        co: 'Otevřela se obrazovka rozhodnutí.' }
    ]
  },

  decide: {
    intro: {
      t: 'Lékař rozhoduje',
      co: 'Tři možnosti: pokračovat, vydat úkol na změnu režimu, nebo zatím nerozhodnout.',
      vsimni: 'Rozhodnutí i důvod lékař jen vybírá.',
      proc: 'Ručně psané důvody by nešlo porovnat napříč studií.'
    },
    steps: [
      { do: [{ sel: '.choice-row .choice.chosen' }],
        t: 'Rozhodnutí podle reportu',
        co: 'Když pacient rady většinou přijímá a fungují, lékař pokračuje. Když je většinou nechává být, vydá úkol na změnu režimu.',
        vsimni: 'Ani jedna možnost nemění dávku inzulinu.' },
      { do: [{ sel: '.buttonlist .btn.selected' }],
        t: 'Důvod z připravených',
        co: 'Lékař vybral důvod, který odpovídá tomu, co viděl v reportu.' },
      { do: [{ sel: '[data-action="issueP2"]', act: 'issueP2' }],
        t: 'Lékař vydá plán P2',
        co: 'Nový plán je vydaný a předaný pacientovi.',
        vsimni: 'Plán P1 a všechny jeho zápisy zůstávají beze změny.',
        dusledek: 'Co už aplikace o pacientových jídlech ví, přechází do nového plánu.' }
    ]
  },

  newplan: {
    intro: {
      t: 'Pacient převezme nový plán',
      co: 'Pacient vidí, co se změnilo a proč.'
    },
    steps: [
      { do: [{ sel: '.plan-changes' }],
        t: 'Co se změnilo',
        co: 'Dávky inzulinu beze změny. Úkol pokračuje, nebo je nový. A důvod, který lékař vybral.',
        proc: 'Pacient má vědět, proč se plán změnil, ne jen že se změnil.' },
      { do: [{ sel: '[data-action="confirmUnderstanding"]', act: 'confirmUnderstanding' }],
        t: 'Nový plán platí',
        co: 'Pacient potvrdil převzetí. Na obrazovce Dnes má nový úkol.',
        dusledek: 'Smyčka se uzavřela: lékař vydal plán, pacient ho plnil, aplikace se učila a radila, lékař na kontrole viděl, jestli rady fungovaly.' }
    ]
  },

  result: {
    intro: {
      t: 'Hodnocení ukázky',
      co: 'Poslední obrazovka patří hodnotiteli ukázky, ne pacientovi.',
      vsimni: 'Nic není předvyplněné.',
      proc: 'Jestli report pomohl, má posoudit garant, ne maketa.'
    },
    steps: [
      { do: [{ sel: '.choice-row' }],
        t: 'Konec příběhu',
        co: 'Tím je příběh u konce. Odpověď na otázku vyberte sami.',
        dusledek: 'V panelu prezentujícího můžete projít odbočky nebo průchod na úrovni garanta — jen po místech, která by garant musel schválit.' }
    ]
  }
};

/* Kroky platné pro danou odbočku. */
T.stepsFor = function (id, B) {
  var ch = T.chapters[id];
  if (!ch) return [];
  return ch.steps.filter(function (s) { return !s.when || s.when(B || D.defaults); });
};

})(typeof window !== 'undefined' ? window : globalThis);
