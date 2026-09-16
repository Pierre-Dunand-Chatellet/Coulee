(function () {
  'use strict';

  /* ---------------------------------------------------------
     Repères du monde (unités SVG)
     --------------------------------------------------------- */
  var SURFACE  = 540;                    // ligne d'eau
  // y calculé, pas choisi : le point le plus bas de la pose accroupie (pied à
  // y=62, demi-trait 14, soit 76) doit reposer sur le plateau du plot, qui est
  // à y≈335 sous le nageur. 335 − 76 = 259.
  var START    = { x: 2030, y: 259 };    // nageur sur le plot, pieds sur le plateau
  var ENTRY    = { x: 1070, y: SURFACE };
  var GLIDE_Y  = 610;                    // profondeur atteinte en fin de coulée
  var SWIMMER_TAIL = 196;                // bout des pieds de la pose 03, à droite du point de référence

  // ancrages exprimés en fraction d'écran : indépendants du viewport
  var ANCHOR_X = 0.76;   // le nageur à l'écran pendant le vol
  var LOCK_X   = 0.66;   // le point d'entrée, une fois la caméra calée
  var LOCK_Y   = 0.58;   // la ligne d'eau — la caméra ne bouge JAMAIS en Y :
                         // un panoramique horizontal, comme une caméra de bassin.

  // bornes de phases
  var P_FLY_A = 0.08, P_LOCK = 0.42;
  var P_GLIDE_END = 0.62, P_TEXT = 0.66;

  /* ---------------------------------------------------------
     Outils
     --------------------------------------------------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function norm(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // même courbe que le CSS : cubic-bezier(.23,1,.32,1)
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return function (x) {
      var t = x, i, e, d;
      for (i = 0; i < 6; i++) {
        e = ((ax * t + bx) * t + cx) * t - x;
        if (Math.abs(e) < 1e-5) break;
        d = (3 * ax * t + 2 * bx) * t + cx;
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      return ((ay * t + by) * t + cy) * t;
    };
  }
  var easeOut = bezier(0.23, 1, 0.32, 1);

  /* ---------------------------------------------------------
     Éléments
     --------------------------------------------------------- */
  var scene   = document.getElementById('scene');
  var stage   = document.getElementById('stage');
  var world   = document.getElementById('world');
  var swimmer = document.getElementById('swimmer');
  var copy    = document.getElementById('heroCopy');
  var cue     = document.getElementById('cue');
  var mini    = document.getElementById('mini');
  var poses   = [
    document.getElementById('pose-a'),
    document.getElementById('pose-b'),
    document.getElementById('pose-c')
  ];
  var chevrons = [].slice.call(document.querySelectorAll('#splash .ch'));

  /* ---------------------------------------------------------
     Géométrie : échelle « cover » + position du nageur
     --------------------------------------------------------- */
  var k = 1, vw = 0, vh = 0, sceneTop = 0, track = 1;
  var camY = 0;         // constant sur toute la séquence
  var glideEnd = 0;     // fin de coulée, calée sur la largeur réelle du cadre
  var pFollowEnd = 0;   // début de la décélération : calculé, pas choisi (voir measure)
  var camFrom = 0;      // position de la caméra à cet instant

  function measure() {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    k = vw <= 640
      ? Math.max(vw / 760, vh / 1280)
      : Math.max(vw / 1520, vh / 1000);
    sceneTop = scene.offsetTop;
    // La scène reste collée tant que son bas n'a pas rejoint celui du stage :
    // la course utile est donc (hauteur scène − hauteur stage). Pas innerHeight,
    // qui grandit de ~56 px quand la barre d'adresse mobile se replie et faisait
    // sauter l'animation en plein geste.
    track = Math.max(1, scene.offsetHeight - stage.offsetHeight);

    camY = LOCK_Y * vh / k - SURFACE;

    // le nageur doit avoir quitté le cadre à 95 % de la coulée, quel que soit l'écran.
    // « Quitté » = ses PIEDS sortis, pas son point de référence : en pose de coulée
    // ils sont 196 unités à droite de lui (pointe à x=180 + demi-trait 16). Avec
    // l'ancien −120, il restait une vingtaine d'unités de pieds au bord gauche.
    var exit = -(SWIMMER_TAIL + 12) - lockCamX();
    glideEnd = ENTRY.x + (exit - ENTRY.x) / 0.95;

    // Le suivi ne peut pas s'arrêter n'importe quand.
    // « meet » est le point où le cadrage verrouillé encadrerait le nageur
    // exactement à son ancre : avant, se caler le ferait repartir vers la
    // droite ; après, la caméra aurait dépassé le verrou. La caméra doit donc
    // être À L'ARRÊT pile à ce rendez-vous — donc commencer à freiner avant.
    // Avec une vitesse qui décroît linéairement, la distance parcourue vaut la
    // moitié de celle du suivi : le freinage démarre à 2·meet − verrou.
    var meet = ENTRY.x + (ANCHOR_X - LOCK_X) * vw / k;
    var t = clamp((START.x - meet) / (START.x - ENTRY.x), 0, 1);
    var pMeet = P_FLY_A + t * (P_LOCK - P_FLY_A);
    pFollowEnd = clamp(2 * pMeet - P_LOCK, P_FLY_A, P_LOCK);
    camFrom = ANCHOR_X * vw / k - swimmerAt(pFollowEnd).x;
  }

  // Hauteur du saut. À 34 (valeur physiquement réaliste d'un départ de
  // compétition) il ne montait que de 11 unités contre 235 de chute : ça ne se
  // lisait pas comme un saut. À 90 il s'élève d'une cinquantaine d'unités,
  // décolle à 16,4° au lieu de 6° et entre dans l'eau à −41,3°.
  var ARC = 90;                     // hauteur du saut au-dessus du plot
  var DROP = ENTRY.y - START.y;     // hauteur de chute jusqu'à l'eau

  // Le corps suit la pente de sa PROPRE trajectoire : rien n'est réglé à la main,
  // donc il ne peut plus entrer par les pieds. Attention au signe : le nageur est
  // dessiné tourné vers la gauche, et en SVG une rotation positive fait descendre
  // le côté droit — c'est donc un angle NÉGATIF qui lui met la tête en bas.
  // +16,4° au décollage (il monte encore), −41,3° à l'entrée (valeurs calculées).
  function flightAngle(t) {
    var vx = ENTRY.x - START.x;
    var vy = -ARC * Math.PI * Math.cos(Math.PI * t) + 2 * DROP * t;
    return Math.atan2(-vy, -vx) * 180 / Math.PI;
  }

  // position du nageur dans le monde, pour une progression p
  function swimmerAt(p) {
    if (p <= P_FLY_A) {
      // droit sur le plot : l'angle de vol ne s'applique qu'une fois en l'air.
      // Avec flightAngle(0), l'accroupi était penché de 16,4° puis se redressait
      // d'un coup à p = 0,08, où la branche du vol repart de 0.
      return { x: START.x, y: START.y, rot: 0 };
    }
    if (p <= P_LOCK) {                       // le vol : parabole
      var t = norm(p, P_FLY_A, P_LOCK);
      return {
        x: lerp(START.x, ENTRY.x, t),
        y: START.y - ARC * Math.sin(Math.PI * t) + DROP * t * t,
        // La tangente vaut déjà +16° au décollage : appliquée telle quelle, elle
        // ferait basculer l'accroupi en arrière alors qu'il est encore sur le
        // plot. On la fait monter depuis 0 sur les premiers pour-cents.
        rot: flightAngle(t) * norm(p, P_FLY_A, 0.13)
      };
    }
    // la coulée : le nageur seul, caméra figée. Il se remet à l'horizontale.
    var u = norm(p, P_LOCK, P_GLIDE_END);
    var e = 1 - Math.pow(1 - u, 1.6);        // il décélère, il ne s'arrête pas net
    return {
      x: lerp(ENTRY.x, glideEnd, e),
      y: lerp(ENTRY.y + 22, GLIDE_Y, e) + 11 * Math.sin(u * Math.PI * 4),
      rot: flightAngle(1) * (1 - easeOut(norm(p, P_LOCK, 0.50)))
    };
  }

  // caméra verrouillée : le point d'entrée cadré à LOCK_X
  function lockCamX() { return LOCK_X * vw / k - ENTRY.x; }

  function cameraAt(p) {
    if (p >= P_LOCK) return { x: lockCamX(), y: camY };

    // elle suit le nageur : sa position écran en X est constante par construction
    if (p <= pFollowEnd) return { x: ANCHOR_X * vw / k - swimmerAt(p).x, y: camY };

    // ... puis elle freine. La vitesse part exactement à celle du suivi — aucun
    // à-coup au raccord — et tombe à zéro pile sur le verrou : la caméra
    // s'immobilise au lieu de buter, et le nageur se met à glisser hors de son
    // ancre, de 76 % à 66 % de la largeur, sans jamais repartir en arrière.
    var t = norm(p, pFollowEnd, P_LOCK);
    return { x: lerp(camFrom, lockCamX(), 1 - (1 - t) * (1 - t)), y: camY };
  }

  /* ---------------------------------------------------------
     Écriture (transform + opacity uniquement, et rien d'inutile)
     --------------------------------------------------------- */
  var last = { world: '', swimmer: '', poses: [-1, -1, -1], chev: [], cue: null, mini: null, settled: null };
  var revealed = false;
  var done = false;     // la séquence a été jouée jusqu'au bout : elle ne rejoue plus

  function setOpacity(el, v, store, i) {
    v = Math.round(v * 100) / 100;
    if (store[i] === v) return;
    store[i] = v;
    el.style.opacity = v;
  }

  function render(p) {
    var cam = cameraAt(p);
    var s = swimmerAt(p);

    var w = 'translate3d(' + (cam.x * k).toFixed(2) + 'px,' + (cam.y * k).toFixed(2) + 'px,0) scale(' + k.toFixed(4) + ')';
    if (w !== last.world) { world.style.transform = w; last.world = w; }

    var sx = (s.x + cam.x) * k, sy = (s.y + cam.y) * k;
    var sw = 'translate3d(' + sx.toFixed(2) + 'px,' + sy.toFixed(2) + 'px,0) scale(' + k.toFixed(4) + ') rotate(' + s.rot.toFixed(2) + 'deg)';
    if (sw !== last.swimmer) { swimmer.style.transform = sw; last.swimmer = sw; }

    // permutation des 3 silhouettes, avec un court fondu croisé
    var a = 1 - norm(p, 0.10, 0.12);
    var c = norm(p, 0.20, 0.22);
    setOpacity(poses[0], a, last.poses, 0);
    setOpacity(poses[1], (1 - a) * (1 - c), last.poses, 1);
    setOpacity(poses[2], c, last.poses, 2);

    // écume : chaque chevron a sa propre fenêtre
    for (var i = 0; i < chevrons.length; i++) {
      var start = 0.355 + i * 0.008;
      var o = norm(p, start, start + 0.03) * (1 - norm(p, 0.46, 0.52));
      setOpacity(chevrons[i], o, last.chev, i);
    }

    // le texte : déclenché une fois, jamais rejoué
    if (!revealed && p >= P_TEXT) { revealed = true; copy.classList.add('is-in'); }

    var off = p > 0.03;
    if (off !== last.cue) { cue.classList.toggle('is-off', off); last.cue = off; }

    // la barre fixe n'apparaît qu'une fois la séquence jouée ET le hero quitté :
    // pendant le plongeon elle n'aurait rien à faire là, et au repos le titre
    // COULÉE est déjà à l'écran juste en dessous.
    var on = done && window.pageYOffset > vh * 0.5;
    if (on !== last.mini) { mini.classList.toggle('is-on', on); last.mini = on; }
    var set = done || p > 0.995;
    if (set !== last.settled) { scene.classList.toggle('is-settled', set); last.settled = set; }
  }

  /* ---------------------------------------------------------
     Boucle : une seule lecture du scroll par frame
     --------------------------------------------------------- */
  var ticking = false;

  // Vue une fois pendant la visite : revenir à l'accueil depuis une autre page
  // ne doit pas imposer 4 écrans de plongeon. sessionStorage peut être bloqué
  // (navigation privée, cookies refusés) : la page marche alors sans mémoire.
  var SEEN_KEY = 'coulee-intro-vue';
  function wasSeen() { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }
  function setSeen(v) { try { if (v) sessionStorage.setItem(SEEN_KEY, '1'); else sessionStorage.removeItem(SEEN_KEY); } catch (e) {} }

  // Fin de séquence : on retire la piste de scroll et on remonte le scroll de
  // la hauteur retirée — l'écran ne bouge pas d'un pixel, mais il n'y a plus
  // rien au-dessus du hero. Position ABSOLUE et « instant » : le html a un
  // scroll-behavior:smooth qui ferait glisser la page, et l'ancrage de scroll du
  // navigateur a pu compenser de son côté — une cible absolue reste juste.
  function finish(y) {
    done = true;
    setSeen(true);
    var before = scene.offsetHeight;
    scene.classList.add('is-done');
    var target = Math.max(0, y - (before - scene.offsetHeight));
    try { window.scrollTo({ top: target, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, target); }
    measure();
  }

  function frame() {
    ticking = false;
    var y = window.pageYOffset;
    var p = done ? 1 : clamp((y - sceneTop) / track, 0, 1);
    if (!done && p >= 1) finish(y);
    render(p);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  // Choix de Pierre (16/09/2026) : le plongeon est joué pour TOUS les visiteurs,
  // y compris ceux dont l'appareil demande « animations réduites ». La classe
  // force-motion est posée dans le <head> de chaque page (pas ici : posée en fin
  // de page, elle laissait la scène à 100svh le temps du chargement, puis la
  // page sautait à 400svh).

  // « Aller au contenu » pendant le plongeon : le défilement doux vers #contenu
  // traversait la fin de séquence, et finish() le coupait net avec un scrollTo
  // instantané — on atterrissait en haut du hero. On termine la séquence AVANT
  // que le navigateur ne calcule la destination du lien.
  var skip = document.querySelector('.skip');
  if (skip) skip.addEventListener('click', function () {
    if (!done) { finish(window.pageYOffset); render(1); }
  });

  function init() {
    window.removeEventListener('scroll', onScroll);
    if (!done && wasSeen()) {
      // déjà vue : on arrive directement sur l'image finale
      done = true;
      revealed = true;
      scene.classList.add('is-done');
      copy.classList.add('is-in');
    }
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    frame();
  }

  // « Rejouer le plongeon », en pied de page.
  function replay() {
    // Le bouton garde le focus après le clic : la touche Espace, pressée
    // ensuite pour descendre, le réactivait et renvoyait en haut de page.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setSeen(false);
    revealed = false;
    done = false;
    scene.classList.remove('is-done');
    copy.classList.remove('is-in');
    mini.classList.remove('is-on');
    scene.classList.remove('is-settled');
    last.world = last.swimmer = '';
    last.cue = last.mini = last.settled = null;
    last.poses = [-1, -1, -1];
    last.chev = [];
    try { window.scrollTo({ top: 0, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, 0); }
    init();
  }

  var replayLink = document.getElementById('replay');
  if (replayLink) replayLink.addEventListener('click', replay);

  init();

  var resizeId;
  window.addEventListener('resize', function () {
    clearTimeout(resizeId);
    resizeId = setTimeout(function () {
      last.world = last.swimmer = '';
      init();
    }, 120);
  });
})();
