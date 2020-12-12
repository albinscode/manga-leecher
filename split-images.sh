#!/bin/bash
# Script to split images in half using ImageMagick
# By Euan McKay
# Taken from https://discourse.devontechnologies.com/t/cutting-images-in-half-with-imagemagick/3663

# You can adjust these settings to suit your needs

INPUT_FOLDER=$1 # set input folder name
OUTPUT_FOLDER=$1 # set output folder name
# mkdir $OUTPUT_FOLDER   # create the folder to store split images

INPUT='png'     # set extension of image type to split
OUTPUT='png'    # set extension of image type to save

# You shouldn't need to adjust anything below here

COUNTER=0       # set counter to zero

for ITEM in ${INPUT_FOLDER}/*.$INPUT        # get items in present folder

do                          # start loop

    data=`identify $ITEM | awk '{print $3}'`                # get image data
    W=`echo $data | sed 's/[^0-9]/ /g' | awk '{print $1}'`  # extract width
    H=`echo $data | sed 's/[^0-9]/ /g' | awk '{print $2}'`  # extract height

    # Vertical part
    NEWW=$((W/2))                                           # set new width

    LEFT=${OUTPUT_FOLDER}'/'${COUNTER}.0.$OUTPUT           # filename of left half
    RIGHT=${OUTPUT_FOLDER}'/'${COUNTER}.1.$OUTPUT          # filename of right half

    convert -verbose -crop ${NEWW}x${H} $ITEM $LEFT         # make left half
    convert -verbose -crop ${W}x${H}+${NEWW}-0 $ITEM $RIGHT # make right half

    # horizontal part
    # NEWH=$((H/2))                                           # set new height

    # TOP=${OUTPUT_FOLDER}'/'${COUNTER}.0.$OUTPUT             # filename of top half
    # BOTTOM=${OUTPUT_FOLDER}'/'${COUNTER}.1.$OUTPUT          # filename of bottom half

    # convert -verbose -crop ${W}x${NEWH} $ITEM $TOP           # make top half
    # convert -verbose -crop ${W}x${H}+0+${NEWH} $ITEM $BOTTOM # make bottom half

    COUNTER=$((COUNTER+1))  # increment counter

done                        # end loop
