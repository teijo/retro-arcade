var CodeBox = React.createClass({
    getInitialState() {
        this.props.events.onValue((steps) => {
            this.setState({step: steps});
        });
        return {
            level: "Text that gets painted\n" +
                   "when you press 's' on\n" +
                   "keyboard.",
            step: 0
        };
    },
    render() {
        var completed = this.state.level.substr(0, this.state.step);
        var left = this.state.level.substr(this.state.step);
        return (
            <pre>
                <span style={{color: "red"}}>{completed}</span>{left}
            </pre>
        );
    }
});

var step = 0;
var listener = new window.keypress.Listener();
var input = new Bacon.Bus();

React.render(<div><CodeBox events={input} /></div>, document.getElementById("main"));

listener.simple_combo("s", () => {
    input.push(++step);
});
