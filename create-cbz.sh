#!/bin/bash
# MANGA=one-punch-man
# MANGA=one-piece
# MANGA=gunnm-last-order
# MANGA=gunnm-kasei-senki
MANGA=naruto
# MANGA=kobato
# MANGA=dragon-ball-super
VOLUME=volume-
# VOLUME=

cd ${MANGA}

for i in {12..20}
do
    cd ${VOLUME}${i}
    echo "Creating cbz for ${MANGA} volume ${i}"
    zip  ${MANGA}-${i}.cbz *.png
    cd ..
done

