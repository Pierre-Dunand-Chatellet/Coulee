/* ============================================================
   COULÉE — commun à toutes les pages : apparition des blocs
   ============================================================ */
(function () {
  'use strict';

  // Tout ce qui se révèle au scroll, sauf le texte du hero : c'est
  // l'animation d'accueil qui le déclenche, pas sa position à l'écran.
  var els = [].slice.call(document.querySelectorAll('.reveal')).filter(function (el) {
    return !el.closest('#scene');
  });

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  // Pas de marge négative en bas : avec −8 %, un bloc situé dans les derniers
  // 8 % d'une page qu'on ne peut plus faire défiler ne franchissait jamais la
  // ligne et restait invisible pour toujours.
  }, { rootMargin: '0px', threshold: 0 });
  els.forEach(function (el) { io.observe(el); });
})();
