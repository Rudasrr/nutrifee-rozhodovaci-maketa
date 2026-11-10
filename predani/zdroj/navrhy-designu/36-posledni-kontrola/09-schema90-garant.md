# 36 / 09 – SCHEMA 90: opravy prezentační vrstvy podle 04-garant

Datum: 10. 11. 2026. Podklad: `04-garant.md` (V1, V2, S1–S7, N1–N9).
Změněno jen v `maketa-rozhodovaci/demo/` (`guide.js`, `tour-content.js` jen texty, `intro.js`, `presenter.js`, `sync.js`, `explain.js`) a v testech `kontrola4-panel.test.cjs` (záměrná změna, SCHEMA 90) a `ukladani.test.cjs` (nový test S5).
Na `app/`, `scene-items.js` ani cíle kroků (`sel`, `watch`) jsem nesahal. Nic necommitováno ani nepublikováno, Supabase nevoláno.
**`NF.SCHEMA` a `?v=` v HTML jsem nezvyšoval** (`NF.SCHEMA` je v `app/core.js`); zvýší je koordinátor spolu se změnami jádra.

## Výsledek po nálezech

| Nález | Stav | Co se změnilo |
|---|---|---|
| **V1** | opraveno | `tour-content.js`, scéna 2 krok 1, „Čeho si všímat“: „Pacient nebere žádný jiný lék na diabetes, ani tablety, ani GLP-1, a nemá premixovaný inzulin.“ |
| **V2** | jen návrh (jádro) | diff níže, provede koordinátor |
| **S1** | opraveno | scéna 31 krok 6 (větev „nemám to doma“): „Lékař rozhodl i ostatní návrhy podle postupu: dávka k obědu zůstala už o krok dříve jeho volbou přes „Jiné rozhodnutí“; poklesy po menší porci ji nezamykají.“ (Začátek věty zůstal stejný jako dřív, protože podle něj mapa `scene-items.js` věty vynechává.) Rada „Pořadí jídla“ a poklesy jako důvod zmizely. |
| **S2** | opraveno | `presenter.js`: po zamítnutí v panelu, když je na obrazovce oznámení `data-off` dané položky, obrazovka k němu odroluje (`offTo` v `tagAfterRender`, přednost před rolováním ke štítku další položky). Věta „Na obrazovce to vidíte…“ je tak pravdivá i u D-CISTA a D-POSTUP. Ověřeno jen testy bez prohlížeče, ne v Playwrightu. |
| **S3** | opraveno | `guide.js`: pryč všechna „Nově (SCHEMA 86, verze v2)“ (nahrazeno „Schvalujete i …“), „(kontrola 4, B6/B8)“, „(kontrola 4, C15)“, „(kontrola 4)“, „od SCHEMA 86“, „(SCHEMA 86)“, „dřív „Milník“, SCHEMA 86“ a všechna „rozhodnutí vlastníka …“ / „určil vlastník …“ (kde šlo o návrh, zůstává „návrh autora“). `tour-content.js`: tři „(rozhodnutí vlastníka 4. 11. 2026)“ ve scénách 2, 13, 23. `explain.js`: „(C17, kontrola 2)“ v bublině. Kontrola skriptem: v textových řetězcích `demo/` (mimo komentáře a stránku správce `results.js`) už žádné SCHEMA/kontrola/vlastník/kódy nálezů; zbylé „verze v2“ v `tour-content.js` je modelová verze R-PORADI ze scénáře 5 (patří do příběhu). |
| **S4** | opraveno | `intro.js`: délka se počítá. Dolní hranice = odhad panelu od začátku (`D.remainingSeconds` se scénou 0), horní = navíc četba celého průvodce (pět oddílů) u všech klinických položek při 200 slovech/min; zaokrouhleno nahoru na 10 min. Text: „Celá ukázka trvá asi X minut, když u 28 pravidel čtete jen kartu v panelu, a asi Y minut, když u nich otevíráte celého průvodce. Můžete ji kdykoli přerušit a pokračovat…“. Dodatek se také počítá (dřív pevně 4 min), i v panelu (`appendixTime` místo „asi 4 minuty“ na dvou místech). Úvod počítá celou délku bez ohledu na rozhodnutí (`D.remainingSeconds(s, true)`), jinak by se úvod měnil se zamítnutím a T3 by to hlásila jako účinek v prologu. Spočteno na kopii (`D.introTime`): **70 a 120 minut, dodatek asi 6 minut**. Záloha bez panelu: 70 a 110. |
| **S5** | opraveno | `sync.js` `restore`: z řádků po posledním resetu se vezme nejvyšší `params.scene` řádků `progress` (a scéna rozhodnutí) a předá se `D.garantResume`. `presenter.js`: `D.garantResume` doplní průchod (`prog.max`, bez nového řádku na server) a je-li garant dřív v příběhu, panel ukáže tlačítko „Pokračovat ve scéně N: název ▶“ (`tourResume`, skok jako z přehledu scén). Po odhlášení se `resumeTo` maže s průchodem a po novém přihlášení se nabídka vrátí ze serveru. Nový test v `ukladani.test.cjs`. |
| **S6** | opraveno | `guide.js` Z-GLUKOZA „Jak funguje“: „V kroku 1 pacient posune posuvník na hodnotu, kterou senzor ukazuje teď (celá čísla 4–15, na koncích pod 4 a nad 15, doladí tlačítky − a +; vedle je volba „Nemám hodnotu“)…“ |
| **S7** | opraveno | scéna 22 krok 3 „Proč“: „V ordinaci se nepíše: hmotnost se nastaví posuvníkem a doladí tlačítky − a +.“ |
| **N1** | neřešeno | rozvržení na telefonu je věc vzhledu a jádra (výška rámečků), ne textu prezentace. Úvod na to už upozorňuje. Navrhuji jako samostatnou úlohu. |
| **N2** | opraveno | Přehled scén: scéna před aktuální s nerozhodnutými položkami má značku ○ a slovo „čeká na rozhodnutí“ místo „✓ hotové“. Zásuvka: položka aktuální scény, která se teprve nabídne, má „přijde v této scéně“ místo „uvidíte ve scéně N“. |
| **N3** | neřešeno (jádro) | text je v `app/screens.js:1400`, mimo zadání. Návrh pro jádro: při zamítnuté R-REAKCE nepsat „po 4 zápisech budeme vědět víc“ a sjednotit „4 ze 4“. |
| **N4** | neřešeno (jádro) | počítadlo je v `app/screens-clinic.js:268`. |
| **N5** | opraveno | scéna 23 krok 3: „Bod, kterému data odporují, dostane štítek, že data říkají jinak, a hromadné potvrzení ho nepřepne“ (bez uvozovek, protože štítek v tom kroku na obrazovce být nemusí a T4 by citaci hlídala). Věty o bodech jsou zvlášť s dvojtečkou, bez vnořených závorek. |
| **N6** | opraveno | `proc` úvodů variant (scéna 28 zaučení, scéna 29 převzetí) je funkce větve a ve variantě „Zaučení se nezdařilo“ má vlastní větu. |
| **N7** | z části | „Hodnota je uvedená věcně…“ opraveno. Dvojí „Pacient také ví“ ve scéně 5 krok 3 **zůstává**: obě věty jsou v mapě vynechávání `scene-items.js` (`drop`, R-NAVYKY v režimu „note“) a jejich změna rozbila T4. Přepsat je půjde ve fázi 3 spolu s generátorem mapy, např. druhou větu na „Pacient si ze zaučení odnesl i to, že před kontrolou pošle do ordinace export ze senzoru.“ |
| **N8** | opraveno | K-KRITERIA „Co schvalujete“: výčet vylučovacích kritérií jen jednou, nejasná věta o protokolu studie pryč; „Lékař jedním zaškrtnutím potvrdí, že pacient žádné z nich nemá; výčet je návrh autora.“ a podrobnosti k akarbóze, pohybu a zraku v jedné větě. Karta v panelu (do 70 slov) končí jako dřív výčtem kritérií. |
| **N9** | opraveno | úvod: „Rozhodnutí i poznámky se ukládají průběžně; potvrzením souhrnu jen dáte vědět, že jste hotovi.“ místo „Nic neposíláte.“ |

### Otisky (S3)

Texty „Co schvalujete“ a průvodce u zhruba 20 položek se změnily, a tím i `fpGuide` (a u položek, kde jádro bere „Co schvalujete“, i `fp`). Garant zatím nic nerozhodl, takže je to v pořádku. Testovací vektory otisku (`VECTORS` v `ukladani.test.cjs`) jsou nad pevnými zkušebními daty, ne nad texty průvodce, a beze změny prošly. Úprava vektorů nebyla potřeba.

## V2 – návrh opravy jádra (neprovedeno)

Příčina: `lowNoticeCard` předává do `ruleCard` tělo `note + ruleEventBody(…)`. Při zamítnuté I-HYPO (nebo R-POKYNY) je pravidlo prázdné, ale `note` ne, a `ruleCard` vkládá oznámení jen při prázdném těle. Oprava vytáhne volbu oznámení do pomocné funkce a karta poklesu ji použije, když pravidlo chybí. Čísla řádků jsou podle stavu z 10. 11. (812–813 a 447–451); jiný agent může mít jádro posunuté.

```diff
--- a/maketa-rozhodovaci/app/screens.js
+++ b/maketa-rozhodovaci/app/screens.js
@@ function ruleCard
-function ruleCard(S, id, title, extra, cls, body) {
-  var pokynyOff = NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY'), itemOff = !!NF.item(S, id) && !NF.usable(S, id);
-  if (!body && !extra && !pokynyOff && !itemOff) return '';
-  /* bez pravidel (zamítnutá R-POKYNY) nebo se zamítnutým pravidlem oznámení na místě textu (A05; B18, nezávislá kontrola 27. 10. 2026) */
-  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title || 'Bezpečnostní pravidlo') + '</p>' + (body || (pokynyOff ? off(S, 'R-POKYNY') : itemOff ? off(S, id) : '')) + (extra || ''), 'doc' + (cls ? ' ' + cls : ''));
-}
+/* SCHEMA 90 (36/04 V2): oznámení místo chybějícího pravidla – bez pravidel (zamítnutá R-POKYNY) nebo se zamítnutým pravidlem I-* */
+function ruleOff(S, id) {
+  var pokynyOff = NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY'), itemOff = !!NF.item(S, id) && !NF.usable(S, id);
+  return pokynyOff ? off(S, 'R-POKYNY') : itemOff ? off(S, id) : '';
+}
+function ruleCard(S, id, title, extra, cls, body) {
+  var o = body ? '' : ruleOff(S, id);
+  if (!body && !extra && !o) return '';
+  /* bez pravidel (zamítnutá R-POKYNY) nebo se zamítnutým pravidlem oznámení na místě textu (A05; B18, nezávislá kontrola 27. 10. 2026) */
+  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title || 'Bezpečnostní pravidlo') + '</p>' + (body || o) + (extra || ''), 'doc' + (cls ? ' ' + cls : ''));
+}
@@ function lowNoticeCard
-  if (night) return ruleCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', seenBtn, 'low', note + ruleShortBody(S, 'I-HYPO')) + rules(S, ['B-HYPO']);
-  return ruleCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', seenBtn, 'low event', note + ruleEventBody(S, 'I-HYPO')) + rules(S, ['B-HYPO']);
+  /* SCHEMA 90 (36/04 V2): věta „Pokles jsme zapsali“ nesmí přebít oznámení – bez pravidla (zamítnutá I-HYPO nebo R-POKYNY) je na jeho místě „Tahle část nefunguje“ (15 odst. 12) */
+  var rb = night ? ruleShortBody(S, 'I-HYPO') : ruleEventBody(S, 'I-HYPO');
+  return ruleCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', seenBtn, night ? 'low' : 'low event', note + (rb || ruleOff(S, 'I-HYPO'))) + rules(S, ['B-HYPO']);
```

Dopad: týká se scény 13 krok 4 (I-HYPO i R-POKYNY zamítnuté) a scény 20 krok 4 (noční pokles). Ostatní volání `ruleCard` se chovají stejně jako dřív. Kontrola T3 krok 4 nehlídá (hlídá jen krok 3). Doporučuji doplnit do `ucinek` I-HYPO / R-POKYNY v `guide.js`, např. `hypo: { … oznameni: true }` na kartě „Pokles pod 4 je zapsaný“. To je ale strojový popis pro T3 a patří ke změně jádra, proto jsem ho nepřidal.

## Testy

Na kopii `scratchpad/t90g/maketa-rozhodovaci` (vedle ní `15-…md`, `navrhy-designu/04-pohledy-2026-10-05` a `32-overeni-cile-2026-11-04`), kopie Disku z 10. 11. odpoledne:

- `ukladani.test.cjs`: **30 prošlo, 0 selhalo** (29 původních a nový „SCHEMA 90 S5“).
- `kontrola4-panel.test.cjs`: **18 prošlo, 0 selhalo** (test délky v úvodu změněn záměrně: místo „asi 60 minut“ hlídá spočítané rozpětí 60–180 min a „přerušit a pokračovat“; komentář SCHEMA 90).

Jiný agent mezitím měnil jádro (na kopii je už rozpracovaná položka I-VYSSI, 29 klinických položek), proto jsem výsledky dělil podle původu: stejnou sadu jsem pustil na **stejném jádru** jednou s mými soubory `demo/` (`t90g`) a jednou s původními (`t90b`) a porovnal nálezy.

1. **První celá sada** (`node nutrifee-rozhodovaci-maketa.test.cjs`, kopie s dřívějším stavem jádra): **143 prošlo, 1 selhalo**, a to `pravdivost` (T3: 9 nálezů, T4: 1 nález). Šlo o moje chyby: úvod se měnil se zamítnutím (prolog v T3) a změněná věta N7 nesouhlasila s mapou vynechávání (T4). **Obojí opraveno.** Ostatní dílčí sady 0 selhalo, mj. `obsah-pacienta` 9/0, `kontrola4-panel` 18/0, `ukladani` 30/0, `rychle`, `zlate-vystupy`, `tokeny`, `faze2-*`, `kontrola2/3/74-*`, `schema84-jadro`, `zaverecne80`.
2. **Po opravě, novější jádro**: `pravdivost` (VERBOSE) má s mými `demo/` **přesně tytéž nálezy jako s původními `demo/`** (60 = 60, rozdíl 0). Všechny pocházejí z rozpracovaného jádra: I-VYSSI bez místa a bez `dopadSceny`, neaktuální mapa scén („spusťte generátor“), změny obrazovky zařazení (`enroll`) a „Zatím ho neznáme – zapište ho ještě 4×“ ve scéně 7 krok 8. T4 nemá od mých změn žádný nový nález.
3. Na novějším jádru: `ukladani` 27/3 a `kontrola4-panel` 17/1. Stejná selhání (otisky 28 z 28, R-REAKCE A1/A2) má i původní `demo/`, takže jde o jádro. Nový test S5 na původním `demo/` podle očekávání selže, na mém projde. `kontrola3-panel` 9/0, `kontrola74-panel` 7/0.

**Před commitem je potřeba** pustit celou sadu znovu, až jádro doběhne. Pak spustit generátor `scene-items` (fáze 3), zvýšit `NF.SCHEMA` a `?v=` a doplnit I-VYSSI do `guide.js` (proc/jak/kde/co/dopad/dopadSceny, bez interních odkazů).

Skripty a logy: `scratchpad/t90g/full.log`, `prav.log`, `prav2.log`, `scratchpad/t90b/prav-orig.log`, porovnání `scratchpad/o.txt` × `n2.txt`.
