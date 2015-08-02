KEY_NORMAL = 0;
KEY_SPECIAL = 1;

var CodeBox = React.createClass({
    getInitialState() {
        var level =
           "var <<listener>> = new window.keypress.Listener();\n" +
           "players.forEach(<<player => {\n" +
           "    var step = 0;\n" +
           "    listener.simple_combo(player.trigger, () => {\n" +
           "        player.input.push(++step);\n" +
           "    });\n" +
           "}>>);";
        this.props.events.takeWhile((keyEvent) => keyEvent.step <= level.length).onValue((keyEvent) => {
            var specialsLeft = keyEvent.keyType == KEY_SPECIAL ? Math.max(0, this.state.specialsLeft - 1) : this.state.specialsLeft;
            this.setState({step: keyEvent.step, specialsLeft: specialsLeft});
        });
        return {
            level: level,
            step: 0,
            specialsLeft: 3
        };
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
    },
    render() {
        var level = this.state.level;
        var blocks = level.split(/<<|>>/);
        var step = this.state.step;
        var [blockIndex, blockPosition] = this.getPosition(blocks, step);
        var elements = blocks.map((block, index) => {
            var baseColor = index % 2 == 0 ? "black" : "blue";
            var key = "block_"+index;
            if (index == blockIndex) {
                var completed = block.substr(0, blockPosition);
                var cursor = block.substr(blockPosition, 1);
                var left = block.substr(blockPosition + 1);
                return <span key={key} style={{color: baseColor}}><span style={{color: "red"}}>{completed}</span><span style={{backgroundColor: "lime"}}>{cursor}</span><span dangerouslySetInnerHTML={{__html: left}} /></span>;
            } else if (index < blockIndex) {
                return <span key={key} style={{color: "red"}}>{block}</span>
            } else {
                return <span key={key} style={{color: baseColor}}>{block}</span>;
            }
        });
        var progress = step / level.length * 100;
        return (
            <div>
                <h2>{this.props.name}</h2>
                <pre>
                    {elements}
                </pre>
                <div className="row">
                    <div className="col-xs-3">Progress: {progress.toFixed(2)}%</div>
                    <div className="col-xs-3">Score: {step * 1024}</div>
                    <div className="col-xs-3">Specials: {this.state.specialsLeft}</div>
                </div>
            </div>
        );
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
]

React.render(
    <div className="row">
        {players.map((p, i) => {
            return <div key={"player_" + i} className="col-xs-5">
                <CodeBox name={p.name} events={p.input} />
            </div>
        })}
    </div>, document.getElementById("main"));


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
