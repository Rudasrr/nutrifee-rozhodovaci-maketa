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
