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
    render() {
        var level = this.state.level;
        level = level.replace(/<</g, '<span style="color: blue;">');
        level = level.replace(/>>/g, '</span>');
        var step = this.state.step;
        var completed = level.substr(0, step);
        var cursor = level.substr(step, 1);
        var left = level.substr(step + 1);
        var length = level.length;
        var progress = step / length * 100;
        return (
            <div>
                <h2>{this.props.name}</h2>
                <pre>
                    <span style={{color: "red"}}>{completed}</span><span style={{backgroundColor: "lime"}}>{cursor}</span><span dangerouslySetInnerHTML={{__html: left}} />
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
        {players.map(p => {
            return <div className="col-xs-5">
                <CodeBox name={p.name} events={p.input} />
            </div>
        })}
    </div>, document.getElementById("main"));


var listener = new window.keypress.Listener();

players.forEach(player => {
    var step = 0;

    var signalInput = (player, inputType) => {
        listener.register_combo({
            keys: inputType === KEY_NORMAL ? player.trigger : player.special,
            on_keyup: () => {
                step = inputType === KEY_NORMAL ? step + 1 : step;
                player.input.push({step: step, keyType: inputType});
            }
        })
    };

    signalInput(player, KEY_NORMAL);
    signalInput(player, KEY_SPECIAL);
});
