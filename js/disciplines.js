/* ============================================================
   COULÉE — quiz « Laquelle pour toi ? »
   Chaque réponse donne un point à une discipline ; la ou les disciplines en
   tête l'emportent. Pas de hasard : à réponses égales, résultat identique.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('quiz');
  var sortie = document.getElementById('quiz-resultat');
  if (!form || !sortie) return;

  var DISC = {
    'eau-libre': {
      nom: 'Eau libre',
      pourquoi: 'Tu cherches la distance et l\'aventure plus que le mur du bassin. En eau libre, on nage près de deux heures sur 10 km, en lisant les courants et en choisissant sa trajectoire.'
    },
    'water-polo': {
      nom: 'Water-polo',
      pourquoi: 'Tu veux jouer à plusieurs et tu n\'as pas peur du contact. Le water-polo demande de l\'endurance, de la force et du sens tactique, sans jamais toucher le fond.'
    },
    'plongeon': {
      nom: 'Plongeon',
      pourquoi: 'Tu aimes la hauteur et la précision. En plongeon, tout se joue en moins de deux secondes : un seul essai, noté par les juges.'
    },
    'natation-artistique': {
      nom: 'Natation artistique',
      pourquoi: 'Tu veux créer et tu es à l\'aise sous l\'eau. La natation artistique mêle danse, gymnastique et apnée, en parfaite coordination.'
    }
  };
  var ORDRE = ['eau-libre', 'water-polo', 'plongeon', 'natation-artistique'];
  var NB_QUESTIONS = 5;

  function lien(id) {
    return '<a href="#' + id + '">' + DISC[id].nom + '</a>';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();   // sinon la page se recharge et les réponses sont perdues

    var scores = {}, repondu = 0;
    ORDRE.forEach(function (id) { scores[id] = 0; });
    for (var q = 1; q <= NB_QUESTIONS; q++) {
      var choix = form.querySelector('input[name="q' + q + '"]:checked');
      if (choix && scores.hasOwnProperty(choix.value)) { scores[choix.value]++; repondu++; }
    }

    if (repondu < NB_QUESTIONS) {
      var manque = [];
      for (var k = 1; k <= NB_QUESTIONS; k++) {
        if (!form.querySelector('input[name="q' + k + '"]:checked')) manque.push(k);
      }
      sortie.className = 'quiz-resultat is-manque';
      sortie.innerHTML = '<p>Il manque ' + (manque.length > 1 ? 'les questions ' : 'la question ') +
        manque.join(', ').replace(/, (\d+)$/, ' et $1') + '.</p>';
      var premiere = form.querySelector('input[name="q' + manque[0] + '"]');
      if (premiere) premiere.focus();
      return;
    }

    var max = Math.max.apply(null, ORDRE.map(function (id) { return scores[id]; }));
    var gagnants = ORDRE.filter(function (id) { return scores[id] === max; });

    var html = '<p class="label">Ta discipline</p>';
    if (gagnants.length === 1) {
      var g = gagnants[0];
      html += '<p class="quiz-nom">' + DISC[g].nom + '</p>' +
        '<p>' + DISC[g].pourquoi + '</p>' +
        '<p class="note">' + max + ' réponse' + (max > 1 ? 's' : '') + ' sur 5 dans ce sens. ' +
        'Relire la fiche : ' + lien(g) + '.</p>';
    } else {
      html += '<p class="quiz-nom">' + gagnants.map(function (id) { return DISC[id].nom; }).join(' ou ') + '</p>' +
        '<p>Égalité à ' + max + ' réponses chacune : tu hésites entre plusieurs profils. ' +
        gagnants.map(function (id) { return DISC[id].pourquoi; }).join(' ') + '</p>' +
        '<p class="note">Relire les fiches : ' + gagnants.map(lien).join(', ') + '.</p>';
    }
    sortie.className = 'quiz-resultat is-on';
    sortie.innerHTML = html;
  });

  form.addEventListener('reset', function () {
    sortie.className = 'quiz-resultat';
    sortie.innerHTML = '';
  });
})();
