KEY_NORMAL = 0;
KEY_SPECIAL = 1;

var LEVEL =
    "var <<listener>> = new window.keypress.Listener();\n" +
    "players.forEach(<<player => {\n" +
    "    var step = 0;\n" +
    "    listener.simple_combo(player.trigger, () => {\n" +
    "        player.input.push(++step);\n" +
    "    });\n" +
    "}>>);";
var BLOCKS = LEVEL.split(/<<|>>/);

var Game = React.createClass({
  propTypes: {
    state: React.PropTypes.object.isRequired
  },
  statics: {
    indentSkip(block, position) {
      var match = block.substr(position + 1).match(/^(\n|\s{2,})[^\s]/);
      return match != null ? match[1].length : 0;
    },
    jump(step, blocks, index, position) {
      var block = blocks[index];
      if (index % 2 == 0 && position == block.length) {
        return step + blocks[index + 1].length;
      }
      return step;
    },
    step(position) {
      return position + 1;
    },
    getPosition(blocks, step) {
      var blockIndex = -1;
      var next = step;
      var remainder;
      do {
        remainder = next;
        blockIndex++;
        next -= blocks[blockIndex].length;
      } while (next > 0);
      return [blockIndex, remainder];
    }
  },
  render() {
    var {progress, step, blockPosition, name, blockIndex, specialsLeft} = this.props.state;
    return (
        <div className="screen-content">
          <div className="header">
            <h2>{name}</h2>
          </div>
          <CodeBox blockPosition={blockPosition}
                   blockIndex={blockIndex}
                   blocks={BLOCKS}/>

          <div className="footer">
            <div className="col progress">{progress.toFixed(0)}% <span
                className="title">Progress</span></div>
            <div className="col score">{step * 1024}<span className="title">Score</span>
            </div>
            <div className="col specials">{specialsLeft}<span
                className="title">Specials</span></div>
          </div>
        </div>
    );
  }
});

var CodeBox = React.createClass({
  propTypes: {
    blockPosition: React.PropTypes.number.isRequired,
    blockIndex: React.PropTypes.number.isRequired,
    blocks: React.PropTypes.array.isRequired
  },
  componentWillUpdate() {
    var node = this.getDOMNode()
    var cursor = React.findDOMNode(this.refs.cursor)
    this.x = Math.max(0, cursor.offsetLeft - node.offsetLeft - node.clientWidth + 150)
    this.y = Math.max(0, cursor.offsetTop - node.offsetTop - node.clientHeight + 150)
  },
  componentDidUpdate() {
    this.getDOMNode().scrollLeft = this.x
    this.getDOMNode().scrollTop = this.y
  },
  render() {
    var [blockPosition, blockIndex, blocks] = [this.props.blockPosition, this.props.blockIndex, this.props.blocks];
    var elements = blocks.map((block, index) => {
      var baseColor = index % 2 == 0 ? "black" : "blue";
      var key = "block_" + index;
      if (index == blockIndex) {
        var completed = block.substr(0, blockPosition);
        var cursor = block.substr(blockPosition, 1);
        var left = block.substr(blockPosition + 1);
        return <span key={key} style={{color: baseColor}}><span
            style={{color: "red"}}>{completed}</span><span
            style={{backgroundColor: "lime"}}
            ref="cursor">{cursor}</span><span
            dangerouslySetInnerHTML={{__html: left}}/></span>;
      } else if (index < blockIndex) {
        return <span key={key} style={{color: "red"}}>{block}</span>
      } else {
        // Previous block finished, cursor jumps to current block
        if (blockIndex == index - 1 && blockPosition == blocks[blockIndex].length) {
          return <span key={key} style={{color: baseColor}}><span
              style={{backgroundColor: "lime"}}
              ref="cursor">{block.substr(0, 1)}</span><span
              dangerouslySetInnerHTML={{__html: block.substr(1)}}/></span>;
        } else {
          return <span key={key} style={{color: baseColor}}>{block}</span>;
        }
      }
    });
    return (
        <pre className="code">
                {elements}
            </pre>
    )

  }
});

var JumpMenu = React.createClass({
  render() {
    return (
      <nav>
        <ul>
          <li>Jump</li>
          <li>:</li>
          <li><a href="#menu">Menu</a></li>
          <li>&gt;</li>
          <li><a href="#howto">How to play</a></li>
          <li>&gt;</li>
          <li><a href="#game">Start game</a></li>
          <li>&gt;</li>
          <li><a href="#score">Score</a></li>
        </ul>
      </nav>
    )
  }
});

var GamePage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div>
          <div className="game">
            <JumpMenu/>
            {this.props.states.map((p, index) => {
              return <div key={"player_" + index} className="player-screen">
                <Game state={p}/>
              </div>
            })}
          </div>
        </div>
    )
  }
});

var MenuPage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div className="menu">
          <JumpMenu/>
          <h1>Game Title</h1>
          <a href="#howto">How to play</a> | <a href="#game">Start game</a>
        </div>
    )
  }
});

var HowtoPage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div>
          <div className="howto">
            <JumpMenu/>
            <h1>How To Play</h1>
            <p>Push the buttons</p>
            <a href="#game">Start game</a>
          </div>
        </div>
    )
  }
});

var ScorePage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired
  },
  render() {
    return (
        <div className="score">
          <JumpMenu/>
          <h1>Score</h1>
          <ul>
            {this.props.states.map((s, index) => <li key={index}>{s.score}</li>)}
          </ul>
          <a href="#menu">Main menu</a>
        </div>
    )
  }
});

function nextStep(propertyVal, streamVal) {
  var currentPosition = streamVal.keyType == KEY_SPECIAL
      ? ((propertyVal.specialsLeft > 0) ? Game.jump(propertyVal.step, BLOCKS, propertyVal.blockIndex, propertyVal.blockPosition) : propertyVal.step)
      : Game.step(propertyVal.step) + Game.indentSkip(BLOCKS[propertyVal.blockIndex], propertyVal.blockPosition);
  var [blockIndex, blockPosition] = Game.getPosition(BLOCKS, currentPosition);
  var specialsLeft = streamVal.keyType == KEY_SPECIAL ? Math.max(0, propertyVal.specialsLeft - 1) : propertyVal.specialsLeft;

  return {
    name: propertyVal.name,
    specialsLeft: specialsLeft,
    blockIndex: blockIndex,
    blockPosition: blockPosition,
    step: currentPosition,
    score: currentPosition * 1024,
    progress: currentPosition / LEVEL.length * 100
  };
}

var listener = new window.keypress.Listener();

function hookInputs(input, trigger, special) {
  var step = 0;

  var signalInput = function(inputType) {
    var key = inputType === KEY_NORMAL ? trigger : special;
    listener.simple_combo(key, () => {
      step = inputType === KEY_NORMAL ? step + 1 : step;
      input.push({step: step, keyType: inputType});
    });
  };

  signalInput(KEY_NORMAL);
  signalInput(KEY_SPECIAL);
}

var players = [
  (f) => {
    var input = new Bacon.Bus();
    hookInputs(input, "s", "w");
    return input.scan({
      name: "Player 1",
      specialsLeft: 3,
      score: 0,
      progress: 0,
      blockIndex: 0,
      blockPosition: 0,
      step: 0
    }, f);
  }
  ,
  (f) => {
    var input = new Bacon.Bus();
    hookInputs(input, "l", "o");
    return input.scan({
      name: "Player 2",
      specialsLeft: 3,
      score: 0,
      progress: 0,
      blockIndex: 0,
      blockPosition: 0,
      step: 0
    }, f);
  }
].map(f => f(nextStep));

var statesP = Bacon.combineAsArray(players[0], players[1]);

var templateE = Bacon.fromEvent(window, "hashchange")
    .map(e => {
      var parts = e.newURL.split("#");
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

Bacon.onValues(templateE, statesP, (template, states) => React.render(template(states), document.getElementById("main")));
