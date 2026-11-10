# Poslední kontrola 10. 11. 2026 – souhrn

Sedm nezávislých prověrek nad SCHEMA 89:

| Zpráva | Úhel pohledu | Vysoké a kritické nálezy | Střední | Nízké |
|---|---|---|---|---|
| `01-klinika.md` | klinická bezpečnost | 6 | 4 | 5 |
| `02-pacient.md` | život pacienta | 4 kritické, 6 vysokých | 9 | 8 |
| `03-ordinace.md` | lékař a sestra | 3 | 9 | 6 |
| `04-garant.md` | garant a ovládání makety | 2 | 7 | 9 |
| `05-kod.md` | kód a robustnost | 5 | 6 | 5 |
| `06-projekt.md` | smysl projektu | 10 zjištění | – | – |
| `07-pristupnost.md` | přístupnost a vzhled | 3 | 5 | 7 |

Nejzávažnější nálezy jsem ověřil v kódu a potvrdily se:
- vyprávění garanta ve scéně 2 říká „GLP-1 navíc nevadí“;
- semafor času v cíli nečte čas pod 3,0;
- ve 0:30 je na řadě snídaně;
- minutový tik ukládá celý stav.

## Co drží

- **Zásady 1–3.** Ve 97 320 kombinacích rad nikde nezazní „sněz víc“, nikde se nenavrhuje výše dávky a při glukóze pod 4 aplikace neradí. Pacient nikde nedostane výzvu k volání.
- **Výpočty pro lékaře.** Ruční přepočet souhlasí: 241 jídel, obvyklá porce 238, inzulin podle plánu 232, pod 3,9 2 %, shoda 36 z 37. Nikde se neobjeví NaN.
- **Jádro.** Náhodné testování proběhlo v 54 600 krocích bez pádu, bez XSS a bez dávky mimo rozsah 1–60. Posun do dneška dává stejná čísla.
- **Testy a panel.** Celá sada má 144 prošlých testů a 0 selhání. Kontrola panelu dala na obou velikostech 0 nálezů a ukládání rozhodnutí garanta je bez ztrát.
- **Přístupnost.** Kontrasty textu jsou v pořádku, klávesnice funguje u posuvníků i zásuvek a stav nikdy nenese jen barva.

## A. Chyby k opravě bez rozhodování (rozpor se `15` nebo zjevná chyba)

1. **Synchronizace dema (kód K1–K5):**
   - minutový tik ukládá a odesílá celý stav;
   - stav zobrazení (role, stránka, rozpracovaný zápis) je ve sdíleném stavu pacienta;
   - pád vykreslení přepíše data čistým stavem;
   - starší verze přepíše novější stav;
   - `rychle.test.cjs` a `zlate-vystupy.test.cjs` neprojdou v repozitáři dema sestaveném podle „Co převzít“.
2. **Semafor času v cíli (ordinace V1, V2):**
   - zelená se ukáže i při čase pod 3,0;
   - semafor nehlídá 14 dní dat;
   - export z jiného období se přijme bez varování.
3. **„Zahodit“ po potvrzeném inzulinu (pacient K3)** smaže inzulin. Správně má spustit pravidlo k vynechanému jídlu s inzulinem.
4. **Oprava „nepíchnuto → podle plánu“ u menší porce (klinika K3)** nezaloží sledování nízké glukózy.
5. **Pravidlo k vysoké glukóze (klinika K7):** čip „nad 15“ nesedí s parametrem pravidla.
6. **Garant:**
   - V1: GLP-1 ve vyprávění;
   - V2: chybí oznámení po zamítnutí I-HYPO;
   - S1, S6, S7: vyprávění odporuje obrazovce;
   - S3: interní odkazy vývoje (SCHEMA, B6, C15) v textech pro garanta.
7. **Ordinace:**
   - S2: data minulého období při druhé kontrole;
   - S4: stopa připisuje činnost sestry lékaři;
   - S7: 93 dní nemoci v období o 92 dnech;
   - S9: pacient čte „lékař náš návrh zamítl“ i u inzulinu;
   - S1: export nahraný po zahájení kontroly se nepromítne.
8. **Přístupnost:**
   - V1: náhled telefonu u sestry jde ovládat klávesnicí;
   - V2: náhled v kroku 4 se smrskne na 56 px;
   - V3: fokus se v kroku 1 ztrácí;
   - S1: ořez při 320 px s písmem 160 %.
9. **Drobnosti pacienta:**
   - „ještě 0 minut“;
   - zakázaná slova „do učení“ a „upřesní se“;
   - „kolem 9“ bez jednotky;
   - nesmyslné názvy jídel jako „xx“ a „123“;
   - „Nevím“ u bazálu se lékaři ukáže jako „null j.“;
   - den převzetí odpoledne.

## B. Rozhodnutí vlastníka (mezery v `15`)

Viz otázky položené 10. 11. 2026. Výsledek je zapsaný v `05-rozhodnuti.md`.

## C. Projekt (mimo maketu, `06-projekt.md`)

- Regulace:
  - konzultace R18 neproběhla;
  - není určený výrobce ani osoba odpovědná za dodržování předpisů;
  - odhad třídy IIb.
- Kohorta „jen inzulin“ má v ČR řádově 1–5 tisíc pacientů (předpoklad).
- Zátěž pacienta: 8–11 min denně a zápis jídla 9–14 úkonů.
- Chybí ekonomika pro ordinaci i plátce.
- Export ze senzoru se do ordinace v praxi nejspíš nedostane.
