"use strict";

import React from "react";
import Bacon from "Bacon";
import Immutable from "immutable";

import * as Const from "./const";
import {HowtoPage, GamePage, ScorePage, WorldSelectPage, MenuPage} from "./components";
import * as Audio from "./audio";
import * as World from "./worlds";

let nextStep = (() => {
  const STEP_MULTIPLIER = 8;
  const SPECIAL_STEP_MULTIPLIER = 32;

  let Movement = {
    indentSkip(block, position) {
      // Match line change and indention whitespace
      let match = block.substr(position + 1).match(/^(\n|\s{2,})+/);
      if (match == null) {
        return 0;
      } else {
        // If next line starts from column 0, skip just \n, else skip until
        // first non-whitespace column which is after the match
        return match[1].length == 1 ? 1 : match[1].length + 1;
      }
    },
    jump(step, blocks, index, position) {
      let blockLength = blocks.get(index).get('text').length;
      // Jump if _cursor_ is at the first character of special block
      // (actual position is last of previous block)
      if (index % 2 == 0 && position == blockLength) {
        return [0, step + blocks.get(index + 1).get('text').length];
      } else if (index % 2 == 1) {
        return [position, step + blockLength - position];
      } else {
        // Missed special usage
        return [-1, step];
      }
    },
    step(position) {
      return position + 1;
    },
    getPosition(blocks, step) {
      let blockIndex = -1;
      let next = step;
      let remainder;
      do {
        remainder = next;
        blockIndex++;
        next -= blocks.get(blockIndex).get('text').length;
      } while (next > 0);
      return [blockIndex, remainder];
    }
  };

  const getBlocks = state => state.getIn(['world', 'blocks']);
  const getWorldLength = state => state.getIn(['world', 'length']);

  function applyProgress(currentState) {
    return currentState.set('progress', currentState.get('step') / getWorldLength(currentState) * 100);
  }

  function applyTimeBonus(state, timeLeft) {
    return state.merge({
      timeLeft: timeLeft,
      score: state.get('score') + timeLeft * 1000
    });
  }

  function applyNormalKey(state) {
    let currentPosition = Movement.step(state.get('step')) + Movement.indentSkip(getBlocks(state).get(state.get('blockIndex')).get('text'), state.get('blockPosition')),
        stepScore = (currentPosition - state.get('step')) * STEP_MULTIPLIER,
        [blockIndex, blockPosition] = Movement.getPosition(getBlocks(state), currentPosition);
    return state.merge({
      blockIndex: blockIndex,
      blockPosition: blockPosition,
      step: currentPosition,
      score: state.get('score') + stepScore
    });
  }

  function applySpecialKey(state) {
    let currentPosition = 0,
        stepScore = 0,
        consecutiveSpecialHits = state.get('consecutiveSpecialHits'),
        specialsLeft = state.get('specialsLeft'),
        autocompletes = state.get('autocompletes'),
        hitPosition = -1; // The character at which autocomplete was used
    if (state.get('specialsLeft') > 0) {
      [hitPosition, currentPosition] = Movement.jump(state.get('step'), getBlocks(state), state.get('blockIndex'), state.get('blockPosition'));
    } else {
      [hitPosition, currentPosition] = [-1, state.get('step')];
    }
    // Perfect hit
    if (hitPosition === 0) {
      // Rewards for hitting special
      consecutiveSpecialHits = consecutiveSpecialHits + 1;
      stepScore = (currentPosition - state.get('step')) * consecutiveSpecialHits * SPECIAL_STEP_MULTIPLIER;
      autocompletes = autocompletes + 1;
    } else if (hitPosition > 0) {
      // Missed first char but still in special block
      stepScore = (currentPosition - state.get('step')) * consecutiveSpecialHits * SPECIAL_STEP_MULTIPLIER / hitPosition;
      consecutiveSpecialHits = 0;
      specialsLeft = Math.max(0, state.get('specialsLeft') - 1);
      autocompletes = autocompletes + 1;
    } else {
      // Not in special block
      consecutiveSpecialHits = 0;
      specialsLeft = Math.max(0, state.get('specialsLeft') - 1);
    }
    let [blockIndex, blockPosition] = Movement.getPosition(getBlocks(state), currentPosition);
    return state.merge({
      blockIndex: blockIndex,
      blockPosition: blockPosition,
      step: currentPosition,
      consecutiveSpecialHits: consecutiveSpecialHits,
      specialsLeft: specialsLeft,
      score: state.get('score') + stepScore,
      autocompletes: autocompletes
    });
  }

  function applyBlockFinish(initialState, currentState) {
    // Just finished a block
    if (currentState.get('blockPosition') == getBlocks(initialState).get(currentState.get('blockIndex')).get('text').length) {
      if (getBlocks(initialState).get(currentState.get('blockIndex')).get('type') === Const.TYPE_GET_SPECIAL) {
        return currentState.set('specialsLeft', initialState.get('specialsLeft') + 1);
      }
    }
    return currentState;
  }

  // Gets and returns Immutable.Map as state
  return (initialState, timeAndKey) => {
    if (initialState.get('step') == getWorldLength(initialState)) {
      return initialState;
    }

    let {keyType, timeLeft} = timeAndKey;

    let state = initialState;
    if (keyType == Const.KEY_SPECIAL) {
      state = applySpecialKey(state);
    }
    if (keyType == Const.KEY_NORMAL) {
      state = applyNormalKey(state);
    }
    state = applyBlockFinish(initialState, state);
    state = applyProgress(state);
    if (state.get('progress') === 100) {
      state = applyTimeBonus(state, timeLeft);
    }

    return state;
  }
})();

function registerKey(key) {
  return Bacon
      .fromEvent(window, "keypress")
      .map(e => e.keyCode)
      .filter(code => String.fromCharCode(code) === key)
      .map(key);
}

// Input config object keys
const UP = 'UP',
      DOWN = 'DOWN',
      LEFT = 'LEFT',
      RIGHT = 'RIGHT';

// Outputs an incremented number when input sequence is advanced
function sequenceStream(keyConfig, sequence) {
  let keySequence = sequence.map(command => keyConfig[command]);
  let keyE = keySequence.map(registerKey);
  return Bacon.mergeAll(keyE)
      .scan({n: 0, loops: 0, seq: keySequence}, (conf, key) => {
        let loops = conf.loops;
        let n = conf.n;
        // Advance sequence only if correct next input given
        if (conf.seq[n] === key) {
          n = (n + 1) % conf.seq.length;
          loops++;
        }
        return {n: n, seq: conf.seq, loops: loops};
      })
      .map(conf => conf.loops)
      .skipDuplicates()
      // Skip initial state as all events trigger cursor movement
      .skip(1);
}

function parseBlock(rawBlock, index) {
  switch (rawBlock[0]) {
    case "!":
      return {type: Const.TYPE_GET_SPECIAL, text: rawBlock.slice(1)};
    default:
      return {type: index % 2 ? Const.TYPE_BONUS : Const.TYPE_NORMAL, text: rawBlock};
  }
}

let player1NameChangeE = new Bacon.Bus();
let player2NameChangeE = new Bacon.Bus();
let outputs = {
  player1Name(name) { player1NameChangeE.push(name) },
  player2Name(name) { player2NameChangeE.push(name) }
};

function timer(count, delay) {
  return Bacon
      .interval(delay || 1000)
      .scan(count, t => t - 1)
      .takeWhile(t => t >= 0);
}

const isGameHash = (hash) => hash.startsWith("#game");
const isScoreHash = (hash) => hash.startsWith("#score");

var pageHashP = Bacon.fromEvent(window, "hashchange")
    .toProperty({newURL: window.location.hash})
    .map(e => {
      let parts = e.newURL.split("#");
      return (parts.length == 2) ? "#" + parts[1] : "#menu";
    });

let activePageP = pageHashP
    .flatMapLatest(hash => {
      if (isGameHash(hash)) {
        return Bacon
            .sequentially(Const.TIME_DELAY, Const.USE_COUNTDOWN ? ["3", "2", "1", "CODE!", ""] : [""])
            .toProperty("READY?") // immediate start from first countdown element
            .flatMap(c => Bacon.combineTemplate({
              hash: hash,
              countdown: c,
              timeLeft: c == "" ? timer(Const.GAME_TIME, Const.TIME_DELAY) : Const.GAME_TIME
            }));
      } else {
        return Bacon.constant({hash: hash});
      }
    })
    .toProperty();

let gameIsActiveP = activePageP.map(page => isGameHash(page.hash) && page.countdown === "");

let gameTimeLeftP = activePageP.filter(page => isGameHash(page.hash)).map(page => page.timeLeft);

let resetStateE = Bacon.mergeAll(
    // Force reset on "Q"
    Bacon.mergeAll(Bacon.once(), registerKey("q")),
    // Reset on menu->game page transition
    activePageP.slidingWindow(2, 2).filter(w => w[0].hash === "#worldSelect" && isGameHash(w[1].hash))
).map("[reset state]");

let playerSettingsP = Bacon
    .combineAsArray([
      {
        name: player1NameChangeE.toProperty("Player 1")
      },
      {
        name: player2NameChangeE.toProperty("Player 2")
      }
    ].map(Bacon.combineTemplate));

const player1Keys = {LEFT: 'a', RIGHT: 'd', DOWN: "s", UP: "w", A: "2", B: "3"};
const player2Keys = {LEFT: 'j', RIGHT: 'l', DOWN: "k", UP: "i", A: "7", B: "8"};

let pageComponentE = activePageP
    .map(page => {
      switch (page.hash) {
        case "#worldSelect":
          return (states, settings, navigation) => <WorldSelectPage navigation={navigation}/>;
        case "#howto":
          return (states, settings, navigation) => <HowtoPage states={states} settings={settings} navigation={navigation}/>;
        case "#game-hs":
        case "#game-asm":
        case "#game-js":
          return (states, settings, navigation) => <GamePage states={states} page={page} settings={settings}/>;
        case "#score":
          return (states, settings, navigation) => <ScorePage states={states} settings={settings} navigation={navigation}/>;
        default:
          return (states, settings, navigation) => <MenuPage states={states} settings={settings} outputs={outputs} navigation={navigation}/>;
      }
    });

// From MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
function freeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(function(name) {
    if (typeof obj[name] == 'object' && !Object.isFrozen(obj[name])) {
      freeze(obj[name]);
    }
  });
  return Object.freeze(obj);
}

let isGamePageP = activePageP
    .map(p => isGameHash(p.hash))
    .skipDuplicates();

function merge(...keys) {
  return Bacon.mergeAll(keys.map(registerKey));
}

let menuNextE = merge(player1Keys.DOWN, player2Keys.DOWN, player1Keys.LEFT, player2Keys.LEFT).map(() => (x) => x - 1);
let menuPrevE = merge(player1Keys.UP, player2Keys.UP, player1Keys.RIGHT, player2Keys.RIGHT).map(() => (x) => x + 1);
let asE = merge(player1Keys.A, player2Keys.A);
let menuResetE = activePageP.map(() => () => 0);

let menuIndexP = Bacon
    .mergeAll(menuNextE, menuPrevE, menuResetE)
    .filter(isGamePageP.not())
    .scan(0, (index, func) => func(index));

const worlds = [
  {world: World.assembly, label: "Assembly", description: "Be the machine"},
  {world: World.javaScript, label: "JavaScript", description: "Best proggaming language"},
  {world: World.haskell, label: "Haskell", description: "Enjoy your burritos"}
];

const navigation = {
  "#menu": [
    {link: "#worldSelect", label: "Start game >", selected: false},
    {link: "#howto", label: "How to play >", selected: false}
  ],
  "#worldSelect": worlds.map(w => ({link: "#game-hs", label: w.label + " >", description: w.description, selected: false})),
  "#score": [
    {link: "#menu", label: "< Back to main menu", selected: false}
  ],
  "#howto": [
    {link: "#menu", label: "< Back to main menu", selected: false}
  ]
};

let navigationP = Bacon
    .constant(navigation)
    .sampledBy(activePageP, (navigation, page) => navigation.hasOwnProperty(page.hash) ? navigation[page.hash] : [])
    .sampledBy(menuIndexP, (navigation, index) => {
      // Wrap navigation index, i.e. index -1 equals last menu item, last index + 1, equals first menu item
      let active = wrapIndex(navigation.length, index);
      return navigation.map((n, i) => {
        n.selected = i === active;
        return n;
      });
    });

navigationP
    .sampledBy(asE)
    .map(navigation => navigation.filter(n => n.selected)[0])
    .onValue(item => window.location.hash = item.link);

let isWorldSelectP = activePageP
    .map(p => isGameHash(p.hash))
    .skipDuplicates();

let isScorePageP = activePageP
  .map(p => isScoreHash(p.hash))
  .skipDuplicates();

const wrapIndex = (length, index) => (length + (index % length)) % length;

let activeWorldP = Bacon
    .constant(worlds)
    .sampledBy(menuIndexP, (worlds, index) => worlds[wrapIndex(worlds.length, index)].world).map(world => {
      let blocks = world.split(/<<|>>/).map(parseBlock);
      return {
        length: blocks.map(b => b.text).join('').length,
        blocks: blocks
      }
    });

let playerStatesP = Bacon
    .combineAsArray([
      {
        keys: player1Keys,
        world: activeWorldP,
        characterImg: 'assets/img/amigadouche.png',
        specialsLeft: 3,
        consecutiveSpecialHits: 0,
        autocompletes: 0,
        score: 0,
        progress: 0,
        blockIndex: 0,
        blockPosition: 0,
        step: 0
      }, {
        keys: player2Keys,
        world: activeWorldP,
        characterImg: 'assets/img/atarigrrrl.png',
        specialsLeft: 3,
        consecutiveSpecialHits: 0,
        autocompletes: 0,
        score: 0,
        progress: 0,
        blockIndex: 0,
        blockPosition: 0,
        step: 0
      }
    ].map(Bacon.combineTemplate))
    .sampledBy(resetStateE)
    .flatMapLatest(players => Bacon.combineAsArray(players.map(player => {
      let normalE = sequenceStream(player.keys, [LEFT, RIGHT]);
      let specialE = registerKey(player.keys.A);
      let keysE = Bacon
          .mergeAll(specialE.map(Const.KEY_SPECIAL), normalE.map(Const.KEY_NORMAL))
          .filter(gameIsActiveP);
      return gameTimeLeftP
          .sampledBy(keysE, (timeLeft, keyType) => ({timeLeft: timeLeft, keyType: keyType}))
          .scan(player, (state, timeAndKey) => nextStep(Immutable.fromJS(state), timeAndKey).toJS());
    })));

Bacon.onValues(pageComponentE, playerStatesP, playerSettingsP, navigationP, (template, states, settings, navigation) => React.render(template(freeze(states), freeze(settings), navigation), document.getElementById("main")));

function playersProgressedToEnd(states) {
  return states.reduce((end, s) => s.progress === 100 && end, true);
}

gameIsActiveP
    .and(activePageP.map(p => p.timeLeft == 0).or(playerStatesP.map(playersProgressedToEnd).toProperty(false)))
    .filter(s => s === true)
    .onValue(() => window.location.hash = "#score");

let [game, menu, menuPickSfx, menuSwitchSfx, typeSfx, perfectSfx, autocompleteSfx, missSfx] = Audio.loadAudioContext(
    'assets/game.mp3', 'assets/menu.mp3', 'assets/menu-pick.wav', 'assets/menu-switch.wav', 'assets/type.wav', 'assets/perfect.wav', 'assets/autocomplete.wav', 'assets/miss.wav');


// Audio

isGamePageP
    .onValue((isActive) => {
      game.loop(isActive);
      menu.loop(!isActive);
    });

asE.filter(isGamePageP.not()).onValue(() => {
  console.log("sfx: pick");
  menuPickSfx.play();
});

Bacon.mergeAll(menuNextE, menuPrevE)
  .filter(isGamePageP.not())
  .filter(isScorePageP.not())
  .onValue(() => {
  console.log("sfx: switch");
  menuSwitchSfx.play();
});

function orAll(cur, prev, fn) {
  if (cur.length !== prev.length) {
    throw new Error("Compared objects must be same size");
  }
  return cur.reduce((eq, _, index) => eq || fn(cur[index], prev[index]), false);
}

const gt = (field) => (c, p) => c[field] > p[field];

playerStatesP.slidingWindow(2, 2).onValues((prev, cur) => {
  const any = (fn) => orAll(cur, prev, fn);

  // Any players' current value of given field greater than in previous step
  if (any(gt("consecutiveSpecialHits"))) {
    console.log("sfx: perfect");
    perfectSfx.play();
  }
  if (any(gt("step"))) {
    console.log("sfx: type");
    typeSfx.play();
  }
  if (any(gt("autocompletes"))) {
    console.log("sfx: autocomplete");
    autocompleteSfx.play();
  }
  if (any((c, p) => c.step == p.step && c.specialsLeft < p.specialsLeft)) {
    console.log("sfx: miss");
    missSfx.play();
  }
});

