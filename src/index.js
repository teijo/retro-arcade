KEY_NORMAL = 0;
KEY_SPECIAL = 1;

var Game = React.createClass({
    propTypes: {
        events: React.PropTypes.object.isRequired,
        name: React.PropTypes.string.isRequired
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
            } while(next > 0);
            return [blockIndex, remainder];
        }
    },
    getInitialState() {
        var level =
           "var <<listener>> = new window.keypress.Listener();\n" +
           "players.forEach(<<player => {\n" +
           "    var step = 0;\n" +
           "    listener.simple_combo(player.trigger, () => {\n" +
           "        player.input.push(++step);\n" +
           "    });\n" +
           "}>>);";
        var blocks = level.split(/<<|>>/);

        this.props.events.takeWhile((keyEvent) => keyEvent.step <= level.length).onValue((keyEvent) => {
            var currentPosition = keyEvent.keyType == KEY_SPECIAL
                ? ((this.state.specialsLeft > 0) ? Game.jump(this.state.step, blocks, this.state.blockIndex, this.state.blockPosition) : this.state.step)
                : Game.step(this.state.step) + Game.indentSkip(blocks[this.state.blockIndex], this.state.blockPosition);
            var [blockIndex, blockPosition] = Game.getPosition(blocks, currentPosition);
            var specialsLeft = keyEvent.keyType == KEY_SPECIAL ? Math.max(0, this.state.specialsLeft - 1) : this.state.specialsLeft;
            this.setState({
                step: currentPosition,
                specialsLeft: specialsLeft,
                blockIndex: blockIndex,
                blockPosition: blockPosition
            });
        });
        return {
            level: level,
            blocks: blocks,
            blockIndex: 0,
            blockPosition: 0,
            step: 0,
            specialsLeft: 3
        };
    },
    render() {
        var [step, level] = [this.state.step, this.state.level];
        var progress = step / level.length * 100;
        return (
            <div className="screen-content">
                <div className="header">
                    <h2>{this.props.name}</h2>
                </div>
                <CodeBox blockPosition={this.state.blockPosition} blockIndex={this.state.blockIndex} blocks={this.state.blocks}/>
                <div className="footer">
                    <div className="col progress">{progress.toFixed(0)}% <span className="title">Progress</span></div>
                    <div className="col score">{step * 1024}<span className="title">Score</span></div>
                    <div className="col specials">{this.state.specialsLeft}<span className="title">Specials</span></div>
                </div>
            </div>
        );
    }
});

var CodeBox = React.createClass({
    propTypes: {
        blockPosition: React.PropTypes.number.isRequired,
        blockIndex: React.PropTypes.number.isRequired,
        blocks:React.PropTypes.array.isRequired
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
            var key = "block_"+index;
            if (index == blockIndex) {
                var completed = block.substr(0, blockPosition);
                var cursor = block.substr(blockPosition, 1);
                var left = block.substr(blockPosition + 1);
                return <span key={key} style={{color: baseColor}}><span style={{color: "red"}}>{completed}</span><span style={{backgroundColor: "lime"}} ref="cursor">{cursor}</span><span dangerouslySetInnerHTML={{__html: left}} /></span>;
            } else if (index < blockIndex) {
                return <span key={key} style={{color: "red"}}>{block}</span>
            } else {
                // Previous block finished, cursor jumps to current block
                if (blockIndex == index - 1 && blockPosition == blocks[blockIndex].length) {
                    return <span key={key} style={{color: baseColor}}><span style={{backgroundColor: "lime"}} ref="cursor">{block.substr(0, 1)}</span><span dangerouslySetInnerHTML={{__html: block.substr(1)}} /></span>;
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

var GamePage = React.createClass({
    propTypes: {
        players: React.PropTypes.array.isRequired
    },
    render() {
        return (
            <div className="game">
                {this.props.players.map((p, i) => {
                    return <div key={"player_" + i} className="player-screen">
                        <Game name={p.name} events={p.input} />
                    </div>
                })}
            </div>
        )
    }
});

var players = [
    {
        name: "Player 1",
        trigger: "s",
        special: "w",
        input: new Bacon.Bus()
    },
    {
        name: "Player 2",
        trigger: "l",
        special: "o",
        input: new Bacon.Bus()
    }
];

React.render(<GamePage players={players} />, document.getElementById("main"));

var listener = new window.keypress.Listener();

players.forEach(player => {
    var step = 0;

    var signalInput = function(player, inputType) {
        var key = inputType === KEY_NORMAL ? player.trigger : player.special;
        listener.simple_combo(key, () => {
            step = inputType === KEY_NORMAL ? step + 1 : step;
            player.input.push({step: step, keyType: inputType});
        });
    };

    signalInput(player, KEY_NORMAL);
    signalInput(player, KEY_SPECIAL);
});
