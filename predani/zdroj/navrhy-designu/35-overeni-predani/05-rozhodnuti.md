# Rozhodnutí vlastníka 9. 11. 2026 – forma předávky pro první demo

Podklady: `01-programator.md`, `02-forma.md`, `03-presnost.md` (tři nezávislé prověrky).

1. **Jádro pro první demo převzít jako hotovou knihovnu** (`app/` včetně obrazovek, `ui.js`, tokenů, písem a ikon, `app/data/`) a demo postavit nad ním (Doporučeno). 17 etap zůstává plánem ostré aplikace; o přepisu pro ostrý provoz se rozhodne po demu.
2. **Platforma dema:** webová aplikace. Pacient ji má na telefonu jako ikonu na ploše (PWA), ordinace běží v prohlížeči na počítači (Doporučeno).
3. **Sdílení dat:** jednoduchá synchronizace stavu pacienta přes server, jen se syntetickými daty. Tenká vrstva je mimo jádro a jádro samo síť nevolá (Doporučeno).
4. **Úprava předávky** (Doporučeno):
   - „Cesta k prvnímu demu“ na 2 strany,
   - soubor pokynů pro AI asistenta do nového repozitáře,
   - zlaté výstupy jádra jako spustitelná specifikace,
   - rychlá sada testů pod 1 minutu,
   - příloha designového systému,
   - opravy 16 nepřesností z `03`.

   V maketě se navíc opraví dvě místa, kvůli kterým jádro samo nestačí:
   - volba větve návrhu (`V.proposalBranch`) se přesune do jádra,
   - otisk položky nebude záviset na prezentační vrstvě.

## Doplněno 10. 11. 2026 (otázky z `predani/01-cesta-k-demu.md`)

5. Jména ve veřejném repozitáři (cesty s příjmením a Gmailem vlastníka, názvy služeb): **nechat vše, jak to je**.
6. Ordinace má **seznam pacientů**, v demu 2–3 syntetické (Doporučeno).
7. **Jeden společný registr** pro všechny pacienty (Doporučeno).
8. Registr garanta: vlastník – „v demu již bude vše schváleno z makety, není tedy třeba tam nic ukazovat, demo má vypadat jako ostrá aplikace, kterou dostane k používání lékař (web) i pacient (apple, android)“.
9. Telefon: **PWA s ikonou na ploše, iPhone i Android** (Doporučeno).
10. Čas: **skutečný čas, české pásmo, připravení pacienti s historií do dneška** (Doporučeno).
11. Přihlášení: **e-mail a heslo, účty zakládá vlastník** (Doporučeno).
12. Server: vlastník nechává volbu na programátorovi: vybere, kde a jak server poběží.
13. Data se po nové verzi **smí obnovit** (Doporučeno).
14. Souběh: **samo načíst novou verzi a krátce oznámit** (Doporučeno).
15. Demo se ukáže **lékařům a garantovi k vyzkoušení na vlastních zařízeních** (Doporučeno).

Promítnuto do `predani/01-cesta-k-demu.md`, `AGENTS.md` a `README.md`.
