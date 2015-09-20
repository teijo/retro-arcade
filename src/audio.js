import React from "react";
import Howler from "howler";

export let loadAudioContext = (...files) => {
  function player(fileName) {
    var isMp3 = fileName.includes('mp3')
    var audio = new Howl({
      urls: [fileName],
      buffer: isMp3,
      loop: isMp3
    })

    return {
      loop(active) {
        audio.loop(true)
        if (active === true) {
          audio.play();
        } else if (active === false) {
          audio.stop();
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
  return files.map((fileName) => player(fileName));
};
