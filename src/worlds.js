import * as Const from "./const";

function createBlocks(template) {
  return template.split(/<<|>>/).map(parseBlock)
}

function parseBlock(rawBlock, index) {
  switch (rawBlock[0]) {
    case "!":
      return {type: Const.TYPE_GET_SPECIAL, text: rawBlock.slice(1)};
    default:
      return {type: index % 2 ? Const.TYPE_BONUS : Const.TYPE_NORMAL, text: rawBlock};
  }
}


export const jsLevel =
`<<let>> listener = <<!new>> <<window>>.keypress.Listener();
players.<<forEach>>(player => {
  let step = 0;
  listener.<<simple_combo>>(player.trigger, () => {
    player.input.<<push>>(++step);
  });
});`;

const jsBlocks = createBlocks(jsLevel)

export const js = {
  blocks: jsBlocks,
  length: jsBlocks.map(b => b.text).join('').length
}


// Source code by Ivan Sergeev
// https://github.com/vsergeev/apfcp
export const asmLevel =
`; Hello World System Call Example in nasm (example-hello-nasm.asm)
section .text
global _start
_start:
  ; open("foo", ...);
  mov eax, 5
  mov ebx, filename
  mov ecx, 0x41
  mov edx, 0q644
  int 0x80

  ; fd in eax -> ebx
  mov ebx, eax

  ; write(fd, ...);
  mov eax, 4
  ; fd in ebx from above
  mov ecx, message
  mov edx, messageLen
  int 0x80

  ; close(fd);
  mov eax, 6
  ; fd still in ebx
  int 0x80

  ; exit(0);
  mov eax, 1
  mov ebx, 0
  int 0x80

section .data
filename:   db 'foo',0
message:    db 'Hello World!',10
messageLen: equ $ - message`

export const haskellLevel =
`import Network.HTTP.Conduit
import Control.Monad.IO.Class (liftIO)

main = withManager $ \manager -> do
    request <- parseUrl "http://www.winsoft.sk"
    liftIO $ print request
    response <- httpLbs request manager
    liftIO $ print response`