/* ------------------------------------------------------------------
   touch.js — on-screen controls, so the game is playable on a phone.

   The pads are ordinary DOM elements laid over the canvas rather than
   anything drawn into the frame buffer: they can then be sized in CSS
   pixels and stay finger-sized whatever integer scale the canvas is
   running at, and they never cost a frame to draw.

   They appear only on a device that reports touch, and fold away again
   the moment a key is pressed — plenty of tablets have both.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var root = null, shown = false;

  var BUTTONS = [
    { action: 'left', label: '◀', cls: 'tc-left' },
    { action: 'right', label: '▶', cls: 'tc-right' },
    { action: 'accel', label: 'GO', cls: 'tc-accel' },
    { action: 'brake', label: 'BRK', cls: 'tc-brake' },
    { action: 'drift', label: 'HOP', cls: 'tc-drift' },
    { action: 'item', label: 'ITEM', cls: 'tc-item' },
    { action: 'start', label: '☰', cls: 'tc-start' }
  ];

  function build() {
    root = document.createElement('div');
    root.id = 'touchpad';
    root.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < BUTTONS.length; i++) {
      (function (spec) {
        var el = document.createElement('button');
        el.className = 'tc ' + spec.cls;
        el.textContent = spec.label;
        el.type = 'button';

        function down(e) {
          e.preventDefault();
          el.classList.add('on');
          SMK.input.setVirtual(spec.action, true);
          /* the first touch also has to unlock audio */
          SMK.audio.resume();
        }
        function up(e) {
          if (e) e.preventDefault();
          el.classList.remove('on');
          SMK.input.setVirtual(spec.action, false);
        }

        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', up);
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        root.appendChild(el);
      })(BUTTONS[i]);
    }
    document.body.appendChild(root);
  }

  function show(on) {
    if (on === shown) return;
    shown = on;
    if (on && !root) build();
    if (root) root.classList.toggle('visible', on);
    document.body.classList.toggle('touch', on);
    /* the canvas gets a different share of the screen with pads on */
    if (SMK._resize) SMK._resize();
  }

  SMK.touch = {
    init: function () {
      var isTouch = ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0) ||
                    window.matchMedia('(pointer: coarse)').matches;
      if (isTouch) show(true);

      /* a tablet with a keyboard: hide the pads once one is used */
      window.addEventListener('keydown', function () { show(false); }, { passive: true });
      /* ...and bring them back on the next real touch */
      window.addEventListener('touchstart', function () { show(true); }, { passive: true });
    },
    show: show,
    get visible() { return shown; }
  };

})(window.SMK);
