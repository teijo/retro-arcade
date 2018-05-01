import { Howl } from "howler";

const files = [
  "assets/game.mp3",
  "assets/menu.mp3",
  "assets/menu-pick.wav",
  "assets/menu-switch.wav",
  "assets/type.wav",
  "assets/perfect.wav",
  "assets/autocomplete.wav",
  "assets/miss.wav",
  "assets/finish.wav"
];

export const loadAudioContext = () => {
  function player(fileName) {
    const isMp3 = fileName.includes("mp3");
    const audio = new Howl({
      src: [fileName],
      loop: isMp3
    });

    return {
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
  }

  // Return a playback functions for each loaded file
  return files.map((fileName) => player(fileName));
};
