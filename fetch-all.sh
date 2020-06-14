#!/bin/bash
for i in {3..3}
do
  yarn start --manga dragon-ball --number $i --maxpages 40
done
