/* Průvodce maketou — vysvětlení a obhajoba návrhu pro prezentující a hodnotitele.
   NENÍ součástí budoucí produkční aplikace a nepatří do běžné uživatelské nápovědy.
   Texty jsou pevné a zkontrolovatelné; nevytváří je žádná živá generativní AI.

   level: 'zasada'  = zásada, na které stojí návrh (zachovat)
          'navrh'   = návrh k posouzení (demonstrace, ne schválené klinické pravidlo)
          'otevrene'= otevřené rozhodnutí (nevybírat potichu za garanta)
   Pole: what / why / risk / sim / decide — vyplněná podle relevance.

   Témat je záměrně jen tolik, kolik je míst, kde se opravdu rozhoduje. Prvky,
   které obhajobu nepotřebují, značku nemají. */
(function (global) {
'use strict';
var G = global.NutriFeeGuideContent = {};

G.levels = {
  zasada: { label: 'Zásada návrhu', cls: 'lvl-zasada' },
  navrh: { label: 'Návrh k posouzení', cls: 'lvl-navrh' },
  otevrene: { label: 'Otevřené rozhodnutí', cls: 'lvl-otevrene' }
};

G.topics = {

  /* ---------- Dějství 1 — v ordinaci ---------- */
  'enroll-context': {
    title: 'V ordinaci se nic nevypisuje',
    level: 'zasada',
    what: 'Diagnóza, režim, senzor, poslední dlouhodobý ukazatel kompenzace i seznam léčby jsou z karty a jen se zobrazují. Kompenzaci lékař označí jedním ze dvou tlačítek, způsobilost odškrtne. Textové pole tu není žádné.',
    why: 'Lékař nemá čas psát texty. Úspora jeho práce je v tomto návrhu rovnocenná pomoci pacientovi — kdyby zařazení znamenalo přepisování známých údajů, program by práci přidal, ne ubral.',
    risk: 'Odvrací duplicitní evidenci vedle zdravotnické dokumentace a s ní i riziko, že se obě rozejdou.',
    sim: 'Údaje jsou syntetické a jen zobrazené. Žádné napojení na dokumentaci neexistuje a maketa z nich nepočítá.',
    decide: 'Které údaje by se v provozu skutečně přenesly z karty a kdo odpovídá za jejich aktuálnost. Přesná definice stabilního režimu a praktická vstupní kritéria kohorty.'
  },
  'task-catalog': {
    title: 'Úkoly jsou předem definované, lékař vybírá',
    level: 'zasada',
    what: 'Katalog nabízí připravené úkoly. Každý má hotovou otázku pacienta, podmínky, minimum záznamu a odhad zátěže. Lékař klikne na jeden.',
    why: 'Základní cesta nevyžaduje psaní. Kdyby si lékař úkol formuloval sám, vznikl by u každého pacienta jiný text, který nikdo neschválil a který nejde vyhodnotit napříč studií.',
    risk: 'Úkol, jehož pravidlo nemá schválenou verzi, je v katalogu vidět, ale přiřadit ho nelze. Neschválené pravidlo se tak k pacientovi nedostane ani omylem.',
    decide: 'Které úkoly patří do první studie a kolik jich má být souběžně. To je první položka rozhodovacího listu.'
  },
  'training-steps': {
    title: 'Zaučení vede sestra, ne lékař',
    level: 'navrh',
    what: 'Sestra odškrtne čtyři konkrétní úkony, které pacient při předání zvládl. Dokud některý chybí, zaučení nelze označit za dokončené.',
    why: 'Lékař rozhodne a vydá plán; edukaci a předání zařízení dělá v ambulanci sestra. Kdyby zaučení viselo na lékaři, program by mu práci přidal.',
    risk: 'Body jsou konkrétní úkony, ne zkoušení. Při nezvládnutém zaučení se úkol neaktivuje, i když plán vydaný je, a pacient se nevykazuje jako úspěšně zařazený — to je jinak snadný způsob, jak si nafouknout čísla pilotu.',
    sim: 'Připojení senzoru je simulované. Žádná data se nepřenášejí a žádná integrace neexistuje.',
    decide: 'Kdo řeší neúspěšné zaučení a co se s takovým pacientem děje dál. Kolik času zaučení sestře zabere a jak se započítá do celkové práce ambulance.'
  },
  'takeover-confirm': {
    title: 'Převzetí plánu není potvrzení porozumění',
    level: 'zasada',
    what: 'Pacient nejdřív plán převezme a teprve potom odpoví na jednu otázku o tom, co aplikace dělá a nedělá. Úkol se aktivuje až po ní.',
    why: 'Zaškrtnutí „rozumím“ se v praxi klikne bez čtení. Jedna konkrétní otázka o hranicích služby odhalí nejčastější nedorozumění — že zápis je zpráva ordinaci.',
    risk: 'Odvrací falešný doklad edukace a falešné očekávání dohledu, které je v této službě bezpečnostní otázka.',
    decide: 'Zda má být ověření porozumění podmínkou aktivace úkolu. V maketě podmínkou je.'
  },

  /* ---------- Dějství 2 — aplikace se učí ---------- */
  'today-primary': {
    title: 'Jeden aktivní úkol',
    level: 'zasada',
    what: 'Pacient vidí právě jeden úkol a jednu hlavní akci. Žádný seznam modulů, žádné skóre, žádný povinný deník všech jídel.',
    why: 'Hodnota se má prokázat na jedné uzavřené otázce. Jeden úkol drží cyklus otázka → záznamy → rada → rozhovor na kontrole čitelný pro pacienta i pro lékaře.',
    risk: 'Odvrací riziko, že se z aplikace stane deník bez závěru a zátěž pacienta i ambulance se zvýší bez doložitelného přínosu.',
    decide: 'Kolik úkolů smí běžet souběžně. V maketě jeden.'
  },
  'meal-food': {
    title: 'Neznámé jídlo nedostane odhad',
    level: 'zasada',
    what: 'U jídla, ke kterému aplikace nemá ani jeden vlastní záznam a nenajde nic podobného, neodhaduje nic. Jen nabídne zápis.',
    why: 'Odhad z ničeho by byl dojem přesnosti bez opory. První chybný odhad stojí důvěru, na které celý produkt stojí.',
    risk: 'Odvrací nejběžnější selhání podobných aplikací — vysvětlení nebo předpověď, kterou data neunesou.',
    sim: 'Počty záznamů i průběhy jsou syntetické.'
  },
  'foods-learning': {
    title: 'Že se aplikace zpřesňuje, musí být vidět',
    level: 'zasada',
    what: 'U každého jídla je počet zápisů a z toho počet úplných. Jídlo je „známé“ od tří úplných záznamů; do té doby je to napsané.',
    why: 'Slib „čím víc dat, tím lepší rada“ se musí dát zkontrolovat. Když je počet vidět, pacient i lékař poznají, kdy se dá radě věřit a kdy ještě ne.',
    risk: 'Odvrací dojem, že aplikace ví víc, než ví. Záznam bez údaje o inzulinu, z období nemoci nebo s mezerou v datech se nepočítá a je to napsané u něj.',
    decide: 'Od kolika úplných záznamů je jídlo známé. V maketě tři — hodnota je k ověření.'
  },
  'meal-level': {
    title: 'Tři úrovně jistoty',
    level: 'navrh',
    what: 'Známé jídlo (tři a víc úplných záznamů) dostane, co se stalo minule a co tehdy pomohlo. Podobné jídlo dostane směr bez čísla. Neznámé jídlo nedostane nic.',
    why: 'Zobecňovat podle názvu jídla — „rýže a knedlíky jsou obojí sacharidy“ — je přesně ta úvaha, kvůli jejímuž selhání vznikl glykemický index, a ten je u složených jídel sám nespolehlivý. Proto se podobnost počítá z měřitelných vlastností porce: sacharidy, bílkovina, tuk, vláknina a forma jídla.',
    risk: 'U podobného jídla se nikdy neuvádí číslo. Číslo by znělo jako měření, přitom je to odhad z jiných jídel.',
    sim: 'Na obrazovce před jídlem je jen úroveň a obvyklý vzestup — jednotlivé průběhy jsou v Moje jídla, aby pacient před jídlem nemusel číst graf. Práh podobnosti i modelové průběhy jsou syntetické. Studie personalizované predikce glykemické odpovědi z roku 2015, na kterou se u tohohle typu funkce obvykle odkazuje, se na tuhle kohortu nepřenáší: byla na lidech bez inzulinu, potřebovala sekvenaci mikrobiomu a předpovídala plochu pod křivkou, ne průběh. Přesný odkaz je v projektové dokumentaci, ne tady.',
    decide: 'Na čem odhad stojí, jaký je práh podobnosti a s jakou nejistotou se pacientovi ukazuje. Bez posouzení garantem je to náš návrh, ne ověřená metoda.'
  },

  /* ---------- Dějství 3 — rada před jídlem ---------- */
  'meal-portion': {
    title: 'Konzistence místo omezování',
    level: 'zasada',
    what: 'Porce se řídí k obvyklému množství — oběma směry. „Dej si menší porci“ aplikace neřekne nikdy.',
    why: 'Diabetik 2. typu má od lékaře pevnou dávku a je edukován, aby k ní jedl konzistentní množství sacharidů. Prakticky mu s tím nikdo nepomáhá, a proto stejná dávka jednou vyjde a jindy ne. Tohle je místo, kde aplikace pomáhá.',
    risk: 'Při pevné dávce je rada „jez méně“ cesta k nízké glykemii: inzulin je už předepsaný na obvyklé množství. Když si pacient chystá méně, aplikace na to upozorní a odkáže na bezpečnostní plán — neradí ubírat.',
    decide: 'Jak se obvyklá porce určí a kdo ji nastaví. V maketě je v katalogu jídel a pacient volí obvyklá / větší / menší.'
  },
  'meal-bolus': {
    title: 'Jedna otázka, která stojí mezi radou a nízkou glykemií',
    level: 'zasada',
    what: 'Aplikace se ptá jednou: jak je to s inzulinem k tomuto jídlu. Odpověď zároveň rozhodne, které rady se smějí dát, a uloží se do záznamu.',
    why: 'Dřív se aplikace ptala dvakrát — jednou kvůli radě, podruhé kvůli zápisu. Pacientovi to připadalo jako totéž a bylo to zbytečné tření. Jedna otázka obslouží obojí.',
    risk: 'Rady, které mění množství jídla, smějí přijít jen předtím, než si pacient píchne. Po podání by vznikl nepoměr mezi dávkou a snědenými sacharidy. Odpověď „nevím“ se posuzuje jako „už podáno“ — nejistota se řeší tou bezpečnější stranou.',
    decide: 'Je správné brát neuvedený stav podání jako „po podání“? Je to konzervativní volba, ne ověřené pravidlo.'
  },
  'meal-blocked': {
    title: 'Když se rada nedá, je vidět proč',
    level: 'zasada',
    what: 'Zablokovaná rada se nezamlčí. Aplikace napíše, která to byla a proč teď nejde.',
    why: 'Tiché vynechání by vypadalo jako že rada neexistuje. Pacient by se nedozvěděl, že příště, když otevře aplikaci dřív, ji dostane.',
    risk: 'Odvrací dojem, že aplikace radí nahodile.'
  },
  'meal-advice': {
    title: 'Rada má důvod, nejistotu a možnost odmítnout',
    level: 'zasada',
    what: 'U každé rady je vidět, z čeho vychází, jak jistá je a ze kterého pravidla pochází. Pacient ji přijme, nebo odmítne — a může říct proč.',
    why: 'Důvod odmítnutí je pro rozhodnutí lékaře cennější než samotné odmítnutí: „nechci“ a „nemám to doma“ vedou k jinému dalšímu kroku. První je téma k rozhovoru, druhé znamená, že je rada nepraktická a má se zkusit jiná.',
    risk: 'Odvrací to, aby se z reportu stal seznam provinění. Report neříká, že pacient neposlechl; říká, co se zkusilo a co z toho bylo.',
    decide: 'Které rady jsou přípustné a za jakých podmínek. Rady bez schválené verze se k pacientovi nedostanou — v maketě jsou to výměna přílohy, odstup od jídla a procházka.'
  },
  'meal-record': {
    title: 'Co se ukládá a co se z toho počítá',
    level: 'zasada',
    what: 'Uloží se jídlo, porce, odpověď o inzulinu a rozhodnutí o radách. Popis jde opravit, třeba překlep.',
    why: 'Pacient musí umět svůj záznam opravit, jinak v datech zůstane chyba, o které ví jen on.',
    risk: 'Záznam s odpovědí „nevím“ se uloží, ale do učení se nezapočítá — a je to u něj napsané. Chybějící údaj se nedopočítává.',
    sim: 'Průběh glukózy po jídle je v maketě spočítaný z modelu, ne naměřený.'
  },
  'rule-notice': {
    title: 'U rady je vidět, z jakého pravidla pochází',
    level: 'zasada',
    what: 'Každá rada nese označení svého pravidla a jeho stavu schválení.',
    why: 'Garant schvaluje všechny výpočty a doporučení. Aby to nebyl jen slib, musí být u každé rady v aplikaci vidět, co přesně bylo schváleno.',
    risk: 'Odvrací stav, kdy se do aplikace dostane rada, ke které se nikdo nepřihlásí.'
  },
  'offline-advice': {
    title: 'Bez spojení se neradí',
    level: 'navrh',
    what: 'Když aplikace nemá spojení s katalogem pravidel, rady vypne a napíše to. Zápis jídla funguje dál.',
    why: 'Pravidlo mohlo být mezitím vyřazeno. Radit podle možná neplatné verze je horší než neradit.',
    risk: 'Opravený text pravidla pacient uvidí až po připojení. Do té doby je potřeba organizační kontakt odpovědnou osobou — aplikace žádnou zprávu neodesílá.',
    sim: 'Stav připojení přepíná prezentující. Skutečné chování při výpadku sítě není ověřené.',
    decide: 'Má aplikace bez spojení rady vypnout, jak je navrženo? Je to konzervativní volba.'
  },

  /* ---------- Dějství 4 — když se něco pokazí ---------- */
  'safety-sections': {
    title: 'Bezpečnostní plán bez vymyšleného klinického obsahu',
    level: 'otevrene',
    what: 'Oblasti jsou vyjmenované, ale konkrétní meze, prahy a postupy chybějí a je to tak označené.',
    why: 'Struktura je náš návrh, obsah patří garantovi. Vyplnit prahy vlastní úvahou by bylo nejrychlejší a nejhorší možné řešení.',
    risk: 'Odvrací to, aby maketa vypadala jako hotový klinický postup a někdo se podle ní zařídil.',
    sim: 'Texty v oblastech jsou zástupné. Žádný práh, žádná dávka, žádná léčebná instrukce. Kontakt je zobrazený postup, ne funkční tlačítko — nikde není číslo, které by šlo vytočit.',
    decide: 'Kdo dodá konkrétní formulace, meze a kontaktní postupy a kdo je schválí.'
  },
  'unclear-split': {
    title: 'Aktuální problém a zpětná otázka jsou dvě různé věci',
    level: 'zasada',
    what: 'Rozcestí je ruční. Aplikace netřídí závažnost podle naměřených čísel.',
    why: 'Automatické třídění závažnosti by byla vlastní akutní detekce. Tu zajišťuje systém výrobce senzoru, ne NutriFee.',
    risk: 'Odvrací to, aby pacient v akutní situaci skončil ve frontě zpětných dotazů.',
    sim: 'Uložená otázka se nikam neodesílá a nikdo na ni nečeká.'
  },
  'datastate-cause': {
    title: 'Chybějící data, porucha senzoru a neznámá příčina',
    level: 'zasada',
    what: 'Aplikace ukáže přesný čas svých posledních dat a zeptá se pacienta, co vidí on. Tři odpovědi vedou ke třem různým textům.',
    why: 'To, že data chybí v NutriFee, neznamená poruchu senzoru. Akutní upozornění zajišťuje systém výrobce; naše data mohou být opožděná.',
    risk: 'Odvrací dvě chyby najednou: tvrzení o poruše, kterou nevidíme, a mlčení o tom, že nám data chybí. Chybějící body zůstanou mezerou a nedopočítávají se.',
    sim: 'Tok dat i jeho obnovení ovládá prezentující.',
    decide: 'Jak dlouhá absence dat je ještě běžná a kdy má aplikace pacienta aktivně upozornit.'
  },
  'resume-conditions': {
    title: 'Obnovení jen po ověření lékařem',
    level: 'otevrene',
    what: 'Pozastavený úkol se neobnoví uplynutím času ani návratem dat. Lékař musí ověřit aktuálnost plánu a vybrat důvod z připravených.',
    why: 'Technické obnovení není klinické obnovení. Návrat dat neznamená konec nemoci.',
    risk: 'Odvrací automatický restart úkolu ve stavu, který nikdo neposoudil.',
    sim: 'Jde o konzervativní variantu pro demonstraci.',
    decide: 'Které stavy pozastavují úkol, kdo jej obnovuje a za jakých podmínek.'
  },

  /* ---------- Dějství 4 — katalog pravidel ---------- */
  'rule-group-vyhodnoceni': {
    title: 'Co garant podepisuje u výpočtu',
    level: 'otevrene',
    what: 'Dva výpočty: jak se počítá reakce na jídlo a jak se hledá podobné jídlo.',
    why: 'Vzestup jednoho záznamu je rozdíl mezi nejvyšší hodnotou glukózy do dvou hodin po jídle a hodnotou v okamžiku jídla. Obvyklý vzestup jídla je medián těchto rozdílů ze všech jeho úplných záznamů — medián, ne průměr, aby jeden mimořádný den výsledek nepřevážil.',
    risk: 'Počítají se jen úplné záznamy mimo období nemoci. Záznam bez údaje o inzulinu nebo s mezerou v datech ze senzoru se vynechá, protože by výsledek posunul, aniž by kdokoli věděl o kolik.',
    decide: 'Je vzestup do dvou hodin správná míra reakce? Od kolika záznamů je jídlo známé? Jaký je práh podobnosti?'
  },
  'rule-group-rady': {
    title: 'Co garant podepisuje u rad',
    level: 'otevrene',
    what: 'Text každé rady a podmínku, za které se smí nabídnout — zvlášť podmínku vůči podání inzulinu.',
    why: 'Rada se nabídne jen tehdy, když má svůj řádek schválenou verzi, jídlo je známé a podmínka vůči inzulinu je splněná. Tři podmínky, všechny viditelné.',
    risk: 'Rady, které mění množství sacharidů, jen před podáním inzulinu. Neuvedený stav podání se posuzuje jako „už podáno“.',
    decide: 'Které rady patří do první studie a jaká je hranice pohybu po podání inzulinu. Procházka po jídle je v maketě návrh bez hodnot a k pacientovi se nedostane.'
  },
  'rule-group-ukoly': {
    title: 'Co garant podepisuje u úkolů',
    level: 'otevrene',
    what: 'Které úkoly smí lékař vybrat a kdy smí zadat úkol na změnu režimu.',
    why: 'Úkol jde přiřadit jen tehdy, má-li jeho pravidlo schválenou verzi. Tím se katalog úkolů a katalog pravidel drží v souladu bez ručního hlídání.',
    risk: 'Úkolem na změnu režimu se nikdy nemění dávka inzulinu. Vydává ho výhradně lékař na kontrole.',
    decide: 'Kdy je na místě zjednodušit cíl místo toho, aby se přidávaly další rady.'
  },

  /* ---------- Dějství 5 — kontrola ---------- */
  'onepage-question': {
    title: 'Otázka pacienta je kontext celého reportu',
    level: 'navrh',
    what: 'To, na co se pacient ptá, je hned v hlavičce, ne až na konci.',
    why: 'Odlišovač NutriFee je propojení konkrétní otázky pacienta, jeho zkušenosti a rozhodnutí na kontrole do jednoho doloženého cyklu. Když otázka není vidět první, zbyde z reportu další výpis dat.',
    risk: 'Odvrací to, aby se report stal duplikátem výstupu výrobce senzoru.'
  },
  'onepage-1': {
    title: 'Pořadí reportu je pevné',
    level: 'navrh',
    what: 'Čtyři části vždy ve stejném pořadí: období a data, plán a jak probíhal, reakce na jídla, fungovaly rady. Pořadí se nemění podle toho, co je zrovna k dispozici.',
    why: 'Pevné pořadí umožňuje lékaři číst podklad rutinně a nehledat. Bezpečnost a dostupnost dat jsou první, protože rozhodují, zda má smysl pokračovat běžnou kontrolou.',
    risk: 'Prázdná část se nevyplňuje. Chybějící údaj se napíše jako chybějící, nikdy jako nula.',
    decide: 'Stačí navržené pořadí a rozsah? Je to náš návrh, ne ověřená klinická praxe.'
  },
  'onepage-2': {
    title: 'Předepsáno, zaznamenáno a ověřeno jsou tři různé věci',
    level: 'zasada',
    what: 'Report odděluje, co je předepsáno, co zaznamenal pacient a co je nezávisle ověřeno. U posledního je napsáno „nemáme údaj“.',
    why: 'Splynutí těchto tří údajů je klinicky nebezpečné. Aplikace nemá jak podání ověřit a nesmí to předstírat.',
    risk: 'Odvrací závěr o tom, jak pacient dodržuje léčbu, postavený na jeho vlastním zápisu.',
    sim: 'Nezávislé ověření podání v maketě neexistuje a ani se nesimuluje. Odhad sacharidů vychází z katalogu jídel a zvolené porce, ne z vážení.'
  },
  'onepage-4': {
    title: 'Reakce na jednotlivá jídla',
    level: 'navrh',
    what: 'U každého jídla počet zápisů, počet úplných, úroveň jistoty, obvyklý vzestup a co u něj pomohlo.',
    why: 'Tohle je věc, kterou lékař jinde nedostane: ne průměr za období, ale reakce na konkrétní jídlo, které pacient opravdu jí.',
    risk: 'U jídla, které není známé, se místo čísla napíše „bez čísla“. Jde o pacientovu minulost, ne o předpověď.',
    decide: 'Je tahle tabulka pro rozhodování na kontrole užitečná, nebo je jí moc?'
  },
  'onepage-5': {
    title: 'Přijato oproti nepřijato',
    level: 'navrh',
    what: 'Srovnání vzestupu tam, kde pacient radu přijal, s tím, kde ji nepřijal — plus nejčastější důvod odmítnutí.',
    why: 'Je to jediné číslo, které lékaři řekne, jestli rada vůbec funguje. Bez něj by se jen počítalo, kolikrát se pacient zachoval podle aplikace.',
    risk: 'Srovnání je z malého počtu záznamů jednoho pacienta a nerozlišuje další vlivy. Ukazuje směr, ne důkaz účinku — a je to u něj napsané.',
    decide: 'Stačí tenhle počet záznamů k rozhodnutí? Jak poznat radu, která je nepraktická, od rady, kterou pacient nechce?'
  },
  'decide-reasons': {
    title: 'Důvod rozhodnutí se vybírá, nepíše',
    level: 'zasada',
    what: 'Lékař vybere rozhodnutí a k němu důvod z připravených formulací.',
    why: 'Základní cesta nevyžaduje psaní. Předem daný seznam důvodů se navíc dá vyhodnotit napříč studií — volný text ne.',
    risk: 'Užitečný výsledek může být i „pokračovat beze změny“ nebo „podkladů je zatím málo“. Nucená změna by byla horší než žádná.',
    decide: 'Je seznam důvodů úplný? Chybí mezi nimi něco, co by lékař potřeboval říct?'
  },
  'newplan-diff': {
    title: 'Historie zůstává u plánu, za kterého vznikla',
    level: 'zasada',
    what: 'Pacient vidí rozdíl proti předchozímu plánu slovně. Starší záznamy zůstávají navázané na plán, za kterého vznikly.',
    why: 'Přepnutí historie na nový plán by zpětně změnilo význam starých dat.',
    risk: 'Odvrací vykazování starších záznamů jako plnění nového plánu.',
    sim: 'V ukázce se léčba nemění. Tím jde ukázat hodnotu cyklu bez simulování léčebného účinku nové dávky.'
  },
  'edge-case': {
    title: 'Okrajové stavy bez dalšího velkého modulu',
    level: 'navrh',
    what: 'Každá situace odpovídá na tři otázky: co se změnilo, co lze dál dělat a kdo řeší další krok.',
    why: 'Organizační pravidlo nepotřebuje samostatný modul. Potřebuje jasný stav a jasného adresáta dalšího kroku.',
    risk: 'Odvrací závěr z neaktivity. Neaktivita není rozhodnutí pacienta ani zdravotní událost. Při ukončení účasti se rozlišuje ukončení, druhotné použití dat a požadavek na výmaz — bez slibu, že se vymaže všechno.',
    decide: 'Které z těchto situací musí být v pilotu vyřešené organizačně a které produktově. Právní režim vyžaduje samostatné posouzení; pseudonymizace není anonymizace.'
  }
};

})(typeof window !== 'undefined' ? window : globalThis);
