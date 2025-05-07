FROM ubuntu:22.04 AS base

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
RUN apt-get update && apt-get install -y \
	cmake \
	expect \
	git \
	ninja-build \
	python2 \
	unzip \
	wget \
	nodejs \
	npm \
	zip \
	default-jre \
	&& rm -rf /var/lib/apt/lists/*

# Some of the Samsung Tizen scripts refer to `python`, but Ubuntu only provides `/usr/bin/python2`
RUN ln -sf /usr/bin/python2 /usr/bin/python

# From here on use a non-root user
RUN useradd -m -s /bin/bash moonlight
USER moonlight
WORKDIR /home/moonlight

# Install Tizen Studio, get the file: `web-cli_Tizen_Studio_6.1_ubuntu-64.bin`
RUN wget -nv -O web-cli_Tizen_Studio_6.1_ubuntu-64.bin 'https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_ubuntu-64.bin'
RUN chmod a+x web-cli_Tizen_Studio_6.1_ubuntu-64.bin
RUN ./web-cli_Tizen_Studio_6.1_ubuntu-64.bin --accept-license --no-java-check /home/moonlight/tizen-studio
ENV PATH=/home/moonlight/tizen-studio/tools/ide/bin:/home/moonlight/tizen-studio/tools:${PATH}

# Prepare the Tizen signing certificates
RUN tizen certificate \
	-a Moonlight \
	-f Moonlight \
	-p 1234
RUN tizen security-profiles add \
	-n Moonlight \
	-a /home/moonlight/tizen-studio-data/keystore/author/Moonlight.p12 \
	-p 1234

# A workaround for packaging applications without gnome-keyring
# These steps must be repeated each time before packaging an application
# See <https://developer.tizen.org/forums/sdk-ide/pwd-fle-format-profile.xml-certificates>
RUN sed -i 's|/home/moonlight/tizen-studio-data/keystore/author/Moonlight.pwd||' /home/moonlight/tizen-studio-data/profile/profiles.xml
RUN sed -i 's|/home/moonlight/tizen-studio-data/tools/certificate-generator/certificates/distributor/tizen-distributor-signer.pwd|tizenpkcs12passfordsigner|' /home/moonlight/tizen-studio-data/profile/profiles.xml

# Install Samsung Emscripten SDK, get the file: `emscripten-1.39.4.7-linux64.zip`
RUN wget -nv -O emscripten-1.39.4.7-linux64.zip 'https://developer.samsung.com/smarttv/file/a5013a65-af11-4b59-844f-2d34f14d19a9'
RUN unzip emscripten-1.39.4.7-linux64.zip
WORKDIR emscripten-release-bundle/emsdk
RUN ./emsdk activate latest-fastcomp

# Configure Java for the Emscripten Closure Compiler
RUN echo 'JAVA = "/usr/bin/java"' >> /home/moonlight/.emscripten
WORKDIR ../..

# Build the application package from the source code
COPY --chown=moonlight . ./moonlight-tizen

RUN cmake \
	-DCMAKE_TOOLCHAIN_FILE=/home/moonlight/emscripten-release-bundle/emsdk/fastcomp/emscripten/cmake/Modules/Platform/Emscripten.cmake \
	-G Ninja \
	-S moonlight-tizen \
	-B build
RUN cmake --build build
RUN cmake --install build --prefix build

RUN cp moonlight-tizen/res/icon.png build/widget/

# Build the package and then sign the application
# It effectively runs `tizen package -t wgt -- build/widget`, but uses an expected cmd file to automate the password prompt
RUN echo \
	'set timeout -1\n' \
	'spawn tizen package -t wgt -- build/widget\n' \
	'expect "Author password:"\n' \
	'send -- "1234\\r"\n' \
	'expect "Yes: (Y), No: (N) ?"\n' \
	'send -- "N\\r"\n' \
	'expect eof\n' \
| expect

RUN mv build/widget/Moonlight.wgt .

# Clone and install the `wgt-to-usb` tool inside the workspace directory
RUN git clone https://github.com/fingerartur/wgt-to-usb.git
RUN cd /home/moonlight/wgt-to-usb/ && npm install wgt-to-usb

# Converting the WGT application package file to a USB package installer
RUN npm exec wgt-to-usb /home/moonlight/Moonlight.wgt
RUN cd /home/moonlight/ && zip -r MoonlightUSB.zip ./userwidget

# Optional: Remove unnecessary files and folders
RUN rm -rf \
	build \
	emscripten-1.39.4.7-linux64.zip \
	emscripten-release-bundle \
	moonlight-tizen \
	tizen-package-expect.sh \
	web-cli_Tizen_Studio_6.1_ubuntu-64.bin \
	.emscripten \
	.emscripten_cache \
	.emscripten_cache.lock \
	.emscripten_ports \
	.emscripten_sanity \
	.package-manager \
	.wget-hsts \
	/home/moonlight/.npm \
	/home/moonlight/wgt-to-usb

# Use a multi-stage build to reclaim space from deleted files
FROM ubuntu:22.04
COPY --from=base / /
USER moonlight
WORKDIR /home/moonlight

# Add Tizen Studio to the path
ENV PATH=/home/moonlight/tizen-studio/tools/ide/bin:/home/moonlight/tizen-studio/tools:${PATH}
