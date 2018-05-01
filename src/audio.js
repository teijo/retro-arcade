import { Howl } from "howler";

export const loadAudioContext = () => {
  function player(audioEntry) {
    const audio = new Howl({
      src: [audioEntry.src],
      loop: audioEntry.isBackgroundMusic
    });

    const context = {};
    context[audioEntry.name] = {
      loop(active) {
        audio.loop(true);
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
    };

    return context;
  }

  // Return a playback functions for each loaded file
  return window.audioData
    .map(player)
    .reduce((memo, current) => Object.assign(current, memo, {}), {});
};
