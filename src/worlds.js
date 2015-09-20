export const javaScript =
`<<let>> l = <<!new>> <<window>>.keypress.Listener();
players.<<forEach>>(player => {
  let step = 0;
  l.<<simple_combo>>(player.trigger, () => {
    player.input.<<push>>(++step);
  });
});`;


// Source code by Ivan Sergeev
// https://github.com/vsergeev/apfcp
export const assembly =
  `.section .text
.global _start
<<_start:>>
  pushl $22
  <<pushl>> $20
  !pushl $42
  <<pushl>> $3
  call sumNumbers
  <<!addl>> <<!$16,>> <<!%esp>>
  # %eax is now 84
  <<# i wish i could
  # autocomplete comments>>

  sumNumbers:
    <<# Function prologue, save>>
    <<!# old frame pointer>>
    <<# and setup new one>>
    pushl %ebp
    movl %esp, %ebp
    sumLoop:
      <<# Add argument 2, 3, 4, ... n in %eax>>
      <<# Argument 2 starts at %ebp+12>>
      addl 12(%ebp, %ecx, 4), %eax
      incl %ecx

      <<# Loop>>
      decl %edx
      jnz sumLoop

    <<# Function epilogue,
    # deallocate and
    # god damn i hate documenting
    # 80% of the time>>
    movl %ebp, %esp
    popl %ebp
    ret`;

// Source code by Juha Paananen
// https://github.com/raimohanska/Monads/blob/gh-pages/challenges/Identity/Identity.hs
export const haskell =
`module Identity where

import <<!Control>>.Applicative
import <<!Control>>.Monad

data <<Identity>> a = Identity a
  deriving (<<!Eq>>, <<Show>>)

<<instance>> Monad Identity where
  return = undefined
  Identity x > > = f = undefined

<<instance Functor Identity where>>
  fmap = undefined

instance <<Applicative>> Identity where
  pure = undefined
  <<(<*>)>> = undefined`;
