# Moonlight Tizen

[![Release Version](https://img.shields.io/github/v/release/brightcraft/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/brightcraft/moonlight-tizen/release-stable.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/brightcraft/moonlight-tizen/actions/workflows/release-stable.yml)
[![Total Downloads](https://img.shields.io/github/downloads/brightcraft/moonlight-tizen/total?style=for-the-badge&logo=github)](https://github.com/brightcraft/moonlight-tizen/releases)
[![Discord Community](https://img.shields.io/badge/Discord-Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/vr62ZDH236)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), which is an open-source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

This application allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung Smart TV.

> [!IMPORTANT]
>
> While I am still actively maintaining the project and doing my best with my **limited time**, I want to let you all know that I am focused on pushing the remaining improvements and new features, including the integration of community contributions. This is also why the project has continued to be **actively updated and receive frequent releases** in recent months.
>
> At this stage, the core functionality is now considered **fully implemented**, and the project has reached a **mature and stable state** as it approaches the end of its active development period. Given this progress, **this will most likely be my final year** of actively maintaining and developing it, and I intend to use this time to complete the work that can still be done before this transition takes place.
>
> To help manage my workload during this period, **new issue submissions are now restricted**, although existing issues remain available for reference. For quick questions, troubleshooting help, and community support, please use the project’s Discord server.
>
> As this transition approaches, I will make a **final announcement**, perhaps towards the end of the year, with more details about what this transition will mean for the project and its future.

---

## ⚙️ Prerequisites

Before proceeding with the installation, please take a moment to ensure that your current hardware, network, and input setup fully meet the necessary requirements described below:
- **Client:** Samsung Smart TV running Tizen OS version 5.5 or newer (model year 2020 onwards).
- **Host:** Gaming PC with a GPU capable of hardware encoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) for optimal streaming performance.
- **Network:** Mid-range or high-end wireless router with a stable wireless connection (Wi-Fi 5/6) for the TV and a wired gigabit Ethernet connection (CAT5e or better) for the host PC are strongly recommended.
- **Input:** [Supported gamepad](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#which-gamepad-controllers-are-officially-supported-on-samsung-tvs) connected to your TV or directly connected to a nearby PC is highly recommended for the best streaming experience.

---

## 📦 Installation

Preparing Moonlight for installation is a straightforward process, although the exact steps depend on the Tizen version your TV uses and the installation method you choose. To get started, follow the steps below:
- Choose your preferred [installation method](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide) from the provided guide.
- Follow the step-by-step instructions to successfully install the application.
- Once complete, you can launch **Moonlight** and start streaming your games.

---

## 📚 Documentation

For in-depth guides, technical support, and comprehensive documentation, please refer to the [Wiki](https://github.com/brightcraft/moonlight-tizen/wiki) or jump directly to a relevant section below:
- 🧭 Get started with Moonlight Tizen: [Quick Start Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Quick-Start-Guide)
- 🚀 Install the app step-by-step: [Installation Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide)
- 🔄 Update your application version: [Updating Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Updating-Guide)
- ✨ Explore available app features: [Features Overview](https://github.com/brightcraft/moonlight-tizen/wiki/Features-Overview)
- ❓ Common questions and tips: [Frequently Asked Questions](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions)
- ⚠️ Review limitations and notes: [Known Issues & Limitations](https://github.com/brightcraft/moonlight-tizen/wiki/Known-Issues-&-Limitations)
- 🔧 Troubleshoot common problems: [Troubleshooting Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Troubleshooting-Guide)
- 🔮 Build instructions and log collection: [Development Guide](https://github.com/brightcraft/moonlight-tizen/wiki/Development-Guide)

---

## 📖 About This Repository

This project originally started as a **WASM port** for Tizen TV created by the [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome). They demonstrated how Moonlight could run on Tizen OS by converting the original Native Client module to WebAssembly, enabling raw TCP/UDP socket access for networking, reimplementing the video and audio pipelines using the Tizen WASM Player to leverage hardware acceleration, and fully adapting the application to the Tizen web environment (see their [full article](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/game-streaming-on-tizen-tv-with-wasm.html) for technical details).

Although it remained only a proof-of-concept at that stage, the work was later taken much further by [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen), who expanded and transformed it into a **fully installable** Tizen application, simplifying the complex build and compilation process for users. However, the application became outdated, lacking new features and still containing several long-standing bugs that affected usability.

In **September 2023**, I started development on a fork repository, where I made significant changes, including a **brand-new app logo** and **extensive improvements** focused on delivering a modern, reliable, and user-friendly experience. When the [upstream repository](https://github.com/KyroFrCode/moonlight-chrome-tizen) became inactive and was eventually abandoned, I migrated all my work to this new dedicated repository as a fresh and **standalone continuation**, offering a cleaner structure, easier maintenance, and greater flexibility for future development.

Since then, [this repository](https://github.com/brightcraft/moonlight-tizen) has been actively maintained with frequent updates. Over time, I have refactored the codebase, updated core libraries, fixed bugs, polished the UI/UX, and introduced many new features and improvements. Thanks to more than two years of dedicated work, this has become the **most enhanced and feature-rich Moonlight client** available for Samsung Tizen TVs.

---

## 📝 Changelogs

See the [CHANGELOG](https://github.com/brightcraft/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

---

## 🛠️ Contributing

Contributions are welcome! You can help by forking the repo, creating pull requests, opening issues, or simply giving a ⭐ to the project.

Where to start:
- 🐛 Report a bug or request a feature: [Issues](https://github.com/brightcraft/moonlight-tizen/issues)
- 💬 Share ideas or ask questions: [Discussions](https://github.com/brightcraft/moonlight-tizen/discussions)
- 🧪 Test early development builds: [Pre-releases](https://github.com/brightcraft/moonlight-tizen/releases?q=pre-release&expanded=false)

See the [CONTRIBUTING](https://github.com/brightcraft/moonlight-tizen/blob/master/.github/CONTRIBUTING.md) file for more information about the project’s contribution guidelines.

---

## ❤️ Support

If you find this project useful and would like to support its continued development, maintenance, and the addition of new features, consider a donation. Your contribution directly helps ensure that the application remains stable and up-to-date for the community.

[![Patreon](https://img.shields.io/badge/Support_me_on_Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/cw/BrightCraft/membership)

---

## ⚖️ License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/brightcraft/moonlight-tizen/blob/master/LICENSE) file for more information.

---

## 🙏 Contributors

This project is made possible thanks to the people who dedicate their time, knowledge, and feedback to making it better.

<a href="https://github.com/brightcraft/moonlight-tizen/graphs/contributors?all=1">
  <img src="https://contrib.rocks/image?repo=brightcraft/moonlight-tizen"/>
</a>

### Special thanks to:

- [Moonlight Game Streaming Project](https://github.com/moonlight-stream) — for creating the core Moonlight implementation, adapting the NVIDIA GameStream protocol, and developing the Moonlight Chrome OS client. The project’s open-source work made it possible to bring Moonlight streaming support to additional platforms and serves as the foundation for the entire Tizen port.
- [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome) — for creating the first Tizen OS (WASM) adaptation based on the Moonlight Chrome OS client. Their work made Moonlight available on Samsung Smart TVs by integrating the client with Tizen’s WASM environment, including video and audio playback through Tizen WASM Player, platform-specific adjustments, and the initial groundwork required for running Moonlight on Tizen devices.
- [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) — for further developing the Tizen implementation by introducing improvements such as a dedicated application build method, 1440p resolution support, a shortcut combo to stop the streaming session, and audio volume control using the remote. This codebase served as the starting point when my repository was still a fork, which I later continued as a standalone repository.
- [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) — for expanding the Tizen implementation in their fork with features such as video codec selection, mouse emulation using the gamepad, Wake-on-LAN (WoL), a new IP address input mode, and other improvements. These changes served as a foundation that was later adapted, improved, and integrated into this project.
- [toypoodlegaming](https://github.com/toypoodlegaming/moonlight-chrome-tizen) — for further expanding the functionality in their fork with features such as 5.1 and 7.1 surround sound configuration, performance statistics, and enhanced bitrate calculation. These changes served as a foundation that was later adapted, improved, and integrated into this project.
- [eduardomozart](https://github.com/eduardomozart) — for contributing to the project with localization support featuring Tizen-first locale detection, HTTP subnet scanning, IPv6 and DNS hostname support, custom port support, Smart Hub Preview support, and build optimizations, along with numerous fixes and improvements that were further refined and integrated into the application.
- [fophillips](https://github.com/fophillips) — for contributing to the project by integrating the Web Audio backend implementation from [ruanformigoni](https://github.com/ruanformigoni) alongside the existing EMSS backend, with an Audio Backend selection setting for switching between the two renderers.
