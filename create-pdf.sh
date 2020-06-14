#!/bin/bash
MANGA=dragon-ball
VOLUME=

cd ${MANGA}

for i in {1..3}
do
    cd ${VOLUME}${i}
    echo "Creating pdf for ${MANGA} volume ${i}"
    convert *.png ${MANGA}-${i}.pdf
    cd ..
done

