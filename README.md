# Moonlight Tizen — Independent Dolby Optical Audio Fork

[![Release Version](https://img.shields.io/github/v/release/fidoboy/moonlight-tizen?style=for-the-badge&logo=github)](https://github.com/fidoboy/moonlight-tizen/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/fidoboy/moonlight-tizen/build-ac3-passthrough.yml?branch=ac3-audio-passthrough&style=for-the-badge&logo=docker)](https://github.com/fidoboy/moonlight-tizen/actions/workflows/build-ac3-passthrough.yml?query=branch%3Aac3-audio-passthrough)
[![Total Downloads](https://img.shields.io/github/downloads/fidoboy/moonlight-tizen/total?style=for-the-badge&logo=github)](https://github.com/fidoboy/moonlight-tizen/releases)
[![Discord Community](https://img.shields.io/badge/Discord-Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/vr62ZDH236)

Moonlight Tizen is a port of [Moonlight ChromeOS](https://github.com/moonlight-stream/moonlight-chrome), an open-source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/). It lets you stream games, applications, and your desktop from a PC to a Samsung Smart TV.

This repository is an **independently maintained fork** of [Brightcraft's Moonlight Tizen](https://github.com/brightcraft/moonlight-tizen). It builds on Brightcraft's extensive maintenance and development, as well as the earlier work of OneLiberty and the other contributors acknowledged below. This is a community fork, not an official Brightcraft release.

> [!IMPORTANT]
>
> ## Main purpose: Dolby Digital audio over optical output
>
> The principal reason for this fork is optional **AC-3 (Dolby Digital) and E-AC-3 (Dolby Digital Plus) passthrough** for compatible Samsung Smart TVs connected over optical (TOSLINK) to a receiver or sound system that supports the selected Dolby format. When the host and playback path support it, the client passes the compressed audio stream to Tizen's native EMSS audio renderer, allowing **stereo or 5.1 surround sound** over a supported optical setup.
>
> - **AC-3 is limited to 5.1 channels.** The current matching experimental Sunshine encoder supports stereo and 5.1; the effective output also depends on the TV model, its audio-output settings, and the receiver or soundbar.
> - **OPUS compatibility is preserved.** Dolby negotiation is optional. If a host only provides OPUS, or does not select AC-3/E-AC-3, Moonlight continues using the normal OPUS path. Hosts that do not implement the optional Dolby extensions remain compatible and do not need to be modified.
> - **Dolby passthrough requires a compatible host.** The matching experimental implementation is available in [fidoboy/Sunshine — ac3-audio](https://github.com/fidoboy/Sunshine/tree/ac3-audio). With a host that only offers OPUS, the client continues to work as usual.
>
> The complete path has been tested with an experimental Sunshine host and Moonlight Tizen on a Samsung TV, including AC-3 and E-AC-3 in default and High Quality audio modes. Results depend on the connected TV and audio equipment.

### Other improvements in this fork

- **Audio stream statistics:** shows the negotiated audio codec, channel layout, channel count, and approximate audio bitrate alongside the existing video and performance statistics.
- **Spanish localization:** adds the es-ES locale and translations for the interface, including the new settings and audio statistics.
- **Quit host app on disconnect:** an optional setting requests that the running host application quit after a normal disconnection; unexpected connection failures do not trigger it.
- **Animated native launch screen:** adds an animated Tizen splash screen and its generation script.
- **Settings and input refinements:** improves optical-output settings, their disabled-state presentation and remote navigation, with related keyboard/input refinements.

---
---

## ⚙️ Prerequisites

Before proceeding with the installation, please take a moment to ensure that your current hardware, network, and input setup fully meet the necessary requirements described below:
- **Client:** Samsung Smart TV running Tizen OS version 5.5 or newer (model year 2020 onwards).
- **Host:** Gaming PC with a GPU capable of hardware encoding that meets the [system requirements](https://docs.lizardbyte.dev/projects/sunshine/latest/index.html#%EF%B8%8F-system-requirements) for optimal streaming performance.
- **Network:** Mid-range or high-end wireless router with a stable wireless connection (Wi-Fi 5/6) for the TV and a wired gigabit Ethernet connection (CAT5e or better) for the host PC are strongly recommended.
- **Input:** [Supported gamepad](https://github.com/brightcraft/moonlight-tizen/wiki/Frequently-Asked-Questions#which-gamepad-controllers-are-officially-supported-on-samsung-tvs) connected to your TV or directly connected to a nearby PC is highly recommended for the best streaming experience.

---

## 📦 Installation

Preparing Moonlight for installation is a straightforward process, although the exact steps depend on the Tizen version your TV uses and the installation method you choose.

- Find published experimental packages in the [fork's Releases](https://github.com/fidoboy/moonlight-tizen/releases). Branch builds may also be available as artifacts from the [experimental WGT workflow](https://github.com/fidoboy/moonlight-tizen/actions/workflows/build-ac3-passthrough.yml?query=branch%3Aac3-audio-passthrough).
- Follow the original project's [installation guide](https://github.com/brightcraft/moonlight-tizen/wiki/Installation-Guide) for instructions appropriate to your TV and Tizen version.
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

## 📖 Project history and this fork

This fork continues the work of the broader Moonlight Tizen community. The original technical foundation was laid by the [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome), which demonstrated how Moonlight could run on Tizen by porting the ChromeOS client to WebAssembly, adapting network access, and using the Tizen WASM Player for hardware-accelerated media playback.

The project was then made into a more readily installable Tizen application by [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen). Community forks continued to extend it. In particular, [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) contributed important features such as video codec selection, gamepad mouse emulation, Wake-on-LAN, and IP address input improvements. Other contributors added features including surround-sound configuration, performance statistics, localization, networking support, and additional fixes.

[Brightcraft's dedicated Moonlight Tizen repository](https://github.com/brightcraft/moonlight-tizen) built on that foundation with extensive ongoing work: refactoring the codebase, updating core libraries, resolving long-standing bugs, improving the UI/UX, maintaining the build process, and integrating community contributions. That work made the application more mature and feature-rich, and remains the foundation of this fork.

The fidoboy/moonlight-tizen fork is maintained independently. Its primary focus is optional Dolby Digital / Dolby Digital Plus passthrough for compatible optical audio setups, while preserving the normal OPUS streaming path for hosts that do not support Dolby. The additional features listed above are maintained alongside that core objective. This fork preserves attribution to the upstream project and the contributors whose work it builds upon.


---

## 📝 Changelogs

For the history of the base application, see the [upstream CHANGELOG](https://github.com/brightcraft/moonlight-tizen/blob/master/CHANGELOG.md). Fork-specific changes are described in this README, the fork's commit history, and its release notes.


---

## 🛠️ Contributing

This fork is developed and maintained independently from the upstream Brightcraft repository. Its GitHub Issues tracker is currently disabled. For general Moonlight Tizen installation and usage guidance, consult the [upstream Wiki](https://github.com/brightcraft/moonlight-tizen/wiki) and [Discord community](https://discord.gg/vr62ZDH236).

Code contributions can be proposed through pull requests against the ac3-audio-passthrough branch. Please keep changes focused, explain their purpose, and include build or device-testing results where possible. Current experimental WGT builds are linked from [GitHub Actions](https://github.com/fidoboy/moonlight-tizen/actions/workflows/build-ac3-passthrough.yml?query=branch%3Aac3-audio-passthrough).


---

## ❤️ Support the upstream project

Brightcraft's original Moonlight Tizen project is supported through its Patreon page. This link supports the upstream project, not this independently maintained fork.

[![Support Brightcraft on Patreon](https://img.shields.io/badge/Support_Brightcraft_on_Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/cw/BrightCraft/membership)


---

## ⚖️ License

This project is licensed under the GNU General Public License v3.0. See this fork's [LICENSE](https://github.com/fidoboy/moonlight-tizen/blob/ac3-audio-passthrough/LICENSE) file for the full license text.


---

## 🙏 Contributors

This project is made possible thanks to the people who dedicate their time, knowledge, and feedback to making it better.

The contributor graph below points to the upstream Brightcraft repository, whose work forms the foundation of this fork.

<a href="https://github.com/brightcraft/moonlight-tizen/graphs/contributors?all=1">
  <img src="https://contrib.rocks/image?repo=brightcraft/moonlight-tizen"/>
</a>

### Special thanks to:

- [Moonlight Game Streaming Project](https://github.com/moonlight-stream) — for creating the core Moonlight implementation, adapting the NVIDIA GameStream protocol, and developing the Moonlight Chrome OS client. The project’s open-source work made it possible to bring Moonlight streaming support to additional platforms and serves as the foundation for the entire Tizen port.
- [Samsung Developers Forum](https://github.com/SamsungDForum/moonlight-chrome) — for creating the first Tizen OS (WASM) adaptation based on the Moonlight Chrome OS client. Their work made Moonlight available on Samsung Smart TVs by integrating the client with Tizen’s WASM environment, including video and audio playback through Tizen WASM Player, platform-specific adjustments, and the initial groundwork required for running Moonlight on Tizen devices.
- [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) — for further developing the Tizen implementation by introducing improvements such as a dedicated application build method, 1440p resolution support, a shortcut combo to stop the streaming session, and audio volume control using the remote. This codebase served as the starting point when my repository was still a fork, which I later continued as a standalone repository.
- [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) — for expanding the Tizen implementation in their fork with features such as video codec selection, mouse emulation using the gamepad, Wake-on-LAN (WoL), a new IP address input mode, and other improvements. These changes served as a foundation that was later adapted, improved, and integrated into this project.
- [Brightcraft](https://github.com/brightcraft/moonlight-tizen) — for the extensive maintenance and development of the dedicated Moonlight Tizen client, including codebase refactoring, core-library updates, bug fixes, UI/UX improvements, build maintenance, and integration of community contributions. This fork builds directly on that work.
- [toypoodlegaming](https://github.com/toypoodlegaming/moonlight-chrome-tizen) — for further expanding the functionality in their fork with features such as 5.1 and 7.1 surround sound configuration, performance statistics, and enhanced bitrate calculation. These changes served as a foundation that was later adapted, improved, and integrated into this project.
- [eduardomozart](https://github.com/eduardomozart) — for contributing to the project with localization support featuring Tizen-first locale detection, HTTP subnet scanning, IPv6 and DNS hostname support, custom port support, Smart Hub Preview support, and build optimizations, along with numerous fixes and improvements that were further refined and integrated into the application.
- [fophillips](https://github.com/fophillips) — for contributing to the project by integrating the Web Audio backend implementation from [ruanformigoni](https://github.com/ruanformigoni) alongside the existing EMSS backend, with an Audio Backend selection setting for switching between the two renderers.
