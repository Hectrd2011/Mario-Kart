/* ------------------------------------------------------------------
   input.js — keyboard and gamepad, normalised to one action set.

   Everything downstream reads `held`, `pressed` (this frame only) and
   `steer` (-1..1, analogue from a stick, digital from keys), so the
   physics never has to care where the input came from.
   ------------------------------------------------------------------ */
'use strict';

(function (SMK) {

  var ACTIONS = ['accel', 'brake', 'left', 'right', 'drift', 'item', 'start', 'back'];

  /* several keys per action, because everyone reaches for a different one */
  var KEYMAP = {
    'ArrowLeft': 'left', 'KeyA': 'left',
    'ArrowRight': 'right', 'KeyD': 'right',
    'ArrowUp': 'accel', 'KeyZ': 'accel', 'KeyW': 'accel',
    'ArrowDown': 'brake', 'KeyX': 'brake', 'KeyS': 'brake',
    'KeyC': 'drift', 'Space': 'drift', 'KeyL': 'drift',
    'ShiftLeft': 'item', 'ShiftRight': 'item', 'KeyQ': 'item', 'KeyK': 'item',
    'Enter': 'start', 'NumpadEnter': 'start',
    'Escape': 'back', 'Backspace': 'back'
  };

  /* extra keys that are not kart actions */
  var HOTKEYS = {
    'KeyM': 'mute', 'KeyF': 'fullscreen', 'KeyH': 'hd',
    'KeyV': 'view', 'KeyP': 'pause', 'Digit1': 'debug'
  };

  var Input = {
    held: {}, pressed: {}, released: {},
    steer: 0,
    hotkeys: {},
    gamepadIndex: -1,
    anyPressed: false
  };

  var rawHeld = {}, prevHeld = {};
  var hotPending = {};
  /* on-screen controls feed in here, alongside the keyboard and pad */
  var virtualHeld = {};
  /* A key tapped and released inside one frame would otherwise vanish:
     the poll would see it already up and never report a press.  Latch
     the keydown and let the next update consume it. */
  var pressLatch = {};

  function setAction(a, down) {
    if (!a) return;
    rawHeld[a] = down;
    if (down) pressLatch[a] = true;
  }

  function onKey(e, down) {
    var a = KEYMAP[e.code];
    if (a) {
      setAction(a, down);
      /* stop the page scrolling / the browser going back */
      if (e.code.indexOf('Arrow') === 0 || e.code === 'Space' || e.code === 'Backspace') {
        e.preventDefault();
      }
    }
    var hk = HOTKEYS[e.code];
    if (hk && down) hotPending[hk] = true;
  }

  Input.attach = function (target) {
    target = target || window;
    target.addEventListener('keydown', function (e) { if (!e.repeat) onKey(e, true); else onKey(e, true); });
    target.addEventListener('keyup', function (e) { onKey(e, false); });
    /* never keep a key stuck down after focus loss */
    window.addEventListener('blur', function () {
      for (var i = 0; i < ACTIONS.length; i++) {
        rawHeld[ACTIONS[i]] = false;
        pressLatch[ACTIONS[i]] = false;
        virtualHeld[ACTIONS[i]] = false;
      }
    });
  };

  /* ---- gamepad ---- */
  function pollPad() {
    if (!navigator.getGamepads) return null;
    var pads = navigator.getGamepads();
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (p && p.connected) { Input.gamepadIndex = i; return p; }
    }
    Input.gamepadIndex = -1;
    return null;
  }

  function btn(p, i) { return p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5); }

  /* the touch overlay pushes state in through this */
  Input.setVirtual = function (action, down) {
    if (!action) return;
    virtualHeld[action] = !!down;
    if (down) pressLatch[action] = true;
  };
  Input.clearVirtual = function () { virtualHeld = {}; };
  Input.hasVirtual = function () {
    for (var k in virtualHeld) if (virtualHeld[k]) return true;
    return false;
  };

  /* call once per frame, before anything reads the state */
  Input.update = function () {
    var a, i;
    var padSteer = 0, padHeld = {};

    var p = pollPad();
    if (p) {
      /* standard mapping: A accel, B brake, X/shoulders drift, Y item */
      padHeld.accel = btn(p, 0) || btn(p, 7);
      padHeld.brake = btn(p, 1) || btn(p, 6);
      padHeld.drift = btn(p, 2) || btn(p, 4) || btn(p, 5);
      padHeld.item = btn(p, 3);
      padHeld.start = btn(p, 9);
      padHeld.back = btn(p, 8);
      padHeld.left = btn(p, 14);
      padHeld.right = btn(p, 15);
      var ax = p.axes.length > 0 ? p.axes[0] : 0;
      if (Math.abs(ax) > 0.18) padSteer = SMK.clamp(ax, -1, 1);
      if (p.axes.length > 1 && p.axes[1] < -0.6) padHeld.accel = true;
    }

    for (i = 0; i < ACTIONS.length; i++) {
      a = ACTIONS[i];
      prevHeld[a] = Input.held[a];
      var down = !!rawHeld[a] || !!padHeld[a] || !!virtualHeld[a];
      Input.held[a] = down;
      Input.pressed[a] = (down && !prevHeld[a]) || !!pressLatch[a];
      Input.released[a] = !down && prevHeld[a];
      pressLatch[a] = false;
    }

    /* digital keys snap to full lock; a stick reports its real value */
    var keySteer = (Input.held.right ? 1 : 0) - (Input.held.left ? 1 : 0);
    Input.steer = keySteer !== 0 ? keySteer : padSteer;

    Input.hotkeys = hotPending;
    hotPending = {};

    Input.anyPressed = false;
    for (i = 0; i < ACTIONS.length; i++) if (Input.pressed[ACTIONS[i]]) Input.anyPressed = true;
  };

  Input.consumeHotkey = function (name) {
    if (Input.hotkeys[name]) { Input.hotkeys[name] = false; return true; }
    return false;
  };

  SMK.input = Input;

})(window.SMK);
