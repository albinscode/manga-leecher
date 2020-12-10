#!/bin/bash
# MANGA=one-punch-man
MANGA=one-piece
# MANGA=dragon-ball-super
VOLUME=volume-
# VOLUME=

cd ${MANGA}

for i in {31..40}
do
    cd ${VOLUME}${i}
    echo "Creating pdf for ${MANGA} volume ${i}"
    convert *.png ${MANGA}-${i}.pdf
    # for html
    # pandoc *.html -t latex -o ${MANGA}-${i}.pdf
    cd ..
done

