# NutriFee — účel určení a osnova posouzení vlivu na ochranu osobních údajů (DPIA)

*Návrh ze dne 18. 10. 2026, **aktualizováno 1. 11. 2026** podle stavu makety SCHEMA 78 a rozhodnutí vlastníka z 30. 10. a 1. 11. 2026. Je to pracovní podklad pro regulatorního poradce a pro klinického garanta, ne hotový dokument k podpisu ani právní stanovisko. Zdrojem pravdy pro chování aplikace je `15-ZDROJ-PRAVDY-MAKETA.md` a publikovaná maketa; kde se tento text liší, platí ony. V dokumentu nejsou jména osob ani institucí.*

**Co se změnilo proti verzi z 18. 10. 2026:**

- Aplikace pacienta k volání do ordinace nikdy sama nevyzve (27. 10. 2026). Zrušena „eskalace zavolejte do ordinace“ v A2, A7 i B2.
- Po dvou poklesech pod 4 za 7 dní karta s obecnou radou, která končí větou „nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal“ (30. 10. 2026). Pokles pod 4 u jídla blokuje v návrhu k dávce větev „zvýšit“.
- „Pokyny lékaře“ nahrazeny bezpečnostními pravidly NutriFee: obecná pravidla stejná pro všechny pacienty, schválená garantem, bez podpisu lékaře.
- Připomínky v telefonu (nejvýš 4 denně, časy vybere pacient se sestrou); připomínka nemusí přijít a inzulin se píchá podle plánu i bez ní.
- NutriFee není systém upozornění na nízkou ani vysokou glukózu a upozornění senzoru nenahrazuje.
- Cesta dat ze senzoru: pacient hodnoty opisuje, export před kontrolou pošle do ordinace a nahrává ho sestra; bez napojení na výrobce senzoru.
- Lékař je vždy jen jeden (1. 11. 2026); kohorta upřesněna o vylučovací kritéria a o to, že pacient nemá potíže s pohybem (1. 11. 2026).
- Garant schvaluje jen klinické položky; provozní pravidla neschvaluje nikdo (dřív „provozní schvaluje vlastník“). U každého rozhodnutí se ukládá verze položky a otisk jejího znění.
- Předběžné zařazení: pravděpodobně třída IIb, s důsledky (nová část A7). Doplněna rizika a opatření z regulační prověrky 29. 10. 2026 a úpravy osnovy DPIA.

---

## Část A — Účel určení (intended purpose)

### A1. Co výrobek je

NutriFee je softwarová aplikace pro pacienty s diabetem 2. typu léčené inzulinem v pevných dávkách, kterou pacient používá na vlastním telefonu mezi kontrolami u lékaře, a webová část pro ordinaci (zařazení a vydání plánu, zaučení sestrou, kontrola). Aplikace **pomáhá pacientovi jíst konzistentně k dávce, kterou mu předepsal lékař**. Vyhodnocuje jeho vlastní zápisy (jak se u něj glukóza po jednotlivých jídlech dosud chovala) a připravuje lékaři na kontrolu strukturovaný podklad včetně návrhu „posoudit dávku“. Lékař návrh ověří s pacientem a rozhodne; bez jeho rozhodnutí se v léčbě nic nemění.

V účelu určení a v materiálech o výrobku se píše „vyhodnocuje vaše zápisy“, ne „učí se“, a nepoužívají se tvrzení o předpovědi glukózy ani o účinku rad (rada „pomohla“). Aplikace popisuje minulost, nepředpovídá.

### A2. Co výrobek dělá (zamýšlené funkce)

1. **Zobrazuje dávky inzulinu předepsané lékařem** s původem a datem („Podle plánu z 5. 10.: 8 j.“) a ptá se, zda a v jaké výši byly podány („Ano · píchnuto“, „Píchnuto jinak“, „Ještě ne“, „Nevím“). Při „Nevím“ ukáže pravidlo, že se inzulin znovu nepíchá.
2. **Připomínky v telefonu:** nejvýš 4 denně (tři hlavní jídla a bazál) v časech, které pacient vybral se sestrou při zaučení, a otázka „Klesla glukóza pod 4?“ 60 minut po menší porci s píchnutým inzulinem. Pacient je může vypnout, lékař nic nenastavuje. Připomínka nemusí přijít (vypnutý nebo vybitý telefon, vypnutá oznámení); pacient to ví ze zaučení a inzulin si píchá podle plánu i bez ní. NutriFee není budík na inzulin.
3. **Před jídlem radí změny, které nemění dávku:** porce k obvyklé (před píchnutím oběma směry; po píchnutí a při „nevím“ jen z větší porce zpět k obvyklé; nikdy „sněz víc“), doplněk bílkoviny nebo tuku („pokud vám nevadí“, z jídla nic neubírat), pořadí jídla, krátká procházka do 60 min po jídle. Rady se nenabízejí při riziku nízké glukózy.
4. **Vyhodnocuje opakované zápisy téhož jídla** (hodnota glukózy před jídlem a nejvyšší hodnota do dvou hodin, opsané pacientem jako celá čísla, na kontrole doplněné exportem) a říká pacientovi, zda je jídlo u něj „většinou v cíli“, nebo „častěji nad cílem“.
5. **Větev nízké glukózy:** po menší porci nebo vynechaném jídle s píchnutým inzulinem ukáže hned pravidlo „Méně jídla než obvykle“, za 60 minut se zeptá, zda glukóza klesla pod 4 mmol/l, a poklesy počítá. **Při dvou poklesech za posledních 7 dní** (klouzavé okno) ukáže na obrazovce Dnes kartu s obecnou radou, co dělat, zakončenou větou: „Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“ Stejnou větou končí pravidlo k nízké glukóze. Karta se ukáže znovu s každým dalším poklesem v okně 7 dní. Aplikace nikam nevolá, nic neposílá a nikoho neupozorňuje.
6. **Bezpečnostní pravidla:** při čipu „pod 4“ ukáže pravidlo k nízké glukóze, při čipu „nad 15“ pravidlo k vysoké glukóze; dále pravidla pro nemoc (zvlášť bazál a inzulin k jídlu) a kontakty jako informace. Jsou to obecná pravidla NutriFee, stejná pro všechny pacienty, schválená garantem; pacient je vidí bez podpisu lékaře s větou „Tato pravidla připravil NutriFee a posoudil je lékař.“
7. **Na kontrole** předloží lékaři souhrn, reakce na jídla, výsledky rad (jako srovnání, ne důkaz účinku), potvrzení dávek, bezpečnostní část (hlášené poklesy; výslovně, když noční hodnoty z exportu chybí) a návrhové karty. U dávky jen „posoudit“: co aplikace pozorovala · proč návrh vznikl · jak ověřit (body „sedí / nesedí“) · větev lékařova schváleného postupu (zvýšit / snížit / ponechat, nikdy velikost kroku) · Souhlasím / Upravit / Zamítnout. Body, které nejde ověřit z dat (technika píchání, jídlo mezi jídly, nemoc a stres), projde předem sestra s pacientem výběrem; lékař vidí její odpovědi a rozhoduje. Směr i výši dávky volí lékař.
8. **Nový plán se změněnou dávkou** pacient při převzetí potvrdí otázkou „Souhlasí s tím, co vám řekl lékař?“; při „Ne“ plán nepřebírá a ukáže telefon sestře.

### A3. Co výrobek nedělá (vyloučené funkce)

- Nepočítá, nemění ani nedoporučuje dávku inzulinu, ani její směr. Nenavrhuje jednotky ani velikost kroku.
- Nepočítá sacharidy, makroživiny ani energii a nevede k tomu pacienta.
- **Není systém upozornění na nízkou ani vysokou glukózu a nenahrazuje upozornění senzoru.** Živou hodnotu glukózy nevidí ani nezobrazuje. Pacient si upozornění nastaví v aplikaci senzoru; sestra při zaučení ověří, že ho má zapnuté. Pacient to vidí při převzetí plánu: „Nízkou ani vysokou glukózu nehlídáme. Upozornění na ni si nastavte v aplikaci senzoru – sestra vám s tím pomůže.“
- **Nemá napojení na aplikaci ani rozhraní výrobce senzoru.** Hodnoty opisuje pacient; export před kontrolou pacient pošle do ordinace a nahraje ho sestra.
- **Pacienta k volání do ordinace sama nikdy nevyzve.** Neupozorňuje lékaře ani nikoho jiného mezi kontrolami, nikam nevolá a neposílá zprávy. Kontakty v Bezpečí jsou jen informace. Věta „nečekejte na kontrolu: poraďte se s lékařem…“ je informace jako v příbalové informaci, ne výzva aplikace.
- Lékař mezi kontrolami nic nedělá a nic nesleduje; data mezi kontrolami nikdo z ordinace nečte.
- Nepočítá s jiným lékařem než tím, kdo plán vydal (A4).
- Nepoužívá generativní umělou inteligenci ani strojové učení parametrů; všechny výpočty jsou deterministické podle pravidel definovaných lidmi a dohledatelné ve stopě.

### A4. Pro koho je určen

- **Pacient:** dospělý s diabetem 2. typu, inzulin v pevných dávkách (bazál jednou večer a prandiální ke třem hlavním jídlům), senzor kontinuálního měření glukózy; tablety nebo GLP-1 navíc nevadí (zaznamenají se a na kontrole se ověří, že se neměnily). **Premixované inzuliny jsou vyloučeny** (jejich dávku nelze přiřadit k jednomu jídlu). **Pacient nemá potíže s pohybem** (vlastník 1. 11. 2026; procházka se proto nabízí bez další podmínky a omezení pohybu je vylučovací kritérium při zařazení). Další vylučovací kritéria, která lékař při zařazení potvrdí jedním zaškrtnutím (bez něj plán nejde vydat): těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčba akarbózou, potíže se zrakem nebo pamětí, které znemožní ovládat telefon. Pacient musí umět používat telefon a opisovat celá čísla z aplikace senzoru; zaučení provádí sestra. V Bezpečí stojí, že při těhotenství nebo změně druhu léčby (jiný inzulin, pumpa) NutriFee přestává platit.
- **Lékař:** diabetolog nebo praktický lékař vedoucí léčbu inzulinem. **Pacientovu léčbu inzulinem vede vždy jen jeden lékař**, ten, kdo v NutriFee vydává plán (vlastník 1. 11. 2026). Aplikace s jiným lékařem nepočítá a nikde o něm nemluví.
- **Sestra:** zaučení pacienta (včetně připomínek a upozornění senzoru), ověření bodů návrhu s pacientem před lékařem, nahrání exportu ze senzoru na kontrole.
- **Klinický garant:** schvaluje klinické položky registru. V první studii je to lékař; v ostrém provozu je garant role na straně výrobce (klinický vedoucí v systému kvality), který změny pravidel navrhuje, a provádí je výrobce v řízení změn (A6, A7).

### A5. Klinický přínos, který se má doložit

Lepší kompenzace (HbA1c, čas v cíli) a méně poklesů glukózy díky konzistentnímu jídlu k pevné dávce; edukovaný pacient, který ví, s čím u něj bývalo jídlo v cíli; lékař s kontextem na kontrole bez práce navíc mezi kontrolami. Jde o cíl studie, ne o tvrzení: v materiálech o výrobku smí být až s klinickými daty. Měřítka a srovnávací rameno stanoví klinický protokol; navržené cílové veličiny jsou v A7.

### A6. Předběžné regulatorní zařazení a jeho důvod

Software, který z dat o konkrétním pacientovi odvozuje informace sloužící k rozhodování o léčbě, je podle běžného výkladu pravidel pro klasifikaci softwaru zdravotnickým prostředkem; tvrzení „dávku nedoporučujeme“ to nemění, rozhoduje účel celku. Regulační prověrka z 29. 10. 2026 (`30-kontrola4-a-pohledy-2026-10-29/06-regulace-bezpecnost.md`) dílčí funkce odhaduje takto:

| Funkce | Odhad dílčí třídy |
|---|---|
| Rady k jídlu s ohledem na podaný inzulin | IIa |
| Otázka na pokles, počítání poklesů, karta po 2 poklesech | IIa |
| Bezpečnostní pravidla zobrazená po čipu (bez výpočtu) | IIa |
| Report lékaři: souhrn, reakce na jídla, poklesy, semafor | IIa |
| **Návrhová karta „posoudit dávku“ s větví postupu zvýšit / snížit** | **IIb (pravděpodobně)** |
| Blok větve „zvýšit“ při poklesu pod 4 | třídu nemění, snižuje riziko |

**Odhad: pravděpodobně třída IIb; IIa jen tehdy, kdyby karta k dávce přestala ukazovat směr; třída I vyloučena.** Chybně ukázaná větev „zvýšit dávku“ může po lékařově souhlasu vést k těžké hypoglykémii; posuzuje se závažnost dopadu chybné informace, ne její pravděpodobnost. **Vlastník 18. 10. 2026 rozhodl kartu „posoudit dávku“ ponechat** (hlavní hodnota pro lékaře a odlišnost od deníků) a vyšší třídu přijímá; doporučení prověrky je plánovat jako IIb a v dokumentaci nepředjímat IIa.

**Akt o umělé inteligenci:** podle prověrky NutriFee není systém AI (pravidla a prahy definují lidé v registru, výstup je deterministický); v technické dokumentaci to musí být výslovně zdůvodněno.

Konečnou kvalifikaci a třídu určí regulatorní poradce a notifikovaná osoba; tento text jim dává účel určení, se kterým mají pracovat.

### A7. Co z pravděpodobné třídy IIb plyne

Podle prověrky z 29. 10. 2026 (seznam „Co musí ostrá aplikace mít navíc“); čísla článků a norem uvedená tam doporučuje prověrka ověřit při přípravě dokumentace:

- **Notifikovaná osoba od začátku:** posouzení shody, technická dokumentace, prohlášení o shodě, registrace a jedinečná identifikace prostředku; předběžný dialog s notifikovanou osobou na podkladě tohoto účelu určení a kvalifikační a klasifikační zprávy.
- **Systém řízení kvality** (řízení návrhu, změn, dodavatelů včetně serveru a cloudu, nápravná opatření), osoba odpovědná za dodržování předpisů, pojištění odpovědnosti.
- **Řízení rizik** se scénáři z A8 a s ověřením účinnosti každého opatření; hodnocení celkového zbytkového rizika a poměru přínosu a rizika.
- **Software:** třída bezpečnosti softwaru (prověrka doporučuje nejvyšší pro moduly bezpečnostních pravidel, větve nízké glukózy a návrhů k dávce), registr jako součást řízené konfigurace, kybernetická bezpečnost, spolehlivost (pravidla v zařízení bez sítě, selhání oznámení, hodiny a časová pásma).
- **Použitelnost:** scénáře použití související s nebezpečím (potvrzení inzulinu, čip „pod 4“, čtení pravidla při hypoglykémii, převzetí plánu a nové dávky, návrhová karta k dávce) a sumativní validace s reprezentativními uživateli včetně pacientů 65+.
- **Klinické hodnocení s vlastní klinickou zkouškou** (ekvivalence nejspíš nepoužitelná), povolení a stanovisko etické komise před zahájením, informovaný souhlas, hlášení závažných nežádoucích příhod. Navržené cílové veličiny: hypoglykémie, čas v cíli a HbA1c, shoda opsaných hodnot s exportem, adherence k zápisu, jak často lékař jde proti větvi postupu, čas lékaře na kontrole.
- **Dozor po uvedení na trh:** plán dozoru a následného klinického sledování, pravidelná zpráva o bezpečnosti (u IIb každý rok), vigilance.
- **Změny pravidel jsou změny prostředku:** změna znění, prahu nebo vypnutí položky jde řízením změn výrobce, ověřením a uvolněním nové verze; během studie jako podstatná změna. V maketě proto garant „navrhuje vypnutí položky“ a provádí ho výrobce (rozhodnutí 30. 10. 2026, bod 11). Každé rozhodnutí garanta nese číslo verze položky a **otisk jejího znění, parametrů a textu „Co schvalujete“**; je tedy doložitelné, k jakému znění se rozhodnutí vztahuje, a rozhodnutí k předchozímu znění je vidět. Každá publikace makety má v gitu značku verze.
- **Návod k použití** v češtině: účel určení, kohorta a vylučovací kritéria, kompatibilní senzory a jednotka mmol/l (výrobce nesmí tvrdit „funguje s jakýmkoli senzorem“), co aplikace nedělá (nehlídá glukózu, není budík, nepočítá dávku), postup při selhání aplikace.

### A8. Hlavní rizika a jak jim aplikace čelí

| Riziko | Opatření v návrhu |
|---|---|
| Pacient pochopí radu jako pokyn k dávce | O dávce aplikace mluví jen jako o předepsané lékařem; rady mění jen jídlo; nikdy „sněz víc“ (pojistka v jádru: rada, jejíž text mluví o množství, se po píchnutí s menší porcí nenabídne) |
| Hypoglykémie po menší porci s podaným inzulinem | Pravidlo „Méně jídla než obvykle“ hned, otázka „pod 4?“ za 60 min (připomínkou v telefonu), rady k množství a procházka se nenabízejí |
| Opakované poklesy pod 4 mezi kontrolami | Po 2 poklesech za 7 dní karta s obecnou radou a větou „nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal“; táž věta v pravidle k nízké glukóze; karta se opakuje s každým dalším poklesem; pokles pod 4 u jídla v období blokuje v návrhu větev „zvýšit dávku“; poklesy v bezpečnostní části reportu. Zbytkové riziko: aplikace nikoho neupozorní, závisí na pacientovi |
| Pacient spoléhá na NutriFee jako na hlídání glukózy | Výslovně „nehlídáme“ při převzetí plánu; bod zaučení „upozornění na nízkou glukózu je v aplikaci senzoru zapnuté“; v návodu „NutriFee není systém upozornění“ |
| Připomínka nepřijde | Bod zaučení „připomínka nemusí přijít, inzulin podle plánu i bez ní“; v analýze rizik stav „aplikace mlčí“ |
| Chybně opsaná hodnota | Celá čísla čipy v rozsahu 4–15 se „pod 4 / nad 15 / nemám“; export na kontrole nahradí opsané hodnoty; shoda opsaných vrcholů s exportem je ověřovací bod návrhu k dávce (při nízké shodě větev „ponechat, posoudit příště z exportu“) a v „Co návrh oslabuje“ počet jen opsaných vrcholů |
| Chybějící noční data | Report výslovně řekne, že bez exportu nelze posoudit noční poklesy |
| Pacient píchá jinou dávku než v plánu (plán v aplikaci neodpovídá skutečnosti) | Aplikace o jiném lékaři nemluví; zapíše-li pacient dvakrát po sobě jinou dávku než v plánu, na Dnes se objeví karta „Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.“ (vlastník 1. 11. 2026); dávku aplikace nemění; na kontrole sestra volí „změnil se zdravotní stav“ (např. hospitalizace) |
| Chybně zadaná dávka | Volič, ne psaní; pacient potvrzuje první i každý nový plán se změněnou dávkou otázkou „Souhlasí s tím, co vám řekl lékař?“ |
| Pacient mimo kohortu | Podmínky zařazení a vylučovací kritéria na obrazovce, bez nich plán nejde vydat; věta v Bezpečí, kdy NutriFee přestává platit; na kontrole záznam „změnil se zdravotní stav“ |
| Alkohol, větší námaha, nemoc | Věta o opožděném poklesu po alkoholu a námaze v pravidle „Méně jídla než obvykle“; pravidla pro nemoc zvlášť pro bazál a inzulin k jídlu včetně tablet při zvracení a průjmu |
| Učení z nesouvisejících dat | Do vyhodnocení jen zápisy s potvrzeným inzulinem, obvyklou porcí, mimo nemoc a neobvyklý den; známé jídlo až ze 4 shodných zápisů ze 6 |
| Lékař přijme návrh mechanicky | Ověření „sedí / nesedí“ bod po bodu; body, které nejdou ověřit z dat, projde sestra s pacientem a hromadné „Vše sedí“ je nepřepíná; „data říkají jinak“ nejde přepnout; lékař „ověří s pacientem a rozhodne“ |
| Chybné nebo nekontrolované pravidlo | Každé klinické pravidlo je položka registru se stavem, verzí, otiskem znění a historií; klinické položky schvaluje garant jen Schválit / Zamítnout s poznámkou; zamítnutá položka na místě ukáže „Tahle část nefunguje“; provozní pravidla aplikace (`scope: 'provozni'`) neschvaluje nikdo, v registru jsou jen popisem; změny pravidel v ostrém provozu jen řízením změn výrobce |

---

## Část B — Osnova posouzení vlivu na ochranu osobních údajů (DPIA)

*Osnova, kterou doplní vývojář serveru podle toho, jak postaví ukládání dat. DPIA je podle regulační prověrky povinné (údaje o zdravotním stavu, zranitelní subjekty, nová technologie). Maketa na veřejné adrese zpracovává jen přihlašovací údaje garanta a správce a jejich neformální rozhodnutí; syntetická data pacienta nejsou osobní údaje.*

### B1. Popis zpracování

- **Účel:** poskytování aplikace pacientovi (rady, vyhodnocení zápisů, připomínky, bezpečnostní pravidla) a příprava podkladu pro kontrolu u lékaře; v první fázi klinická studie.
- **Kategorie údajů:** identifikace pacienta v rámci ordinace (pseudonym, ne jméno v aplikaci), diagnóza, léčba a vylučovací kritéria, dávky inzulinu a jejich potvrzení, zápisy jídel a porcí, opsané hodnoty glukózy, odpovědi na otázku o poklesu, export ze senzoru (časové řady glukózy včetně nocí), odpovědi na rady, stav nemoci, časy připomínek, odpovědi sestry k bodům návrhu, stopa akcí. Jsou to **údaje o zdravotním stavu** (zvláštní kategorie). U formuláře podpory navíc telefonní číslo (zdravotní potíže tam nepatří).
- **Subjekty údajů:** pacienti; v menší míře lékař, sestra a garant (kdo rozhodl, kdy, k jakému znění).
- **Tok dat:** pacient opisuje hodnoty ze senzoru do aplikace; **bez napojení na aplikaci nebo rozhraní výrobce senzoru**. Před kontrolou pacient export ze senzoru získá u výrobce senzoru a pošle ho do ordinace (jak přesně, je otevřený úkol ostré aplikace); sestra ho na kontrole nahraje a NutriFee ho převede a doplní mezery. Personál se nikdy nepřihlašuje účtem pacienta a nezná jeho heslo.
- **Zdroj:** pacient (zápisy, opsané hodnoty, export), ordinace (karta, dávky, odpovědi sestry), aplikace (odvozené hodnoty, stopa).
- **Příjemci:** jeden ošetřující lékař a sestra v ordinaci; provozovatel serveru NutriFee jako zpracovatel. Výrobce senzoru data od NutriFee nedostává; žádný další subjekt. Kdo z provozovatele (technická podpora, správce) má k datům přístup, musí říct informace pro pacienta.
- **Uchování:** po dobu účasti ve studii a dále podle protokolu a zdravotnické legislativy; dokumentace klinické zkoušky a technická dokumentace podle lhůt, které stanoví poradce; stopa pro doložení algoritmů pseudonymizovaná, po skončení anonymizovaná.
- **Role:** ordinace jako správce, provozovatel NutriFee jako zpracovatel (smlouva o zpracování včetně cloudových subdodavatelů), případně společní správci pro studii — určí právní poradce.

### B2. Nezbytnost a přiměřenost

- Zpracovává se jen to, co vyhodnocení a bezpečnostní větev potřebují: dvě opsané hodnoty glukózy k jídlu, odpověď na pokles, potvrzení dávky, porce, rada a odpověď. Žádné makroživiny, fotky jídla, poloha, kontakty, kalendář.
- Živá hodnota ze senzoru se nezobrazuje a nesbírá; export se nahrává jednou za kontrolu a čte se v ordinaci.
- Lékař mezi kontrolami data nečte; nikdo z ordinace pacienta průběžně nesleduje. **Aplikace nikoho neupozorňuje a pacienta k volání nevyzývá**; při opakovaných poklesech pacientovi jen řekne, ať nečeká na kontrolu a poradí se s lékařem, který mu inzulin předepsal. Žádný údaj se kvůli tomu nikam neposílá.
- Připomínky si pacient nastavuje a vypíná sám; lékař k nim přístup nepotřebuje.
- Právní základ pro zdravotní údaje: poskytování zdravotní péče, resp. výslovný souhlas účastníka studie — potvrdí právní poradce. Ve studii oddělit informovaný souhlas s účastí od právního základu zpracování.
- Informace pro pacienta: co se zapisuje, kdo to vidí (včetně technické podpory), jak dlouho, že aplikace dávku nemění a glukózu nehlídá, jak účast ukončit, jak získat kopii a výmaz.

### B3. Rizika pro práva a svobody subjektů

| Riziko | Pravděpodobnost | Závažnost | Opatření |
|---|---|---|---|
| Únik zdravotních údajů ze serveru | nízká | vysoká | šifrování při přenosu i v klidu, přístup jen pod účtem s rolí, oddělení studie od ostatních systémů, bez jmen v aplikaci, servery v EU |
| Přístup nepovolané osoby v ordinaci | střední | střední | přihlášení s rolí, odhlášení po nečinnosti, bez tisku |
| Ztráta telefonu pacienta | střední | střední | v zařízení jen stav aplikace pod zámkem telefonu, data na serveru, možnost vzdáleného odhlášení |
| Přenos exportu ze senzoru do ordinace | střední | střední | způsob předání určí ostrá aplikace; zabezpečený kanál, žádné heslo pacienta v ordinaci, soubor se čte jen pro převod a nečitelný se odmítne celý |
| Nesprávný závěr z dat (poškození zdraví) | nízká | vysoká | část A8; lékař rozhoduje, aplikace nemění dávku |
| Použití dat k jinému účelu (pojišťovna, zaměstnavatel) | nízká | vysoká | smlouva o zpracování, žádný třetí příjemce, výmaz po studii |
| Nemožnost uplatnit práva (přístup, výmaz) | nízká | střední | export zápisů a stopy na žádost, výmaz účtu s potvrzením ordinaci |

### B4. Opatření a jejich doložení

- Technická: šifrování, řízení přístupu podle rolí, protokolování přístupů, zálohy, oddělené prostředí studie; **jádro aplikace nevolá síť** (test to hlídá) — síť má jen vrstva ukládání. Bezpečnostní pravidla jsou v zařízení a fungují bez připojení.
- Organizační: smlouva o zpracování s provozovatelem serveru, pověřenec nebo odpovědná osoba, školení sestry, postup pro incidenty (do 72 h), postup pro žádosti subjektů, záznam o činnostech zpracování.
- Doklady: tento dokument, protokol studie, informovaný souhlas, smlouva o zpracování, záznam o činnostech zpracování, bezpečnostní dokumentace serveru (dodá vývojář serveru).
- **Maketa:** e-maily a rozhodnutí garantů a správce v databázi makety jsou osobní údaje — smlouva o zpracování s poskytovatelem databáze, umístění v EU, informace pro garanty, výmaz po ukončení posuzování. Rozhodnutí garanta nesou verzi a otisk znění položky; přístup podle pravidel databáze (garant jen své zápisy, správce vše, žádné úpravy ani mazání řádků).

### B5. Co zbývá rozhodnout před studií

1. Právní základ a role správce a zpracovatele (právní poradce).
2. Kde fyzicky leží server a kdo k němu má přístup (vývojář serveru).
3. Jak pacient získá export ze senzoru a jak ho bezpečně předá do ordinace; převodníky pro senzory v kohortě a seznam ověřených senzorů pro návod k použití.
4. Doba uchování a způsob anonymizace stopy po studii.
5. Zda a jak pacient vidí vlastní data mimo aplikaci (export na žádost).
6. Konzultace s dozorovým úřadem, pokud zbytkové riziko vyjde vysoké.

---

*Související: `15-ZDROJ-PRAVDY-MAKETA.md` odst. 1, 2, 4–7, 10, 12, 18; `navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/06-regulace-bezpecnost.md` (regulace a klinická bezpečnost, 29. 10. 2026) a `00-rozhodnuti.md` (rozhodnutí 30. 10. a 1. 11. 2026); `navrhy-designu/23-schvalovani-2026-10-27/00-SOUHRN.md` (bez výzvy volat, cesta dat ze senzoru); historicky `11-analyza-projektu-2026-10-15.md` a `12-krizova-analyza-2026-10-15.md`.*
