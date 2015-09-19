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
  <<!addl>> $16, %esp
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

// Source code by Raimo Hanski
// https://github.com/raimohanska/Monads/blob/gh-pages/examples/challenges/Validation/Validation.hs
export const haskell =
`module Validation(Validation, valid, invalid) where

import Control.Applicative
import Control.Monad
import Data.Monoid

data Validation e a = Validation a e

valid :: Monoid e => a -> Validation e a
valid x = Validation x mempty

invalid :: Monoid e => a -> e -> Validation e a
invalid x error = Validation x error

isValid :: (Eq e, Monoid e) => Validation e a -> Bool
isValid (Validation a e) = e == mempty

instance (Show a, Show e, Monoid e, Eq e) => Show (Validation e a) where
  show v@(Validation a e) | isValid v = "OK " ++ show a
                          | otherwise = "INVALID " ++ show a ++ "(" ++ show e ++")"

instance (Monoid e) => Monad (Validation e) where
  return = valid
  (Validation a errors) >>= f = case f a of
    Validation b moreErrors -> Validation b (errors \`mappend\` moreErrors)

instance (Monoid e) => Functor (Validation e) where
  fmap = liftM

instance (Monoid e) => Applicative (Validation e) where
  pure = return
  (<*>) = ap`;
