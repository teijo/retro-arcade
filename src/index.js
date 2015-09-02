"use strict";

import React from "react";
import Bacon from "Bacon";
import Immutable from "immutable";

import * as Const from "./const";
import {HowtoPage, GamePage, ScorePage, MenuPage} from "./components";

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

  function applyProgress(currentState) {
    return currentState.set('progress', currentState.get('step') / currentState.get('levelLength') * 100);
  }

  function applyTimeBonus(state, timeLeft) {
    return state.merge({
      timeLeft: timeLeft,
      score: state.get('score') + timeLeft * 1000
    });
  }

  function applyNormalKey(state) {
    let currentPosition = Movement.step(state.get('step')) + Movement.indentSkip(state.get('blocks').get(state.get('blockIndex')).get('text'), state.get('blockPosition')),
        stepScore = (currentPosition - state.get('step')) * STEP_MULTIPLIER,
        [blockIndex, blockPosition] = Movement.getPosition(state.get('blocks'), currentPosition);
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
        hitPosition = -1; // The character at which autocomplete was used
    if (state.get('specialsLeft') > 0) {
      [hitPosition, currentPosition] = Movement.jump(state.get('step'), state.get('blocks'), state.get('blockIndex'), state.get('blockPosition'));
    } else {
      [hitPosition, currentPosition] = [false, state.get('step')];
    }
    // Perfect hit
    if (hitPosition == 0) {
      // Rewards for hitting special
      consecutiveSpecialHits = consecutiveSpecialHits + 1;
      stepScore = (currentPosition - state.get('step')) * consecutiveSpecialHits * SPECIAL_STEP_MULTIPLIER;
    } else if (hitPosition > 0) {
      // Missed first char but still in special block
      stepScore = (currentPosition - state.get('step')) * consecutiveSpecialHits * SPECIAL_STEP_MULTIPLIER / hitPosition;
      consecutiveSpecialHits = 0;
      specialsLeft = Math.max(0, state.get('specialsLeft') - 1);
    } else {
      // Not in special block
      consecutiveSpecialHits = 0;
      specialsLeft = Math.max(0, state.get('specialsLeft') - 1);
    }
    let [blockIndex, blockPosition] = Movement.getPosition(state.get('blocks'), currentPosition);
    return state.merge({
      blockIndex: blockIndex,
      blockPosition: blockPosition,
      step: currentPosition,
      consecutiveSpecialHits: consecutiveSpecialHits,
      specialsLeft: specialsLeft,
      score: state.get('score') + stepScore
    });
  }

  function applyBlockFinish(initialState, currentState) {
    // Just finished a block
    if (currentState.get('blockPosition') == initialState.get('blocks').get(currentState.get('blockIndex')).get('text').length) {
      if (initialState.get('blocks').get(currentState.get('blockIndex')).get('type') === Const.TYPE_GET_SPECIAL) {
        return currentState.set('specialsLeft', initialState.get('specialsLeft') + 1);
      }
    }
    return currentState;
  }

  // Gets and returns Immutable.Map as state
  return (initialState, timeAndKey) => {
    if (initialState.get('step') == initialState.get('levelLength')) {
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

let LEVEL =
`<<let>> listener = <<!new>> <<window>>.keypress.Listener();
players.<<forEach>>(player => {
  let step = 0;
  listener.<<simple_combo>>(player.trigger, () => {
    player.input.<<push>>(++step);
  });
});`;
let BLOCKS = LEVEL.split(/<<|>>/).map(parseBlock);


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

let activePageP = Bacon.fromEvent(window, "hashchange")
    .toProperty({newURL: window.location.hash})
    .flatMapLatest(e => {
      let parts = e.newURL.split("#");
      let hash = (parts.length == 2) ? "#" + parts[1] : "#menu";
      switch (hash) {
        case "#game":
          return Bacon
              .sequentially(Const.TIME_DELAY, ["3", "2", "1", "CODE!", ""])
              .toProperty("READY?") // immediate start from first countdown element
              .flatMap(c => Bacon.combineTemplate({
                  hash: hash,
                  countdown: c,
                  timeLeft: c == "" ? timer(Const.GAME_TIME, Const.TIME_DELAY) : Const.GAME_TIME
              }));
        default:
          return Bacon.constant({hash: hash});
      }
    })
    .toProperty();

let gameIsActiveP = activePageP.map(page => page.hash === "#game" && page.countdown === "");

let gameTimeLeftP = activePageP.filter(page => page.hash === "#game").map(page => page.timeLeft);

let resetStateE = Bacon.mergeAll(
    // Force reset on "Q"
    Bacon.mergeAll(Bacon.once(), registerKey("q")),
    // Reset on menu->game page transition
    activePageP.slidingWindow(2, 2).filter(w => w[0].hash === "#menu" && w[1].hash === "#game")
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

let playerStatesP = Bacon
    .combineAsArray([
      {
        keys: {LEFT: 'a', RIGHT: 'd', DOWN: "s", UP: "w", A: "f", B: "g"},
        level: LEVEL,
        levelLength: BLOCKS.map(b => b.text).join('').length,
        blocks: BLOCKS,
        specialsLeft: 3,
        consecutiveSpecialHits: 0,
        score: 0,
        progress: 0,
        blockIndex: 0,
        blockPosition: 0,
        step: 0
      }, {
        keys: {LEFT: 'j', RIGHT: 'l', DOWN: "k", UP: "i", A: ";", B: "'"},
        level: LEVEL,
        levelLength: BLOCKS.map(b => b.text).join('').length,
        blocks: BLOCKS,
        specialsLeft: 3,
        consecutiveSpecialHits: 0,
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

let pageComponentE = activePageP
    .map(page => {
      switch (page.hash) {
        case "#howto":
          return (states, settings) => <HowtoPage states={states} settings={settings}/>;
        case "#game":
          return (states, settings) => <GamePage states={states} page={page} settings={settings}/>;
        case "#score":
          return (states, settings) => <ScorePage states={states} settings={settings}/>;
        default:
          return (states, settings) => <MenuPage states={states} settings={settings} outputs={outputs}/>;
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

Bacon.onValues(pageComponentE, playerStatesP, playerSettingsP, (template, states, settings) => React.render(template(freeze(states), freeze(settings)), document.getElementById("main")));

function playersProgressedToEnd(states) {
  return states.reduce((end, s) => s.progress === 100 && end, true);
}

gameIsActiveP
    .and(activePageP.map(p => p.timeLeft == 0).or(playerStatesP.map(playersProgressedToEnd).toProperty(false)))
    .filter(s => s === true)
    .onValue(() => window.location.hash = "#score");
