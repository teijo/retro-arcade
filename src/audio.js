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
  // Load all files with <audio> tag
  React.render(<div>{files.map((f, index) => <Audio key={index} file={f}/>)}</div>,
      document.getElementById("audio-loader"));
  let context = new (window.AudioContext || window.webkitAudioContext)();

  function player(id) {
    let audio = document.getElementById("audio-" + id);
    audio.volume = 1.0;
    context.createMediaElementSource(audio).connect(context.destination);
    return () => audio.play();
  }

  // Return a playback functions for each loaded file
  return files.map(player);
};
