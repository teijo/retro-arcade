var CodeBox = React.createClass({
    getInitialState() {
        var level = "Text that gets painted\n" +
            "when you press 's' on\n" +
            "keyboard.";
        this.props.events.takeWhile((step) => step <= level.length).onValue((steps) => {
            this.setState({step: steps});
        });
        return {
            level: level,
            step: 0
        };
    },
    render() {
        var completed = this.state.level.substr(0, this.state.step);
        var cursor = this.state.level.substr(this.state.step, 1);
        var left = this.state.level.substr(this.state.step + 1);
        return (
            <div>
                <h2>{this.props.name}</h2>
                <pre>
                    <span style={{color: "red"}}>{completed}</span><span style={{backgroundColor: "lime"}}>{cursor}</span>{left}
                </pre>
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
