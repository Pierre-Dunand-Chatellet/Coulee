/* ============================================================
   COULÉE — accueil : compteur en direct et passage au 25 m
   Dépend de js/donnees.js (window.COULEE).
   ============================================================ */
(function () {
  'use strict';

  var D = window.COULEE;
  if (!D) return;

  var v = 50 / D.RECORDS.H.crawl.t;   // vitesse moyenne du record, en m/s

  var half = document.getElementById('half-t');
  if (half) half.textContent = D.fr(25 / v, 1);

  var live = document.getElementById('live-m');
  if (!live) return;

  // performance.now() part du chargement de la page : c'est « depuis ton arrivée ».
  // On n'écrit que quand le chiffre change (1 fois toutes les ~0,4 s), et pas du
  // tout quand l'onglet est caché — le calcul reste juste au retour, il repart
  // de l'horloge et non d'un compteur incrémenté.
  var shown = -1;
  function tick() {
    if (!document.hidden) {
      var m = Math.floor(performance.now() / 1000 * v);
      if (m !== shown) {
        shown = m;
        // séparateur de milliers en espace insécable classique : toLocaleString('fr-FR')
        // met une espace fine (U+202F) qu'Anton n'a pas, et le navigateur la
        // remplacerait par une autre police au milieu du chiffre
        live.textContent = String(m).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        // au-delà de 4 chiffres (~70 min sur la page), le nombre débordait de sa case
        if (m >= 10000) live.parentNode.classList.add('is-long');
      }
    }
  }
  tick();
  setInterval(tick, 250);
})();
