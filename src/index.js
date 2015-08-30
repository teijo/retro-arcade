"use strict";

import React from "React";
import Bacon from "Bacon";

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
      let block = blocks[index];
      // Jump if _cursor_ is at the first character of special block
      // (actual position is last of previous block)
      if (index % 2 == 0 && position == block.text.length) {
        return [true, step + blocks[index + 1].text.length];
      }
      // Missed special usage
      return [false, step];
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
        next -= blocks[blockIndex].text.length;
      } while (next > 0);
      return [blockIndex, remainder];
    }
  };

  return (state, keyType) => {
    if (state.step == state.levelLength) {
      return state;
    }

    let currentPosition = 0,
        stepScore = 0,
        consecutiveSpecialHits = state.consecutiveSpecialHits,
        specialsLeft = state.specialsLeft;

    if (keyType == Const.KEY_SPECIAL) {
      let specialHit = false;
      if (state.specialsLeft > 0) {
        [specialHit, currentPosition] = Movement.jump(state.step, state.blocks, state.blockIndex, state.blockPosition);
      } else {
        [specialHit, currentPosition] = [false, state.step];
      }
      if (specialHit) {
        // Rewards for hitting special
        consecutiveSpecialHits = consecutiveSpecialHits + 1;
        stepScore = (currentPosition - state.step) * consecutiveSpecialHits * SPECIAL_STEP_MULTIPLIER;
      } else {
        // Penalties for wasting special
        consecutiveSpecialHits = 0;
        specialsLeft = Math.max(0, state.specialsLeft - 1);
      }
    } else if (keyType == Const.KEY_NORMAL) {
      currentPosition = Movement.step(state.step) + Movement.indentSkip(state.blocks[state.blockIndex].text, state.blockPosition);
      stepScore = (currentPosition - state.step) * STEP_MULTIPLIER;
    } else {
      throw new Error("Invalid keyType: " + keyType)
    }

    let [blockIndex, blockPosition] = Movement.getPosition(state.blocks, currentPosition);

    // Just finished a block
    if (blockPosition == state.blocks[blockIndex].text.length) {
      if (state.blocks[blockIndex].type === Const.TYPE_GET_SPECIAL) {
        specialsLeft++;
      }
    }

    return {
      name: state.name,
      keys: state.keys,
      level: state.level,
      levelLength: state.levelLength,
      blocks: state.blocks,
      consecutiveSpecialHits: consecutiveSpecialHits,
      specialsLeft: specialsLeft,
      blockIndex: blockIndex,
      blockPosition: blockPosition,
      step: currentPosition,
      score: state.score + stepScore,
      progress: currentPosition / state.levelLength * 100
    };
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
const UP = 'UP';
const DOWN = 'DOWN';
const LEFT = 'LEFT';
const RIGHT = 'RIGHT';

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

function parseBlock(rawBlock) {
  switch (rawBlock[0]) {
    case "!":
      return {type: Const.TYPE_GET_SPECIAL, text: rawBlock.slice(1)};
    default:
      return {type: Const.TYPE_NORMAL, text: rawBlock};
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
              .flatMap(c => {
                return Bacon.combineTemplate({
                  hash: hash,
                  countdown: c,
                  timeLeft: c == "" ? timer(Const.GAME_TIME, Const.TIME_DELAY) : Const.GAME_TIME
                });
              });
        default:
          return Bacon.constant({hash: hash});
      }
    })
    .toProperty();

let gameIsActiveP = activePageP.map(page => page.hash === "#game" && page.countdown === "");

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
        keys: {LEFT: 'a', RIGHT: 'd', DOWN: "s", UP: "w"},
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
        keys: {LEFT: 'h', RIGHT: 'k', DOWN: "j", UP: "u"},
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
      let normalE = sequenceStream(player.keys, [DOWN]);
      let specialE = registerKey(player.keys.UP);
      return Bacon
          .mergeAll(specialE.map(Const.KEY_SPECIAL), normalE.map(Const.KEY_NORMAL))
          .filter(gameIsActiveP)
          .scan(player, nextStep);
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

Bacon.onValues(pageComponentE, playerStatesP, playerSettingsP, (template, states, names) => React.render(template(states, names), document.getElementById("main")));

function playersProgressedToEnd(states) {
  return states.reduce((end, s) => s.progress === 100 && end, true);
}

gameIsActiveP
    .and(activePageP.map(p => p.timeLeft == 0).or(playerStatesP.map(playersProgressedToEnd).toProperty(false)))
    .filter(s => s === true)
    .onValue(() => window.location.hash = "#score");
