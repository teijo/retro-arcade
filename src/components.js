"use strict";

import * as Const from "./const"

function disableClassOnAnimationEnd(ref, className) {
  let node = React.findDOMNode(ref);
  Bacon
      .fromEvent(node, "animationend")
      .onValue(() => node.classList.toggle(className, false));
}

let AnimatedCounter = React.createClass({
  propTypes: {
    value: React.PropTypes.number.isRequired
  },
  componentDidMount() {
    disableClassOnAnimationEnd(this.refs.cursor, "bump");
  },
  shouldComponentUpdate(nextProps) {
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
    state: React.PropTypes.object.isRequired,
    settings: React.PropTypes.object.isRequired
  },
  render() {
    let {consecutiveSpecialHits, progress, score, blockPosition,
        blockIndex, specialsLeft, blocks} = this.props.state;
    return (
        <div className="player-screen">
          <div className="header">
            <h2>{this.props.settings.name}</h2>
          </div>
          <CodeBox blockPosition={blockPosition}
                   blockIndex={blockIndex}
                   blocks={blocks}/>

          <div className="footer">
            <div className="col">
              <AnimatedCounter value={Math.round(progress)}/>
              <span className="title">Progress</span>
            </div>
            <div className="col">
              <AnimatedCounter value={score}/>
              <span className="title">Score</span>
            </div>
            <div className="col">
              <AnimatedCounter value={consecutiveSpecialHits}/>
              <span className="title">Combo</span>
            </div>
            <div className="col">
              <AnimatedCounter value={specialsLeft}/>
              <span className="title">Specials</span>
            </div>
          </div>
        </div>
    );
  }
});

let PassedBlock = React.createClass({
  propTypes: {
    content: React.PropTypes.string.isRequired,
    animate: React.PropTypes.bool.isRequired
  },
  componentDidMount() {
    disableClassOnAnimationEnd(this.refs.block, "finish");
  },
  render() {
    let classes = classNames({finish: this.props.animate});
    return <span ref="block" style={{color: "red"}} className={classes}>{this.props.content}</span>;
  }
});

export let ActiveBlock = React.createClass({
  propTypes: {
    content: React.PropTypes.string.isRequired,
    color: React.PropTypes.string.isRequired,
    position: React.PropTypes.number.isRequired,
    onInput: React.PropTypes.func.isRequired
  },
  componentDidUpdate() {
    let cursor = React.findDOMNode(this.refs.cursor);
    if (cursor === null) {
      return;
    }
    this.props.onInput(cursor.offsetLeft, cursor.offsetTop);
  },
  render() {
    let {content, position, color} = this.props;
    let completed = content.substr(0, position);
    let cursor = content.substr(position, 1);
    let left = content.substr(position + 1);
    return (
        <span style={{color: color}}>
          <PassedBlock animate={false} content={completed}/>
          <span style={{backgroundColor: "lime"}} ref="cursor">{cursor}</span>
          <span dangerouslySetInnerHTML={{__html: left}}/>
        </span>
    );
  }
});

let UpcomingBlock = React.createClass({
  propTypes: {
    content: React.PropTypes.string.isRequired,
    color: React.PropTypes.string.isRequired
  },
  render() {
    return <span style={{color: this.props.color}}>{this.props.content}</span>;
  }
});

export let UpcomingNextBlock = React.createClass({
  propTypes: {
    content: React.PropTypes.string.isRequired,
    color: React.PropTypes.string.isRequired
  },
  render() {
    return (
        <span style={{color: this.props.color}}>
          <span style={{backgroundColor: "lime"}} ref="cursor">{this.props.content.substr(0, 1)}</span>
          <span dangerouslySetInnerHTML={{__html: this.props.content.substr(1)}}/>
        </span>
    );
  }
});

let CodeBox = React.createClass({
  propTypes: {
    blockPosition: React.PropTypes.number.isRequired,
    blockIndex: React.PropTypes.number.isRequired,
    blocks: React.PropTypes.array.isRequired
  },
  onInput(cursorOffsetLeft, cursorOffsetTop) {
    let node = this.getDOMNode();
    let {offsetLeft, offsetTop, clientWidth, clientHeight} = node;
    node.scrollLeft = Math.max(0, cursorOffsetLeft - offsetLeft - clientWidth + 150);
    node.scrollTop = Math.max(0, cursorOffsetTop - offsetTop - clientHeight + 150);
  },
  render() {
    let {blockPosition, blockIndex, blocks} = this.props;
    let elements = blocks.map((block, index) => {
      let baseColor = block.type === Const.TYPE_GET_SPECIAL ? "green" : (index % 2 == 0 ? "black" : "blue");
      let key = "block_" + index;
      if (index == blockIndex && blockPosition < blocks[blockIndex].text.length) {
        return <ActiveBlock key={key} onInput={this.onInput} content={block.text} position={blockPosition} color={baseColor}/>
      } else if (index <= blockIndex) {
        return <PassedBlock animate={true} content={block.text} key={key}/>
      } else {
        // Previous block finished, cursor jumps to current block
        if (blockIndex == index - 1 && blockPosition == blocks[blockIndex].text.length) {
          return <UpcomingNextBlock key={key} color={baseColor} content={block.text} />;
        } else {
          return <UpcomingBlock key={key} color={baseColor} content={block.text} />;
        }
      }
    });
    return <pre className="code">{elements}</pre>;
  }
});

let Countdown = React.createClass({
  propTypes: {
    value: React.PropTypes.string.isRequired
  },
  render() {
    return <span className="countdown" ref="cursor">{this.props.value}</span>;
  }
});

let GameTime = React.createClass({
  propTypes: {
    value: React.PropTypes.number.isRequired
  },
  render() {
    return <span className="timeLeft">{this.props.value}</span>;
  }
});

export let GamePage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired,
    settings: React.PropTypes.array.isRequired,
    page: React.PropTypes.object.isRequired
  },
  render() {
    return (
        <div>
          <Countdown value={this.props.page.countdown}/>
          <GameTime value={this.props.page.timeLeft}/>
          <div className="game">
            {this.props.states.map((p, index) => <Game key={"player_" + index} settings={this.props.settings[index]} state={p}/>)}
          </div>
        </div>
    );
  }
});

let PlayerName = React.createClass({
  propTypes: {
    onchange: React.PropTypes.func.isRequired,
    placeholder: React.PropTypes.string.isRequired
  },
  componentDidMount() {
    Bacon
        .fromEvent(React.findDOMNode(this.refs.input), "keyup")
        .map(e => e.target.value)
        .onValue(this.props.onchange);
  },
  render() {
    return <input placeholder={this.props.placeholder} ref="input" type="text"/>;
  }
});

export let MenuPage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired,
    settings: React.PropTypes.array.isRequired,
    outputs: React.PropTypes.object.isRequired
  },
  render() {
    return (
        <div className="menu">
          <h1>Game Title</h1>
          <div>
            <PlayerName placeholder={this.props.settings[0].name} onchange={this.props.outputs.player1Name}/>
            <PlayerName placeholder={this.props.settings[1].name} onchange={this.props.outputs.player2Name}/>
          </div>
          <ul>
            <li><a href="#game">Start game &gt;</a></li>
            <li><a href="#howto">How to play &gt;</a></li>
          </ul>
        </div>
    );
  }
});

export let HowtoPage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired,
    settings: React.PropTypes.array.isRequired
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
              {this.props.states.map((s, index) => <li key={index}>{this.props.settings[index].name} trigger: {s.keys.DOWN}, special {s.keys.UP}</li>)}
            </ul>
            <a href="#menu">&lt; Back to main menu</a>
          </div>
        </div>
    );
  }
});

export let ScorePage = React.createClass({
  propTypes: {
    states: React.PropTypes.array.isRequired,
    settings: React.PropTypes.array.isRequired
  },
  render() {
    let maxScore = this.props.states.reduce((max, state) => Math.max(max, state.score), 0);
    return (
        <div className="score">
          <h1>Game over</h1>
          <ul>
            {this.props.states.map((s, index) => {
                  let classes = classNames('resultScore', {winner: s.score === maxScore});
                  return (
                      <li key={index}>
                        <h2>{this.props.settings[index].name}</h2>
                        <p className={classes}>{s.score}</p>
                      </li>
                  );
                }
            )}
          </ul>
          <a href="#menu">&lt; Back to main menu</a>
        </div>
    );
  }
});

