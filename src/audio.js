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
      loop(active) {
        audio.loop = true;
        if (active === true) {
          audio.play();
        } else if (active === false) {
          audio.pause();
        } else {
          throw new Error("Must call as: loop(active: boolean)");
        }
      },
      play() {
        if (arguments.length !== 0) {
          throw new Error("Must call as: play()");
        }
        audio.play();
      }
    }
  }

  // Return a playback functions for each loaded file
  return files.map((_, index) => player(index));
};
