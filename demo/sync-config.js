/* Nastavení ukládání rozhodnutí garanta (prezentační vrstva). Jediné místo, kde se mění úložiště.
   Supabase: url = https://<projekt>.supabase.co, key = veřejný klíč „publishable“ (role anon; smí jen vkládat díky pravidlům RLS, číst ani mazat nemůže), table = název tabulky.
   Dokud je url prázdné, rozhodnutí čekají ve frontě v prohlížeči a lišta ukazuje „ukládání nenastaveno“. */
(function (global) {
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};
D.syncConfig = { url: 'https://lswgqpozlmuxvvenxopd.supabase.co', key: 'sb_publishable_PtNto6lTGT_AXVXXFNtf9g_vUurjXnj', table: 'garant_rozhodnuti' };
D.syncLabel = 'rozhodnutí k maketě (neformální)';
})(typeof window !== 'undefined' ? window : globalThis);
