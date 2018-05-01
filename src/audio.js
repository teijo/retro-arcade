import { Howl } from "howler";

const files = [
  {name: "game", src: "assets/game.mp3", isBackgroundMusic: true},
  {name: "menu", src: "assets/menu.mp3", isBackgroundMusic: true},
  {name: "menuPickSfx", src: "assets/menu-pick.wav", isBackgroundMusic: false},
  {name: "menuSwitchSfx", src: "assets/menu-switch.wav", isBackgroundMusic: false},
  {name: "typeSfx", src: "assets/type.wav", isBackgroundMusic: false},
  {name: "perfectSfx", src: "assets/perfect.wav", isBackgroundMusic: false},
  {name: "autocompleteSfx", src: "assets/autocomplete.wav", isBackgroundMusic: false},
  {name: "missSfx", src: "assets/miss.wav", isBackgroundMusic: false},
  {name: "finishSfx", src: "assets/finish.wav", isBackgroundMusic: false}
];

export const loadAudioContext = () => {
  function player(file) {
    const audio = new Howl({
      src: [file.src],
      loop: file.isBackgroundMusic
    });

    const context = {};
    context[file.name] = {
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
  return files
    .map((fileName) => player(fileName))
    .reduce((memo, current) => Object.assign(current, memo, {}), {});
};
