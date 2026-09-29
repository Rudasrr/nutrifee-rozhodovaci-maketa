/* Průvodce maketou — vysvětlení a obhajoba návrhu pro prezentující a hodnotitele.
   NENÍ součástí budoucí produkční aplikace a nepatří do běžné uživatelské nápovědy
   (ta je přímo v obrazovkách: „proč mi to radíš a jak moc si tím jsi jistá“).
   Texty jsou pevné a zkontrolovatelné; nevytváří je žádná živá generativní AI.

   level: 'zasada'  = závazná zásada nového směru (neporušitelné)
          'navrh'   = návrh k posouzení (demonstrace, ne schválené klinické pravidlo)
          'otevrene'= otevřené rozhodnutí (nevybírat potichu za garanta)
   Pole: what / why / risk / sim / decide — vyplněná podle relevance. */
(function (global) {
'use strict';
var G = global.NutriFeeGuideContent = {};

G.levels = {
  zasada: { label: 'Závazná zásada', cls: 'lvl-zasada' },
  navrh: { label: 'Návrh k posouzení', cls: 'lvl-navrh' },
  otevrene: { label: 'Otevřené rozhodnutí', cls: 'lvl-otevrene' }
};

G.topics = {

  /* ---- ordinace ---- */
  'enroll-eligibility': {
    title: 'Kohorta: jen inzulin, pevné dávky',
    level: 'zasada',
    what: 'Lékař potvrdí čtyři kritéria: dospělý s DM2, jen inzulin bez perorálních antidiabetik, bazál večer a prandiální inzulin ke třem jídlům v pevných dávkách, senzor CGM. Bez nich se nepokračuje.',
    why: 'Celý návrh stojí na pevné dávce: pacient nepočítá sacharidy jako diabetik 1. typu, má k dávce jíst konzistentní množství. Učení z reakcí dává smysl jen tehdy, když se dávka mezi dny nemění.',
    risk: 'Pacient s flexibilním dávkováním nebo s perorálními antidiabetiky by dostával rady postavené na předpokladu, který u něj neplatí.',
    sim: 'Kritéria jsou čtyři zaškrtávátka. Kontrola proti dokumentaci se nesimuluje.',
    decide: 'Praktická vstupní kritéria kohorty. Čtyři body jsou náš návrh, ne schválený protokol.'
  },
  'enroll-context': {
    title: 'Co lékař ví, se nevypisuje',
    level: 'zasada',
    what: 'Diagnóza, léčba, režim, senzor a poslední HbA1c jsou na kartě. Obrazovka je zobrazuje, lékař je nepřepisuje.',
    why: 'Lékař nemá čas psát texty. Kdyby zařazení znamenalo přepisování známých údajů, program by mu práci přidal.',
    risk: 'Odvrací duplicitní evidenci vedle zdravotnické dokumentace a s ní i riziko, že se obě rozejdou.',
    sim: 'Údaje jsou syntetické a jen zobrazené. Žádné napojení na dokumentaci neexistuje.',
    decide: 'Které údaje by se v provozu přenesly z karty a kdo odpovídá za jejich aktuálnost. K ověření.'
  },
  'enroll-compensation': {
    title: 'Kompenzace je posouzení lékaře, ne výpočet',
    level: 'navrh',
    what: 'Dvě tlačítka: nedostatečná, nebo přijatelná.',
    why: 'Lékař to ví dřív, než se posadí. Stačí jedno kliknutí, aby se to přeneslo do reportu na příští kontrolu.',
    risk: 'Aplikace kompenzaci nepočítá ani neodvozuje z dat.',
    decide: 'Zda dvě hodnoty stačí. Návrh k posouzení.'
  },
  'task-catalog': {
    title: 'Úkoly jsou předem definované; lékař vybírá',
    level: 'zasada',
    what: 'Katalog nabízí připravené úkoly s hotovou otázkou pacienta a odhadem zátěže. Úkol, jehož pravidlo nemá schválenou verzi (procházka po večeři), je vidět, ale nejde vybrat.',
    why: 'Ručně psané úkoly nejdou vyhodnotit napříč studií a nikdo je neschválil. Výběrem z katalogu je každý úkol navázaný na schválené pravidlo.',
    risk: 'Neschválené pravidlo se k pacientovi nedostane ani omylem — už v ordinaci ho nejde přiřadit.',
    sim: 'Katalog má čtyři položky, jednu zablokovanou.',
    decide: 'Které úkoly patří do první studie a kolik jich má být.'
  },
  'issue-medication': {
    title: 'Ověření léčby hlídá kohortu',
    level: 'zasada',
    what: 'Lékař potvrdí, že pacient bere jen inzulin a žádná perorální antidiabetika.',
    why: 'Učení z reakcí předpokládá pevnou dávku inzulinu jako jedinou farmakologickou proměnnou.',
    risk: 'Bez ověření by se rady opíraly o nesprávný předpoklad.'
  },
  'issue-safety': {
    title: 'Bezpečnostní plán je podmínkou vydání',
    level: 'zasada',
    what: 'Plán nejde vydat, dokud lékař nepotvrdí předání bezpečnostního a kontaktního plánu.',
    why: 'Aplikace radí k jídlu. Co dělat při nízké glukóze nebo když pacient sní méně, musí mít od lékaře dřív, než dostane první radu.',
    decide: 'Konkrétní formulace a meze bezpečnostního plánu dodá garant.'
  },
  'training-sensor': {
    title: 'Připojení senzoru je simulované',
    level: 'zasada',
    what: 'Obrazovka to říká přímo: žádná data se nepřenášejí a žádná integrace neexistuje.',
    why: 'Maketa nesmí vzbudit dojem, že integrace se senzorem existuje.',
    sim: 'Průběhy po jídle v maketě počítá jednoduchý deterministický model v demonstrační vrstvě.'
  },
  'training-steps': {
    title: 'Zaučení jsou konkrétní úkony z předání',
    level: 'zasada',
    what: 'Sestra odškrtne pět úkonů, mimo jiné že pacient zvládl zapsat zkušební jídlo a ví, že se ho aplikace před radou zeptá, jestli si už píchl.',
    why: 'Lékař rozhodne a vydá plán; edukaci a předání zařízení dělá sestra. Otázka na bolus je jediná věc mezi radou a hypoglykemií — pacient ji musí znát předem.',
    risk: 'Úkol se aktivuje až po zaučení a ověření porozumění. Nezdařené zaučení nechá plán vydaný, ale úkol neaktivní.',
    decide: 'Kdo řeší neúspěšné zaučení a kolik času sestře zabere.'
  },

  /* ---- předání a porozumění ---- */
  'takeover-basics': {
    title: 'Pacient vidí dávky, ale aplikace je neřeší',
    level: 'zasada',
    what: 'Plán ukazuje pevné dávky jako text od lékaře a úkol s otázkou, na kterou odpovídá.',
    why: 'Pacient má vědět, že aplikace mu pomáhá jíst k dávce obvyklé množství — ne dávku měnit.',
    risk: 'Žádné číslo dávky v aplikaci nevzniká ani se nezobrazuje jako výpočet.'
  },
  'takeover-confirm': {
    title: 'Převzetí není porozumění',
    level: 'navrh',
    what: 'Tlačítko převzetí vede k jedné kontrolní otázce.',
    why: 'Otevření plánu nic neříká o tom, jestli pacient rozumí hranicím služby.'
  },
  'understand-answer': {
    title: 'Jedna otázka na hranici služby',
    level: 'zasada',
    what: '„Znamená zápis, že ho lékař hned uvidí?“ Správně je ne.',
    why: 'Nikdo pacienta průběžně nesleduje. Kdyby si to myslel, mohl by čekat na reakci, která nepřijde.',
    risk: 'Odvrací falešný pocit dohledu.',
    decide: 'Zda má být ověření porozumění podmínkou aktivace. V maketě je.'
  },
  'help-split': {
    title: 'Technická pomoc a zdravotní kontakt jsou oddělené',
    level: 'navrh',
    what: 'Dva sloupce: senzor a aplikace řeší podpora, zdraví ordinace.',
    why: 'Směšování obou cest zatěžuje ordinaci technickými dotazy a zdržuje zdravotní.'
  },
  'plan-strip': {
    title: 'Platný plán je vždy vidět',
    level: 'navrh',
    what: 'Horní proužek říká, který plán platí a do kdy.',
    why: 'Rady se vážou k platnému plánu. Pacient má vždy vědět, z čeho aplikace vychází.'
  },
  'patient-nav': {
    title: 'Čtyři místa, nic navíc',
    level: 'navrh',
    what: 'Dnes, Moje jídla, Plán, Bezpečí.',
    why: '„Moje jídla“ jsou místo, kde je učení vidět. Bezpečí je dostupné odkudkoli.'
  },

  /* ---- doma: učení ---- */
  'today-primary': {
    title: 'Hlavní akce je „chystám se jíst“',
    level: 'zasada',
    what: 'Pacient otevře aplikaci před jídlem, ne po něm.',
    why: 'Rada, která mění množství sacharidů, má smysl jen před bolusem. Proto je vstupní bod před jídlem, ne deník zpětně.',
    risk: 'Zpětný deník by radu přinesl pozdě — po podání inzulinu, kdy se porce měnit nesmí.'
  },
  'today-counts': {
    title: '„Zpřesňuje se“ musí být vidět',
    level: 'zasada',
    what: 'Počet zapsaných jídel a počet jídel, která aplikace už zná.',
    why: 'Slib učení bez viditelného pokroku je jen slib. Počty ukazují, odkud aplikace bere jistotu.'
  },
  'today-unsure': {
    title: 'Nejistota má vlastní cestu',
    level: 'navrh',
    what: 'Tři tlačítka: nerozumím, bezpečnostní plán, jsem nemocný.',
    why: 'Pacient nemusí rozhodovat, jestli je jeho problém „dost vážný“. Vybere, čeho se týká.'
  },
  'foods-list': {
    title: 'U každého jídla je vidět, kolikrát ho pacient jedl',
    level: 'zasada',
    what: 'Seznam jídel s počtem zápisů, počtem úplných záznamů, úrovní jistoty a u známých jídel obvyklým vzestupem a tím, co pomohlo.',
    why: 'Pacient i lékař vidí, na čem aplikace stojí. Známé jídlo od tří úplných záznamů, do té doby se zpřesňuje.',
    risk: 'Záznamy bez údaje o inzulinu, s mezerou v datech nebo z doby nemoci jsou vidět, ale nepočítají se.',
    decide: 'Zda jsou tři úplné záznamy správná hranice pro „známé jídlo“. Parametr pravidla R-REAKCE.'
  },
  'foods-learning': {
    title: 'Pruh učení',
    level: 'navrh',
    what: 'Kolik úplných záznamů jídlo má z počtu potřebného k tomu, aby ho aplikace znala.',
    why: 'Jednoduchý vizuální signál, že další zápis má smysl.'
  },

  /* ---- před jídlem ---- */
  'meal-food': {
    title: 'Pacient vybírá, nepíše',
    level: 'navrh',
    what: 'Jídla ze seznamu s úrovní jistoty a počtem zápisů.',
    why: 'Výběr ze seznamu dává jídlu vlastnosti (sacharidy, bílkovina, tuk, vláknina, forma), ze kterých se počítá podobnost. Volný text by je neměl.',
    sim: 'Katalog má čtyři syntetická jídla.',
    decide: 'Zdroj a licence potravinových dat. Kdo přidává nová jídla do pacientova seznamu.'
  },
  'meal-portion': {
    title: 'Cílem je obvyklá porce, ne méně',
    level: 'zasada',
    what: 'Tři volby porce a věta: cílem je obvyklé množství držet, ne jíst méně.',
    why: 'Při pevné dávce stejných osm jednotek jednou vyjde a jindy ne podle toho, kolik pacient reálně snědl (PMC6375528). Konzistence sacharidů je cíl, jejich omezování ne.',
    risk: '„Dej si menší porci“ je při pevné dávce cesta k hypoglykemii. Aplikace porci řídí k obvyklé oběma směry.',
    decide: 'Co je „obvyklá porce“ a jak se určí. V maketě je v katalogu jídel.'
  },
  'meal-level': {
    title: 'Tři úrovně jistoty',
    level: 'zasada',
    what: 'Známé jídlo: co se stalo minule a o kolik obvykle stoupne. Podobné jídlo: jen směr („stoupá víc“), bez čísla. Neznámé jídlo: žádný odhad, nabídne zapsat.',
    why: 'Aplikace má říct tolik, kolik ví — a ne víc. Podobnost se počítá z vlastností porce, ne z názvu jídla.',
    risk: 'Číslo u podobného jídla by vypadalo jako předpověď bez opory. Proto ho neukazuje.',
    sim: 'Vzestup (nejvyšší hodnota do 120 minut minus výchozí) počítá jádro z modelových průběhů.',
    decide: 'Na čem stojí odhad reakce a s jakou nejistotou se ukazuje. Obvyklá vědecká opora pro personalizovanou predikci (studie z roku 2015) se na tuto kohortu nepřenáší: lidé bez inzulinu, sekvenace mikrobiomu, predikce plochy pod křivkou. K ověření garantem.'
  },
  'meal-bolus': {
    title: 'Jediná otázka mezi radou a hypoglykemií',
    level: 'zasada',
    what: '„Už sis k tomuto jídlu píchl inzulin?“ Ještě ne / Už ano / Nevím. Ptá se pokaždé, dřív než ukáže radu.',
    why: 'Rada měnící množství sacharidů je bezpečná jen před bolusem. Po podání už je dávka daná a porce se měnit nesmí.',
    risk: 'Neznámý stav podání se chová jako „po bolusu“ — při „nevím“ se rada k porci nedá.'
  },
  'meal-blocked': {
    title: 'Proč se rada k porci teď nedává',
    level: 'zasada',
    what: 'Po podání nebo při „nevím“ aplikace řekne, že radu k porci nedává a proč.',
    why: 'Pacient nemá mít dojem, že aplikace „zapomněla“. Vysvětlení je součástí bezpečnostního pravidla.',
    risk: 'Ani blokovaná rada sama neradí jíst víc nebo méně. Odkazuje na bezpečnostní plán.'
  },
  'meal-advice': {
    title: 'Každá rada nese své pravidlo',
    level: 'zasada',
    what: 'U každé rady je páka, text, jak jistá si aplikace je, a pravidlo s verzí a stavem. Pacient zvolí „zkusím to“ nebo „tentokrát ne“ a může připojit důvod.',
    why: 'Každé doporučení pochází ze schváleného pravidla a na obrazovce je vidět které. Rozhodnutí pacienta je data: bez nich by report nevěděl, jestli rady fungují.',
    risk: 'Rady z neschválených pravidel (příloha, odstup, procházka) se k pacientovi nedostanou vůbec. Nejsou ani zašedlé.',
    decide: 'Které typy rad jsou přípustné a kdy.'
  },
  'meal-help': {
    title: 'Nápověda, která zůstává v produkci',
    level: 'navrh',
    what: '„Proč mi to radíš a jak moc si tím jsi jistá?“ — odkud aplikace ví, co nepočítá a proč se ptá na inzulin.',
    why: 'Tohle je běžná nápověda aplikace, ne Průvodce maketou. Pacient ji potřebuje i v ostrém provozu.'
  },
  'meal-record': {
    title: 'Popis se dá opravit, čas podání se zadává',
    level: 'otevrene',
    what: 'Předvyplněný popis jídla je editovatelný a čas podání inzulinu pacient napíše.',
    why: 'Pacient musí umět opravit překlep. Oprava zůstává v historii.',
    decide: 'Zda i tady nahradit psaní výběrem. Nerozhodnuto.'
  },
  'rule-notice': {
    title: 'Vyřazená rada zmizí, ostatní platí',
    level: 'zasada',
    what: 'Pacient se dozví, že jednu radu teď nedostane, proč, a že se jeho dávky nemění.',
    why: 'Vyřazené pravidlo nesmí vytvořit radu ani omylem. Zbytek aplikace ale funguje dál.'
  },
  'offline-advice': {
    title: 'Bez spojení aplikace neradí',
    level: 'navrh',
    what: 'Když zařízení nemá spojení, rady jsou vypnuté a bezpečnostní plán zůstává dostupný.',
    why: 'Bez spojení aplikace neví, jestli garant mezitím pravidlo nevyřadil. Radit ze starého pravidla by porušilo zásadu, že k pacientovi se dostane jen schválené.',
    risk: 'Cenou je, že offline pacient radu nedostane vůbec.',
    decide: 'Zda rady offline vypnout úplně, nebo povolit po nějakou dobu od posledního ověření pravidel.'
  },

  /* ---- když něco nesedí ---- */
  'safety-sections': {
    title: 'Bezpečnostní plán je od lékaře, ne od aplikace',
    level: 'zasada',
    what: 'Sekce včetně „Snědl jsem méně, než jsem měl v plánu“. Konkrétní meze doplní garant.',
    why: 'Aplikace radí k jídlu, ale co dělat při nízké glukóze, určuje lékař.',
    decide: 'Kdo dodá konkrétní formulace a meze.'
  },
  'safety-contact': {
    title: 'Kontakt je simulovaný a nic neodesílá',
    level: 'zasada',
    what: 'Postup kontaktu bez vytočitelného čísla.',
    why: 'Nic se neodesílá, nikdo pacienta průběžně nesleduje.'
  },
  'unclear-split': {
    title: 'Dřívější průběh, problém teď, nemoc',
    level: 'navrh',
    what: 'Otázka ke kontrole se uloží a neodesílá; problém teď vede k bezpečnostnímu plánu; nemoc pozastaví úkol.',
    why: 'Každá z cest má jiného adresáta a jiný čas.'
  },
  'datastate-cause': {
    title: 'Výpadek dat nehádá příčinu',
    level: 'zasada',
    what: 'Tři volby, co pacient vidí u výrobce senzoru.',
    why: 'NutriFee popisuje jen absenci vlastních dat. Záznam s mezerou se nepočítá do učení a mezera se nedopočítává.'
  },
  'resume-conditions': {
    title: 'Obnovení potvrzuje lékař',
    level: 'navrh',
    what: 'Podmínky obnovení a důvod z připravených.',
    why: 'Uplynutí času ani návrat dat samo úkol neobnoví.',
    decide: 'Reálné podmínky obnovení a kdo je potvrzuje.'
  },

  /* ---- správa pravidel ---- */
  'rule-approved': {
    title: 'Schválené pravidlo',
    level: 'zasada',
    what: 'Účel, vstupy, parametry, omezení, text pro pacienta a příklady použití i nepoužití.',
    why: 'Každý výpočet a rada v aplikaci pochází z pravidla v tomto katalogu. Parametry (například tři záznamy pro známé jídlo) jsou v pravidle, ne v kódu.',
    decide: 'Obsah a parametry každého pravidla.'
  },
  'rule-draft': {
    title: 'Návrh nic nedělá',
    level: 'zasada',
    what: 'Návrh pravidla je vidět, ale nevytvoří výpočet ani radu a úkol s ním nejde přiřadit.',
    why: 'Schválení je vědomý krok garanta po projití příkladů.'
  },
  'rule-retired': {
    title: 'Vyřazení působí okamžitě',
    level: 'zasada',
    what: 'Rada z vyřazeného pravidla se přestane nabízet. Úkol běží dál, pokud na pravidle nestojí.',
    why: 'Nejasný text rady („sněz nejdřív jogurt“ pochopený jako náhrada přílohy) může při pevné dávce snížit sacharidy. Musí jít rychle vypnout.',
    decide: 'Kdo pravidla vyřazuje a jak se řeší zařízení, které změnu nedostalo.'
  },
  'versions-trace': {
    title: 'Stopa demonstrace',
    level: 'navrh',
    what: 'Lokální záznam událostí makety: vydání plánů, uložení jídel, změny pravidel.',
    why: 'Pro prezentaci a kontrolu determinismu. Nikam se neodesílá.'
  },

  /* ---- kontrola ---- */
  'onepage-1': {
    title: 'Bezpečnost a úplnost dat nahoře',
    level: 'zasada',
    what: 'Události, které pacient nahlásil, a kolik záznamů je úplných.',
    why: 'Lékař nejdřív potřebuje vědět, jestli se něco stalo a jak spolehlivá jsou čísla pod tím.'
  },
  'onepage-2': {
    title: 'Konzistence sacharidů mezi dny',
    level: 'zasada',
    what: 'Rozpětí sacharidů ve snídani a kolikrát byla porce jiná než obvyklá.',
    why: 'To je přesně to, co po pacientovi s pevnou dávkou chce lékař. Report to ukazuje přímo.',
    sim: 'Sacharidy se odhadují z katalogu a zvolené porce, ne z vážení.'
  },
  'onepage-3': {
    title: 'Čas v rozmezí',
    level: 'navrh',
    what: 'Souhrn ze senzoru za poslední období: dostupnost dat a čas v rozmezí, pod ním a nad ním.',
    sim: 'Hodnoty jsou předem vložené, nevypočtené.',
    decide: 'Cílové rozmezí je jen modelové nastavení.'
  },
  'onepage-4': {
    title: 'Reakce na jednotlivá jídla',
    level: 'zasada',
    what: 'Tabulka: kolikrát zapsáno, kolikrát úplně, úroveň jistoty, obvyklý vzestup a co pomohlo. S pravidlem, ze kterého výpočet pochází.',
    why: 'Lékař vidí, jak tělo reagovalo na jednotlivá jídla, a jak jisté to je.'
  },
  'onepage-5': {
    title: 'Klíčové číslo: přijato oproti nepřijato',
    level: 'zasada',
    what: 'Vzestup, když pacient radu přijal, a když ne. Kolikrát se která rada nabídla a přijala. Nejčastější důvod odmítnutí.',
    why: 'Jen tohle srovnání lékaři řekne, jestli rada funguje. Report neříká „pacient neposlechl“ — říká, co se zkusilo a co z toho bylo.',
    risk: 'Soustavné odmítání může znamenat potřebu změny režimu, nebo nepraktickou radu. Důvody odmítnutí je pomáhají rozlišit.',
    decide: 'Co je v pilotu úspěch u tohoto rozdílu. Aplikace, která odhaduje reakci a doporučuje úpravu jídla, dělá klinické tvrzení — podle MDR jiná třída rizika než pozorovací deník. K ověření.'
  },
  'onepage-6': {
    title: 'Otázka pacienta',
    level: 'navrh',
    what: 'Poslední otázka, kterou si pacient uložil ke kontrole, beze změny jeho slov.',
    why: 'Rozhovor začíná tím, co zajímá pacienta.'
  },
  'decide-options': {
    title: 'Tři rozhodnutí, žádné psaní',
    level: 'zasada',
    what: 'Pokračovat, vydat úkol na změnu režimu, nebo zatím nerozhodnout.',
    why: 'Úkol na změnu režimu je odpověď na soustavné odmítání rad. Dávka se nemění nikdy.'
  },
  'decide-reasons': {
    title: 'Důvod se vybírá z připravených',
    level: 'zasada',
    what: 'Čtyři připravené důvody rozhodnutí; lékař jeden vybere.',
    why: 'Ručně psané důvody nejdou vyhodnotit napříč studií a lékař nemá čas je psát.'
  },
  'newplan-diff': {
    title: 'Nový plán říká, co se změnilo a proč',
    level: 'navrh',
    what: 'Dávky beze změny, úkol pokračuje nebo je nový, důvod z rozhodnutí lékaře.',
    why: 'Co aplikace o jídlech ví, zůstává. Starší zápisy zůstávají u původního plánu.'
  },
  'preview-summary': {
    title: 'Pacient vidí, co uvidí lékař',
    level: 'navrh',
    what: 'Počet zápisů a kolik rad zkusil a kolik nechal být.',
    why: 'Žádné překvapení na kontrole a žádné hodnocení poslušnosti.'
  },

  /* ---- okraje ---- */
  'participation-end': {
    title: 'Ukončení účasti',
    level: 'navrh',
    what: 'Úkoly, rady i připomínky se zastaví.',
    why: 'Z neaktivity se nevyvozuje žádný závěr.'
  },
  'edge-case': {
    title: 'Okrajové situace',
    level: 'navrh',
    what: 'Stav, další krok a odpovědná role.',
    why: 'Každá situace musí mít majitele. Aplikace nikomu nic neodesílá.'
  },

  /* ---- rozhodovací list ---- */
  'decision-regulace': {
    title: 'Regulatorní váha se změnila',
    level: 'otevrene',
    what: 'Položka rozhodovacího listu k zařazení podle MDR.',
    why: 'Odhad glykemické odpovědi a doporučení úpravy jídla je klinické tvrzení. Maketa to nevyřeší, ale předání to má říkat nahlas.',
    decide: 'Třída rizika a co z ní plyne pro studii.'
  },
  'decision-odhad': {
    title: 'Opora odhadu reakce',
    level: 'otevrene',
    what: 'Položka rozhodovacího listu k tomu, na čem stojí odhad.',
    why: 'Režim dávkování potvrzují mezinárodní i české odborné standardy léčby DM2. Že se z reakcí na jídlo dá odvozovat doporučení, nepotvrzuje žádný z nich.',
    decide: 'Zda a s jakou nejistotou odhad ukazovat. K ověření.'
  }
};

})(typeof window !== 'undefined' ? window : globalThis);
