/* ============================================================
   COULÉE — outils sous le calculateur d'allure
   1. Toi contre le record   2. Ton niveau (points World Aquatics)
   3. Séance générée
   Écoute l'événement « allure:maj » envoyé par js/allure.js ; ce fichier doit
   donc être chargé AVANT allure.js (qui calcule une première fois au chargement).
   Dépend de js/donnees.js (window.COULEE).
   ============================================================ */
(function () {
  'use strict';

  var D = window.COULEE;
  if (!D) return;
  var fr = D.fr, chrono = D.chrono;

  var etat = null;   // dernier résultat du calculateur

  function sexe() {
    var r = document.querySelector('input[name="sexe-rec"]:checked');
    return r ? r.value : 'H';
  }
  function plafond5(s) { return Math.ceil(s / 5) * 5; }
  // départ « toutes les 1:45 » : toujours avec les minutes, sans centièmes
  function mmss(s) {
    s = Math.round(s);
    var m = Math.floor(s / 60), r = s - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  // écart lisible : « 8,4 s » ou « 1 min 05 s »
  function ecart(s) {
    if (s < 60) return fr(s, 1) + ' s';
    s = Math.round(s);
    var m = Math.floor(s / 60), r = s - m * 60;
    return m + ' min ' + (r < 10 ? '0' : '') + r + ' s';
  }
  function longueurs(m, B) {
    var n = m / B;
    return fr(n, n % 1 ? 1 : 0) + ' longueur' + (n >= 2 ? 's' : '');
  }

  /* =========================================================
     1. TOI CONTRE LE RECORD
     ========================================================= */
  var vs = {
    race: document.getElementById('vs-race'),
    btn: document.getElementById('vs-start'),
    status: document.getElementById('vs-status'),
    texte: document.getElementById('vs-texte'),
    vitesse: document.getElementById('vs-vitesse')
  };
  var lanes = [], dist = [], raf = 0;

  if (vs.race) {
    vs.race.innerHTML =
      lane('toi', 'Couloir 4', 'Toi') +
      '<div class="rope" aria-hidden="true"></div>' +
      lane('rec', 'Couloir 5', 'Record');
    vs.race.setAttribute('aria-hidden', 'true');   // le résultat est donné en texte
    vs.race.hidden = false;
    lanes = [].slice.call(vs.race.querySelectorAll('.lane')).map(function (el) {
      return {
        el: el,
        nom: el.querySelector('b'),
        track: el.querySelector('.track'),
        sw: el.querySelector('.race-swimmer'),
        chrono: el.querySelector('.chrono'),
        place: el.querySelector('.place')
      };
    });
  }

  function lane(id, couloir, nom) {
    return '<div class="lane" data-id="' + id + '">' +
      '<div class="lane-name"><small>' + couloir + '</small><b>' + nom + '</b></div>' +
      '<div class="track"><span class="race-swimmer">' + D.NAGEUR_SVG + '</span></div>' +
      '<div class="lane-time"><span class="chrono">0,00</span><span class="place"></span></div>' +
      '</div>';
  }

  function mesurer() {
    dist = lanes.map(function (l) { return Math.max(0, l.track.clientWidth - l.sw.offsetWidth); });
  }
  function placer(i, p) {
    lanes[i].sw.style.transform = 'translate3d(' + (p * dist[i]).toFixed(1) + 'px,0,0)';
  }

  function reset() {
    cancelAnimationFrame(raf);
    if (!lanes.length) return;
    mesurer();
    lanes.forEach(function (l, i) {
      l.el.classList.remove('done');
      placer(i, 0);
      l.chrono.textContent = '0,00';
      l.place.textContent = '';
    });
    vs.status.textContent = '';
    vs.btn.textContent = '▶ Départ';
  }

  function textesVs() {
    if (!vs.texte) return;
    if (!etat || !etat.ok) {
      vs.texte.textContent = 'Entre un temps valide dans le calculateur pour lancer la course.';
      vs.btn.disabled = true;
      vs.vitesse.textContent = '';
      return;
    }
    vs.btn.disabled = false;
    var sx = sexe();
    var R = D.RECORDS_NL[sx][etat.D2];
    lanes[1].nom.textContent = R.nom;
    var lent = Math.max(etat.T2, R.t);
    vs.vitesse.textContent = 'Course accélérée ×' + Math.max(1, Math.round(lent / 8)) + ', jouée en 8 secondes';

    var intro = 'Record du monde du ' + etat.D2 + ' m nage libre ' + (sx === 'H' ? 'hommes' : 'dames') +
      ' : ' + chrono(R.t) + ', ' + R.qui + ' (' + R.pays + ', ' + R.an + '). ';
    if (etat.T2 > R.t) {
      var reste = etat.D2 * (1 - R.t / etat.T2);
      vs.texte.textContent = intro +
        'Quand ' + (sx === 'H' ? 'il' : 'elle') + ' touche le mur, il te reste ' + fr(reste, 0) + ' m à nager, soit ' +
        longueurs(Math.round(reste), etat.B) + ' de bassin de ' + etat.B + ' m. Tu arrives ' +
        ecart(etat.T2 - R.t) + ' plus tard.';
    } else {
      vs.texte.textContent = intro + 'Ton temps estimé battrait ce record. Vérifie ta saisie… ou préviens ta fédération.';
    }
  }

  function lancer() {
    if (!etat || !etat.ok) return;
    reset();
    var R = D.RECORDS_NL[sexe()][etat.D2];
    var totaux = [etat.T2, R.t];
    var f = Math.max(totaux[0], totaux[1]) / 8;   // la course dure 8 secondes réelles
    var t0 = performance.now();
    vs.btn.textContent = '↺ Relancer';

    function frame(now) {
      var t = Math.max(0, (now - t0) / 1000 * f);
      var fini = true;
      lanes.forEach(function (l, i) {
        var p = Math.min(t / totaux[i], 1);
        placer(i, p);
        if (p < 1) { fini = false; l.chrono.textContent = chrono(t); }
        else if (!l.el.classList.contains('done')) {
          l.el.classList.add('done');
          l.chrono.textContent = chrono(totaux[i]);
          l.place.textContent = (totaux[i] <= totaux[1 - i] ? '1re' : '2e') + ' place';
        }
      });
      if (fini) { vs.status.textContent = vs.texte.textContent; return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  if (vs.btn) vs.btn.addEventListener('click', lancer);

  /* =========================================================
     2. TON NIVEAU — barème World Aquatics 2026
     ========================================================= */
  var niv = {
    points: document.getElementById('niv-points'),
    texte: document.getElementById('niv-texte'),
    echelle: document.getElementById('niv-echelle'),
    ref: document.getElementById('niv-ref')
  };
  var PALIERS = [1000, 900, 800, 700, 600, 500, 400, 300];

  function niveau() {
    if (!niv.points) return;
    if (!etat || !etat.ok) {
      niv.points.textContent = '—';
      niv.texte.textContent = '';
      niv.ref.textContent = '';
      niv.echelle.innerHTML = '';
      return;
    }
    var sx = sexe();
    var p = D.points(sx, etat.D2, etat.T2);
    niv.points.textContent = p.toLocaleString('fr-FR');
    niv.texte.textContent = 'points pour ton estimation de ' + chrono(etat.T2) +
      ' au ' + etat.D2 + ' m nage libre, barème ' + (sx === 'H' ? 'hommes' : 'dames') + '.';
    var pRef = D.points(sx, etat.D1, etat.T1);
    niv.ref.textContent = pRef === null ? '' :
      'Ton temps de référence sur ' + etat.D1 + ' m vaut ' + pRef.toLocaleString('fr-FR') + ' points' +
      (pRef > p ? ' : l\'estimation est plus faible, les longues distances coûtent plus cher en points.' : '.');

    // échelle : paliers officiels + ta ligne insérée à sa place
    var lignes = PALIERS.map(function (P) {
      return { p: P, t: D.tempsPour(sx, etat.D2, P), moi: false };
    });
    lignes.push({ p: p, t: etat.T2, moi: true });
    lignes.sort(function (a, b) { return b.p - a.p || (a.moi ? 1 : -1); });
    niv.echelle.innerHTML = lignes.map(function (l) {
      var lib = l.moi ? 'Toi' : l.p === 1000 ? 'Temps de base (record au 31/12/2025)' : l.p + ' points';
      return '<li' + (l.moi ? ' class="moi"' : '') + '><span class="pts">' + (l.moi ? p : l.p) + '</span>' +
        '<span class="lib">' + lib + '</span><span class="tps">' + chrono(l.t) + '</span></li>';
    }).join('');
  }

  /* =========================================================
     3. SÉANCE GÉNÉRÉE
     ========================================================= */
  var sea = {
    corps: document.getElementById('seance-corps'),
    resume: document.getElementById('seance-resume'),
    print: document.getElementById('seance-imprimer')
  };

  // série principale selon l'objectif : [répétitions, distance, repos ajouté au temps de nage (s)]
  var SERIES = { 100: [6, 50, 40], 200: [8, 50, 20], 400: [8, 100, 15], 800: [10, 100, 15], 1500: [5, 300, 30] };

  function seance() {
    if (!sea.corps) return;
    if (!etat || !etat.ok) {
      sea.corps.innerHTML = '';
      sea.resume.textContent = 'Entre un temps valide dans le calculateur.';
      return;
    }
    var B = etat.B, p100 = etat.T2 / etat.D2 * 100;
    var souple = function (m) { return m / 100 * p100 * 1.3; };   // nage lente : ~30 % plus lent
    var s = SERIES[etat.D2];
    var nage = s[1] / 100 * p100;
    var depart = plafond5(nage + s[2]);
    var edu = plafond5(p100 / 2 * 1.2 + 20);
    var vite = B === 25 ? { n: 4, m: 25, d: 60 } : { n: 4, m: 50, d: plafond5(p100 / 2 + 45) };

    var blocs = [
      { nom: 'Échauffement', txt: '400 m souple, en variant les nages', m: 400, duree: souple(400), dep: '—' },
      { nom: 'Éducatifs', txt: '4 × 50 m : 25 m d\'éducatif, 25 m de nage', m: 200, duree: 4 * edu, dep: 'toutes les ' + mmss(edu) },
      { nom: 'Série principale', txt: s[0] + ' × ' + s[1] + ' m à l\'allure de ton ' + etat.D2 + ' m : ' + chrono(nage, 1) + ' par ' + s[1] + ' m', m: s[0] * s[1], duree: s[0] * depart, dep: 'toutes les ' + mmss(depart), fort: true },
      { nom: 'Récupération', txt: '100 m souple', m: 100, duree: souple(100), dep: '—' },
      { nom: 'Vitesse', txt: vite.n + ' × ' + vite.m + ' m vite, en restant relâché', m: vite.n * vite.m, duree: vite.n * vite.d, dep: 'toutes les ' + mmss(vite.d) },
      { nom: 'Retour au calme', txt: '200 m souple', m: 200, duree: souple(200), dep: '—' }
    ];
    var total = 0, duree = 0;
    sea.corps.innerHTML = blocs.map(function (b) {
      total += b.m; duree += b.duree;
      return '<tr' + (b.fort ? ' class="fort"' : '') + '><th scope="row">' + b.nom + '</th><td>' + b.txt + '</td>' +
        '<td class="num">' + b.m + ' m</td><td class="num">' + b.dep + '</td></tr>';
    }).join('');
    sea.resume.textContent = 'Total ' + fr(total, 0) + ' m, environ ' + Math.round(duree / 60) + ' minutes, en bassin de ' + B + ' m.';
  }

  if (sea.print) sea.print.addEventListener('click', function () { window.print(); });

  /* ========================================================= */
  function toutMettreAJour() {
    reset();
    textesVs();
    niveau();
    seance();
  }

  document.addEventListener('allure:maj', function (e) {
    etat = e.detail;
    toutMettreAJour();
  });
  [].slice.call(document.querySelectorAll('input[name="sexe-rec"]')).forEach(function (r) {
    r.addEventListener('change', toutMettreAJour);
  });

  var resizeId;
  window.addEventListener('resize', function () {
    clearTimeout(resizeId);
    resizeId = setTimeout(function () {
      mesurer();
      lanes.forEach(function (l, i) { placer(i, l.el.classList.contains('done') ? 1 : 0); });
    }, 120);
  });
})();
