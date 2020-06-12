#!/bin/bash
for i in {1..13}
do
  yarn start --manga bonne-nuit-punpun --number volume-$i
done
