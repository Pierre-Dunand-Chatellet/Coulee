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

  // La silhouette de la coulée, retournée pour nager vers la droite (couloirs de course)
  var NAGEUR_SVG =
    '<svg viewBox="-200 -60 400 110" aria-hidden="true" focusable="false">' +
      '<g transform="scale(-1,1)" fill="none" stroke="#EAF2FF" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M 65,8 L 130,14 L 180,8" stroke-width="32"/>' +
        '<path d="M -35,-8 L -185,-30" stroke-width="28"/>' +
        '<path d="M 65,8 L -35,-8" stroke-width="54"/>' +
        '<circle cx="-65" cy="-32" r="24" fill="#22E0C8" stroke="none"/>' +
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
