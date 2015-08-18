"use strict";

const KEY_NORMAL = 0;
const KEY_SPECIAL = 1;

let AnimatedCounter = React.createClass({
  propTypes: {
    value: React.PropTypes.number.isRequired
  },
  componentDidMount() {
    let node = React.findDOMNode(this.refs.cursor);
    Bacon
        .fromEvent(node, "animationend")
        .onValue(() => node.classList.toggle("bump", false));
  },
  shouldComponentUpdate(nextProps, _) {
    // Animate (update component) only when value changes
    return this.props.value !== nextProps.value;
  },
  componentWillUpdate() {
    React.findDOMNode(this.refs.cursor).classList.toggle("bump", true);
  },
  render() {
    return (
        <span className="counter">
          <span ref="cursor">{this.props.value}</span>
        </span>
    );
  }
});

let Game = React.createClass({
  propTypes: {
    state: React.PropTypes.object.isRequired
  },
  render() {
    let {consecutiveSpecialHits, progress, score, blockPosition, name,
        blockIndex, specialsLeft, blocks} = this.props.state;
    return (
        <div className="player-screen">
          <div className="header">
            <h2>{name}</h2>
          </div>
          <CodeBox blockPosition={blockPosition}
                   blockIndex={blockIndex}
                   blocks={blocks}/>

          <div className="footer">
            <div className="col progress">
              <AnimatedCounter value={Math.round(progress)}/>
              <span className="title">Progress</span>
            </div>
            <div className="col score">
              <AnimatedCounter value={score}/>
              <span className="title">Score</span>
            </div>
            <div className="col">
              <AnimatedCounter value={consecutiveSpecialHits}/>
              <span className="title">Combo</span>
            </div>
            <div className="col specials">
              <AnimatedCounter value={specialsLeft}/>
              <span className="title">Specials</span>
            </div>
          </div>
        </div>
    );
  }
});

let CodeBox = React.createClass({
  propTypes: {
    blockPosition: React.PropTypes.number.isRequired,
    blockIndex: React.PropTypes.number.isRequired,
    blocks: React.PropTypes.array.isRequired
  },
  componentWillUpdate() {
    let node = this.getDOMNode();
    let cursor = React.findDOMNode(this.refs.cursor);
    if (cursor === null) {
      return;
    }
    this.x = Math.max(0, cursor.offsetLeft - node.offsetLeft - node.clientWidth + 150);
    this.y = Math.max(0, cursor.offsetTop - node.offsetTop - node.clientHeight + 150);
  },
  componentDidUpdate() {
    this.getDOMNode().scrollLeft = this.x;
    this.getDOMNode().scrollTop = this.y;
  },
  render() {
    let {blockPosition, blockIndex, blocks} = this.props;
    let elements = blocks.map((block, index) => {
      let baseColor = index % 2 == 0 ? "black" : "blue";
      let key = "block_" + index;
      if (index == blockIndex) {
        let completed = block.substr(0, blockPosition);
        let cursor = block.substr(blockPosition, 1);
        let left = block.substr(blockPosition + 1);
        return (
            <span key={key} style={{color: baseColor}}>
              <span style={{color: "red"}}>{completed}</span>
              <span style={{backgroundColor: "lime"}} ref="cursor">{cursor}</span>
              <span dangerouslySetInnerHTML={{__html: left}}/>
            </span>
        );
      } else if (index < blockIndex) {
        return <span key={key} style={{color: "red"}}>{block}</span>
      } else {
        // Previous block finished, cursor jumps to current block
        if (blockIndex == index - 1 && blockPosition == blocks[blockIndex].length) {
          return (
              <span key={key} style={{color: baseColor}}>
                <span style={{backgroundColor: "lime"}} ref="cursor">{block.substr(0, 1)}</span>
                <span dangerouslySetInnerHTML={{__html: block.substr(1)}}/>
              </span>
          );
        } else {
          return <span key={key} style={{color: baseColor}}>{block}</span>;
        }
      }
    });
    return <pre className="code">{elements}</pre>;
  }
});

let GamePage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div>
          <div className="game">
            {this.props.states.map((p, index) => <Game key={"player_" + index} state={p}/>)}
          </div>
        </div>
    );
  }
});

let MenuPage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div className="menu">
          <h1>Game Title</h1>
          <a href="#howto">How to play</a> | <a href="#game">Start game</a>
        </div>
    );
  }
});

let HowtoPage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div>
          <div className="howto">
            <h1>How To Play</h1>
            <ol>
              <li>Press &quot;trigger&quot; to advance</li>
              <li>Press &quot;special&quot; when entering highlighted block</li>
              <li>Aim for speed and accuracy</li>
              <li>Profit</li>
            </ol>
            <h2>Player keys</h2>
            <ul>
              {this.props.states.map((s, index) => <li key={index}>{s.name}, trigger: {s.keys.trigger}, special {s.keys.special}</li>)}
            </ul>
            <a href="#game">Start game</a>
          </div>
        </div>
    );
  }
});

let ScorePage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div className="score">
          <h1>Score</h1>
          <ul>
            {this.props.states.map((s, index) => <li key={index}>{s.name} - {s.score}</li>)}
          </ul>
          <a href="#menu">Main menu</a>
        </div>
    );
  }
});

let nextStep = (function() {
  const STEP_MULTIPLIER = 8;
  const SPECIAL_STEP_MULTIPLIER = 32;

  let Movement = {
    indentSkip(block, position) {
      let match = block.substr(position + 1).match(/^(\n|\s{2,})[^\s]/);
      return match != null ? match[1].length : 0;
    },
    jump(step, blocks, index, position) {
      let block = blocks[index];
      // Jump if _cursor_ is at the first character of special block
      // (actual position is last of previous block)
      if (index % 2 == 0 && position == block.length) {
        return [true, step + blocks[index + 1].length];
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
        next -= blocks[blockIndex].length;
      } while (next > 0);
      return [blockIndex, remainder];
    }
  };

  return (state, keyType) => {
    if (state.step == state.levelLength) {
      return state;
    }

    let currentPosition,
        stepScore = 0,
        consecutiveSpecialHits = state.consecutiveSpecialHits,
        specialsLeft = state.specialsLeft;

    if (keyType == KEY_SPECIAL) {
      let specialHit;
      if (state.specialsLeft > 0) {
        [specialHit, currentPosition] = Movement.jump(state.step, state.blocks, state.blockIndex, state.blockPosition);
      } else {
        [specialHit, currentPosition] = [false, state.step];
      }
      specialsLeft = Math.max(0, state.specialsLeft - 1);
      consecutiveSpecialHits = specialHit ? consecutiveSpecialHits + 1 : 0;
      stepScore = specialHit ? (currentPosition - state.step) * consecutiveSpecialHits * SPECIAL_STEP_MULTIPLIER : 0;
    } else if (keyType == KEY_NORMAL) {
      currentPosition = Movement.step(state.step) + Movement.indentSkip(state.blocks[state.blockIndex], state.blockPosition);
      stepScore = (currentPosition - state.step) * STEP_MULTIPLIER;
    } else {
      throw new Error("Invalid keyType: " + keyType)
    }

    let [blockIndex, blockPosition] = Movement.getPosition(state.blocks, currentPosition);

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

let listener = new window.keypress.Listener();

function registerInput(trigger, special) {
  let inputE = new Bacon.Bus();
  listener.simple_combo(trigger, () => inputE.push(KEY_NORMAL));
  listener.simple_combo(special, () => inputE.push(KEY_SPECIAL));
  return inputE;
}

function registerKey(key) {
  let inputE = new Bacon.Bus();
  listener.simple_combo(key, () => inputE.push(key));
  return inputE;
}

let LEVEL =
    "let <<listener>> = new window.keypress.Listener();\n" +
    "players.forEach(<<player => {\n" +
    "    let step = 0;\n" +
    "    listener.simple_combo(player.trigger, () => {\n" +
    "        player.input.push(++step);\n" +
    "    });\n" +
    "}>>);";
let BLOCKS = LEVEL.split(/<<|>>/);

let player1NameP = Bacon.constant("Player 1");
let player2NameP = Bacon.constant("Player 2");

let playerStatesP = Bacon
    .combineAsArray([
      {
        name: player1NameP,
        keys: {trigger: "s", special: "w"},
        level: LEVEL,
        levelLength: BLOCKS.join('').length,
        blocks: BLOCKS,
        specialsLeft: 3,
        consecutiveSpecialHits: 0,
        score: 0,
        progress: 0,
        blockIndex: 0,
        blockPosition: 0,
        step: 0
      }, {
        name: player2NameP,
        keys: {trigger: "j", special: "u"},
        level: LEVEL,
        levelLength: BLOCKS.join('').length,
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
    .sampledBy(Bacon.mergeAll(Bacon.once(), registerKey("q")))
    .flatMap(players => Bacon.combineAsArray(players.map(player =>
        registerInput(player.keys.trigger, player.keys.special).scan(player, nextStep))));

let pageComponentE = Bacon.fromEvent(window, "hashchange")
    .map(e => {
      let parts = e.newURL.split("#");
      return (parts.length == 2) ? "#" + parts[1] : "#menu";
    })
    .toProperty(window.location.hash)
    .map(hash => {
      switch (hash) {
        case "#howto":
          return (states) => <HowtoPage states={states}/>;
        case "#game":
          return (states) => <GamePage states={states}/>;
        case "#score":
          return (states) => <ScorePage states={states}/>;
        default:
          return (states) => <MenuPage states={states}/>;
      }
    });

Bacon.onValues(pageComponentE, playerStatesP, (template, states) => React.render(template(states), document.getElementById("main")));
