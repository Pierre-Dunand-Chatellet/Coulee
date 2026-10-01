/* ============================================================
   COULÉE — données partagées
   SEULE source des records : les pages les écrivent aussi en dur dans le HTML
   (pour qu'elles restent lisibles sans JavaScript), et ce fichier réécrit
   toutes les cases marquées data-rec au chargement. Un record tombe :
   on ne change que cette table.

   Records du monde du 50 m, grand bassin — vérifiés le 16/09/2026
   (World Aquatics, Wikipedia « List of world records in swimming »,
   recoupés avec la presse pour les trois records de 2026).
   ============================================================ */
(function () {
  'use strict';

  var RECORDS = {
    H: {
      crawl:    { t: 20.88, qui: 'Cameron McEvoy',     pays: 'Australie',   an: 2026 },
      papillon: { t: 22.27, qui: 'Andriy Govorov',     pays: 'Ukraine',     an: 2018 },
      dos:      { t: 23.55, qui: 'Kliment Kolesnikov', pays: 'Russie',      an: 2023 },
      brasse:   { t: 25.95, qui: 'Adam Peaty',         pays: 'Royaume-Uni', an: 2017 }
    },
    F: {
      crawl:    { t: 23.19, qui: 'Kate Douglass',      pays: 'États-Unis',  an: 2026 },
      papillon: { t: 24.43, qui: 'Sarah Sjöström',     pays: 'Suède',       an: 2014 },
      dos:      { t: 26.56, qui: 'Sara Curtis',        pays: 'Italie',      an: 2026 },
      brasse:   { t: 29.16, qui: 'Rūta Meilutytė',     pays: 'Lituanie',    an: 2023 }
    }
  };

  // MET du Compendium of Physical Activities, entraînement soutenu (vérifié le
  // 16/09/2026 sur pacompendium.com) : 18270 papillon, 18260 brasse « training or
  // competition », 18230 nage libre « fast, vigorous », 18250 dos « training or
  // competition ». Les anciennes valeurs 5,3 et 4,8 étaient celles de la brasse
  // et du dos « recreational », mélangées à des valeurs d'effort.
  var MET = { papillon: 13.8, brasse: 10.3, crawl: 9.8, dos: 9.5 };

  var NOMS = { papillon: 'Papillon', dos: 'Dos', brasse: 'Brasse', crawl: 'Nage libre' };

  // Records du monde de NAGE LIBRE, grand bassin, 100 à 1500 m — vérifiés le
  // 16/09/2026 (Wikipedia + presse pour Liebmann et Steenbergen, 2026).
  // « nom » = nom de famille affiché dans le couloir ; en chinois il vient EN PREMIER
  // (Pan Zhanle → Pan, Zhang Lin → Zhang), d'où un champ explicite plutôt qu'un découpage.
  var RECORDS_NL = {
    H: {
      100:  { t: 46.40,  qui: 'Pan Zhanle',         nom: 'Pan',         pays: 'Chine',      an: 2024 },
      200:  { t: 102.00, qui: 'Paul Biedermann',    nom: 'Biedermann',  pays: 'Allemagne',  an: 2009 },
      400:  { t: 219.96, qui: 'Lukas Märtens',      nom: 'Märtens',     pays: 'Allemagne',  an: 2025 },
      800:  { t: 452.12, qui: 'Zhang Lin',          nom: 'Zhang',       pays: 'Chine',      an: 2009 },
      1500: { t: 866.79, qui: 'Johannes Liebmann',  nom: 'Liebmann',    pays: 'Allemagne',  an: 2026 }
    },
    F: {
      100:  { t: 51.68,  qui: 'Marrit Steenbergen', nom: 'Steenbergen', pays: 'Pays-Bas',   an: 2026 },
      200:  { t: 112.23, qui: 'Ariarne Titmus',     nom: 'Titmus',      pays: 'Australie',  an: 2024 },
      400:  { t: 234.18, qui: 'Summer McIntosh',    nom: 'McIntosh',    pays: 'Canada',     an: 2025 },
      800:  { t: 484.12, qui: 'Katie Ledecky',      nom: 'Ledecky',     pays: 'États-Unis', an: 2025 },
      1500: { t: 920.48, qui: 'Katie Ledecky',      nom: 'Ledecky',     pays: 'États-Unis', an: 2018 }
    }
  };

  // Barème officiel « World Aquatics Point Scoring 2026 », grand bassin (valable
  // du 01/01 au 31/12/2026). Temps de base = records au 31/12/2025, lus dans les
  // PDF officiels : ils diffèrent donc des records actuels pour le 100 m dames
  // et le 1500 m hommes, battus en 2026. Points = 1000 × (base / temps)³, arrondi
  // à l'entier inférieur.
  var BASES_2026 = {
    H: { 50: 20.91, 100: 46.40, 200: 102.00, 400: 219.96, 800: 452.12, 1500: 870.67 },
    F: { 50: 23.61, 100: 51.71, 200: 112.23, 400: 234.18, 800: 484.12, 1500: 920.48 }
  };
  function points(sexe, dist, temps) {
    var b = BASES_2026[sexe] && BASES_2026[sexe][dist];
    if (!b || !(temps > 0)) return null;
    return Math.floor(1000 * Math.pow(b / temps, 3) + 1e-9);
  }
  // Temps le plus lent qui vaut encore p points : c'est la valeur imprimée dans
  // la table officielle (vérifié sur les lignes 300 à 1000).
  function tempsPour(sexe, dist, p) {
    var b = BASES_2026[sexe][dist];
    return Math.floor(b / Math.cbrt(p / 1000) * 100 + 1e-7) / 100;
  }

  // La silhouette de la coulée, retournée pour nager vers la droite (couloirs de course).
  // Générée depuis la pose de coulée de js/nageur.js : à régénérer, pas à retoucher à la main.
  var NAGEUR_SVG =
    '<svg viewBox="-230 -24 403 57" aria-hidden="true" focusable="false">' +
      '<g transform="scale(-1,1)">' +
        '<path d="M42.7 26.5L117.5 27.6A12.2 12.2 0 1 0 119.9 3.4L46.4 -10.2A18.5 18.5 0 0 0 42.7 26.5ZM117.6 27.6L190.4 27.8A6.9 6.9 0 1 0 191.4 14.1L119.4 3.3A12.2 12.2 0 0 0 117.6 27.6ZM126.9 17A12.6 12.6 0 1 0 152.1 17A12.6 12.6 0 1 0 126.9 17ZM184.2 27.1L221.1 28.5A3.8 3.8 0 1 0 222 21L185.9 13.4A6.9 6.9 0 0 0 184.2 27.1Z" fill="#9FB4D4" stroke="#04101D" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke"/><path d="M41.1 26.9L71.2 27.4L74.5 -5.4L44.9 -10.9Z" fill="#17A99A"/><path d="M-43.3 -10.1L-97 -8.8A9.4 9.4 0 1 0 -98.7 9.8L-46.2 20.8A15.6 15.6 0 0 0 -43.3 -10.1ZM-96.2 -8.8L-144 -11.5A6.4 6.4 0 1 0 -145.6 1.2L-98.4 9.8A9.4 9.4 0 0 0 -96.2 -8.8ZM-144.5 -11.5L-164.4 -11.3A4.4 4.4 0 1 0 -165.1 -2.6L-145.6 1.1A6.4 6.4 0 0 0 -144.5 -11.5Z" fill="#9FB4D4" stroke="#04101D" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke"/><path d="M40.7 -11.4L11.2 -7.9A15.5 15.5 0 1 0 10.7 22.8L40.1 27.3A19.5 19.5 0 0 0 40.7 -11.4ZM16.3 -7.7L-17.5 -15A19.5 19.5 0 0 0 -21.3 23.6L13.3 23A15.5 15.5 0 1 0 16.3 -7.7ZM-26.6 -14.8L-46.9 -9.5A15.5 15.5 0 1 0 -44.8 20.9L-24 23.4A19.5 19.5 0 0 0 -26.6 -14.8Z" fill="#EAF2FF" stroke="#04101D" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke"/><path d="M23 8A20 20 0 1 0 63 8A20 20 0 1 0 23 8Z" fill="#22E0C8"/><path d="M43.4 26.5L118.1 25A12.2 12.2 0 1 0 119.6 0.7L45.7 -10.3A18.5 18.5 0 0 0 43.4 26.5ZM118.2 25L191 22.6A6.9 6.9 0 1 0 191.6 8.9L119.2 0.7A12.2 12.2 0 0 0 118.2 25ZM127.1 13.7A12.6 12.6 0 1 0 152.3 13.7A12.6 12.6 0 1 0 127.1 13.7ZM184.8 22.1L221.7 22.2A3.8 3.8 0 1 0 222.3 14.7L186 8.4A6.9 6.9 0 0 0 184.8 22.1Z" fill="#EAF2FF"/><path d="M41.8 27L71.9 26.4L74 -6.5L44.2 -11ZM23 8A20 20 0 1 0 63 8A20 20 0 1 0 23 8Z" fill="#22E0C8"/><path d="M-41.7 -3.4L-71.4 -7.6A8.5 8.5 0 1 0 -74.1 9.2L-44.5 14.4A9 9 0 0 0 -41.7 -3.4Z" fill="#EAF2FF"/><path d="M-42.8 -10.1L-96.4 -10.7A9.4 9.4 0 1 0 -98.8 7.8L-46.7 20.7A15.6 15.6 0 0 0 -42.8 -10.1ZM-95.7 -10.6L-143.4 -15A6.4 6.4 0 1 0 -145.3 -2.4L-98.6 7.9A9.4 9.4 0 0 0 -95.7 -10.6ZM-143.8 -15.1L-163.7 -15.5A4.4 4.4 0 1 0 -164.8 -6.8L-145.4 -2.4A6.4 6.4 0 0 0 -143.8 -15.1Z" fill="#EAF2FF"/><path d="M-93.1 0.8A20.5 20.5 0 1 0 -52.1 0.8A20.5 20.5 0 1 0 -93.1 0.8Z" fill="#EAF2FF" stroke="#04101D" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke"/><path d="M-91.8 -6.2A20.5 20.5 0 1 1 -74.2 21.3A16.4 16.4 0 0 0 -91.8 -6.2Z" fill="#22E0C8"/><path d="M-82.7 2.6L-53.6 -3.8" fill="none" stroke="#0B2B4F" stroke-width="2.6" stroke-linecap="round"/><path d="M-81.9 7.3L-79.5 6.9A4.8 4.8 0 0 0 -81.2 -2.5L-83.5 -2.1A4.8 4.8 0 0 0 -81.9 7.3Z" fill="#0B2B4F"/>' +
      '</g>' +
    '</svg>';

  function fr(n, d) {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // 65 → « 1:05,00 » ; 866.79 → « 14:26,79 »
  function chrono(sec, dec) {
    if (dec === undefined) dec = 2;
    var f = Math.pow(10, dec);
    var total = Math.round(sec * f) / f;
    var m = Math.floor(total / 60), s = total - m * 60;
    var st = s.toFixed(dec).replace('.', ',');
    return m ? m + ':' + (s < 10 ? '0' : '') + st : st;
  }

  window.COULEE = {
    RECORDS: RECORDS, RECORDS_NL: RECORDS_NL, BASES_2026: BASES_2026,
    MET: MET, NOMS: NOMS, NAGEUR_SVG: NAGEUR_SVG,
    fr: fr, chrono: chrono, points: points, tempsPour: tempsPour
  };

  /* data-rec="H.crawl"            → 20,88
     data-rec="H.crawl" data-champ="v"   → 2,39 (m/s)
     data-rec="H.crawl" data-champ="qui" → Cameron McEvoy
     data-rec="H.crawl" data-champ="legende" → Australie, 2026 */
  var cases = document.querySelectorAll('[data-rec]');
  for (var i = 0; i < cases.length; i++) {
    var el = cases[i];
    var cle = el.getAttribute('data-rec').split('.');
    var r = RECORDS[cle[0]] && RECORDS[cle[0]][cle[1]];
    if (!r) continue;
    var champ = el.getAttribute('data-champ') || 't';
    var sep = el.getAttribute('data-sep') || ',';
    var txt =
      champ === 'v' ? fr(50 / r.t, 2) :
      champ === 'qui' ? r.qui :
      champ === 'legende' ? r.pays + ', ' + r.an :
      r.t.toFixed(2).replace('.', sep);
    el.textContent = txt;
  }
})();
