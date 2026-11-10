# Poslední kontrola: skutečný život pacienta (SCHEMA 89)

*10. 11. 2026 · úhel: pacient 55–75 let, není technicky zdatný, hůř vidí a nepočítá sacharidy · nic se neměnilo*

## Jak jsem kontroloval

- Kopie `maketa-rozhodovaci/` (SCHEMA 89) ve scratchpadu `k36-pacient/`. Maketa běžela přes `python3 -m http.server 8901`, prohlížeč Playwright na šířce 390 px (mobil, dotyk), přihlášení bylo falešné a síť na Supabase zablokovaná. Skutečné Supabase se nevolalo a nezadávalo se žádné heslo.
- **Průchod příběhem:** scény 5–20, 25, 28 a 31 krok za krokem v roli pacienta, celkem 99 stavů. U každého stavu se zapsal text, počet slov, výška obrazovky, písmo pod 16 px a cíle klepnutí pod 44 px. K tomu všech 57 obrazovek atlasu P01–P57.
- **Reálné situace:** spouštěl jsem je volně mimo příběh. Zámek příběhu byl vypnutý, hodiny jsem posouval ručně a klepal skutečnými kliky Playwrightu. Šlo o tyto scénáře: `pulnoc`, `zapomenuto`, `dvejidla`, `pasmo`, `restaurace`, `pichne-nesni`, `nemoc` a `klepnuti`.
- **Texty:** všechny řetězce s češtinou ze `app/screens.js` (924 řetězců), celé `app/data/catalogs.js` a texty (`texts`) všech položek v `app/data/registry.js`.
- **Snímky** jsou v `snimky-pacient/`. Předpona `S-` označuje snímky ze scénářů, `A-` snímky z atlasu a `W-` snímky z průchodu příběhem.

Závažnost: **K** = kritická (pacient může dostat chybnou dávku nebo přijde o bezpečnostní větev, nebo se zápisy trvale poškodí) · **V** = vysoká (pacient se ze situace sám nedostane) · **S** = střední · **N** = nízká.

---

## Nálezy seřazené podle závažnosti

### K1 · Pozdní večeře po půlnoci se zapíše jako snídaně a v ráno pak ukazuje dávku k obědu
- **Kde:** scénář `pulnoc` (snímky `S-pulnoc-02-po-pulnoci-0-30.png`, `S-pulnoc-05-chystam-se-jist.png`) a `dvejidla` (`S-dvejidla-04-rano-7-30.png`). Kód: `app/core.js:573–591` (`NF.mealState` a `NF.focusMeal` se řídí jen tím, jestli je slot prázdný), `app/screens.js:217` (`mealNow`), `app/ui.js:364` (`startMeal`).
- **Co se stane:** ve 0:30 je na Dnes „Na řadě je snídaně · 8 j.“. Pacient, který večeří pozdě, klepne na „Chystám se jíst“ a otevře se „Je inzulin ke snídani už píchnutý? · 8 j.“. Večeře se uloží jako snídaně. V 7:30 je pak snídaně „zapsáno“ a Dnes ukazuje „Na řadě je oběd · 10 j.“. Skutečnou snídani tak pacient zapíše jako oběd a před píchnutím vidí dávku k obědu. Zápisy jsou poškozené a obrazovka ukazuje cizí dávku.
- **Návrh:** od půlnoci do brzkého rána (například do 4:00, provozní parametr S-PRIPOMINKY) brát „Chystám se jíst“ jako večeři předchozího dne, pokud chybí. Pokud večeře nechybí, nechat pacienta volbou potvrdit „Je to snídaně, nebo pozdní večeře?“. Do `15` odst. 7a doplnit, co dělá den po půlnoci. Dnes to zdroj pravdy neřeší.

### K2 · Druhé jídlo krátce po prvním otevře zápis dalšího hlavního jídla s dotazem na jeho inzulin
- **Kde:** `S-dvejidla-01…`, `S-dvejidla-02-chystam-se-jist-zakusek.png`. Kód: `app/screens.js:899–904` (karta „Co teď“ ve stavu „next“ nabízí jako hlavní tlačítko „Chystám se jíst“ pro další slot).
- **Co se stane:** ve 13:20, hodinu po obědě, má Dnes nadpis „Další jídlo: večeře“ a jediné velké tlačítko „Chystám se jíst“. Pacient si chce zapsat zákusek nebo druhý chod a dostane otázku „Je inzulin k večeři už píchnutý? · 8 j.“ s volbou „Ano, 8 j.“. Správná cesta „Zapsat svačinu“ je až pod pásem dne jako malý odkaz. Hrozí zbytečný inzulin, nebo aspoň večeře zapsaná v 13:20.
- **Návrh:** ve stavu „další“ (do `dalsi_slot_h`) dát jako hlavní tlačítko „Zapsat svačinu / něco navíc“. Večeři nechat jako vedlejší volbu „Už je čas na večeři“, nebo před krokem 1 položit otázku „Je to večeře?“. Platí rozhodnutí z 19. 10. 2026, že na řadě nesmí být hned další dávka; teď to obchází tlačítko.

### K3 · „Zahodit rozpracovaný zápis“ smaže i potvrzený inzulin, takže pravidlo „Méně jídla“ ani hlídání poklesu nezačne
- **Kde:** `S-pichne-nesni-01…`, `S-pichne-nesni-02-zpet-na-dnes-dotaz.png`. Kód: `app/screens.js:1160` (dotaz) a `app/ui.js:384` (`mealCancel` nastaví `S.meal = null` a nic neuloží).
- **Co se stane:** pacient v kroku 1 odpoví „Ano, 8 j.“, pak mu není dobře a jíst nebude. Klepne na „Zpět na Dnes“ a pak na „Zahodit“. Nikde se nezapíše, že má v těle inzulin. Neukáže se I-MENE, za 60 minut nepřijde otázka „pod 4?“ a karta po poklesu nevznikne. Dotaz se ptá jen „Zahodit rozpracovaný zápis?“ a o inzulinu neříká nic.
- **Návrh:** když je odpověď o inzulinu „Ano“, „jinak“ nebo „nevím“, nabídnout místo „Zahodit“ volbu „Inzulin je píchnutý, ale jíst nebudu“ (odpovídá `mealSkip <slot>:as`, včetně I-MENE a B-HYPO). Obecné „Zahodit“ ponechat jen tehdy, když inzulin potvrzený není.

### K4 · Cesta do jiného časového pásma: hodiny aplikace se zastaví, nebo skočí
- **Kde:** scénář `pasmo` (`S-pasmo-03…`, `S-pasmo-04…`). Kód: `app/core.js:69` (`NF.tick` posune hodiny jen dopředu a ukládá místní čas bez pásma). `15` časová pásma vůbec nezmiňuje.
- **Co se stane:** cesta na západ znamená, že místní čas jde zpět. Aplikace drží původní čas (v testu 19:00, i když bylo místně 13:30) celé hodiny, dokud ho skutečný čas nedožene. Ukazuje „Dobrý večer“, kartu bazálu a všechna jídla zapíše na zamrzlý čas. Cesta na východ znamená skok dopředu: snídaně najednou „chybí“ a otázka „Byla dnes snídaně?“ přijde dřív, než pacient vůbec snídal. Bazál „ve 21:00“ se tiše posune o několik hodin, a o tom, jestli bazál držet podle domácího času, nikdo nerozhodl.
- **Návrh:** pro ostrou aplikaci ukládat čas v UTC s posunem pásma a změnu pásma poznat. Pacientovi pak jednou ukázat větu „Jste v jiném časovém pásmu. Bazál si píchejte, jak jste se domluvili s lékařem.“, bez rady k dávce. Hodiny nikdy nezamrazit. Do `15` odst. 7a doplnit pravidlo pro dovolenou. Jde o klinickou otázku pro garanta, protože se týká času bazálu.

### V1 · Když chybí dřívější jídlo, nejde večer zapsat večeři a od 19:00 „Co teď“ tvrdí „další věc až zítra ráno“
- **Kde:** `S-zapomenuto-01-17-00-snidane-chybi.png`, `S-zapomenuto-02-19-30-bazal-hero.png`, `S-pulnoc-03-20-30.png`. Kód: `app/core.js:584` (`focusMeal` vrací nejdřív minulý prázdný slot), `app/screens.js:878` (`basalTime = hour >= basalHour - 2`) a `:905–908` (větev bazálu má přednost před chybějícím jídlem), uzel pásu dne „Večeře · později“ není tlačítko (`:962–975`).
- **Co se stane:** pacient zapomene zapsat snídani. Od 10:00 do 19:00 je na Dnes jen otázka „Byla dnes snídaně?“ a večeře je v pásu „později“, i když je 18:00. Od 19:00 karta „Co teď“ přepne na „Čas na bazál“ s větou „Potom: další věc až zítra ráno“. Otázka na snídani zmizí a cesta k večeři na Dnes není žádná. Zbývá jen „Zapsat svačinu“, takže se večeře zapíše jako svačina bez dotazu na inzulin. Přesně tenhle typ pacienta, zapomnětlivý senior, tu uvízne.
- **Návrh:** chybějící slot nesmí blokovat ten, který je na řadě. Když je čas na další slot, ukázat v kartě „Co teď“ jako hlavní ten, který je na řadě, a chybějící jako druhý řádek („Snídani doplníte tady“). Uzel pásu „později/teď“ udělat klepatelný jako ostatní. Větu „další věc až zítra ráno“ nepsat, dokud je dnes nějaké jídlo prázdné.

### V2 · Uložený zápis nejde opravit ani smazat (kromě inzulinu do 60 minut)
- **Kde:** všechny cesty po uložení. V `app/ui.js` není akce pro opravu jídla, porce ani glukózy, ani pro smazání zápisu nebo jídla ze seznamu (jsou jen `fixInsulin*`). Detail jídla ukazuje historii jen pro čtení (`app/screens.js:1413`).
- **Co se stane:** pacient vybere omylem jiné jídlo, jinou porci nebo posune glukózu na 15 místo 5 a uloží. Zápis zůstane navždy a vstoupí do učení, do stupně reakce, do „Jak to dopadlo“ i do reportu. Jedinou opravou je inzulin v 60minutovém okně. Pacient nemá jak napravit chybu, o kterou se nemusel nijak snažit.
- **Návrh:** u posledního zápisu na Dnes doplnit vedle „Opravit inzulin“ volbu „Opravit zápis“ (jídlo, porce, hodnoty) do konce dne, a „Smazat zápis“ s potvrzením. Obojí zapsat do stopy, opravený zápis označit jako nečistý (D-CISTA). Do `15` odst. 7 dopsat, co se dá opravit a jak dlouho.

### V3 · Nesmyslná jména jídel se přijmou a v seznamu zůstanou navždy
- **Kde:** scénář `restaurace`, kroky 5–6. Kód: `app/core.js:868` (`NF.addFood`) a `app/ui.js:428` (`mealSaveFood`).
- **Co se stane:** jako nová jídla se bez námitky přidají názvy „xx“, „aaaaaaa“ i „123“. Jídlo ze seznamu nejde smazat ani přejmenovat. Pacient, který se v klávesnici splete, si zaplní „naposledy“ a seznam Jídla jídly, která nikdy nebudou „známá“, a lékař je uvidí v podkladech.
- **Návrh:** odmítnout název bez písmen a název kratší než 3 znaky („Napište název jídla slovy“). V detailu jídla, které má 0–1 zápis, nabídnout „Odebrat ze seznamu“, a u jídla se zápisy „Přejmenovat“.

### V4 · Výchozí velikost písma u pacienta je pod pravidlem z `15` odst. 15a (od 17 px), místy pod mezí tokenů (14 px)
- **Kde:** měřeno při průchodu všemi 99 stavy (podrobný výpis je v `scratchpad/k36-pacient/walk.json`).
  - **13 px:** bezpečnostní věta „Nízkou ani vysokou glukózu nehlídáme…“ a popisky „nepočítáme sacharidy / neměníme dávku / nikdo nečte zápisy“ (P05, `A-P05…png`), nadpisy pravidel při nemoci „Nemoc: inzulin na noc (bazál)“ (P19, `A-P19…png`), tabulka „Historie zápisů“ v detailu jídla (P50), dlaždice „Co uvidí lékař“ (P52), popisek „Pořadí jídla“ a „podobné známým“.
  - **14 px:** hlavička kroku „Krok 1 ze 3 · snídaně“, popisky „Glukóza teď · 7:00“, „Po snídani · 7:05–9:05“ (časová hlavička, která má hodnoty od sebe odlišit), „Jiné jídlo – napište pár písmen“, volby porce „Menší než obvykle / Obvyklá / Větší než obvykle“, „Pokles pod 4 je zapsaný“, datum na Dnes.
  - **15 px:** vedlejší tlačítka „Snídaně už byla“, „Dnes bez snídaně“, „Uložit, píchnu za chvíli“, „Píchnuto jinak“, „Zkusím to“, „Tentokrát ne“, „Rozumím“, „Zavřít“, řádky „Potom: …“ a „Co dál: …“ (P6), „Celé pravidlo“, „Proč se ptáme“, podřádky voleb inzulinu („pro jistotu počítáme, že už je“).
- **Proč to vadí:** jde o text, podle kterého se pacient rozhoduje: volba porce, „píchnu za chvíli“ a „co bude dál“. Token `--nf-fs-2xs` (13 px) má podle `app/tokens.css:59` „jen ordinace… pacient nikdy pod 14 px“, a přesto se u pacienta používá.
- **Návrh:** u pacienta zvednout `--nf-fs-sm` a `--nf-fs-xs` na 17 px a popisky na nejméně 16 px. Zakázat `--nf-fs-2xs` uvnitř `.patient-shell` a hlídat to testem (měřit vypočtenou velikost písma v prohlížeči, ne jen třídu). Nejdřív opravit bezpečnostní větu v P05 a nadpisy pravidel při nemoci.

### V5 · Jeden zápis jídla stojí 9 klepnutí a 2 tahy posuvníkem, k tomu přepnutí do aplikace senzoru
- **Kde:** scénář `klepnuti` (oběd po zapsané snídani, známé jídlo z „naposledy“). Snímky `S-klepnuti-07…`, `S-klepnuti-11…`.
- **Počet:** „Chystám se jíst“ (1) → „Ano, 10 j.“ (2) → tah na nejvyšší hodnotu po snídani (tah) → „Uložit · 9 mmol/l“ (3) → „Klesla pod 4? Ne“ (4) → tah na glukózu teď (tah) → „Další: co budete jíst“ (5) → jídlo z naposledy (6) → „Obvyklá“ (7) → „Další: rada a zápis“ (8) → „Uložit jídlo“ (9). Nepovinně ještě 2–3 odpovědi na rady („Zkusím to“ nebo „Tentokrát ne“, viz P43 se třemi radami). To je 11–14 úkonů na jídlo, asi 35–40 denně a přes 3 000 za 92 dní, nepočítaje bazál. Bez rady trvá zápis zkušenému uživateli 40–60 s, seniorovi s brýlemi déle.
- **Vydrží to?** Nejtěžší je opisovat nejvyšší hodnotu z grafu. Sám kód to označuje za nejtěžší úkon dne (`catalogs.js:12`, B7). Posuvník a samostatné „Uložit“ k tomu přidávají jedno klepnutí navíc.
- **Návrh (bez změny pravidel):** (a) nejvyšší hodnotu uložit hned tahem, protože otázka na pokles se mění jen u „pod 4“, kterou stejně ukazuje zvláštní konec dráhy, a samostatné „Uložit“ nechat jen pro ten konec. (b) U jídla zapsaného třikrát po sobě se stejnou porcí nabídnout v kroku 2 jeden řádek „Jako obvykle: [jídlo] · obvyklá porce“ a přeskočit dvě klepnutí. (c) Sbalenou rutinní radu (už existuje) použít i pro procházku. Pro studii stojí za to měřit, kolik zápisů denně pacienti po 2. a 6. týdnu skutečně dělají.

### V6 · Nemoc zapnutá omylem nejde na Dnes vypnout; vypínač je jen na konci Bezpečí a nemá slovo
- **Kde:** scénář `nemoc` (`S-nemoc-02-bezpeci.png`). Kód: `app/screens.js:881–885` (na Dnes je „Zítra se zeptáme, jestli je vám lépe“) a `:1498` (přepínač bez textu akce, popsaný „Nemoc trvá od 18. 10. 2026“).
- **Co se stane:** pacient omylem klepne na „Není mi dobře“. Rady zmizí a zápisy přestanou jít do učení. Na Dnes je jen „Zítra se zeptáme“. Vypnout to jde jen přepínačem na samém konci Bezpečí, kde nestojí „Vypnout“ ani „Už je mi dobře“.
- **Návrh:** na Dnes první den nemoci přidat tiché tlačítko „Klepl jsem omylem / Už je mi dobře“. V Bezpečí přepínač popsat slovy „Není mi dobře · zapnuto“ a k němu tlačítko „Už je mi lépe“.

### S1 · Při nemoci je hned vidět jen první věta pravidla; pokyn kdy vyhledat pomoc je až pod „Celé pravidlo“
- **Kde:** `A-P19-dnes-nemoc.png`. `app/data/catalogs.js:24–25`: `coDal` u I-NEMOC-JIDLO vynechává „Když zvracíte a nemůžete pít, nebo je glukóza déle než 3 hodiny nad {v}, vyhledejte ještě ten den lékařskou pomoc“ a `coDal` u I-VYSOKA vynechává „Když je glukóza i potom nad {v} a vydrží tam déle než 3 hodiny, vyhledejte ještě ten den lékařskou pomoc“.
- **Proč to vadí:** při nemoci a při čipu „nad 15“ je tohle druhý nejdůležitější krok. Celé znění je sice na klepnutí, ale krátká podoba (P8) jde mimo to nejpodstatnější.
- **Návrh:** obě věty doplnit do `coDal`. Jde o novou verzi položky I-* ke schválení garantem, jak předepisuje P8.

### S2 · Otázka na pokles po vynechaném jídle visí do druhého dne a uvádí čas odpovědi místo času jídla
- **Kde:** `S-dvejidla-04-rano-7-30.png` a `S-pasmo-03…`: „Včera v 13:20 jste vynechali snídani s podaným inzulinem · Podívejte se na senzor. Klesla glukóza pod 4?“. Kód: `app/screens.js:750–752`.
- **Co se stane:** u vynechaného jídla se jako čas bere chvíle, kdy pacient klepl na „Dnes bez…“. Když pacient na otázku neodpoví, druhý den ráno se ptá v přítomném čase („Podívejte se na senzor“), ale netýká se to žádného konkrétního okna. Pacient neví, na kterou dobu se má v grafu dívat.
- **Návrh:** u vynechaného jídla psát „Včera ke snídani…“ bez hodiny. Po 24 h otázku zavřít jako „nezodpovězeno“, případně ji zeptat s oknem („mezi 13:20 a 17:20“).

### S3 · Inzulin „čeká na potvrzení“ nemá volbu „jinak“
- **Kde:** `A-P24-dnes-inzulin-ceka.png`. Kód: `app/screens.js:816–820` (jen „Píchnuto 8 j.“, „Nepíchnuto“ a „Nevím“).
- **Co se stane:** pacient uloží „píchnu za chvíli“ a pak si píchne 6 j. Nemá jak to zapsat. Musí zvolit „Píchnuto 8 j.“ a pak ještě „Opravit inzulin“.
- **Návrh:** přidat „Píchnuto jinak“ s posuvníkem jednotek (`V.unitsSlider`), stejně jako v kroku 3.

### S4 · Tři téměř stejné pokyny na jedné obrazovce kroku 1 (P10)
- **Kde:** `W-6-02-krok1-glukoza-ted.png`: „Posuňte na číslo z aplikace senzoru.“ + „Posuňte na hodnotu ze senzoru“ (pod číslem) + „Posuňte na hodnotu ze senzoru, nebo klepněte na „nemám hodnotu“.“ (pod tlačítkem). Kód: `app/screens.js:1120`, `:1121`, `:1177`.
- **Návrh:** nechat jen popisek u posuvníku a pod tlačítkem napsat jen to, co chybí („Vyberte hodnotu, nebo „nemám hodnotu“.“).

### S5 · Slova pro lékaře a čísla bez jednotky v textech pro pacienta (P9, „čísla s jednotkou“)
- `app/screens.js:150`, detail jídla (P50, `A-P50…png`): „Spočítáno ze 4 vašich zápisů, s dalšími se **upřesní**.“ P9 zakazuje u pacienta „upřesní se“. Navrhuji „Ze 4 vašich zápisů.“
- `app/screens.js:1539`, „Co uvidí lékař“: „…z doby nemoci – ty se **do učení** nepočítají, ale lékař je vidí.“ P9 zakazuje „do učení“. Navrhuji „…z doby nemoci – podle nich jídla nehodnotíme, lékař je ale uvidí.“
- `app/screens.js:1399`, detail nestálého jídla: „Lékař to uvidí **v podkladech**. Zkuste jídlo dělat pokaždé stejně, nebo ho **rozdělte na dvě**.“ „Podklady“ je slovo lékaře a „rozdělte na dvě“ nikdo nepochopí. Navrhuji „Lékař to uvidí na kontrole. Když ho děláte různě, zapište každou podobu jako samostatné jídlo.“
- `app/screens.js:842`, „Jak to dopadlo“ (P14, `A-P14…png`): „Dřív bývala nejvyšší kolem **9**.“ chybí jednotka. Patří tam „kolem 9 mmol/l“.
- `app/screens.js:1542`, „Co uvidí lékař“: „…kolem 12 mmol/l, bez rady kolem **13**.“ chybí jednotka u druhého čísla.
- `app/screens.js:1563`, nový plán: „najdete je v Bezpečí a **v Plánu**“. Záložka se od SCHEMA 86 jmenuje „Můj plán“.

### S6 · Text „Zatím ho neznáme – zapište ho ještě 4×.“ zní jako pokyn to jídlo jíst
- **Kde:** krok 3 u nového jídla (`W-6-08-krok3-nezname.png`, `S-restaurace-04…`). Kód: `app/screens.js:1274`.
- **Proč to vadí:** u jídla z restaurace nebo u výjimečného jídla senior čte „zapište ho ještě 4×“ jako úkol jíst ho čtyřikrát. Odporuje to zásadě 2 (nic nenutíme).
- **Návrh:** „Zatím ho neznáme. Poznáme ho, až ho zapíšete čtyřikrát.“

### S7 · Detail jídla začíná větou „V cíli 0 ze 4 zápisů“
- **Kde:** `A-P50-jidlo-detail.png`, `app/screens.js:1397`. Podle `15` odst. 7b se má pacientovi říkat věcně, bez čísel, která zní jako neúspěch („4 z 28“ bylo zrušeno proto, že zní jako neúspěch, SCHEMA 84, B6). „0 ze 4“ je totéž.
- **Návrh:** v hlavičce nechat štítek „častěji nad cílem“ a větu „Zapsáno 4×.“. Číslo „X z N“ přesunout pod „Podrobnosti“ (P7).

### S8 · Pravidlo po vynechané večeři říká „změřte za 60 min“, ale aplikace „ráno se zeptáme“
- **Kde:** `S-pichne-nesni-05-Ano-8-j.png` (večeře v 18:00 bez jídla, inzulin podaný): pravidlo I-MENE „změřte glukózu za 60 min“ a hned pod ním „Potom: ráno se zeptáme, jestli glukóza klesla v noci pod 4“.
- **Proč to vadí:** odpovídá to `15` odst. 8 (po večeři se ptáme ráno), ale v 18:00 je riziko poklesu v příštích 1–4 hodinách. Pacient čte „ráno se zeptáme“ jako „teď nic dělat nemusím“.
- **Návrh:** pro otázku po večeři použít „ráno“ jen tehdy, když bylo jídlo po 20:00. Jinak se ptát za 60 minut, stejně jako u ostatních jídel. Je to otázka pro garanta (B-HYPO).

### S9 · Dnes se večer ptá na nejvyšší hodnotu po obědě a stejnou otázku má pak krok 1 večeře
- **Kde:** `S-zapomenuto-05-odpovim-ne-bez-snidane.png`: na Dnes je zároveň „Na řadě je večeře“ s tlačítkem „Chystám se jíst“ i otevřená otázka „Po obědu · 12:20–14:20 · Nejvyšší hodnota…“ s posuvníkem. Kód: `prevAskBlock`, `app/screens.js:727–745`.
- **Proč to vadí:** jsou to dvě otevřené otázky na Dnes (P1) a odpověď se zbytečně vyžaduje dvakrát.
- **Návrh:** dokud je na řadě další jídlo, ukazovat blok jen v kroku 1. Na Dnes ho ukázat až tehdy, když už žádné jídlo dne nezbývá (večer u bazálu).

### N1 · „Opravit inzulin · ještě 0 minut“
- `S-dvejidla-01…`, `app/screens.js:536` (`Math.max(0, left)`). V 60. minutě se ukáže odkaz, který už nic neopraví. Navrhuji odkaz při `left <= 0` skrýt.

### N2 · „Po obědu“ vedle „po obědě“
- `app/screens.js:726` (`prevLabel`) skládá „Po obědu · 12:20–14:20“, zatímco R-SKORE i „Co dál: …po obědě“ mají „po obědě“. Navrhuji použít `NF.MEAL_PO` (jako v `:1096`), aby bylo všude „po obědě“.

### N3 · „Záznam“ a „zaznamenejte“ místo „zápis“ a „zapište“ (slovník v odst. 19)
- `app/screens.js:934`, `:937`: „Záznam ze včerejška chybí“. `app/data/registry.js` u S-PRIPOMINKY: „…snídani zaznamenejte“. Navrhuji „Zápis ze včerejška chybí“ a „snídani zapište“.

### N4 · Připomínky v telefonu mluví o „NutriFee“
- S-PRIPOMINKY: „Otevřete NutriFee a…“, „potvrďte ho v NutriFee“. Hlas „my“ (odst. 19) dovoluje „NutriFee“ jen v Bezpečí a v podpoře. U oznámení telefonu je jméno aplikace nutné, ale stojí za to vědomě to zapsat jako výjimku do odst. 19.

### N5 · Zkratka „min“ v bezpečnostních pravidlech
- `catalogs.js:21–22` („Za 15 min glukózu změřte znovu“, „za {v}“ → „za 60 min“) a „Co dál: za 60 min se zeptáme“. Pro seniora je čitelnější „za 15 minut“ a „za hodinu“. Navrhuji psát celé slovo, protože dosazení hodnoty `{v}` s jednotkou to umožňuje.

### N6 · Ikona klíče u dávek bez vysvětlení před stránkou „Jak to funguje“
- P02 a pás dne („🔑 8 j.“). Metafora klíče se vysvětluje až na stránce 4 z 6. Na P02 si to pacient nespojí. Navrhuji na P02 dávku ukázat bez ikony, nebo přidat popisek „dávka od lékaře“.

### N7 · „Je to jako…“ u nového jídla nabízí jen několik známých jídel, ne podobné z databáze
- `S-restaurace-02-restaurace-nazvem.png`: u „Svíčková v restauraci“ jsou nabídnuté jen „Chléb se sýrem“, „Ovesná kaše“ a „Smažený řízek“, ne „Svíčková na smetaně s knedlíkem“, kterou pacient vidí ve výsledcích hledání o krok dřív. Navrhuji mezi možnosti zařadit jídla z databáze, která se shodují s hledaným slovem.

### N8 · „Teď nelze nic zapsat · K tomuto jídlu plán nemá dávku.“
- `app/screens.js:1210–1212` je slepá ulička bez jiné cesty. V kohortě má pacient tři dávky, takže by to nemělo nastat. Kdyby ale nastalo, nabídnout aspoň „Zapsat jako svačinu“.

---

## Reálné situace: shrnutí

| Situace | Co se stane | Dostane se z toho? |
|---|---|---|
| Zapomenutý zápis | Dnes se zeptá „Byla dnes snídaně?“, druhý den je karta „Včera chybí…“, zpětný zápis funguje | **Ne vždy:** od 19:00 zmizí otázka i večeře (V1). Starší než včerejšek doplnit nejde (podle `15`) |
| Restaurace | Nové jídlo názvem, rada „obvyklá porce“ u větší porce | Ano. Text „zapište ho ještě 4×“ je zavádějící (S6) |
| Jídlo, které není v seznamu | Hledání → „Přidat…“ → nepovinně „Je to jako“ | Ano. Bez kontroly nesmyslů a bez možnosti mazat (V3) |
| Dvě jídla po sobě | Velké „Chystám se jíst“ otevře další hlavní jídlo s dávkou | **Ne bez rizika** (K2) |
| Pozdní večeře po půlnoci | Zapíše se jako snídaně, ráno ukazuje dávku k obědu | **Ne** (K1). Obejít se to dá jen přes „Včera chybí večeře – Doplnit“, a to je zpětný zápis bez rady |
| Píchne a nesní | „Dnes bez …“ → „Ano“ → I-MENE a otázka za 60 min / ráno | Ano přes „Dnes bez …“. **Ne** přes „Zpět na Dnes → Zahodit“ (K3). Rozpor 60 min / ráno (S8) |
| Výměna senzoru bez hodnoty | „nemám hodnotu“ u glukózy teď i u nejvyšší; zápis se uloží | Ano. Věta „Hodnotu doplní sestra na kontrole“ nemusí platit, protože ani export z doby výměny hodnotu mít nebude (N, bez čísla) |
| Nemoc | Režim nemoci, pravidla nahoře, „Už je vám lépe?“ až zítra | Ano. Omyl se vrací těžko (V6), podstatné kroky jsou až pod „Celé pravidlo“ (S1) |
| Jiné časové pásmo | Hodiny se zastaví nebo skočí, zdroj pravdy to neřeší | **Ne** (K4) |
| Omylem nesmysl | Glukózu nebo inzulin lze opravit „Změnit“ před uložením, inzulin do 60 minut po něm | **Ne** po uložení u jídla, porce a glukózy (V2). Nesmyslný název zůstane (V3) |

## Co je v pořádku

- Převzetí plánu (P01–P06) je krátké, má jednu otázku na stránku a kontrolní otázka vysvětlí špatnou odpověď bez výčitky.
- Krok 1 drží zásadu „jedna otevřená otázka“: zodpovězené odpovědi se sbalí na řádek se „Změnit“ a „Ano, 10 j.“ hned posune na další otázku.
- Vykání je důsledné, tykání ani „report“, „medián“, „skóre“ nebo „glykémie“ jsem v textech pacienta nenašel. Glukóza se píše všude stejně, „j.“ a „mmol/l“ mají nezlomitelnou mezeru.
- Cíle klepnutí: při průchodu 99 stavy nebyl žádný ovládací prvek menší než 44 × 44 px.
- Karta po opakovaných poklesech (P18) má tři body, větu „nečekejte na kontrolu…“ jednou a nikam nevolá.
- V převzatých textech registru a katalogu jsem nenašel překlepy ani gramatické chyby. Nálezy výše jsou nekonzistence, ne pravopis.

## Soubory

- Zpráva: `navrhy-designu/36-posledni-kontrola/02-pacient.md`
- Snímky: `navrhy-designu/36-posledni-kontrola/snimky-pacient/` (32 snímků)
- Skripty a surová data (scratchpad, nepublikuje se): `k36-pacient/br/walk.cjs`, `k36-pacient/br/sb.cjs`, `k36-pacient/scn/*.js`, `k36-pacient/walk.json`, `k36-pacient/walk.log`
