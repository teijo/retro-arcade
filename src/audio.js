import { Howl } from "howler";

const files = [
  {src: "assets/game.mp3", isBackgroundMusic: true},
  {src: "assets/menu.mp3", isBackgroundMusic: true},
  {src: "assets/menu-pick.wav", isBackgroundMusic: false},
  {src: "assets/menu-switch.wav", isBackgroundMusic: false},
  {src: "assets/type.wav", isBackgroundMusic: false},
  {src: "assets/perfect.wav", isBackgroundMusic: false},
  {src: "assets/autocomplete.wav", isBackgroundMusic: false},
  {src: "assets/miss.wav", isBackgroundMusic: false},
  {src: "assets/finish.wav", isBackgroundMusic: false}
];

export const loadAudioContext = () => {
  function player(file) {
    const audio = new Howl({
      src: [file.src],
      loop: file.isBackgroundMusic
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
