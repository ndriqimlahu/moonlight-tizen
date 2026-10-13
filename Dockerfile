# Generate the animated native Samsung TV splash in a tool-only stage.
FROM ubuntu:22.04 AS splash
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg librsvg2-bin fonts-dejavu-core python3 && rm -rf /var/lib/apt/lists/*
COPY res/launch-screen.svg /tmp/launch-screen.svg
COPY res/generate-launch-screen.py /tmp/generate-launch-screen.py
RUN python3 /tmp/generate-launch-screen.py --template /tmp/launch-screen.svg --frames /tmp/launch-frames --static-svg /tmp/launch-screen-final.svg && \
    rsvg-convert -w 1280 -h 720 --format png -o /tmp/launch-screen.png /tmp/launch-screen-final.svg && \
    ffmpeg -hide_banner -loglevel error -framerate 30 -i /tmp/launch-frames/frame-%03d.png -frames:v 90 \
    -c:v libx264 -preset veryslow -tune stillimage -crf 18 -pix_fmt yuv420p \
    -profile:v baseline -level 3.1 -an -movflags +faststart -y /tmp/launch-screen.mp4 && \
    test -s /tmp/launch-screen.mp4 && test "$(stat -c %s /tmp/launch-screen.mp4)" -lt 2097152

FROM ubuntu:22.04 AS sdk

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

