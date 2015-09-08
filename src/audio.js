import React from "react";

let Audio = React.createClass({
  propTypes: {
    file: React.PropTypes.string.isRequired
  },
  render() {
    return (
        <audio id={"audio-" + this.props.file} crossOrigin="anonymous">
          <source src={"audio/" + this.props.file} type="audio/wav"/>
        </audio>
    );
  }
});

export let loadAudioContext = (...files) => {
  React.render(<div>{files.map((f, index) => <Audio key={index} file={f}/>)}</div>,
      document.getElementById("audio-loader"));
  let context = new (window.AudioContext || window.webkitAudioContext)();
  return (id) => {
    let audio = document.getElementById("audio-" + id);
    audio.volume = 1.0;
    context.createMediaElementSource(audio).connect(context.destination);
    return () => audio.play();
  }
};
