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
        this.props.events.takeWhile((step) => step <= level.length).onValue((steps) => {
            this.setState({step: steps});
        });
        return {
            level: level,
            step: 0
        };
    },
    render() {
        var level = this.state.level;
        level = level.replace(/<</g, '<span style="color: blue;">');
        level = level.replace(/>>/g, '</span>');
        var completed = level.substr(0, this.state.step);
        var cursor = level.substr(this.state.step, 1);
        var left = level.substr(this.state.step + 1);
        var length = level.length;
        var progress = this.state.step / length * 100;
        return (
            <div>
                <h2>{this.props.name}</h2>
                <pre>
                    <span style={{color: "red"}}>{completed}</span><span style={{backgroundColor: "lime"}}>{cursor}</span><span dangerouslySetInnerHTML={{__html: left}} />
                </pre>
                <h3>Progress: {progress.toFixed(2)}%</h3>
            </div>
        );
    }
});

var players = [
    {
        name: "Player 1",
        trigger: "s",
        input: new Bacon.Bus()
    },
    {
        name: "Player 2",
        trigger: "l",

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
    listener.simple_combo(player.trigger, () => {
        player.input.push(++step);
    });
});
