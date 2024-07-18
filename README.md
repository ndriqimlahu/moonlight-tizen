# Moonlight for Samsung TV (Tizen OS)

[![Project Status](https://img.shields.io/badge/project-actively_maintained-brightgreen?style=for-the-badge&logo=github)](https://github.com/ndriqimlahu/moonlight-tizen)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ndriqimlahu/moonlight-tizen/docker-publish.yml?branch=master&style=for-the-badge&logo=docker)](https://github.com/ndriqimlahu/moonlight-tizen/actions/workflows/docker-publish.yml)
[![Release Version](https://img.shields.io/badge/widget-V1.2.6-orange?style=for-the-badge&logo=windows)](https://github.com/ndriqimlahu/moonlight-tizen/pkgs/container/moonlight-tizen)

## About

[Moonlight for Tizen](https://moonlight-stream.org) is an open source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

Moonlight it allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung Smart TV running **Tizen OS 5.5 or higher**.

Check out the [Moonlight Wiki](https://github.com/moonlight-stream/moonlight-docs/wiki) and [Sunshine Docs](https://docs.lizardbyte.dev/en/latest/) for more details, setup guides, or troubleshooting steps.

## Getting Started

To get started, make sure your setup meets the [Prerequisites](https://github.com/ndriqimlahu/moonlight-tizen#prerequisites) and then follow the [Installation](https://github.com/ndriqimlahu/moonlight-tizen#installation) guide to successfully install Moonlight on your Samsung Smart TV.

### Prerequisites

- Client Requirements — You must have a Samsung Smart TV with Tizen OS starting from model year `2020 (Tizen 5.5) or newer`.

- Host Requirements — It is highly recommended that you have a powerful PC running `Windows 10 64-bit or higher`, that is capable and supports at least hardware-accelerated H.264 video decoding, otherwise it will have to use CPU decoding.
    > Note: You must also have WSL 2 and Docker installed on your computer to proceed with the Moonlight installation. For more details on how to install them, you can check out the installation guides below.
    - Windows Subsystem for Linux (WSL 2) — Check the [Installation](https://learn.microsoft.com/en-us/windows/wsl/install-manual) guide and follow the instructions step by step.
    - Docker Desktop — Check the [Installation](https://docs.docker.com/desktop/) guide and follow the instructions step by step.

- Network Requirements — You need a mid-range or high-end wireless router with a good wireless connection to your client device using `5 GHz WiFi 5 (802.11ac) or WiFi 6 (802.11ax)` and a good wired connection to your host PC using the `Ethernet` cable which is strongly recommended.

## Installation

1. Enable the `Developer mode` on your "Samsung Smart TV" (If you need more details, check the official [Samsung guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)):
	- Go to the `Apps` panel and press `12345` on the remote, then a dialog should popup.
	- Set `Developer mode` to `On`, then enter your computer's IP address in the `Host PC IP` field.
	- Restart the TV by holding the power button, then go to the `Apps` panel.
	- Depending on your model, a `DEVELOP MODE` will appear in the `Apps` panel at the top of the screen.
2. Get the `TV IP Address` on your "Samsung Smart TV":
	- Go to the `Settings` panel, then go to the `General` section.
	- Select the `Network` menu, then select `Network Status` and click the `IP Settings` button.
	- Now you can get the "IP Address" from the `IP Address` field.
3. Now, you need to run `Docker Desktop` and make sure to close any resource intensive applications.
4. Open `Windows PowerShell` or a similar terminal depending on your OS, then enter the following command to pull the pre-built "Docker" image:
	 ```
	 docker pull ghcr.io/ndriqimlahu/moonlight-tizen:master
	 ```
	- This operation may take a while, please be patient.
5. After that, in `Windows PowerShell`, enter the following command to run and enter the container:
	 ```
	 docker run -it --rm ghcr.io/ndriqimlahu/moonlight-tizen:master
	 ```
6. After that, in `Windows PowerShell`, follow the steps below to install the application on your TV:
	- Enter the following command to connect to your "Samsung Smart TV" over "Smart Development Bridge":
	 ```
	 sdb connect YOUR_TV_IP
	 ```
 	> Note: Replace `YOUR_TV_IP` with `IP Address` of your TV.
	- Next, enter the following command to confirm that you are connected, then take note of the "Device ID":
	 ```
	 sdb devices
	 ```
 	> Note: Just to clarify "Device ID" will be the last column, something like `UE55AU7172UXXH`.
	- Next, enter the following command to install the package:
	 ```
	 tizen install -n Moonlight.wgt -t YOUR_DEVICE_ID
	 ```
 	> Note: Replace `YOUR_DEVICE_ID` with `Device ID` of your TV.
	- Next, enter the following command to exit the container:
	 ```
	 exit
	 ```
 	> Note: Moonlight should now be available under `Recent Apps` on your "Samsung Smart TV".
7. Finally, in `Windows PowerShell`, enter the following command to remove the "Docker" image, as it is no longer needed:
	 ```
	 docker image rm ghcr.io/ndriqimlahu/moonlight-tizen:master
	 ```
 	> Note: At the end you can enter the `exit` command to close the `Windows PowerShell` window.
8. (Optional) Disable the `Developer mode` on your "Samsung Smart TV":
	- Go to the `Apps` panel and press `12345` on the remote, then a dialog should popup.
	- Set `Developer mode` to `Off` and then click the `OK` button to close the dialog.
	- Restart the TV by holding the power button, then go to the `Apps` panel.
	- Depending on your model, a `DEVELOP MODE` will disappear from the `Apps` panel at the top of the screen.

## Updating

1. You must delete the existing Moonlight app that you already have on your Samsung Smart TV to prevent errors when installing the new Moonlight app.
2. Then you need to follow the [Installation](https://github.com/ndriqimlahu/moonlight-tizen#installation) guide from the beginning in order to successfully install the latest version of Moonlight on your Samsung Smart TV.

## FAQ

1. How can I add the Moonlight app to the home screen for easy access?
- Once you install the Moonlight app, hover over the app icon and long press the "OK" button on your TV remote. Then select `Add to Home`. Use the cursor to move the icon where you want it to be in the app launcher row on the home screen.

2. How to find specifications and video capabilities for my TV?
- To learn more about your TV's specifications and capabilities, such as supported resolution, frame rate, bit rate, video codecs and their limitations. You can refer to the official [Samsung TV specifications](https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2020-tv-video-specifications.html) and based on the [TV model groups](https://developer.samsung.com/smarttv/develop/specifications/tv-model-groups.html) you can find the model and year of your TV.
- You will then be able to find all the necessary information about your TV's specifications and capabilities, which will help you set the right settings in the Moonlight app.

3. What is the best streaming performance achievable in Moonlight?
- Based on the latest TV video specifications, the high-end devices are powerful enough to push streaming up to `4K 120 FPS HDR` with stereo sound.
- Streaming performance may vary based on your host device, client device and network configuration. So, it is recommended that you adjust the streaming resolution, frame rate, bit rate, and other settings to achieve the desired performance.

4. What video codecs are supported in Moonlight?
- Most common video codecs such as `H.264`, `HEVC (H.265 - Main, Main10)` and `AV1 (Main, Main10)` are supported.
- To use HDR for streaming, then you must have an HDR10-capable device, a GPU that can encode HEVC Main10 or AV1 Main10, and HDR10-enabled game. Games that use DXGI/OS HDR also require an HDR display connected to your host PC.

5. Are keyboard and mouse inputs supported in Moonlight?
- Yes, Moonlight can support any Bluetooth or USB-wired keyboard and mouse input.

6. What are the supported gamepad controllers that I can use on my TV?
- You can use the most popular Bluetooth or USB-wired controllers such as `Xbox Series X/S`, `Xbox One`, `Xbox 360`, `Xbox Elite Wireless Series 2`, `Xbox Adaptive`, `PlayStation DualShock 4`, `PlayStation DualSense`, `Amazon Luna Wireless`, `NVIDIA Shield`, `Logitech F310/F510/F710`, `PowerA MOGA XP5-X Plus Bluetooth` and `Joytron CYVOX DX`.

7. Why am I having some problems with unsupported gamepad controllers on my TV?
- If you use any Bluetooth or USB 2.0 controllers other than those mentioned in the previous question, then unfortunately due to the lack of a large number of unsupported gamepad controllers on Samsung TV, you may encounter such problems like unresponsive D-PAD and Guide button, Y and X button swapping, and other gamepad controller issues.
- We advise you to use one of the supported gamepad controllers to enjoy the best possible gaming experience.

8. How do I connect my Bluetooth gamepad controller to my TV?
- Using your remote, follow these steps: `Settings` -> `Connection` -> `External Device Manager` -> `Input Device Manager` -> `Bluetooth Device List` -> `Pair your controller`.

9. Does the rumble feature work for gamepad controllers in Moonlight?
- Yes, Moonlight supports any wired Bluetooth or USB gamepad controller that has a built-in vibration rumble motor.

10. How can I test the functionality of the gamepad controller on my TV?
- To test the functionality of the gamepad controller on Samsung Smart TV, you can use the [GamepadChecker](https://developer.samsung.com/smarttv/accessory/gamepad.html) application.
- Please visit the above link and follow all the instructions in the `Testing Gamepad Functionality` section to download and install the app on your Samsung Smart TV.

## Changelogs

See the [CHANGELOG](https://github.com/ndriqimlahu/moonlight-tizen/blob/master/CHANGELOG.md) file for more information about the changes for each version of this project.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

If you have a suggestion that would make this project better, then feel free to fork the repo, create a pull request or open an issue.

Also, if you liked the project or found it useful, don't forget to give the project a star!

## License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/ndriqimlahu/moonlight-tizen/blob/master/LICENSE) file for more information.

## Credits
- Thanks to [Moonlight Game Streaming Project](https://github.com/moonlight-stream/moonlight-chrome) for developing and maintaining Moonlight for Chrome OS.
- Thanks to [SamsungDForum](https://github.com/SamsungDForum/moonlight-chrome) for adapting the code and implementing Moonlight for Tizen OS.
- Thanks to [babagreensheep](https://github.com/babagreensheep/jellyfin-tizen-docker) for adapting the Dockerfile and supporting files.
- Thanks to [pablojrl123](https://github.com/pablojrl123/moonlight-tizen-docker) for creating a method for building Moonlight by re-adapting the Dockerfile.
- Thanks to [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) for updating the core files and improving the Dockerfile for better compatibility.
- Thanks to [OneLiberty](https://github.com/OneLiberty/moonlight-chrome-tizen) for fixing many issues in the app and adding new features for a better experience.
