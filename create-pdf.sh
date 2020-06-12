#!/bin/bash
MANGA=dragon-ball-super

cd ${MANGA}

for i in {1..59}
do
    cd ${i}
    echo "Creating pdf for ${MANGA} volume ${i}"
    convert *.png ${MANGA}-${i}.pdf
    cd ..
done

