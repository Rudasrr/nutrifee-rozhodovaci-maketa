# Kontrola 4 · pohled 06: regulace a klinická bezpečnost

*29. 10. 2026 · pracovní podklad pro vlastníka, regulatorního poradce a garanta; nepublikuje se. Maketa se neměnila. Posuzováno proti `15-ZDROJ-PRAVDY-MAKETA.md` (stav SCHEMA 77) a textům v `maketa-rozhodovaci/app/data/registry.js`, `app/screens.js`, `app/screens-clinic.js`, `demo/guide.js`, `demo/intro.js`; kontext `navrhy-designu/29-konkurence-2026-10-29/01-reserse.md` a `navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`. Nejde o právní stanovisko; konečnou kvalifikaci a třídu určí regulatorní poradce a notifikovaná osoba.*

**Stupně nálezů:** **A** = bezpečnostní riziko pro pacienta nebo zásadní regulační problém, které by měly být vyřešené před studií · **B** = má se opravit před ostrou aplikací nebo před předložením notifikované osobě · **C** = drobnost, upřesnění, poznámka pro garanta.

**Počty:** A 3 · B 15 · C 14.

Několik nálezů se dotýká rozhodnutí, která `15` odst. 18 už vědomě uzavřel (hlavně „bez výzvy volat“, 27. 10. 2026). U nich uvádím důvod tehdejšího rozhodnutí a proč ho z regulačního a bezpečnostního pohledu doporučuji otevřít. Rozhodne vlastník.

---

## 1. Kvalifikace a třída

### 1.1 Je ostrá NutriFee zdravotnický prostředek?

**Ano, téměř jistě.** Podle MDR čl. 2 odst. 1 je software zdravotnickým prostředkem, když je výrobcem určen k účelu jako „diagnostika, prevence, monitorování, … léčba nebo mírnění nemoci“. NutriFee podle účelu určení (`15` odst. 1, dok. 14 část A):

- zobrazuje předepsané dávky inzulinu a sbírá jejich podání,
- z hodnot glukózy (opsaných, export) vyhodnocuje reakci na jídla jednotlivého pacienta a radí mu před jídlem s ohledem na už podaný inzulin (porce, doplněk, pořadí, procházka),
- při hlášené nízké nebo vysoké glukóze ukáže postup a eviduje poklesy,
- lékaři na kontrole předkládá vyhodnocení a návrh „posoudit dávku“ s větví postupu (zvýšit / snížit / ponechat).

To je informace použitá k terapeutickým rozhodnutím o konkrétním pacientovi, ne obecná edukace ani „wellness“. MDCG 2019-11 rev. 1 výslovně uvádí, že znění „informace použitá k rozhodnutím s diagnostickým nebo terapeutickým účelem“ popisuje způsob působení, který je společný všem MDSW, a jako příklady MDSW uvádí i software s radami k dávce inzulinu pro laiky a software čtečky glukózy s „vedením k inzulinu“. Vyjmutí tvrzením „dávku nedoporučujeme“ nefunguje — rozhoduje účel celku.

**Akt o umělé inteligenci (nařízení 2024/1689):** NutriFee podle mého posouzení **není systém AI**. Pravidla, prahy a větve definují lidé (registr, garant), výstup je deterministický; recitál 12 vylučuje „systémy založené na pravidlech definovaných výhradně fyzickými osobami“. Je ale nutné to v technické dokumentaci výslovně zdůvodnit (C2) — slova „aplikace se učí“ by při povrchním čtení mohla vést k opačnému závěru a k povinnostem pro vysoce rizikové systémy AI (čl. 6 odst. 1, prostředek s posouzením notifikovanou osobou).

### 1.2 Třída podle pravidla 11

Pravidlo 11 (příloha VIII MDR) a tabulka 1 v příloze III MDCG 2019-11 rev. 1:

| | Léčit / diagnostikovat | Řídí klinický postup | Informuje |
|---|---|---|---|
| Kritická situace | III | IIb | IIa |
| **Závažná situace** | **IIb** | **IIa** | IIa |
| Nezávažná | IIa | IIa | IIa |

**Stav pacienta:** DM2 léčený intenzifikovaným inzulinem je podle mého posouzení „závažná situace“ (chronické onemocnění, chyba v léčbě může vést k těžké hypoglykémii nebo dlouhodobému zhoršení, ale rozhodnutí není časově kritické v minutách). Kritickou situací by bylo akutní řízení hypoglykémie nebo ketoacidózy v reálném čase — to NutriFee nedělá (živou glukózu nevidí).

**Význam informace podle funkcí:**

| Funkce | Význam informace | Dílčí třída | Co ji posouvá |
|---|---|---|---|
| Rady k jídlu (porce k obvyklé, doplněk, pořadí, procházka) s ohledem na podaný inzulin | řídí rozhodnutí pacienta o terapii (jídlo k dávce je součást inzulinové léčby) | **IIa** | nahoru: kdyby radila „sněz víc“ nebo podle čísla glukózy; dolů nic (u inzulinu nelze pod IIa) |
| Otázka „Klesla glukóza pod 4?“, počítání poklesů, karta po 2 poklesech | monitorování nevitálního fyziologického procesu (pravidlo 11b) + informace pro lékaře | **IIa** | nahoru: alarm v reálném čase, automatická eskalace; dolů: čistý deník bez vyhodnocení (stále IIa) |
| Bezpečnostní pravidla (I-HYPO, I-VYSOKA, I-NEMOC…) zobrazená po čipu „pod 4“ / „nad 15“ | standardní edukace, spouštěná vstupem | **IIa** (nejde-li o výpočet) | nahoru: personalizované množství cukru, výpočet; drží dolů: obecné znění shodné s běžnými edukačními materiály, bez výpočtu |
| Report lékaři: souhrn, reakce na jídla, poklesy, semafor | informuje / řídí klinický postup | **IIa** | — |
| **Návrhová karta „posoudit dávku“ s větví postupu „zvýšit / snížit dávku“ a voličem nové dávky** | software aplikuje postup na data a ukáže **směr změny inzulinu** → blíží se „léčit“ | **IIb** (pravděpodobně) | nahoru: velikost kroku v jednotkách, předvyplněná nová dávka, automatické vydání; dolů: viz níže |
| Blok větve „zvýšit“ při poklesu pod 4 | opatření ke snížení rizika | třídu nemění | snižuje pravděpodobnost újmy, je silný argument v analýze rizik |

**Odhad třídy: IIb (nejpravděpodobnější), IIa obhajitelná jen s úpravou karty k dávce; třída I vyloučena.**

Odůvodnění: Pravidlo 11a dává IIb, když rozhodnutí na základě chybné informace může způsobit „závažné zhoršení zdravotního stavu“. Chybně ukázaná větev „zvýšit dávku“ u inzulinu (například z nadhodnocených opsaných vrcholů, B5) vede po lékařově souhlasu k vyšší dávce a k riziku těžké hypoglykémie — to je typický příklad závažného zhoršení. Lékař v kruhu a ověřovací body pravděpodobnost snižují, ale MDCG posuzuje závažnost dopadu chybné informace, ne pravděpodobnost. Srovnatelné produkty pro titraci inzulinu jsou zařazené ve třídě IIb (EU) nebo jako třída II se zvláštními kontrolami (USA). Třída III by přicházela v úvahu, jen kdyby software dávku sám počítal nebo podával (pravidlo 22, uzavřená smyčka), což NutriFee nedělá.

**Cesta k IIa (rozhodnutí vlastníka, ne doporučení):** karta k dávce by musela přestat ukazovat směr. Tedy jen „Co aplikace pozorovala · Co ověřit · výsledek ověření“ a odkaz na lékařův postup bez vybrané větve. `15` odst. 18 (18. 10. 2026) to už zvážil a vlastník kartu ponechal, protože je hlavní hodnotou pro lékaře. Doporučuji to rozhodnutí neměnit, ale **plánovat jako IIb** (notifikovaná osoba, klinické hodnocení s klinickými daty, PSUR každý rok) a v dokumentaci nepředjímat IIa. `navrhy-designu/29-…/01-reserse.md` odst. 4 bod 4 („pravděpodobně MDR třída IIa“) je proti tomu příliš optimistický.

### 1.3 Co zbytečně zvyšuje regulační riziko a jak to přeformulovat beze změny smyslu

Třídu určuje funkce, ne slova. Formulace ale určují, jak notifikovaná osoba a klinický hodnotitel funkci přečtou (účel určení zahrnuje podle MDR čl. 2 bod 12 i „propagační materiály a prohlášení“). Konkrétní místa jsou v nálezech **B7–B11** a **C7, C8, C13**. Zkráceně:

1. **Budoucí čas a „odhad“ u jídel** (B7): „Kam se po něm glukóza dostane“ je predikce; registr přitom říká „Popisuje minulost, nepředpovídá“. Predikce zvyšuje nároky na klinický důkaz (přesnost předpovědi).
2. **Příčinná tvrzení u pacienta** (B8): „Co u vás pomohlo“, „jestli to pomohlo“ — u lékaře je to správně neutrální („s radou bývalo níž“, „nedokazuje účinek“).
3. **Lékař „jen schvaluje“** (B10): navozuje, že rozhoduje software a lékař je formalita — přesně to, co tlačí funkci k „léčit“ a co hodnotitel čte jako riziko automatizačního zkreslení.
4. **„Postup říká: zvýšit dávku“ a „Souhlasím · z 8 na 10 j.“** (B11): tlačítko „Souhlasím“ vyjadřuje souhlas s návrhem aplikace; má jít o rozhodnutí lékaře podle jeho postupu.
5. **„odborník, který za NutriFee odborně ručí“** (B9): odpovědnost za prostředek má podle MDR výrobce, ne fyzická osoba.
6. **„signál ke změně dávky“** v `15` odst. 1 (C13).

---

## 2. Nálezy

### A — bezpečnostní riziko nebo zásadní regulační problém

#### A1. Opakované poklesy pod 4: pacient se nedozví, že to nemá čekat do kontroly

**Kde:** B-HYPO `texts.opakovane`, I-HYPO, `15` odst. 2.3, 8, 18 („Bez výzvy volat“, zavrženo 27. 10. 2026).

**Stav:** Po 2 poklesech za 7 dní pacient dostane obecnou radu a větu „Poklesy uvidí lékař na kontrole.“ Kontrola je typicky za 3 měsíce. Lékař mezi kontrolami nic nevidí. Pacient s pevnou dávkou, u kterého se poklesy opakují (změna jídla, hubnutí, nástup GLP-1, zhoršení ledvin, pohyb), tak může mít desítky hypoglykémií, než dávku někdo posoudí. Karta se navíc po zavření „Rozumím“ znovu ukáže až s dalším poklesem a nic nestupňuje.

**Proč A:** Opakovaná hypoglykémie u inzulinu je hlavní známé riziko celé léčby a kartu po poklesech aplikace sama počítá — ví tedy o nebezpečné situaci a výslovně ji odkládá na kontrolu. Při posuzování podle přílohy I MDR (body 1–4: snížit riziko co nejvíc, informace pro bezpečnost jako poslední, ale nutná vrstva) a ISO 14971 to klinický hodnotitel pravděpodobně označí za nepřijatelné zbytkové riziko. Standardní edukace k inzulinu i příbalové informace inzulinů říkají, že při častých hypoglykémiích se má pacient poradit s lékařem.

**Důvod rozhodnutí z 27. 10. 2026** (`15` odst. 18): plán je digitalizací dnešní péče; lékař nesmí vydat plán, který vede do hypoglykémie; pacient má vědět, co dělat; o poklesech se lékař dozví na kontrole. **Proč to nestačí:** plán, který na začátku nevede do hypoglykémie, do ní může vést za měsíc (změna hmotnosti, léků, ledvin). Dnes bez NutriFee by pacient s opakovanými poklesy podle běžné edukace lékaři zavolal; věta „Poklesy uvidí lékař na kontrole“ ho od toho naopak odrazuje — aplikace tím zhoršuje dnešní stav, ne digitalizuje ho.

**Návrh (zachovává „aplikace nikam nevolá a nic neposílá“, jen informuje jako příbalová informace):**

B-HYPO `opakovane`, nahradit poslední větu:
> „Při každém poklesu postupujte podle pravidla k nízké glukóze. Mějte u sebe vždy cukr nebo džus. Když sníte méně než obvykle, řiďte se pravidlem „Méně jídla než obvykle“. Dávku inzulinu si sami neměňte, rozhoduje o ní lékař. **Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.**“

A do I-HYPO na konec:
> „Když glukóza klesá pod 4 opakovaně, poraďte se s lékařem dřív než na kontrole.“

Karta po druhém poklesu pak nemá zmizet natrvalo „Rozumím“, ale ukázat se znovu při každém dalším poklesu v okně 7 dní (stávající `S.hypoAlertSeen` po zavření jen do dalšího poklesu — ověřit, že tak opravdu funguje i při 3., 4. poklesu).

Rozhodnutí vlastníka nutné (přebíjí zavržení z 27. 10. 2026).

#### A2. „Na nízkou či vysokou glukózu vás upozorňuje aplikace vašeho senzoru“

**Kde:** `app/screens.js` ř. 223 (převzetí plánu, stránka „Co neděláme“); stejný předpoklad v `15` odst. 7b bod 1 („na nízkou/vysokou upozorňuje aplikace senzoru“) a v I-VYSOKA.

**Proč A:** NutriFee tímto tvrzením přesouvá hlavní ochranu před hypoglykémií na cizí prostředek, o kterém nic neví: zda pacientův senzor upozornění vůbec umí (některé senzory v kohortě je mít nemusí nebo jen volitelně), zda je pacient zapnul, jaké má prahy, zda telefon nemá ztlumený zvuk a zda senzor právě nemá výpadek. Pacient z věty pochopí „hlídá mě to“. Když upozornění nepřijde, nic jiného ho nehlídá — NutriFee živou glukózu nevidí. Navíc věta „S potížemi teď pomůže Bezpečí“ slibuje pomoc, kterou obrazovka s pravidly neposkytuje.

**Návrh znění** (ř. 223):
> „Nízkou ani vysokou glukózu nehlídáme. Upozornění na ni si nastavte v aplikaci senzoru – sestra vám s tím pomůže. Když vám není dobře, řiďte se pravidly v Bezpečí.“

**Navíc pro ostrou aplikaci:** bod zaučení „Pacient má v aplikaci senzoru zapnuté upozornění na nízkou glukózu“ (sestra zaškrtne; pokud senzor upozornění neumí, poznamená to a lékař to vidí). Do podmínek zařazení nebo do analýzy rizik: senzor s upozorněním na nízkou glukózu, nebo vědomé přijetí rizika lékařem. V návodu k použití uvést, že NutriFee není systém upozornění.

#### A3. Zobrazená dávka může být neplatná, když ji změnil jiný lékař nebo nemocnice

**Kde:** krok 1 před jídlem („Inzulin ke snídani: 8 j.“, „Ano, 8 j. · píchnuto“), Dnes („Lékař vám předepsal …“, „Čas na bazál“), Plán.

**Stav:** Dávky mění jen lékař v NutriFee na kontrole. Pacient ale může dostat jinou dávku mimo NutriFee: hospitalizace, pohotovost, jiný diabetolog, telefonická úprava. Aplikace pak dál v okamžiku píchání ukazuje starou dávku jako „předepsanou lékařem“ a nabízí ji jako první odpověď. U seniora je reálné, že se podle čísla na displeji řídí. Snížená dávka po hypoglykémii v nemocnici → aplikace ukazuje původní vyšší → opakovaná těžká hypoglykémie. „Píchnuto jinak“ problém neřeší, jen ho zaznamená.

**Proč A:** aplikace v kritickém okamžiku zobrazuje údaj o léčbě, který může být neplatný, a podává ho s autoritou lékaře.

**Návrh:**
- U dávky v kroku 1 a na kartě bazálu doplnit původ a datum: „**Podle plánu z 3. 10.:** 8 j.“ a pod tím jednou větou: „Když vám lékař dávku mezitím změnil, řiďte se jím a klepněte na „Píchnuto jinak“.“
- Když pacient 2× po sobě u téhož jídla dne potvrdí „Píchnuto jinak“ se stejnou jinou hodnotou, karta na Dnes (bez rodu): „Inzulin ke snídani je už podruhé 6 j. místo 8 j. podle plánu. Když vám dávku změnil lékař, ukažte telefon sestře nebo lékaři, ať plán upraví.“ (Žádná změna dávky aplikací; je to informace o neplatném plánu.)
- V návodu k použití a v zaučení: plán NutriFee platí jen do další změny léčby kýmkoli; bod zaučení „Pacient ví, že při změně dávky jinde to řekne v ordinaci“.

---

### B — opravit před ostrou aplikací nebo před předložením notifikované osobě

#### B1. Pravidlo k nízké glukóze je pro člověka v hypoglykémii dlouhé a stojí jen na čísle ze senzoru

**Kde:** I-HYPO (8 vět), karta „Glukóza je teď pod 4“, Bezpečí.

**Problémy:** (a) Při hypoglykémii je narušené soustředění; první akce musí být vidět okamžitě, ostatní až pod ní (IEC 62366-1: scénář použití související s nebezpečím, nutná sumativní validace). (b) Pravidlo se spouští jen čipem „pod 4“. Pacient s příznaky a senzorem, který kvůli zpoždění tkáňové glukózy ukazuje 5, pravidlo nedostane. (c) Po léčbě senzor ukazuje vzestup se zpožděním 5–15 min — „za 15 min změřte znovu“ podle senzoru vede k opakovanému zbytečnému cukru. (d) U pacientů s akarbózou (tablety v kohortě „nevadí“) řepný cukr ani džus se sacharózou nepůsobí spolehlivě, je potřeba glukóza (hroznový cukr).

**Návrh znění I-HYPO** (stejné množství, stejný postup, jen pořadí a dvě věty navíc):
> „**Hned vypijte asi 1,5 dl džusu nebo snězte 3–4 kostky cukru.** To je léčba nízké glukózy, ne rada k jídlu.
> Platí to, když glukóza klesne pod 4 mmol/l, i když se cítíte jako při nízké glukóze (třes, pocení, hlad, zmatenost) a senzor ukazuje víc.
> Za 15 min glukózu změřte znovu; když se cítíte jinak, než ukazuje senzor, změřte ji glukometrem z prstu. Když je pořád pod 4 mmol/l, dejte si džus nebo cukr ještě jednou a za 15 min změřte znovu; když je pod 4 mmol/l i potom, volejte záchrannou službu.
> Když je glukóza zase nad 4 mmol/l a další jídlo máte až za víc než hodinu, snězte krajíc chleba nebo jinou malou svačinu.
> Kdo je zmatený, nemůže polknout nebo je v bezvědomí, nesmí nic dostat do úst: okolí volá záchrannou službu. Řekněte to i svým blízkým.“

Akarbóza: buď vylučovací kritérium v K-KRITERIA („Akarbóza ne – nízká glukóza se u ní léčí jen hroznovým cukrem“), nebo osobní hodnota pravidla. Doporučuji vylučovací kritérium (jednodušší, nepersonalizuje pravidlo). Garant posoudí, zda kohorta akarbózu reálně obsahuje.

#### B2. Alkohol a větší pohyb: žádné pravidlo, přitom jsou to hlavní spouštěče hypoglykémie u inzulinu

**Kde:** registr nemá pravidlo; alkohol je jen důvod „neobvyklý den“ pro vyřazení z učení (R-REAKCE, D-CISTA); pohyb jen jako rada „procházka“ a ověřovací bod lékaře.

**Riziko:** opožděná (i noční) hypoglykémie po alkoholu nebo po zátěži (zahrada, sport) při pevné dávce; senior to nemusí vědět. Aplikace se o alkoholu dozví (pacient označí neobvyklý den), ale nic neřekne.

**Návrh:** doplnit větu do I-MENE (nebo nové pravidlo I-NAMAHA, garant schválí):
> „Po alkoholu a po větší námaze než obvykle (sport, práce na zahradě) může glukóza klesnout i za několik hodin, i v noci. Jezte jako obvykle, mějte u sebe cukr a před spaním se podívejte na senzor.“

Při volbě „Neobvyklý den (… alkohol)“ tuto větu ukázat jednou pod volbou. Nejde o radu „sněz víc“ — je to pokyn jíst jako obvykle k dávce.

#### B3. Nemoc a tablety: chybí pokyn k tabletám a k nízké glukóze během nemoci

**Kde:** I-NEMOC-BAZAL, I-NEMOC-JIDLO, P-NEMOC; kohorta připouští „tablety nebo GLP-1“.

**Riziko:** (a) metformin a glifloziny se při zvracení, průjmu nebo dehydrataci obvykle přerušují (riziko laktátové acidózy, ketoacidózy i při normální glukóze, akutního selhání ledvin); ketoacidóza u gliflozinů může nastat i pod 15 mmol/l, takže práh „déle než 3 hodiny nad 15“ ji nezachytí. (b) Pravidlo pro bazál říká „píchejte dál, i když nejíte“ — správně, ale nemocný bez jídla s plným bazálem může klesat a pravidlo na to neodkazuje. (c) Deriváty sulfonylurey zvyšují riziko hypoglykémie při nejedení.

**Návrh znění:**
I-NEMOC-BAZAL:
> „Bazál si píchejte dál ve stejný čas, i když nejíte. Pijte a měřte glukózu každé 3 h. **Když je pod 4 mmol/l, řiďte se pravidlem k nízké glukóze; když klesá opakovaně, vyhledejte ještě ten den lékařskou pomoc.**“

I-NEMOC-JIDLO, doplnit za větu o zvracení:
> „**Berete-li i tablety na cukrovku, při zvracení, průjmu nebo když nemůžete pít, se ještě ten den poraďte s lékařem, které z nich vynechat.**“

Obojí je „vyhledejte lékařskou pomoc“ ve stejném duchu jako dnešní text (ne výzva aplikace volat ordinaci). Garant posoudí; pro K-KRITERIA zvážit, zda glifloziny a sulfonylurea do kohorty pustit, nebo je zapsat zvlášť (dnes jedno zaškrtávátko „bere i tablety nebo GLP-1“ nerozlišuje, které).

#### B4. Vylučovací kritéria aplikace nekontroluje a nemá je ani na obrazovce

**Kde:** K-KRITERIA (4 zaškrtávátka), průvodce: „vylučovací kritéria (těhotenství, těžké ledvinové nebo jaterní onemocnění, opakované těžké poklesy glukózy, zhoršený zrak nebo paměť…) aplikace nekontroluje; stanoví je protokol studie“.

**Riziko:** V ostré aplikaci protokol studie nebude. Těhotenství má výrazně nižší cíle glukózy (cíle 3,9/10,0 a rada „v cíli“ by byly klinicky chybné), nepoznávání hypoglykémie ruší předpoklad, že pacient pozná a zapíše pokles, těžké ledvinové selhání mění kinetiku inzulinu. Těhotenství může nastat i během plánu a aplikace nemá cestu, jak to zjistit.

**Návrh:** páté zaškrtávátko zařazení (nepíše se, jen se zaškrtne):
> „Pacient nemá žádné vylučovací kritérium: těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, potíže se zrakem nebo pamětí, které znemožní ovládat telefon.“

A do Bezpečí (informace) a do zaučení:
> „Když otěhotníte nebo vám lékař změní léčbu, NutriFee pro vás přestává platit. Řekněte to lékaři.“

Na kontrole k „Léky mimo inzulin“ přidat volbu „Změnil se zdravotní stav (těhotenství, ledviny, hospitalizace)“ jako záznam do stopy.

#### B5. Návrh k dávce stojí hlavně na opsaných hodnotách, shoda s exportem není ověřovacím bodem

**Kde:** D-PRAND (okno ≥ 28 dní), Z-IMPORT (`shoda_mmol`), D-POSTUP `prandHigh`.

**Stav:** Export pokrývá jen posledních ~14 dní (příběh: 22. 12. – 4. 1.), okno návrhu je od změny dávky, nejméně 28 dní. Většina vrcholů v návrhu „zvýšit“ je tedy opsaná pacientem. Systematická chyba opisu nahoru (pacient opíše nejvyšší číslo z grafu včetně artefaktu, opíše hodnotu mimo 2 h, splete si „teď“ s „nejvyšší“) vede k větvi „zvýšit“. Údaj „Opsaná nejvyšší hodnota se s exportem shoduje u X z Y jídel“ existuje, ale jen v části „Data ze senzoru“, ne v kartě návrhu.

**Návrh:** do D-POSTUP `prandHigh` nový bod (fakt z dat, „data říkají jinak“, když shoda < 80 % nebo méně než 5 jídel ke srovnání):
> „Opsané nejvyšší hodnoty se s exportem shodují (u X z Y jídel do 1 mmol/l)“ · větev „bod nesedí → ponechat, posoudit příště z exportu“.

A do „Co návrh oslabuje“: „N z M vrcholů v návrhu je jen opsaných, bez průběhu z exportu.“ Klinický důkaz o shodě opisu je zároveň klíčový výstup studie (validace vstupu dat podle IEC 62366-1 a klinického hodnocení).

#### B6. Nový plán se změněnou dávkou se pacientovi nepotvrzuje otázkou „Souhlasí?“

**Kde:** `app/screens.js` ř. 1157–1159 („Projděte si změny a klepněte na „Rozumím, pokračuji““); u prvního plánu je otázka „Souhlasí s tím, co vám řekl lékař?“ (ř. 297) — podle `15` odst. 7b bod 9 „jediná nezávislá kontrola zadání dávky“.

**Riziko:** Chyba voličem na kontrole (10 místo 6) projde k pacientovi bez nezávislé kontroly; změna dávky je přitom nejrizikovější okamžik celého cyklu.

**Návrh:** u nového plánu se změněnou dávkou stejná otázka:
> „Nová dávka inzulinu ke snídani: 10 j. (dřív 8 j.). Souhlasí s tím, co vám řekl lékař?“ · Ano · Ne → „Ukažte telefon sestře. Plán zatím nepřebírejte; sestra dávku ověří s lékařem.“

#### B7. Předpověď místo popisu minulosti u jídla

**Kde:** `app/screens.js` ř. 120, 136 „Kam se po něm glukóza dostane“; ř. 121 „Zatím odhad z podobného jídla“; ř. 941 „odhad podle podobného jídla“; `15` odst. 15a bod 1 („kam se glukóza posune, když pacient radu přijme“). Registr R-REAKCE přitom říká „Popisuje minulost, nepředpovídá“.

**Proč:** Předpověď hodnoty glukózy pro konkrétního pacienta je prediktivní funkce; MDCG 2019-11 rev. 1 ji zvlášť zmiňuje a notifikovaná osoba bude chtít doklad přesnosti předpovědi. Smysl obrazovky je popis toho, co se dosud dělo.

**Návrh znění:**
- „Kam se po něm glukóza dostane“ → „**Kam se po něm glukóza dostávala**“
- řádek „s [radou]“: „**S radou [rada] bývala**“
- „Zatím odhad z podobného jídla, upřesní ho vaše zápisy.“ → „**Podobné jídlo bývalo spíš v cíli. Jak je to u tohoto jídla, ukážou vaše zápisy.**“
- „Zatím ho neznáme – odhad podle podobného jídla“ → „Zatím ho neznáme – podobné jídlo bývalo spíš v cíli / spíš nad cílem“

#### B8. Příčinná tvrzení u pacienta: „pomohlo“

**Kde:** `app/screens.js` ř. 1042 „Co u vás pomohlo“; `app/core.js` ř. 1155 „Po prvním pokusu uvidíte, jestli to pomohlo.“; `15` odst. 1 a 6 („co u vás pomohlo“).

**Proč:** Pacient si radu volí sám, srovnání není důkaz účinku — u lékaře to aplikace říká správně („Srovnání … ukazuje směr, nedokazuje účinek“, S-SOUHRN). U pacienta je to klinické tvrzení o účinku bez opory.

**Návrh znění:** „Co u vás pomohlo“ → „**S čím u vás bývalo v cíli**“; „Po prvním pokusu uvidíte, jestli to pomohlo.“ → „**Po prvním pokusu uvidíte, jak to dopadlo.**“

#### B9. „schválil je odborník, který za NutriFee odborně ručí“

**Kde:** `app/screens.js` ř. 1080 (Bezpečí); `15` odst. 4.5.

**Proč:** Za prostředek a jeho pravidla odpovídá podle MDR výrobce (čl. 10), s osobou odpovědnou za dodržování předpisů (čl. 15). Věta přisuzuje ručení fyzické osobě, kterou pacient nezná, a vytváří dojem osobní odpovědnosti, který v uspořádání ostré aplikace nebude.

**Návrh znění:**
> „Pravidla jsou stejná pro všechny pacienty NutriFee. Připravil je výrobce NutriFee a posoudil je lékař. Nic k nim nepřidáváme.“

#### B10. „Lékař … jen je schvaluje“ a „lékař nemusí přemýšlet“

**Kde:** `demo/intro.js` ř. 13 („Lékař dostane na kontrole souhrn a návrhy a jen je schvaluje.“); `15` odst. 1 („Lékař jen schvaluje, upravuje nebo odmítá.“), odst. 18 („Lékař tak nemusí přemýšlet, co vyhodnocení znamená“).

**Proč:** Popisuje lékaře jako formalitu nad rozhodnutím softwaru — posiluje čtení funkce jako „léčit“ (vyšší třída) a je to přesně riziko automatizačního zkreslení, které má analýza rizik ošetřit. Intro je text pro garanta a později podklad pro účel určení.

**Návrh znění** (intro):
> „Lékař dostane na kontrole souhrn a návrhy, ověří je s pacientem a rozhodne.“

`15` odst. 1: „Lékař návrhy posoudí, ověří s pacientem a rozhodne; nic se nemění bez jeho rozhodnutí.“ Větu z odst. 18 nahradit: „Lékař vidí, co vyhodnocení znamená podle jeho vlastního postupu, a rozhoduje sám.“

#### B11. „Postup říká: zvýšit dávku“ a „Souhlasím · z 8 na 10 j.“

**Kde:** `app/screens-clinic.js` ř. 419, 448 (návrhová karta k dávce).

**Proč:** „Souhlasím“ je souhlas s návrhem aplikace; nadpis „Postup říká“ bez uvedení, čí postup a jaká verze, zní jako doporučení softwaru. Funkce zůstává stejná, ale čtení jako „aplikace doporučila zvýšit“ je pro třídu i pro odpovědnost nejhorší možné.

**Návrh znění:**
- nadpis „Postup říká“ → „**Váš schválený postup (verze N) pro tento výsledek**“
- tlačítko „Souhlasím · z 8 na 10 j.“ → „**Rozhodnout podle postupu · z 8 na 10 j.**“; „Souhlasím · nastavte novou dávku“ → „**Rozhodnout podle postupu · nastavte novou dávku**“
- u ostatních návrhů (návyky, rady) „Souhlasím“ ponechat.
- `15` odst. 10 a 15a tomu přizpůsobit (zásada 1 se nemění).

#### B12. Registr v ostré aplikaci: změna pravidla je změna zdravotnického prostředku

**Kde:** `15` odst. 13 (scénář 5, „podnět → vypnout hned (1 klik) → schválit opravu (nová verze)“), odst. 12, karta „Podnět z provozu“, `app/screens-clinic.js` ř. 542–545.

**Proč:** V certifikovaném prostředku je každé klinické pravidlo součást návrhu prostředku. Změna znění, prahu nebo vypnutí položky pro všechny pacienty je změna návrhu, která musí projít řízením změn výrobce (ISO 13485 kap. 7.3.9, IEC 62304 kap. 6 a 8), ověřením a uvolněním verze; podstatnou změnu je nutné předem oznámit notifikované osobě (MDR příloha IX bod 4.10). Vypnutí funkce kvůli bezpečnosti u prostředku na trhu je bezpečnostní nápravné opatření s hlášením (čl. 87, 89). Během klinické zkoušky je to podstatná změna, která vyžaduje oznámení nebo schválení (čl. 75). Garant v ostrém provozu proto nemůže být „uživatel lékař“, ale role výrobce (klinický vedoucí v systému kvality); registr je jeho nástroj řízení změn, ne konfigurace prostředku z ordinace.

**Návrh:** v textech, které garant vidí (scénář 5, karta „Podnět z provozu“):
> „Ve studii a v ostrém provozu se pravidla mění jen postupem výrobce pro změny. Vypnutí položky je bezpečnostní opatření výrobce: zapíše se, oznámí se a nová verze platí až po ověření a uvolnění.“
Tlačítko „Vypnout položku hned“ → „**Navrhnout vypnutí položky**“ (s tím, že v ostré aplikaci vypnutí provede výrobce). V `15` odst. 13 a 18 doplnit odkaz na řízení změn a na čl. 75/87/89 MDR.

#### B13. „Připomíná inzulin“, ale nic nepřipomene, když aplikace není otevřená

**Kde:** `15` odst. 1, `demo/intro.js` ř. 13 („připomíná inzulin předepsaný lékařem“), dok. 14 A2 bod 1; přitom `15` odst. 7: „po 30 min otázka „Byl inzulin?“ – jen při otevření aplikace, nic nehlídá“; Dnes „Čas na bazál“ je karta.

**Riziko:** Pacient se spolehne na připomínku bazálu, která nepřijde (aplikace zavřená, oznámení vypnutá, telefon vybitý) → vynechaný bazál; nebo obráceně opožděná připomínka po už podané dávce → zdvojení.

**Návrh:** buď ostrá aplikace má systémová oznámení s ošetřeným selháním (a analýzou rizik), nebo tvrzení zúžit:
> „…ukáže dávku předepsanou lékařem, když aplikaci otevřete, a zeptá se, jestli byl inzulin podaný.“
Do zaučení: „Pacient ví, že NutriFee není budík na inzulin.“

#### B14. Výchozí cíle glukózy pro starší a křehké pacienty

**Kde:** C-CILE (3,9 / 10,0 / TIR ≥ 70 % / pod cílem < 4 %), S-SEMAFOR; kohorta je kolem 58 let, design počítá s pacienty 65+.

**Poznámka pro garanta:** mezinárodní konsenzus k cílům CGM doporučuje u starších a rizikových pacientů mírnější cíle (čas v cíli > 50 %, pod 3,9 mmol/l < 1 %). Výchozí „čas v cíli ≥ 70 %“ spolu s větví „zvýšit, když vyrovnání nedosahuje cíle“ (bod 6 `prandHigh`) může u křehkého pacienta tlačit k intenzifikaci. Cíle mění lékař voličem, ale výchozí hodnota má silný kotvicí účinek.

**Návrh:** u cílů v zařazení věta „U starších nebo křehkých pacientů a při riziku nízké glukózy zvažte mírnější cíle.“ a v C-CILE druhá sada výchozích hodnot „mírnější“ (čas v cíli ≥ 50 %, pod cílem < 1 %) volitelná jedním klepnutím. Hodnoty jsou návrh k posouzení garantem.

#### B15. Účel určení (dok. 14) neodpovídá dnešnímu chování

**Kde:** `navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`: A2 bod 4 „vyzve pacienta, aby zavolal do ordinace“, A7 „eskalace „zavolejte do ordinace““, „pokyn lékaře“, „provozní [schvaluje] vlastník“, B2 „Jediná eskalace jde přes pacienta („zavolejte“)“.

**Proč:** Účel určení je základ klasifikace, analýzy rizik i klinického hodnocení; regulatorní poradce bude pracovat s ním. Dnes popisuje opatření (výzva volat), které maketa nemá — analýza rizik by stála na neexistující kontrole rizika.

**Návrh:** aktualizovat dok. 14 podle `15` (bezpečnostní pravidla NutriFee místo pokynů lékaře, bez výzvy volat — nebo podle rozhodnutí k A1, provozní pravidla neschvaluje nikdo, export nahrává sestra, opsané hodnoty) a doplnit: odhad třídy IIb (odst. 1.2), že NutriFee není systém upozornění (A2) a seznam kompatibilních senzorů (C14).

---

### C — drobnosti, upřesnění, poznámky pro garanta

- **C1. Mrtvý kód s psaním desetinného čísla.** `app/screens.js` ř. 628–637 `peakAskCard`: karta „Nejvyšší hodnota po…?“ s polem `type="number" step="0.1"`, která se nikde nevykresluje (zrušena 18. 10. 2026). Před předáním vývojáři smazat — nepoužívaný kód v prostředku je nález podle IEC 62304 a pole by obcházelo čipy.
- **C2. Akt o AI.** Do technické dokumentace zdůvodnění „není systém AI“ (recitál 12: pravidla definovaná lidmi, deterministický výstup, žádné strojové učení parametrů). V textech pro pacienta „učíme se“ může zůstat; v účelu určení a propagaci psát „vyhodnocuje vaše zápisy“.
- **C3. Doplněk „hrst ořechů“.** Aplikace nezná alergie. R-DOPLNEK: „Přidejte k jídlu {doplněk}, **pokud vám nevadí**. Z jídla nic neubírejte.“ (Pacient může radu odmítnout, závažnost je nízká.)
- **C4. Procházka.** R-PROCHAZKA: „Po jídle se asi {minut} minut svižně projděte, **pokud vám to zdravotní stav dovolí**.“ Poznámka pro garanta: pohyb po podaném prandiálním inzulinu zvyšuje riziko poklesu; pravidlo ho správně nenabízí při riziku, ale ne při např. neuropatii nebo kardiálním omezení.
- **C5. Glukagon a blízcí.** I-HYPO správně říká „okolí volá záchrannou službu“. Garant zváží, zda kohorta na inzulinu má mít glukagon pro blízké — mimo aplikaci, ale do zaučení.
- **C6. Kontakty v ostré aplikaci s čísly.** I-KONTAKT: „Bezvědomí, křeče nebo dušnost: záchranná služba **155** (nebo 112).“ Číslo ordinace a pohotovosti z plánu. (V maketě čísla záměrně nejsou.)
- **C7. „Mezi kontrolami tu nic dělat nemusíte“ / „Vy už mezi kontrolami nic neděláte“** (`app/screens-clinic.js` ř. 56, 123, 489). Lékařova povinnost péče trvá (zavolá-li pacient). Znění: „**Aplikace vám mezi kontrolami nic neposílá a nic po vás nežádá.**“
- **C8. „Tato jídla řeší aplikace s pacientem“** (`app/screens-clinic.js` ř. 323, S-SILNA). Znění: „**Aplikace u těchto jídel nabízí pacientovi rady k porci, pořadí, doplňku a procházce.** Nic nezakazuje …“
- **C9. Formulář podpory sbírá telefonní číslo** („Ozveme se na telefon, ze kterého píšete“, ř. 1091). V ostré aplikaci informace o zpracování a účel; podpora nesmí dostat zdravotní údaje — věta „Zdravotní potíže sem nepatří“ je dobře.
- **C10. „nikdo nečte zápisy mezi kontrolami“** (ř. 219, 316, 1127). Data jsou na serveru výrobce, technická podpora a správce k nim mohou mít přístup. Znění: „**nikdo z ordinace nečte zápisy mezi kontrolami**“ a v informaci o zpracování říct, kdo přístup má.
- **C11. „Platí vždy, i bez připojení“** (Bezpečí, ř. 809, 1078). V ostré aplikaci musí být pravidla v zařízení a testem ověřená bez sítě (požadavek, ne text).
- **C12. Data garantů v maketě.** E-maily a rozhodnutí garantů v Supabase jsou osobní údaje: smlouva o zpracování, umístění serveru v EU, informace pro garanty, výmaz po ukončení posuzování.
- **C13. `15` odst. 1 „signál ke změně dávky“.** Znění: „s návrhem dalšího plánu včetně **podkladu k posouzení dávky**“.
- **C14. Kompatibilní senzory a jednotky.** „Funguje s jakýmkoli senzorem“ (rešerše 3.6) nesmí být tvrzení výrobce. Návod k použití musí jmenovat senzory, se kterými je kombinace ověřena (příloha I bod 14.1 MDR), jednotku mmol/l, a co dělat, když senzor ukazuje mg/dl. Lékařem měnitelné hodnoty pravidel (I-*: `v`) potřebují ověřené meze.

---

## 3. Klinická bezpečnost: scénáře poškození

| Scénář | Co maketa řeší | Co neřeší | Co by měl vědět garant |
|---|---|---|---|
| **Hypoglykémie po menší porci / vynechaném jídle s inzulinem** | I-MENE hned (i před píchnutím „až si píchnete“), otázka za 60 min, po večeři ráno, karta po 2 poklesech, procházka a rady k množství se nenabízí, pokles blokuje „zvýšit“ | pacient bez senzorového upozornění se o nočním poklesu nedozví včas; opakované poklesy se odkládají na kontrolu (A1, A2) | jediná aktivní ochrana mezi kontrolami je pacient sám a upozornění senzoru, které aplikace neověřuje |
| **Hypoglykémie z jiné příčiny** (alkohol, pohyb, hubnutí, ledviny, nástup GLP-1, sulfonylurea) | I-HYPO v Bezpečí; „neobvyklý den“ vyřadí zápis z učení; poklesy se počítají | žádné pravidlo k alkoholu a námaze (B2); změna léků se zjistí až na kontrole; tablety nerozlišené (B3) | hypoglykémie bez souvislosti s porcí nemá v aplikaci žádný spouštěč kromě čipu „pod 4“ |
| **Prodlení s pomocí** | pravidla říkají, kdy záchranná služba a kdy „ještě ten den lékařská pomoc“ (vysoká, nemoc) | opakované poklesy (A1); dlouhá nemoc — karta po 3 dnech jen zopakuje pravidlo | aplikace nikoho neupozorní; pacient s kognitivním úpadkem nemusí pravidla použít |
| **Chybně opsaná hodnota** | celá čísla čipy, rozsah 4–15 a „pod 4 / nad 15“, „nemám“ místo hádání, export nahradí opsané hodnoty, shoda X z Y | systematicky nadhodnocený opis mimo okno exportu → návrh „zvýšit“ (B5); chybný čip „7“ místo „pod 4“ → žádné pravidlo | shoda opisu je hlavní neznámá studie; má být primárním výstupem bezpečnosti dat |
| **Chybně zadaná dávka** | první plán: otázka pacientovi „Souhlasí?“; volič, ne psaní | nový plán po kontrole bez té otázky (B6) | nejrizikovější okamžik je změna dávky |
| **Dávka změněná mimo NutriFee** | „Píchnuto jinak“ zapíše skutečnost | aplikace dál ukazuje starou dávku jako předepsanou (A3) | doporučuji bod zaučení a větu u dávky |
| **Pacient na jiné léčbě než kohorta** | 4 podmínky zařazení, premixy vyloučené, „bere i tablety nebo GLP-1“ jako záznam, léky ověřené na kontrole | flexibilní dávkování podle sacharidů, akarbóza, glifloziny, sulfonylurea, pumpa — nic z toho aplikace nerozliší (B1, B3, B4) | rada „obvyklá porce“ je u pacienta, který byl edukován dávkovat podle sacharidů, v rozporu s jeho edukací |
| **Nemoc** | „Není mi dobře“, rady se zastaví, dvě pravidla (bazál / k jídlu), denní otázka, karta po 3 dnech, data mimo učení | tablety při nemoci, nízká glukóza při nemoci s bazálem (B3); pacient nemoc nezapne | ketoacidóza u gliflozinů pod prahem 15 |
| **Alkohol** | jen důvod vyřazení zápisu | žádná bezpečnostní informace (B2) | opožděná noční hypoglykémie |
| **Sport / větší pohyb** | procházka 15 min jen mimo riziko; ověřovací body „pohyb byl běžný“ | žádná informace pro pacienta (B2) | — |
| **Těhotenství** | nic (vylučovací kritérium jen v protokolu studie) | cíle a rady by byly chybné (B4) | zařadit jako vylučovací kritérium na obrazovce |
| **Děti a dospívající** | podmínka „dospělý“ | — | DM2 u dětí mimo kohortu; aplikace bez plánu nic neradí, riziko nízké |
| **Starší a křehcí** | velké písmo, čipy, jedna akce, převzetí po stránkách | výchozí cíle pro zdatné dospělé (B14); dlouhé pravidlo při hypoglykémii (B1) | sumativní test použitelnosti s pacienty 65+ je nutný |
| **Selhání aplikace** | rozpracovaný zápis se drží; Bezpečí „i bez připojení“; jádro nevolá síť | připomínky jen při otevření (B13); výpadek serveru, ztráta telefonu, špatné hodiny (časová pásma, letní čas), pád uprostřed potvrzení inzulinu | analýza rizik musí obsahovat „aplikace mlčí“ jako stav; pacient se nesmí na aplikaci spoléhat jako na jedinou připomínku |
| **Lékař přijme návrh mechanicky** | ověření sedí/nesedí bod po bodu, „data říkají jinak“ nejde přepnout, pokles blokuje „zvýšit“, věta při 2 změnách dávek | „Potvrdit vše beze změny“ a „Vše sedí“ jsou rychlé zkratky; formulace „Souhlasím“ (B11) | v klinickém hodnocení měřit, jak často lékař jde proti větvi a proč |
| **Garant schválí chybné pravidlo** | historie, oznámení „Tahle část nefunguje“, test pravdivosti | jeden garant = jeden názor; žádné nezávislé klinické přezkoumání | v ostré aplikaci druhé klinické posouzení u bezpečnostních položek (I-*, B-HYPO, D-POSTUP) |

**Co maketa dělá dobře (pro vyváženost):** nikdy „sněz víc“ po píchnutí a pojistka `NF.talksAmount`; bezpečnostní větev před bránou rad; při „pod 4“ žádná rada; procházka ne při riziku; další jídlo „na řadě“ až po 3 h (proti hromadění inzulinu); svačina bez inzulinu; I-NEVIM „znovu nepíchejte“; I-VYSOKA „inzulin navíc nepíchejte“; pokles blokuje „zvýšit“ i bez postupu; žádná velikost kroku v jednotkách; zamítnutí K-KRITERIA a Z-GLUKOZA jen jako záznam nesouhlasu (nebezpečné vypnutí odmítnuto).

---

## 4. Tvrdí maketa víc, než smí?

**Celkově ne — maketa je v tvrzeních střídmá.** Žádné tvrzení o lepší kompenzaci, HbA1c nebo snížení hypoglykémií na obrazovkách; „DEMO · syntetická data · není určeno pro léčbu“ je trvale v liště; srovnání rad u lékaře výslovně „nedokazuje účinek“; „Hodnoty jsou návrh autora makety, ne klinická pravda“ v průvodci. Problémová místa:

| Tvrzení | Kde | Problém | Nález |
|---|---|---|---|
| „Kam se po něm glukóza dostane“, „odhad“ | pacient, karta jídla | předpověď bez validace | B7 |
| „Co u vás pomohlo“, „jestli to pomohlo“ | pacient | účinek bez důkazu | B8 |
| „Na nízkou či vysokou glukózu vás upozorňuje aplikace senzoru“; „S potížemi teď pomůže Bezpečí“ | pacient, převzetí | slib bezpečnosti, který nikdo neověřil | A2 |
| „připomíná inzulin“ | intro, `15` | funkce je jen při otevření | B13 |
| „odborník, který za NutriFee odborně ručí“ | Bezpečí | nepravdivá struktura odpovědnosti | B9 |
| „Lékař … jen je schvaluje“ | intro | podceňuje roli lékaře | B10 |
| „Každá rada a každý výpočet … vychází z pravidla, které schvaluje lékař. Aplikace si nic nevymýšlí.“ | registr (lékař) | v ostré aplikaci pravidla uvolňuje výrobce; „nic nevymýšlí“ je reklamní | znění: „Každá rada a každý výpočet vychází z položky registru; klinické položky posoudil lékař-garant.“ (patří k B12) |
| „Čím častěji ji držíte, tím lépe dávka sedí a tím přesněji umíme radit.“ | pacient, přehled před kontrolou (ř. 1132) | slabé klinické tvrzení | znění: „Když ji držíte, můžeme výsledky jídel lépe porovnávat.“ (patří k B8) |
| „nikdo nečte zápisy mezi kontrolami“ | pacient | nepřesné vůči provozovateli | C10 |
| `15` odst. 1 „Cíl: lepší kompenzace“ | dokument | cíl studie, ne tvrzení — v propagaci smí být až s klinickými daty | — |
| Rešerše 3.5: „výrazně snižuje riziko … usnadňuje audit“; 3.6 „funguje s jakýmkoli senzorem“ | interní dokument | do propagace ani účelu určení nepřebírat | C14 |

---

## 5. Co musí ostrá aplikace mít navíc — seznam pro vlastníka

### Regulační základ
1. **Konečný účel určení** (aktualizovaný dok. 14, B15) a **kvalifikační a klasifikační zpráva** (pravidlo 11, MDCG 2019-11 rev. 1, odhad IIb) potvrzená regulatorním poradcem; předběžný dialog s notifikovanou osobou.
2. **Systém řízení kvality** podle čl. 10 odst. 9 MDR a ISO 13485:2016 (řízení návrhu, změn, dodavatelů — server, cloud, knihovny; CAPA; dokumenty a záznamy).
3. **Osoba odpovědná za dodržování předpisů** (čl. 15); pojištění odpovědnosti (čl. 10 odst. 16).
4. **Technická dokumentace** podle příloh II a III MDR; prohlášení o shodě; UDI a registrace v EUDAMED; posouzení shody notifikovanou osobou (příloha IX).
5. **Návod k použití** v češtině (elektronický podle nařízení 2021/2226): účel určení, kohorta, kontraindikace (B4), kompatibilní senzory (C14), co aplikace nedělá (nehlídá glukózu, není budík, nepočítá dávku), postup při selhání.
6. **Zdůvodnění „není systém AI“** podle nařízení 2024/1689 (C2).

### Řízení rizik (ISO 14971:2019, ISO/TR 24971)
7. Plán a soubor řízení rizik; analýza nebezpečí včetně scénářů z odst. 3 (hypoglykémie, prodlení, chybný opis, chybná dávka, neplatná dávka, mimo kohortu, nemoc, alkohol, selhání aplikace, mechanické přijetí návrhu, chybné pravidlo v registru, kybernetický útok).
8. Ke každému kontrolnímu opatření ověření účinnosti (testy jádra — dnešní testy pravdivosti T1–T4 jsou dobrý základ — a validace použitelnosti).
9. Hodnocení celkového zbytkového rizika a poměru přínosu a rizika; rozhodnutí k A1 a A2 tam musí být výslovně zdůvodněné.

### Software (IEC 62304:2006+A1:2015, EN 82304-1, IEC 81001-5-1)
10. Klasifikace bezpečnosti softwaru (doporučuji **C** pro moduly bezpečnostních pravidel, B-HYPO a návrhů k dávce, nebo B se zdůvodněnými vnějšími kontrolami rizik); plán vývoje, požadavky, architektura s oddělením modulů, ověření, uvolnění verzí, údržba, řízení konfigurace registru jako součásti softwaru.
11. Seznam SOUP (knihovny, písma, cloud) s riziky; odstranit mrtvý kód (C1).
12. Kybernetická bezpečnost podle MDCG 2019-16 a IEC 81001-5-1: model hrozeb, šifrování, řízení přístupu, záznamy přístupů, aktualizace, hlášení zranitelností; CSP a hlavičky (`15` odst. 2.6).
13. Spolehlivost: pravidla v zařízení bez sítě (C11), oznámení a jejich selhání (B13), hodiny a časová pásma, ochrana před dvojím uložením, obnovení po pádu.

### Použitelnost (IEC 62366-1:2015+A1:2020)
14. Specifikace uživatelů (pacient 65+, slabozrakost, nízká digitální gramotnost; lékař, sestra), scénáře použití související s nebezpečím: potvrzení inzulinu, čip „pod 4“, čtení I-HYPO při hypoglykémii (B1), převzetí plánu a nové dávky (B6), návrhová karta k dávce.
15. Formativní testy a **sumativní validace** s reprezentativními uživateli (pacienti, lékaři, sestry), včetně písma 160 % a čtečky obrazovky.

### Klinické hodnocení a studie
16. Plán klinického hodnocení (čl. 61, příloha XIV): rešerše, ekvivalence nejspíš nepoužitelná → **vlastní klinická zkouška**.
17. Klinická zkouška podle čl. 62 a přílohy XV, ISO 14155:2020: povolení SÚKL a stanovisko etické komise (pro IIb povolení před zahájením), pojištění subjektů, protokol, informovaný souhlas, hlášení závažných nežádoucích příhod (čl. 80), podstatné změny (čl. 75; viz B12 — vypnutí položky během studie).
18. Cílové veličiny navrhuji: hypoglykémie (čas pod 3,9 a 3,0, těžké epizody), čas v cíli a HbA1c, **shoda opsaných hodnot s exportem** (B5), adherence k zápisu, jak často lékař jde proti větvi postupu, čas lékaře na kontrole.

### Dozor po uvedení na trh
19. Plán dozoru (čl. 84) a **PMCF** (příloha XIV část B); **PSUR** (čl. 86: u IIb každý rok, u IIa nejméně každé dva roky).
20. Vigilance (čl. 87–92): hlášení závažných nehod do 15 dnů (ohrožení veřejného zdraví 2, smrt nebo vážné zhoršení 10), hlášení trendů (čl. 88), bezpečnostní nápravná opatření a oznámení (sem patří i „vypnutí položky“ z registru, B12).
21. Sběr podnětů z provozu: dnešní „Podnět z provozu“ napojit na postup vyřizování stížností výrobce, ne jen na garanta.

### Ochrana osobních údajů (GDPR, zákon č. 110/2019 Sb.)
22. **DPIA** podle čl. 35 GDPR — zdravotní údaje, zranitelní subjekty (senioři, pacienti), nová technologie: splňuje nejméně dvě kritéria pokynů WP248, takže je povinné. Osnova v dok. 14 část B je dobrý začátek; doplnit tok dat podle `15` (opsané hodnoty, export, formulář podpory s telefonem C9).
23. **Právní základ** pro zdravotní údaje (čl. 9 odst. 2 písm. h) poskytování péče, nebo písm. a) výslovný souhlas ve studii) a role správce a zpracovatele (ordinace, výrobce, provozovatel serveru); smlouvy o zpracování (čl. 28) včetně cloudových subdodavatelů; servery v EU.
24. **Informace pro pacienta** (čl. 13): co se zapisuje, kdo to vidí — včetně technické podpory (C10), jak dlouho, jak účast ukončit, jak získat kopii a výmaz. Ve studii oddělit informovaný souhlas s účastí (ISO 14155) od právního základu zpracování.
25. **Uchování:** zdravotnická dokumentace v ordinaci podle zákona č. 372/2011 Sb. a vyhlášky č. 98/2012 Sb.; dokumentace klinické zkoušky nejméně 10 let po jejím skončení (příloha XV kap. III bod 3 MDR); technická dokumentace 10 let od uvedení posledního kusu (čl. 10 odst. 8). Stopa algoritmů pro studii pseudonymizovaná, po skončení anonymizovaná.
26. Zabezpečení a incidenty: hlášení porušení zabezpečení do 72 h (čl. 33), záznamy o činnostech (čl. 30), pověřenec, pokud ho ordinace nebo výrobce potřebuje. Připravit se na nařízení o evropském prostoru pro zdravotní data (2025/327) — MDCG 2019-11 rev. 1 ho zmiňuje u systémů elektronických záznamů.
27. Data garantů v maketě (C12).

---

## 6. Zdroje

Navštíveno 29. 10. 2026:
- MDCG 2019-11 rev. 1, *Guidance on Qualification and Classification of Software in Regulation (EU) 2017/745 – MDR and Regulation (EU) 2017/746 – IVDR*, červen 2025 (citováno: text pravidla 11, oddíl 4.2.1, příloha III tabulka 1, příklady s inzulinem v oddílu 3): https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf
- Oznámení Evropské komise o vydání MDCG 2019-11 rev. 1 (17. 6. 2025): https://health.ec.europa.eu/latest-updates/update-mdcg-2019-11-rev1-qualification-and-classification-software-regulation-eu-2017745-and-2025-06-17_en
- Nařízení (EU) 2024/1689 (akt o AI), recitál 12 (systémy založené na pravidlech definovaných lidmi): https://artificialintelligenceact.eu/recital/12/ (úřední znění: https://eur-lex.europa.eu/eli/reg/2024/1689/oj — stránka se 29. 10. 2026 nenačetla)

Úřední texty uvedené podle znění, které znám, dnes neotevřené (doporučuji ověřit čísla článků při přípravě dokumentace):
- Nařízení (EU) 2017/745 (MDR), konsolidované znění: https://eur-lex.europa.eu/eli/reg/2017/745/oj — čl. 2 body 1 a 12, čl. 10, 15, 61, 62, 70, 75, 80, 83–92, příloha I, VIII (pravidla 11 a 22), IX, XIV, XV.
- Nařízení (EU) 2016/679 (GDPR): https://eur-lex.europa.eu/eli/reg/2016/679/oj — čl. 9, 13, 28, 30, 33, 35.
- Prováděcí nařízení (EU) 2021/2226 (elektronický návod k použití): https://eur-lex.europa.eu/eli/reg_impl/2021/2226/oj
- MDCG 2019-16 (kybernetická bezpečnost zdravotnických prostředků): https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en
- Pokyny WP248 rev. 01 k DPIA (EDPB): https://ec.europa.eu/newsroom/article29/items/611236
- Normy (bez veřejného textu): ISO 13485:2016, ISO 14971:2019 a ISO/TR 24971:2020, IEC 62304:2006+A1:2015, IEC 62366-1:2015+A1:2020, IEC 82304-1:2016, IEC 81001-5-1:2021, ISO 14155:2020.
- Klinický kontext (cíle CGM, mírnější cíle u starších; zpoždění tkáňové glukózy; přerušení metforminu a gliflozinů při nemoci; léčba hypoglykémie glukózou při akarbóze): mezinárodní konsenzus k cílům času v cíli (Diabetes Care 2019) a běžná doporučení odborných společností — uvedeno z odborné znalosti, garant ověří proti doporučením, která používá.

Interní podklady: `15-ZDROJ-PRAVDY-MAKETA.md`, `navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`, `navrhy-designu/29-konkurence-2026-10-29/01-reserse.md` (odst. 3.5, 4), kód makety uvedený v hlavičce.
