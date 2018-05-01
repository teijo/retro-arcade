"use strict";

import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import Bacon from "baconjs";
import classNames from "classnames";

import * as Const from "./const";

function disableClassOnAnimationEnd(ref, className) {
  const node = ReactDOM.findDOMNode(ref);
  Bacon
      .fromEvent(node, "animationend")
      .onValue(() => node.classList.toggle(className, false));
}

function typeToClassName(type) {
  switch(type) {
    case Const.TYPE_GET_SPECIAL:
      return "block-special-add";
    case Const.TYPE_BONUS:
      return "block-bonus";
    case Const.TYPE_NORMAL:
      return "block-normal";
    default:
      return "";
  }
}

class AnimatedCounter extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    disableClassOnAnimationEnd(this.refs.cursor, "bump");
  }
  shouldComponentUpdate(nextProps) {
    // Animate (update component) only when value changes
    return this.props.value !== nextProps.value;
  }
  componentWillUpdate() {
    ReactDOM.findDOMNode(this.refs.cursor).classList.toggle("bump", true);
  }
  render() {
    return (
        <span className="counter">
          <span ref="cursor">{this.props.value}</span>
        </span>
    );
  }
}

AnimatedCounter.proTypes = {
  value: PropTypes.any.isRequired
}; 

class Splatter extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    disableClassOnAnimationEnd(this.refs.splash, "splash");
  }
  shouldComponentUpdate(nextProps) {
    // Animate (update component) only when value changes
    return this.props.value !== nextProps.value;
  }
  componentWillUpdate() {
    ReactDOM.findDOMNode(this.refs.splash).classList.toggle("splash", true);
  }
  render() {
    const text = this.props.value == 0 ? "" : "PERFECT " + this.props.value + "X!";
    return (
        <div className="splatter-container">
          <span ref="splash" className="splatter">{text}</span>
        </div>
    );
  }
}

Splatter.propTypes = {
  value: PropTypes.number.isRequired
};

class ProgressBar extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    disableClassOnAnimationEnd(this.refs.bar, "flash");
  }
  componentWillUpdate() {
    ReactDOM.findDOMNode(this.refs.bar).classList.toggle("flash", true);
  }
  shouldComponentUpdate(nextProps) {
    // Animate (update component) only when value changes
    return this.props.value !== nextProps.value;
  }
  render() {
    return <div ref="bar" className="progress-bar" style={{width: this.props.value + "%"}}></div>;
  }
}

ProgressBar.propTypes =  {
  value: PropTypes.number.isRequired
};

class Game extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const {consecutiveSpecialHits, progress, score, blockPosition,
        blockIndex, specialsLeft, world, characterImg} = this.props.state;

    return (
        <div className="player-screen">
          <div className="header">
            <ProgressBar value={progress}/>
            <h2>{this.props.settings.name}</h2>
          </div>
          <CodeBox blockPosition={blockPosition}
                   blockIndex={blockIndex}
                   blocks={world.blocks}/>
          <Splatter value={consecutiveSpecialHits}/>
          <div className="footer">
            <div className="col">
              <AnimatedCounter value={parseFloat(score).toFixed(0)}/>
              <span className="title">Score</span>
            </div>
            <div className="col col-character">
              <img className="character" src={characterImg}/>
              <img className={consecutiveSpecialHits > 1 ? "flame visible" : "flame"} src={"assets/img/flame.gif"}/>
            </div>
            <div className="col">
              <AnimatedCounter value={Array(specialsLeft + 1).join(">")}/>
              <span className="title">Autocompletes</span>
            </div>
          </div>
        </div>
    );
  }
}

Game.propTypes = {
  state: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired
};

class PassedBlock extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    disableClassOnAnimationEnd(this.refs.block, "finish");
  }
  render() {
    const classes = classNames(typeToClassName(this.props.type), {finish: this.props.animate});
    return <span ref="block" style={{color: "red"}} className={classes}>{this.props.content}</span>;
  }
}

PassedBlock.propTypes = {
  content: PropTypes.string.isRequired,
  animate: PropTypes.bool.isRequired,
  type: PropTypes.any.isRequired
};

class ActiveBlock extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidUpdate() {
    const cursor = ReactDOM.findDOMNode(this.refs.cursor);
    if (cursor === null) {
      return;
    }
    this.props.onInput(cursor.offsetLeft, cursor.offsetTop);
  }
  render() {
    const {content, position} = this.props,
        completed = content.substr(0, position),
        cursor = content.substr(position, 1),
        left = content.substr(position + 1);
    return (
        <span className={typeToClassName(this.props.type)}>
          <PassedBlock animate={false} type={this.props.type} content={completed}/>
          <span style={{backgroundColor: "lime"}} ref="cursor">{cursor}</span>
          <span dangerouslySetInnerHTML={{__html: left}}/>
        </span>
    );
  }
}

ActiveBlock.propTypes = {
  content: PropTypes.string.isRequired,
  position: PropTypes.number.isRequired,
  onInput: PropTypes.func.isRequired,
  type: PropTypes.any.isRequired
};

class UpcomingBlock extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <span className={typeToClassName(this.props.type)}>{this.props.content}</span>;
  }
}

UpcomingBlock.propTypes = {
  content: PropTypes.string.isRequired,
  type: PropTypes.any.isRequired
};

class UpcomingNextBlock extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
        <span className={typeToClassName(this.props.type)}>
          <span style={{backgroundColor: "lime"}} ref="cursor">{this.props.content.substr(0, 1)}</span>
          <span dangerouslySetInnerHTML={{__html: this.props.content.substr(1)}}/>
        </span>
    );
  }
}

UpcomingNextBlock.propTypes = {
  content: PropTypes.string.isRequired,
  type: PropTypes.any.isRequired
};

class CodeBox extends React.Component {
  constructor(props) {
    super(props);
    this.onInput = this.onInput.bind(this);
  }
  onInput(cursorOffsetLeft, cursorOffsetTop) {
    const node = ReactDOM.findDOMNode(this);
    const {offsetLeft, offsetTop, clientWidth, clientHeight} = node;
    node.scrollLeft = Math.max(0, cursorOffsetLeft - offsetLeft - clientWidth + 50);
    node.scrollTop = Math.max(0, cursorOffsetTop - offsetTop - clientHeight + 150);
  }
  render() {
    const {blockPosition, blockIndex, blocks} = this.props;
    const elements = blocks.map((block, index) => {
      const key = "block_" + index;
      if (index == blockIndex && blockPosition < blocks[blockIndex].text.length) {
        return <ActiveBlock key={key} type={block.type} onInput={this.onInput} content={block.text} position={blockPosition}/>;
      } else if (index <= blockIndex) {
        return <PassedBlock animate={true} type={block.type} content={block.text} key={key}/>;
      } else {
        // Previous block finished, cursor jumps to current block
        if (blockIndex == index - 1 && blockPosition == blocks[blockIndex].text.length) {
          return <UpcomingNextBlock key={key} type={block.type} content={block.text} />;
        } else {
          return <UpcomingBlock key={key} type={block.type} content={block.text} />;
        }
      }
    });
    return <pre className="code">{elements}</pre>;
  }
}

CodeBox.propTypes = {
  blockPosition: PropTypes.number.isRequired,
  blockIndex: PropTypes.number.isRequired,
  blocks: PropTypes.array.isRequired
};

class Countdown extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <span className="countdown" ref="cursor">{this.props.value}</span>;
  }
}

Countdown.propTypes = {
  value: PropTypes.string.isRequired
};

class GameTime extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <div><span className="timeLeft">{this.props.value}</span><span className="logo-clock">Reaktor</span></div>;
  }
}

GameTime.propTypes = {
  value: PropTypes.number.isRequired
};

export class GamePage extends React.Component {
  constructor(props) {
    super(props);
  }
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
}

GamePage.propTypes = {
  states: PropTypes.array.isRequired,
  settings: PropTypes.array.isRequired,
  page: PropTypes.object.isRequired
};

class PlayerName extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    Bacon
        .fromEvent(ReactDOM.findDOMNode(this.refs.input), "keyup")
        .map(e => e.target.value)
        .onValue(this.props.onchange);
  }
  render() {
    return <input placeholder={this.props.placeholder} ref="input" type="text"/>;
  }
}

PlayerName.propTypes = {
  onchange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired
};

function getCredits() {
  Const.CREDITS.sort(() => Math.round(Math.random()) - 0.5);
  return Const.CREDITS;
}

class Credits extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      credits: getCredits(),
      interval: undefined
    };
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  componentDidMount() {
    this.interval = setInterval(() => this.setState({credits: getCredits()}), 3000);
  }

  render() {
    const credits = this.state.credits.join(", ");
    return <marquee>::: ARCANECODER ::: The realistic software development simulator ::: Presented by following Reaktorians in good old mutable order ::: {credits} ::: And yes, this is &lt;marquee&gt; in case you were wondering... embrace it while you can! :::</marquee>;
  }
}

export class MenuPage extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
        <div className="menu">
          <img className="logo" src="assets/img/logo.png" />
          <div className="characters">
            <img className="character" src={this.props.states[0].characterImg} />

            <img className="character" src={this.props.states[1].characterImg} />
          </div>
          <ul>
            {this.props.navigation.map((item, index) => {
              return (
                <li key={index}>
                  <a className={classNames({selected: item.selected})} href={item.link}>{item.label}</a>
                </li>
              );
            })}
          </ul>

          <div className="playerNames">
            <PlayerName placeholder={this.props.settings[0].name} onchange={this.props.outputs.player1Name}/>
            <PlayerName placeholder={this.props.settings[1].name} onchange={this.props.outputs.player2Name}/>
          </div>
          <Credits/>
        </div>
    );
  }
}

MenuPage.propTypes = {
  states: PropTypes.array.isRequired,
  settings: PropTypes.array.isRequired,
  outputs: PropTypes.object.isRequired,
  navigation: PropTypes.array.isRequired
};

export class WorldSelectPage extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
        <div className="worldSelect">
          <img className="logo" src="assets/img/logo.png" />
          <h1>Select world</h1>
          <ul>
            {this.props.navigation.map((item, index) => {
              return (
                  <li className={classNames({selected: item.selected})} key={index}>
                    <a href={item.link}>{item.label}</a>
                    <p>{item.description}</p>
                  </li>
              );
            })}
          </ul>
        </div>
    );
  }
}

WorldSelectPage.propTypes =  {
  navigation: PropTypes.array.isRequired
};

export class HowtoPage extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const [navigation] = this.props.navigation;
    return (
        <div className="howto">
          <h1>How To Play</h1>
          <ol>
            <li>Repeat &quot;LEFT&quot; and &quot;RIGHT&quot; to advance</li>
            <li>Press &quot;A&quot; to use AUTOCOMPLETE when entering <span className="block-bonus">keyword</span></li>
            <li>Aim for speed and accuracy</li>
            <li>Profit</li>
          </ol>
          <h2>Player keys</h2>
          <ul>
            {this.props.states.map((s, index) => <li key={index}>{this.props.settings[index].name} LEFT: {s.keys.LEFT}, RIGHT: {s.keys.RIGHT}, A: {s.keys.A}</li>)}
          </ul>
          <h2>Keywords</h2>
          <ul>
            <li><span className="block-bonus">BONUS</span> gives score multiplier only when autocompleted</li>
            <li><span className="block-special-add">AUTOCOMPLETE+1</span> gives one autocomplete command when passed</li>
          </ul>
          <a className={classNames({selected: navigation.selected})} href={navigation.link}>{navigation.label}</a>
        </div>
    );
  }
}

HowtoPage.propTypes =  {
  states: PropTypes.array.isRequired,
  settings: PropTypes.array.isRequired,
  navigation: PropTypes.array.isRequired
};

export class ScorePage extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const [navigation] = this.props.navigation;
    const maxScore = this.props.states.reduce((max, state) => Math.max(max, state.score), 0);
    return (
        <div className="score">
          <h1>Game over</h1>
          <ul>
            {this.props.states.map((s, index) => {
              const classes = classNames("resultScore", {winner: s.score === maxScore});
              return (
                  <li key={index}>
                    <h2>{this.props.settings[index].name}</h2>
                    <p className={classes}>{parseFloat(s.score).toFixed(0)}</p>
                  </li>
              );
            }
            )}
          </ul>
          <a className={classNames({selected: navigation.selected})} href={navigation.link}>{navigation.label}</a>
        </div>
    );
  }
}

ScorePage.propTypes =  {
  states: PropTypes.array.isRequired,
  settings: PropTypes.array.isRequired,
  navigation: PropTypes.array.isRequired
};
