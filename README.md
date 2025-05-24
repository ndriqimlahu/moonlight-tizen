# Moonlight Tizen

[![Project Status](https://img.shields.io/badge/project-actively_maintained-brightgreen?style=for-the-badge&logo=github)](#)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ndriqimlahu/moonlight-tizen/build-and-release.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/ndriqimlahu/moonlight-tizen/actions/workflows/build-and-release.yml)
[![Release Version](https://img.shields.io/github/v/release/ndriqimlahu/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/ndriqimlahu/moonlight-tizen/releases/latest)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), which is an open source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

Moonlight it allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung TV running **Tizen OS 5.5 or higher**.

Check out the [Moonlight Wiki](https://github.com/ndriqimlahu/moonlight-tizen/wiki) for more details, setup guides, or troubleshooting steps.

## Prerequisites

To get started, ensure that your client, host, and network meet the recommended requirements described below, which are essential to use the **Moonlight** app.

- Client Requirements — You must have a Samsung TV with Tizen OS starting from model year `2020 (Tizen 5.5) or later`.

- Host Requirements — You must have a powerful PC with a GPU capable of hardware decoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) to ensure optimal streaming performance.

- Network Requirements — You need a mid-range or high-end wireless router with a good wireless connection to your client using `5 GHz WiFi 5 (802.11ac) or WiFi 6 (802.11ax)` and a good wired connection to your host using the `CAT5e ethernet or better` which is strongly recommended.

## Installation

Follow the instructions below based on the Tizen OS version of your Samsung TV to successfully download and install the **Moonlight** app.

### Newer Samsung TVs — Tizen 8.0 or Higher

- Download the `Moonlight.wgt` file from the [latest release](https://github.com/ndriqimlahu/moonlight-tizen/releases/latest).
- Follow the provided [installation guide](https://github.com/ndriqimlahu/moonlight-tizen/wiki/Installation-Guide#installation-using-tizen-studio) to install the app on your TV using Tizen Studio.
- Once the installation is complete, the **Moonlight** app will automatically open on your TV.

### Older Samsung TVs — Tizen 5.5 to 7.0

- Follow the provided [installation guide](https://github.com/ndriqimlahu/moonlight-tizen/wiki/Installation-Guide#installation-using-docker-image) to install the app on your TV using the Docker image.
- Once the installation is complete, open the **Moonlight** app on your TV.

## Changelogs

See the [CHANGELOG](https://github.com/ndriqimlahu/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

## Contributing

Contributions are welcome! Fork the repo, create pull requests, or open issues. If you find the project useful, consider giving it a star!

## License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/ndriqimlahu/moonlight-tizen/blob/master/LICENSE) file for more information.

## Acknowledgements
- Thanks to [Moonlight Game Streaming Project](https://github.com/moonlight-stream/moonlight-chrome) for developing and maintaining Moonlight for Chrome OS.
- Thanks to [SamsungDForum](https://github.com/SamsungDForum/moonlight-chrome) for adapting the code and implementing Moonlight for Tizen OS.
- Thanks to [babagreensheep](https://github.com/babagreensheep/jellyfin-tizen-docker) for adapting the Dockerfile and supporting files.
- Thanks to [pablojrl123](https://github.com/pablojrl123/moonlight-tizen-docker) for creating a method for building Moonlight by re-adapting the Dockerfile.
- Thanks to [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) for updating the core files and improving the Dockerfile for better compatibility.
- Thanks to [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) for improving the Docker publishing workflow and adding new features for a better experience.
