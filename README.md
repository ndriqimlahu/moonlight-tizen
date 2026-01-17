# Moonlight Tizen

[![Project Status](https://img.shields.io/badge/project-actively_maintained-brightgreen?style=for-the-badge&logo=github)](#)
[![Build Status](https://img.shields.io/github/actions/workflow/status/brightcraft/moonlight-tizen/release-stable.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/brightcraft/moonlight-tizen/actions/workflows/release-stable.yml)
[![Release Version](https://img.shields.io/github/v/release/brightcraft/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases/latest)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), which is an open source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

Moonlight it allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung TV running **Tizen OS 5.5 or higher**.

Check out the [Moonlight Wiki](https://github.com/brightcraft/moonlight-tizen/wiki) for more details, setup guides, or troubleshooting steps.

## About

This project originally started as a **WASM port** for Tizen TV created by the [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome). They demonstrated how Moonlight could run on Tizen OS by converting the original Native Client module to WebAssembly, enabling raw TCP/UDP socket access for networking, reimplementing the video and audio pipelines using the Tizen WASM Player to leverage hardware acceleration, and fully adapting the application to the Tizen web environment (see their [full article](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/game-streaming-on-tizen-tv-with-wasm.html) for technical details).

Although it remained only a proof-of-concept at that stage, the work was later taken much further by [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen), who expanded and transformed it into a **fully installable** Tizen application, simplifying the complex build and compilation process for users. However, the application became outdated, lacking new features and still containing several long-standing bugs that affected usability.

In **September 2023**, I started development on a [fork repository](https://web.archive.org/web/20231101171228/https://github.com/ndriqimlahu/moonlight-chrome-tizen), where I made significant changes, including a **brand-new app logo** and **extensive improvements** focused on delivering a modern, reliable, and user-friendly experience. When the [upstream repository](https://github.com/KyroFrCode/moonlight-chrome-tizen) became inactive and was eventually abandoned, I migrated all my work to this new dedicated repository as a fresh and **standalone continuation**, offering a cleaner structure, easier maintenance, and greater flexibility for future development. For more details on why this repository decided to be independent and not remain as a fork, see [this FAQ entry](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#why-isnt-this-repository-a-fork-like-the-others).

Since then, [this repository](https://github.com/brightcraft/moonlight-tizen) has been actively maintained with frequent updates. Over time, I have refactored the codebase, updated core libraries, fixed bugs, polished the UI/UX, and introduced many new features and improvements. Thanks to more than two years of dedicated work, this has become the **most enhanced and feature-rich Moonlight client** available for Samsung Tizen TVs.

## Prerequisites

To get started, ensure that your setup meet the recommended requirements described below, which are essential to use the Moonlight app.

- Client Requirements — You must have a Samsung TV with Tizen OS starting from model year **2020 (Tizen 5.5) or later**.

- Host Requirements — You must have a powerful PC with a GPU capable of hardware decoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) to ensure optimal streaming performance.

- Network Requirements — You need a mid-range or high-end wireless router with a good wireless connection to your client using **5 GHz WiFi 5 (802.11ac) or WiFi 6 (802.11ax)** and a good wired connection to your host using the **CAT5e ethernet or better** which is strongly recommended.

- Input Requirements — It is highly recommended that you use a [supported gamepad](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#what-gamepad-controllers-are-supported-on-samsung-tv) connected to your client or host device for the best game streaming experience, as using a mouse and keyboard may cause some interference issues with Tizen OS during the streaming session.

## Installation

Follow the instructions below based on the Tizen OS version of your Samsung TV to successfully download and install the Moonlight app.

### Newer Samsung TVs — Tizen 8.0 or Higher

- Download the `Moonlight.wgt` file from the [latest release](https://github.com/brightcraft/moonlight-tizen/releases/latest).
- Follow the provided [installation guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide#installation-using-tizen-studio) to install the app on your TV using Tizen Studio.
- Once the installation is complete, the **Moonlight** app will automatically open on your TV.

### Older Samsung TVs — Tizen 5.5 to 7.0

- Follow the provided [installation guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide#installation-using-docker-image) to install the app on your TV using the Docker image.
- Once the installation is complete, open the **Moonlight** app on your TV.

### Any Samsung TVs — Tizen 5.5 or Higher

- Download the `MoonlightUSB.zip` file from the [latest version](https://github.com/brightcraft/moonlight-tizen/releases?q=-usb&expanded=false) of the USB package.
- Follow the provided [installation guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide#installation-using-usb-drive) to install the app on your TV using the USB drive.
- Once the installation is complete, open the **Moonlight** app on your TV.

## Changelogs

See the [CHANGELOG](https://github.com/brightcraft/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

## Contributing

Contributions are welcome! You can fork the repo, create pull requests, or open issues.

If you find this project useful, here are ways you can support it:
- ⭐ Star the repo to show your appreciation and support the project.
- 🐛 Report bugs or suggest new features to help improve the project.
- 💬 Participate in discussions to share ideas, tips, and help others.
- 🧪 Test pre-release builds and give early feedback to the developer.

## License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/brightcraft/moonlight-tizen/blob/master/LICENSE) file for more information.

## Acknowledgements
- Thanks to [Moonlight Game Streaming Project](https://github.com/moonlight-stream) for the core implementation of the NVIDIA GameStream protocol and the development of Moonlight for Chrome OS.
- Thanks to [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome) for creating a port version based on Chrome OS (NaCl) and adapting the Moonlight implementation for Tizen OS (WASM).
- Thanks to [babagreensheep](https://github.com/babagreensheep/jellyfin-tizen-docker) and [pablojrl123](https://github.com/pablojrl123/moonlight-tizen-docker) for creating a method for building the application and adapting the Dockerfile including the supporting files.
- Thanks to [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) for updating the core files, adding a shortcut combo to stop the streaming session, allowing audio volume changes, and improving the Dockerfile for better build compatibility.
- Thanks to [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) for implementing features such as video codec selection, mouse emulation, Wake-on-LAN, new IP address field mode, improved Docker publishing workflow, and several improvements.
- Thanks to [toypoodlegaming](https://github.com/toypoodlegaming/moonlight-chrome-tizen) for improving video codec selection logic and implementing features such as audio configuration and performance statistics.
