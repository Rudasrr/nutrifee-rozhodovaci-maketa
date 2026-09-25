/* Průvodce maketou — vysvětlení a obhajoba návrhu pro prezentující a hodnotitele.
   NENÍ součástí budoucí produkční aplikace a nepatří do běžné uživatelské nápovědy.
   Texty jsou pevné a zkontrolovatelné; nevytváří je žádná živá generativní AI.

   level: 'zasada'  = zásada ze zadání (závazné, zachovat)
          'navrh'   = návrh k posouzení (demonstrace, ne schválené klinické pravidlo)
          'otevrene'= otevřené rozhodnutí (nevybírat potichu za garanta)
   Pole: what / why / risk / sim / decide — vyplněná podle relevance. */
(function (global) {
'use strict';
var G = global.NutriFeeGuideContent = {};

G.levels = {
  zasada: { label: 'Zásada ze zadání', cls: 'lvl-zasada' },
  navrh: { label: 'Návrh k posouzení', cls: 'lvl-navrh' },
  otevrene: { label: 'Otevřené rozhodnutí', cls: 'lvl-otevrene' }
};

G.topics = {

  /* ---- ordinace: zařazení a zaučení ---- */
  'enroll-eligibility': {
    title: 'Cesta začíná u lékaře',
    level: 'zasada',
    what: 'První obrazovkou celé makety je zařazení pacienta v ordinaci. Lékař potvrdí čtyři kritéria kohorty; bez nich se nepokračuje.',
    why: 'Pacient si na začátku nevymýšlí klinický cíl. Posoudit kontext a vydat plán je krok lékaře — proto tu pacient nic nevyplňuje dřív, než lékař vstoupí do hry.',
    risk: 'Odvrací zařazení mimo kohortu a plán vydaný bez posouzení. Nepotvrzené kritérium není „skoro splněné“ — zařazení prostě nepokračuje.',
    sim: 'Kritéria jsou čtyři zaškrtávátka. Skutečná kontrola proti dokumentaci se nesimuluje.',
    decide: 'Přesná definice stability režimu a praktická vstupní kritéria. V maketě jsou čtyři body — to je náš návrh, ne schválený protokol.'
  },
  'enroll-context': {
    title: 'Co lékař ví, se nevypisuje',
    level: 'zasada',
    what: 'Diagnóza, režim, senzor, poslední HbA1c a seznam léčby jsou na kartě. Obrazovka je zobrazuje, lékař je nepřepisuje.',
    why: 'Lékař nemá čas psát texty. Úspora jeho práce je v tomto programu rovnocenná pomoci pacientovi — kdyby zařazení znamenalo přepisování známých údajů, program by práci přidal, ne ubral.',
    risk: 'Odvrací duplicitní evidenci vedle zdravotnické dokumentace a s ní i riziko, že se obě rozejdou.',
    sim: 'Údaje jsou syntetické a jen zobrazené. Žádné napojení na dokumentaci neexistuje a maketa z nich nepočítá.',
    decide: 'Které údaje by se v provozu skutečně přenesly z karty a kdo odpovídá za jejich aktuálnost. K ověření.'
  },
  'enroll-compensation': {
    title: 'Kompenzace je posouzení lékaře, ne výpočet',
    level: 'navrh',
    what: 'Dvě tlačítka: nedostatečná, nebo přijatelná. Nic víc.',
    why: 'Lékař tohle o pacientovi ví dřív, než se posadí. Stačí to zaznamenat jedním kliknutím, aby se to dalo přenést do podkladu na příští kontrolu.',
    risk: 'Aplikace kompenzaci nepočítá ani neodvozuje z dat. Kdyby to dělala, byl by z toho klinický závěr bez opory.',
    decide: 'Zda dvě hodnoty stačí, nebo je potřeba jemnější škála. Návrh k posouzení.'
  },
  'task-catalog': {
    title: 'Úkoly jsou předem definované; lékař vybírá',
    level: 'zasada',
    what: 'Katalog nabízí připravené pozorovací úkoly. Každý má hotovou otázku pacienta, podmínky, minimum epizody a odhad zátěže. Lékař klikne na jeden.',
    why: 'Základní cesta nevyžaduje psaní. Kdyby si lékař úkol formuloval sám, vznikl by u každého pacienta jiný text, který nikdo neschválil a který nejde vyhodnotit napříč studií.',
    risk: 'Úkol s neschváleným pravidlem nelze přiřadit — je v katalogu vidět, ale nejde vybrat. Neschválené pravidlo se tak nedostane k pacientovi ani omylem.',
    sim: 'Katalog má tři položky, z toho jednu se schváleným pravidlem. Skutečný rozsah katalogu je otevřený.',
    decide: 'Které pozorovací úkoly patří do první studie a kolik jich má být. To je první otázka rozhodovacího listu.'
  },
  'training-sensor': {
    title: 'Připojení senzoru je simulované',
    level: 'zasada',
    what: 'Obrazovka to říká přímo: žádná data se nepřenášejí a žádná integrace neexistuje.',
    why: 'Konkrétní senzor a jeho oficiální datová cesta jsou blokátor před stavbou. Maketa smí cestu pouze výslovně simulovat.',
    risk: 'Odvrací dojem, že je integrace hotová nebo prokázaná jako proveditelná.',
    sim: 'Celé připojení. Latence, spolehlivost ani licence se neřeší.',
    decide: 'Který senzor, jaká datová cesta a za jakých licenčních podmínek.'
  },
  'training-steps': {
    title: 'Zaučení je podmínka, ne formalita',
    level: 'navrh',
    what: 'Čtyři konkrétní věci, které pacient v ordinaci předvede. Dokud některá chybí, zaučení nelze označit za dokončené.',
    why: 'Počáteční edukace je u nově zavedeného senzoru součástí standardu péče. Kdyby stačilo jedno zaškrtnutí, byl by z toho doklad bez obsahu.',
    risk: 'Při nezvládnutém zaučení se plán nevydá a žádný klinický úkol se neaktivuje. Pacient se nevykazuje jako úspěšně zařazený — to je jinak snadný způsob, jak si nafouknout čísla pilotu.',
    sim: 'Body zaškrtává prezentující. Skutečné ověření dovednosti se nesimuluje.',
    decide: 'Kdo řeší neúspěšné zaučení a co se s takovým pacientem děje dál. Opora pro rozsah edukace: ADA, Standards of Care 2026 — konkrétní podoba je k ověření.'
  },

  /* ---- jeden aktivní úkol a jeho dokončení ---- */
  'today-primary': {
    title: 'Jeden aktivní úkol',
    level: 'zasada',
    what: 'Pacient vidí právě jeden úkol a jednu hlavní akci. Žádný seznam modulů, žádné skóre, žádný povinný deník všech jídel.',
    why: 'Hodnota se tu má prokázat na jedné uzavřené otázce, ne na množství funkcí. Jeden úkol drží cyklus otázka → sběr → poctivý závěr → rozhovor na kontrole čitelný pro pacienta i pro lékaře.',
    risk: 'Odvrací riziko, že se z aplikace stane deník bez závěru a že se zátěž pacienta i ambulance zvýší bez doložitelného přínosu.',
    decide: 'Které pozorovací úkoly patří do prvního katalogu a kolik jich smí být souběžně. Model jednoho aktivního úkolu je náš návrh, ne klinicky ověřený fakt.'
  },
  'today-counts': {
    title: 'Zaznamenané a úplné epizody odděleně',
    level: 'zasada',
    what: 'Dvě čísla vedle sebe: kolik epizod je zaznamenaných a kolik z nich má potřebný kontext.',
    why: 'Jedno souhrnné číslo by smíchalo „pacient nic nezapsal“ a „pacient zapsal, ale chybí údaj o inzulinu“. To jsou různé situace s různým dalším krokem.',
    risk: 'Chybějící údaj není nula. Sloučené počitadlo by z mezery udělalo domnělé selhání pacienta.',
    decide: 'Co přesně je minimální úplná epizoda a při jakém počtu úplných epizod lze úkol uzavřít věcným závěrem. V maketě jsou to dvě — hodnota je k ověření.'
  },
  'task-done': {
    title: 'Dokončení ukončí požadavek na zapisování',
    level: 'zasada',
    what: 'Po dokončení úkolu obrazovka jasně říká, že pro tento úkol už není třeba nic zapisovat, a ukazuje termín kontroly.',
    why: 'Bez zřetelného konce by aplikace mlčky pokračovala v očekávání záznamů. Konec úkolu je stejně důležitý jako jeho začátek.',
    risk: 'Odvrací nekonečné sbírání dat bez rozhodnutí a automatický přechod na nový léčebný úkol, který nikdo nevydal.',
    sim: 'Termín kontroly je fiktivní. Žádná připomínka se neodesílá.'
  },
  'conclude-options': {
    title: 'Závěr píše pacient',
    level: 'navrh',
    what: 'Nabídnuté věty jsou východisko, které pacient upraví nebo přepíše.',
    why: 'Ověřovat se má, zda pacient vlastními slovy vysvětlí, co se dozvěděl a co z dat rozhodnout nelze. Předvyplněný nezměnitelný závěr by to znemožnil.',
    risk: 'Aplikace nesmí za pacienta tvrdit příčinu ani budoucí účinek.',
    decide: 'Zda nabízené formulace vůbec mají být předpřipravené, nebo zda má být pole prázdné. K ověření s reálnými pacienty.'
  },

  /* ---- úplnost epizod, původ údajů a nejistota závěrů ---- */
  'episode-insulin': {
    title: 'Volba „nevím“ je legitimní údaj',
    level: 'zasada',
    what: 'Pacient volí „podal jsem podle plánu“, „nepodal jsem“, nebo „nevím“. Při „nevím“ se nic nedopočítává.',
    why: 'Vynucená odpověď by vyrobila nepravdivý kontext. Poctivá mezera je pro rozhodnutí lékaře cennější než domyšlený údaj.',
    risk: 'Odvrací nejzávažnější tichou chybu: epizodu, která vypadá úplně, ale stojí na odhadu.',
    decide: 'Jaké minimum údajů musí epizoda mít, aby ji šlo použít ke klinické rozvaze.'
  },
  'episode-desc': {
    title: 'Podobnost jídla je pacientský údaj',
    level: 'zasada',
    what: 'Předvyplněný popis lze změnit. Text výslovně uvádí, že obvyklou porci označuje pacient.',
    why: 'Nemáme objektivní složení ani gramáž. Tvrdit shodu jídel by bylo nepodložené.',
    risk: 'Bez tohoto rozlišení by rozdíl mezi průběhy vypadal jako důkaz o potravině. Žádné univerzální skóre potravin ani kalorie maketa nepoužívá.',
    sim: 'Body křivky u ručně zapsané epizody jsou pevná syntetická čísla, ne měření.'
  },
  'compare-sentence': {
    title: 'Poctivý závěr místo interpretace',
    level: 'zasada',
    what: 'Věta uvádí počet zaznamenaných a počet úplných průběhů, konstatuje rozdíl a výslovně říká, že příčinu neznáme a nejde o předpověď.',
    why: 'Toto je jádro hodnotového tvrzení: pacient má odejít s tím, co ví, i s tím, co z dat rozhodnout nelze.',
    risk: 'Odvrací nejběžnější selhání podobných aplikací — vysvětlení příčiny, které data neunesou.',
    decide: 'Zda je tato míra opatrnosti pro pacienta srozumitelná, nebo demotivující. K ověření.'
  },
  'compare-list': {
    title: 'Původ údaje u každé epizody',
    level: 'zasada',
    what: 'U každé epizody je čas jídla, čas zápisu, čas importu senzorového úseku a označení, zda chybí kontext.',
    why: 'Lékař na kontrole potřebuje vědět, odkud údaj je a kdy vznikl. Čas události, čas zápisu a čas importu jsou tři různé věci.',
    risk: 'Bez rozlišení časů nelze poznat zpětné dopisování ani opožděný import.',
    sim: 'Import je simulovaný; žádná datová cesta k výrobci senzoru neexistuje.'
  },

  /* ---- předepsáno / pacientem zaznamenáno / ověřeně podáno ---- */
  'onepage-2': {
    title: 'Tři různé informace o dávce',
    level: 'zasada',
    what: 'Část 2 odděluje „předepsáno“, „pacientem zaznamenáno“ a „nezávisle ověřeno“. U posledního je uvedeno „nemáme údaj“.',
    why: 'Splynutí těchto tří údajů je klinicky nebezpečné. Aplikace nemá jak podání ověřit a nesmí to předstírat.',
    risk: 'Odvrací závěr o adherenci postavený na pacientském zápisu.',
    sim: 'Nezávislé ověření podání v této maketě neexistuje a ani se nesimuluje.',
    decide: 'Zda by pilot vůbec měl usilovat o nezávislé doložení podání a jakou cestou. K ověření.'
  },
  'issue-medication': {
    title: 'Seznam léčby je podklad k ověření',
    level: 'zasada',
    what: 'Pacient seznam vyplní, lékař jej na návštěvě ověří zaškrtnutím. Bez toho plán nelze vydat.',
    why: 'Pacientský soupis není předpis. Vydání plánu bez ověření by vytvořilo dojem, že aplikace zná aktuální léčbu.',
    risk: 'Odvrací záměnu pacientského údaje za klinický vstup.',
    sim: 'Ověření je jedno zaškrtnutí. Skutečná kontrola proti dokumentaci se nesimuluje.'
  },

  /* ---- historická křivka oproti předpovědi ---- */
  'onepage-3': {
    title: 'Historická agregace, žádná předpověď',
    level: 'zasada',
    what: 'Senzorový souhrn za uzavřené období s dostupností dat, TIR, časem pod a nad rozmezím. Žádné budoucí pásmo.',
    why: 'Zadání zakazuje predikce a predikční pásma. Graf i souhrn ukazují jen to, co se stalo.',
    risk: 'Předpovědní křivka by vypadala jako klinický nástroj a mohla by ovlivnit rozhodnutí o dávce.',
    sim: 'Hodnoty 91 %, 62 %, 2 % a 36 % jsou předem vložené syntetické údaje. Nejsou vypočtené z pěti bodů snídaňových epizod. Tři časové kategorie dávají 100 %; dostupnost dat je jiný ukazatel a do součtu nevstupuje.',
    decide: 'Cílové rozmezí 3,9–10,0 mmol/l je zde jen modelové nastavení pro konzistenci dat, nikoli individuální doporučení.'
  },

  /* ---- hranice mezi pozorováním a změnovou radou ---- */
  'prep-blocked': {
    title: 'Pacient nevydá plán',
    level: 'zasada',
    what: 'Tlačítko „Začít úkol“ je nedostupné a text uvádí konkrétní chybějící krok: plán zatím nevydal lékař.',
    why: 'Cesta začíná u lékaře. Pacient si na začátku nevymýšlí klinický cíl.',
    risk: 'Odvrací aktivaci klinického úkolu bez vydaného plánu.',
    sim: 'Blokace je skutečná logika jádra, ne jen vypnuté tlačítko — potvrzuje ji automatický test.'
  },
  'today-unsure': {
    title: 'Pozorování a změnová rada jsou oddělené',
    level: 'zasada',
    what: 'Výchozí úkoly jsou pozorovací. Změnová rada k jídlu nebo pohybu se nabízí jen před bolusem a jen v mezích lékařova plánu a schváleného pravidla.',
    why: 'Neznámý stav podání není „před bolusem“. Samotný čas před bolusem nezakládá oprávnění — musí k němu být i plán, který radu povoluje, a použitelná verze pravidla.',
    risk: 'Odvrací radu vydanou mimo klinické meze nebo po podání dávky, kdy už ji nelze bezpečně zohlednit.',
    decide: 'Kdy lze bezpečně nabídnout změnový úkol a které úkoly do první studie vůbec patří.'
  },
  'help-split': {
    title: 'Technická pomoc není zdravotní kontakt',
    level: 'navrh',
    what: 'Dvě oddělené cesty: podpora aplikace a zdravotní kontakt podle bezpečnostního plánu.',
    why: 'Pacient v nejistotě sáhne po prvním tlačítku. Pokud technická podpora vypadá jako ordinace, zdrží se řešení zdravotní situace.',
    risk: 'Odvrací záměnu rolí a falešné očekávání, že „někdo v aplikaci“ odpoví na zdravotní dotaz.',
    decide: 'Kdo v provozu skutečně drží obě linky a v jakém čase. K ověření.'
  },
  'understand-answer': {
    title: 'Ověření porozumění, které neznámkuje',
    level: 'navrh',
    what: 'Jedna otázka. Odpověď „ano“ otevře vysvětlení a návrat; „ne“ umožní pokračovat. Žádné hodnocení, žádné body.',
    why: 'Cílem je předejít nejčastějšímu nedorozumění — že zápis je zpráva ordinaci. Zkouška se známkou by pacienta jen naučila hádat správnou odpověď.',
    risk: 'Odvrací falešné očekávání dohledu, které je v této službě bezpečnostní otázka, ne detail.',
    decide: 'Kolik otázek a jaké téma má ověření porozumění obsahovat. Jedna otázka je náš návrh.'
  },

  /* ---- bezpečnostní plán, výpadek dat, absence průběžného dohledu ---- */
  'safety-sections': {
    title: 'Bezpečnostní plán bez vymyšleného klinického obsahu',
    level: 'otevrene',
    what: 'Šest oblastí je vyjmenovaných, ale konkrétní meze, prahy a postupy chybějí a jsou tak označené.',
    why: 'Struktura je návrh, obsah patří garantovi. Vyplnit prahy vlastní úvahou by bylo nejrychlejší a nejhorší možné řešení.',
    risk: 'Odvrací to, že by maketa vypadala jako hotový klinický postup a někdo by se podle ní zařídil.',
    sim: 'Texty v sekcích jsou zástupné. Žádný práh, žádná dávka, žádná léčebná instrukce.',
    decide: 'Kdo dodá konkrétní formulace, meze a kontaktní postupy a kdo je schválí.'
  },
  'safety-contact': {
    title: 'Kontakt jako postup, ne jako tlačítko na číslo',
    level: 'zasada',
    what: 'Tlačítko se jmenuje „Ukázat kontaktní postup“. Nezobrazuje se žádné číslo, které by šlo vytočit, a nikde nevzniká stav „ordinace informována“.',
    why: 'Fiktivní číslo v maketě je riziko samo o sobě. A především: nikdo pacienta průběžně nesleduje.',
    risk: 'Odvrací falešný dojem odeslané zprávy a čekání na odpověď.',
    sim: 'Kontaktní postup je zobrazený text. Nic se neodesílá.'
  },
  'datastate-cause': {
    title: 'Výpadek dat, porucha senzoru a neznámá příčina',
    level: 'zasada',
    what: 'Aplikace ukáže přesný čas posledních vlastních dat a zeptá se pacienta, co vidí on. Tři odpovědi vedou ke třem různým textům.',
    why: 'Absence dat v NutriFee neznamená poruchu senzoru. Akutní alarmy zajišťuje systém výrobce; naše data mohou být opožděná.',
    risk: 'Odvrací dvě chyby: tvrzení o poruše, kterou nevidíme, a mlčení o tom, že nám data chybí.',
    sim: 'Datový tok i jeho obnovení ovládá prezentující. Žádné napojení na senzor neexistuje.',
    decide: 'Jak dlouhá absence dat je ještě běžná a kdy má aplikace pacienta aktivně upozornit. K ověření.'
  },
  'unclear-split': {
    title: 'Aktuální problém versus zpětná otázka',
    level: 'zasada',
    what: 'Rozcestí je ruční. Aplikace netřídí závažnost podle naměřených čísel.',
    why: 'Automatické třídění závažnosti by bylo vlastní akutní detekcí, kterou zadání zakazuje.',
    risk: 'Odvrací to, aby pacient v akutní situaci skončil ve frontě zpětných dotazů.',
    sim: 'Uložená otázka se nikam neodesílá a nikdo na ni nečeká.'
  },

  /* ---- pořadí jednostránkové kontroly ---- */
  'onepage-1': {
    title: 'Pořadí jedné stránky je pevné',
    level: 'navrh',
    what: 'Pět částí vždy ve stejném pořadí: bezpečnost a úplnost, plán a odchylky, cíle a TIR, nejvýše dva kontextové nálezy, otázka pacienta.',
    why: 'Pevné pořadí umožňuje lékaři číst podklad rutinně a nehledat. Bezpečnost je první, protože rozhoduje, zda má vůbec smysl pokračovat běžnou kontrolou.',
    risk: 'Pořadí podle dostupnosti dat by lékaře nutilo pokaždé znovu zjišťovat, co chybí.',
    decide: 'Stačí navržené pořadí a zdroje? Co je klinicky užitečný kontextový nález? Toto je náš návrh, ne ověřená klinická praxe.'
  },
  'onepage-4': {
    title: 'Nejvýše dva nálezy, prázdné místo se nevyplňuje',
    level: 'zasada',
    what: 'Nálezů může být nula, jeden nebo dva. Každý má zdroj, období a omezení. Druhý se nevynucuje.',
    why: 'Limit dva drží stránku čitelnou a brání tomu, aby se do podkladu dostal šum vydávaný za nález.',
    risk: 'Prázdné místo není požadavek vyrobit nález. Nulový deník nesmí blokovat návštěvu ani vytvořit hodnocení adherence.',
    decide: 'Zda je limit dva správný a co je ještě nález oproti pozorování bez hodnoty.'
  },
  'onepage-5': {
    title: 'Otázka pacienta je součástí podkladu',
    level: 'navrh',
    what: 'Poslední část stránky je hlavní otázka, kterou si pacient uložil.',
    why: 'Odlišovač NutriFee je propojení konkrétní otázky pacienta, jeho zkušenosti a rozhodnutí na kontrole do jednoho doloženého cyklu. Bez otázky by zbyl jen další výpis dat.',
    risk: 'Odvrací to, aby se z jedné stránky stal duplikát výstupu výrobce senzoru.',
    decide: 'Zda otázka patří na konec, nebo naopak na začátek stránky. K ověření s lékaři.'
  },

  /* ---- změny a předávání plánu ---- */
  'takeover-basics': {
    title: 'Autor, verze a účinnost vždy viditelné',
    level: 'zasada',
    what: 'Pacient vidí, kdo plán vydal, jakou má verzi, od kdy je účinný a do kdy platí.',
    why: 'Plán je klinický dokument. Bez autora a verze nelze později dohledat, podle čeho se pacient řídil.',
    risk: 'Odvrací nejasnost, který plán právě platí, zvlášť po vydání nového.'
  },
  'takeover-confirm': {
    title: 'Potvrzení převzetí není potvrzení porozumění všemu',
    level: 'zasada',
    what: 'Text pod tlačítkem to říká výslovně.',
    why: 'Zaškrtnutí „rozumím“ se v praxi klikne bez čtení. Nechceme z něj dělat důkaz porozumění.',
    risk: 'Odvrací falešný doklad edukace.',
    decide: 'Zda má být ověření porozumění podmínkou aktivace úkolu, nebo jen doporučené. V maketě je podmínkou.'
  },
  'newplan-diff': {
    title: 'Změny plánu ve větách, historie zůstává u starého plánu',
    level: 'zasada',
    what: 'Pacient vidí rozdíl slovně. Starší epizody zůstávají navázané na plán, za kterého vznikly.',
    why: 'Přepnutí historie na nový plán by zpětně změnilo význam starých dat.',
    risk: 'Odvrací nepravdivé vykazování starších záznamů jako plnění nového plánu.',
    sim: 'V ukázce je léčba beze změny. Tím lze ukázat hodnotu cyklu bez simulování léčebného účinku nové dávky.'
  },
  'decide-options': {
    title: 'Užitečný výsledek může být i „beze změny“',
    level: 'zasada',
    what: 'Čtyři možnosti: plán beze změny s upřesněním pozorování, úprava plánu, odebrání úkolu, nebo „zatím nelze rozhodnout“.',
    why: '„Plán beze změny“ a „nedostatek podkladů“ jsou legitimní a doložitelné výsledky cyklu. Nucená změna by byla horší než žádná.',
    risk: 'Editor plánu sám nesmí doporučit dávku. Žádné rozhodnutí aplikace nevytváří novou dávku.',
    decide: 'Jak se v pilotu pozná, že kontext pomohl — a jak se změří práce za celý cyklus, ne jen čas u obrazovky.'
  },
  'versions-trace': {
    title: 'Dohledatelnost bez živého dohledu',
    level: 'navrh',
    what: 'Lokální stopa demonstrace: kdy byl plán vydán, kdy úkol aktivován, pozastaven a obnoven.',
    why: 'Rozhodnutí o rozsahu studie potřebuje vidět, že stav je dohledatelný. Zároveň to není monitoring pacienta.',
    risk: 'Odvrací záměnu auditní stopy za zdravotní dohled.',
    sim: 'Stopa je jen v tomto prohlížeči. Nikam se neodesílá a nikdo ji nečte.'
  },
  'resume-conditions': {
    title: 'Obnovení jen po modelovém potvrzení lékařem',
    level: 'otevrene',
    what: 'Pozastavený úkol se neobnoví uplynutím času ani návratem dat. Lékař musí ověřit aktuálnost plánu.',
    why: 'Technické obnovení není klinické obnovení. Návrat dat neznamená konec nemoci.',
    risk: 'Odvrací automatický restart klinického úkolu ve stavu, který nikdo neposoudil.',
    sim: 'Jde o konzervativní demo variantu.',
    decide: 'Které stavy pozastavují úkol, kdo jej obnovuje a za jakých podmínek. Reálné podmínky určí garant.'
  },

  /* ---- schvalování a vyřazení pravidel ---- */
  'rule-approved': {
    title: 'Modelové schválení není skutečné schválení',
    level: 'zasada',
    what: 'Pravidlo má účel, populaci, vstupy, omezení, text pro pacienta, modelového schvalovatele a testovací příklady použití i nepoužití.',
    why: 'Klinická pravidla a formulace schvaluje garant. Neschválené pravidlo nemůže ovlivnit pacientský průchod.',
    risk: 'Odvrací to, aby se produktová formulace dostala k pacientovi jako klinický pokyn.',
    sim: 'Označení „modelově schváleno“ je stav fiktivního záznamu, ne rozhodnutí klinického garanta.'
  },
  'rule-draft': {
    title: 'Návrh v2 neovlivní aktivní úkol',
    level: 'zasada',
    what: 'Nová verze je návrh. Schválit ji lze až po projití testovacích příkladů; do té doby aktivní úkol běží podle v1.',
    why: 'Tichá výměna verze pod běžícím úkolem by znamenala, že se pacientovi změní pokyn bez rozhodnutí.',
    risk: 'Odvrací nekontrolovanou změnu klinického obsahu.',
    sim: 'Blokaci potvrzuje automatický test: neschválená v2 nenahradí v1.',
    decide: 'Zda má být povinné projít příklady i u drobné formulační opravy.'
  },
  'rule-retired': {
    title: 'Vyřazení pravidla nemění inzulin',
    level: 'zasada',
    what: 'Vyřazení pozastaví dotčený úkol a zobrazí seznam dopadu. Předpis plánu zůstává beze změny.',
    why: 'Pravidlo řídí edukační úkol, ne léčbu. Záměna by mohla vést k závěru, že se má měnit dávka.',
    risk: 'Seznam dopadu je seznam dotčených úkolů, ne živý monitoring zdravotního stavu.',
    sim: 'Akce je potvrzena uvnitř makety a nikam se neodesílá. Doručení změny do offline zařízení se nepotvrzuje.',
    decide: 'Kdo v provozu řeší nedoručenou aktualizaci a jakou organizační cestou.'
  },
  'rule-concept': {
    title: 'Koncept není pravidlo',
    level: 'otevrene',
    what: 'Koncept má stav „neschválený koncept“ a nelze jej aktivovat.',
    why: 'Oddělení konceptu od katalogu drží hranici mezi tím, o čem se diskutuje, a tím, co může potkat pacienta.',
    decide: 'Zda koncept vůbec pokračuje, nebo zůstane mimo první studii.'
  },

  /* ---- dávkové podklady a samotitrace ---- */
  'dose-basis': {
    title: 'Dávkové podklady jsou oddělená otevřená varianta',
    level: 'otevrene',
    what: 'Dvě karty: vzorce s nejistotou a otázkou, nebo struktura číselného podkladu s prázdným polem pro obsah od garanta.',
    why: 'Zadání výslovně žádá, aby číselný dávkový podklad nebyl nenápadně součástí základního průchodu. Proto je jen v panelu lékaře a prezentujícího.',
    risk: 'Žádné číslo nevymýšlíme a žádný výpočet neimplementujeme. Případný dodaný statický obsah se nesmí automaticky přenést do plánu ani být dostupný v pacientské roli.',
    sim: 'Obě karty jsou prázdné struktury. Není za nimi žádná logika.',
    decide: 'Pouze vzorce a otázky, nebo i předem odborně připravený číselný podklad? Přesná slučitelnost číselné varianty se zákazem výpočtu dávky je otevřené rozhodnutí, nikoli vyřešený návrh.'
  },
  'decision-samotitrace': {
    title: 'Samotitrace: rozhodnutí, ne implementace',
    level: 'otevrene',
    what: 'Koncepční větev ukazuje jen potřebná pole protokolu a stop-situace. Hodnoty jsou „k doplnění garantem“.',
    why: 'Rozhodnutí o samotitraci se nesmí zaměnit s rozhodnutím o katalogu edukace. Proto je ve zcela oddělené větvi.',
    risk: 'Pokud by samotitrace vyžadovala, aby NutriFee dávku vypočítala nebo sama změnila, je mimo zadání. Rozpor nelze vyřešit skrytým algoritmem ani statickou tabulkou, která provádí tutéž volbu.',
    sim: 'Koncepční pacientský náhled je dostupný pouze uvnitř panelu variant a je trvale označený jako neaktivní.',
    decide: 'Mimo první studii, samostatná větev k dopracování, nebo odklad rozhodnutí?'
  },

  /* ---- ukončení účasti a okrajové stavy ---- */
  'participation-end': {
    title: 'Ukončení účasti',
    level: 'navrh',
    what: 'Úkoly a připomínky se zastaví, zobrazí se modelové předání pokynů a informace o dostupnosti dokumentů.',
    why: 'Odchod ze služby je stejně důležitý stav jako vstup. Bez něj by aplikace tiše pokračovala v očekávání záznamů.',
    risk: 'Odvrací závěr z neaktivity. Neaktivita není rozhodnutí pacienta ani zdravotní událost.',
    decide: 'Jak se liší ukončení účasti, druhotné použití dat a požadavek výmazu. Právní režim vyžaduje samostatné posouzení; pseudonymizace není anonymizace.'
  },
  'edge-case': {
    title: 'Okrajové stavy bez dalšího velkého modulu',
    level: 'navrh',
    what: 'Každá situace odpovídá na tři otázky: co se změnilo, co lze dál dělat a kdo řeší další krok.',
    why: 'Organizační pravidlo nepotřebuje samostatný modul. Potřebuje jasný stav a jasného adresáta dalšího kroku.',
    risk: 'Odvrací růst rozsahu na pátý hlavní scénář.',
    sim: 'Situace se zapínají v panelu prezentujícího a mění jen stav této demonstrace.',
    decide: 'Které z těchto situací musí být v pilotu vyřešené organizačně a které produktově.'
  },

  /* ---- doplňkové ---- */
  'plan-strip': {
    title: 'Který plán právě platí',
    level: 'zasada',
    what: 'Pruh nad obsahem uvádí platný plán, jeho verzi a účinnost.',
    why: 'Po vydání nového plánu musí být bez hledání jasné, který teď platí.',
    risk: 'Odvrací záměnu starého a nového plánu v období předání.'
  },
  'patient-nav': {
    title: 'Čtyři místa, žádné skryté funkce',
    level: 'navrh',
    what: 'Dnes, Moje záznamy, Plán, Bezpečí. Bezpečnostní plán je dosažitelný odkudkoli.',
    why: 'Trvale dosažitelný bezpečnostní a kontaktní plán je požadavek zadání, ne volitelná položka menu.',
    decide: 'Zda je rozdělení na čtyři místa pro cílovou skupinu srozumitelné. K ověření.'
  },
  'prep-circumstances': {
    title: 'Okolnosti sbíráme omezeně',
    level: 'navrh',
    what: 'Dvě volná pole místo dotazníku.',
    why: 'Omezený sběr kontextu je součást mechanismu hodnoty. Delší dotazník by zvýšil zátěž bez důkazu přínosu.',
    decide: 'Jaký je rozumný rozsah vstupních údajů před vydáním plánu.'
  },
  'prep-medication': {
    title: 'Seznam léčby vyplňuje pacient',
    level: 'zasada',
    what: 'Pole je označené jako podklad k ověření lékařem, ne jako nový předpis.',
    why: 'Aplikace nesmí vytvářet dojem, že zná a spravuje léčbu.',
    risk: 'Odvrací záměnu pacientského soupisu za platný předpis.'
  },
  'today-after-done': {
    title: 'Co bude dál',
    level: 'navrh',
    what: 'Po dokončení úkolu je vidět termín kontroly a co se na ní bude probírat.',
    why: 'Bez dalšího kroku by pacient nevěděl, zda má něco dělat. Zároveň jej nevyzýváme k dodatečnému odhadování minulých jídel.',
    sim: 'Termín je fiktivní a žádná připomínka se neodesílá.'
  },
  'issue-safety': {
    title: 'Bezpečnostní plán je podmínkou vydání',
    level: 'zasada',
    what: 'Bez potvrzení předání bezpečnostního a kontaktního plánu nelze plán vydat.',
    why: 'Trvale dosažitelný bezpečnostní plán je vstupenka, ne doplněk.',
    risk: 'Odvrací aktivní úkol bez dostupného postupu pro mimořádnou situaci.'
  }
};

})(typeof window !== 'undefined' ? window : globalThis);
