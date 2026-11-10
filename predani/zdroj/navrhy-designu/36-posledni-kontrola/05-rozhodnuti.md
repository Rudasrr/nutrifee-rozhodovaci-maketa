# Rozhodnutí vlastníka 11. 11. 2026 k poslední kontrole

Podklady: `00-souhrn.md` a zprávy `01`–`07`. Vše podle doporučení:

1. **Den aplikace končí ve 4:00.** Jídlo do 4:00 patří k předchozímu dni. Rozhraní je provozní parametr v registru (S-PRIPOMINKY).
2. **Do 3 h po hlavním jídle je hlavní tlačítko „Zapsat svačinu“.** Další hlavní jídlo je jen vedlejší volba (hranice B-HYPO `dalsi_slot_h`).
3. **„Glukóza teď pod 4“ v kroku 1 se počítá jako pokles se všemi důsledky:** karta po opakovaných poklesech, Bezpečnost u lékaře, blokace „zvýšit“. Nová verze B-HYPO ke schválení.
4. **Čas pod cílem nad mezí blokuje větev „zvýšit“ u všech dávek.** Nová verze D-POSTUP ke schválení.
5. **Výrazně vyšší dávka než předepsaná:**
   - zobrazí se nové obecné pravidlo, nová položka ke schválení: sledovat glukózu, mít po ruce cukr, jídlo nevynechávat;
   - za 60 min přijde otázka „pod 4?“;
   - procházka se nenabízí;
   - hranici určuje parametr;
   - nic se neradí o dávce a aplikace nevyzývá k volání.
6. **Poklesy z exportu se k jídlu přiřazují do 4 h.** Nejvyšší hodnota zůstává do 2 h. Nový parametr Z-IMPORT.
7. **Zápis jídla jde opravit nebo smazat do 24 h.** Oprava jde do stopy a zápis pak není čistý.
8. **Kontrola u lékaře:** body potvrzené daty se předvyplní jako „sedí podle dat“ a lékař řeší jen ostatní. Může je změnit a stopa to zaznamená. Nová verze D-POSTUP ke schválení.
9. **Demo:** vypadá jako ostrá aplikace, ale má nenápadný trvalý štítek „Demo · jen syntetická data“ a v zápatí větu, že není určeno pro léčbu. U nového pacienta upozorní „jen smyšlené údaje“. (Promítnout do `predani/01-cesta-k-demu.md`.)
10. **Písmo pacienta:**
    - hlavní text a volby od 17 px;
    - doplňkový text od 15 px;
    - nic pod 15 px;
    - hlídá to test.
11. **Časové pásmo:** aplikace běží vždy v českém čase a cestování je mimo rozsah studie. Při jiném pásmu telefonu se ukáže věta „Na cestách se řiďte pokyny svého lékaře; zápisy jsou v českém čase.“
12. **K-KRITERIA:** doplnit podmínky „bez korekčního schématu“ a „bazál večer“ jako novou verzi ke schválení.
