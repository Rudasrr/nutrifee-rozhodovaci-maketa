/* Nastavení ukládání rozhodnutí garanta (prezentační vrstva). Jediné místo, kde se mění úložiště.
   Supabase: url = https://<projekt>.supabase.co, key = veřejný klíč „anon“ (smí jen vkládat díky pravidlům RLS), table = název tabulky.
   Dokud je url prázdné, rozhodnutí čekají ve frontě v prohlížeči a lišta ukazuje „ukládání nenastaveno“. */
(function (global) {
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};
D.syncConfig = { url: '', key: '', table: 'garant_rozhodnuti' };
D.syncLabel = 'rozhodnutí k maketě (neformální)';
})(typeof window !== 'undefined' ? window : globalThis);
