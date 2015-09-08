import React from "react";

let Audio = React.createClass({
  propTypes: {
    audioId: React.PropTypes.number.isRequired,
    file: React.PropTypes.string.isRequired
  },
  render() {
    return (
        <audio ref="element" id={"audio-" + this.props.audioId} crossOrigin="anonymous">
          <source src={this.props.file} type="audio/wav"/>
        </audio>
    );
  }
});

export let loadAudioContext = (...files) => {
  // Load all files with <audio> tag
  React.render(<div>{files.map((f, index) => <Audio key={index} audioId={index} file={f}/>)}</div>, document.getElementById("audio-loader"));
  let context = new (window.AudioContext || window.webkitAudioContext)();

  function player(index) {
    let audio = document.getElementById("audio-" + index);
    audio.volume = 1.0;
    context.createMediaElementSource(audio).connect(context.destination);
    return {
      play(active) {
        if (active) {
          audio.play();
        } else {
          audio.pause();
        }
      }
    }
  }

  // Return a playback functions for each loaded file
  return files.map((_, index) => player(index));
};
