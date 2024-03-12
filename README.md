# Moonlight for Samsung TV (Tizen OS)

<a href="#" target="_blank">

![Project Status](https://img.shields.io/badge/project-actively_maintained-brightgreen?style=for-the-badge&logo=github)

</a>

## About

[Moonlight](https://moonlight-stream.org) is an open source client for NVIDIA GameStream and [Sunshine](https://app.lizardbyte.dev/Sunshine/).

Moonlight for Tizen allows you to stream your collection of games, programs, or your full desktop from your powerful PC to your Samsung Smart TV running Tizen OS.

Check out the [Moonlight Wiki](https://github.com/moonlight-stream/moonlight-docs/wiki) and [Sunshine Docs](https://docs.lizardbyte.dev/en/latest/) for more detailed project information, setup guide, or troubleshooting steps.

## Getting Started

Starting with the project, you should first take a look at the required [Prerequisites](https://github.com/ndriqimlahu/moonlight-tizen#prerequisites) and then follow the [Installation](https://github.com/ndriqimlahu/moonlight-tizen#installation) instructions in order to successfully install Moonlight on your Samsung Smart TV.

### Prerequisites

Client Requirements −󠀭󠀭 You must have a Samsung Smart TV with Tizen OS starting from model year `2020 (Tizen 5.5) or newer`.

Host Requirements −󠀭󠀭 It is recommended to have a computer with `Windows 10 or later`, you must also have [Windows Subsystem for Linux (WSL 2)](https://learn.microsoft.com/en-us/windows/wsl/install-manual) and [Docker Desktop](https://docs.docker.com/desktop/) installed on your computer.

Network Requirements −󠀭󠀭 To have a good experience, you need a mid to high-end wireless router with a good wireless connection to your client device (5 GHz WiFi 5 (802.11ac) or WiFi 6 (802.11ax) strongly recommended) and a good connection from your PC server to your router (Ethernet/wired connections highly recommended).

### Installation
1. Download the source code or clone this repository to your local machine:
	```
   	git clone https://github.com/ndriqimlahu/moonlight-tizen.git
   	```
2. Now, you need to run `Docker Desktop` before proceeding further and it is also recommended to close any software or application that requires high CPU and memory resources, because `Docker Desktop` will take high resources while running.
3. Open `Windows PowerShell` or a similar terminal depending on your OS, then change directory to where you cloned the repository, then use the `Dockerfile` from source code folder, so for example you should enter the following command to go on that path.
   	```
	cd .\Downloads\moonlight-tizen
	```
4. Enable the `Developer mode` on your "Samsung Smart TV" (If you need more detailed instructions, see the official [Samsung guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)):
	- Go to the `Apps` panel.
	- Press `12345` on the remote and a dialog should popup.
	- Set `Developer mode` to `On` and fill in the `Host PC IP` field which is the `IP Address` of your PC, then click the `OK` button to close the dialog.
	- Restart the TV by holding the power button for 2 seconds as instructed by the new dialog popup, then again go to the `Apps` panel.
	- Depending on your model, a `DEVELOP MODE` or similar message will appear in the `Apps` panel at the top of the screen.
5. After that, in `Windows PowerShell`, enter the following command to build the application within a "Docker" image:
	```
	docker build -t moonlight-tizen . --no-cache
	```
	- This operation may take a while, please be patient.
 	> Note: If you are running "Docker" on a "Mac" with a silicon chip (M1/M2 etc), then you need to change the first line in the `Dockerfile` to `FROM --platform=linux/amd64 ubuntu:22.04` before building the application to ensure compatibility.
6. Find the `TV IP Address` on your "Samsung Smart TV":
	- Go to the `Settings` panel, then go to the `General` section.
	- Select the `Network` menu, then select `Network Status` and click the `IP Settings` button.
	- Now you can get the "IP Address" from the `IP Address` field.
7. After that, in `Windows PowerShell`, follow the steps below to install the application on your TV:
	- Enter the following command to run and enter a container:
	 ```
	 docker run -it --rm moonlight-tizen
	 ```
	- Next, enter the following command to connect to your "Samsung Smart TV" over "Smart Development Bridge":
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
 	- After that, Moonlight should now appear on your `Recent Apps` or similar page on your "Samsung Smart TV".
	- Next, enter the following command to exit the container:
	 ```
	 exit
	 ```
	- Finally, enter the following command to remove the "Docker" image:
	 ```
	 docker image rm moonlight-tizen
	 ```
 	> Note: At the end you can enter the `exit` command to close the `Windows PowerShell` window.
8. (Optional) Disable the `Developer mode` on your "Samsung Smart TV":
	- Go to the `Apps` panel.
	- Press `12345` on the remote and a dialog should popup.
	- Set `Developer mode` to `Off` and then click the `OK` button to close the dialog.
	- Restart the TV by holding the power button for 2 seconds as instructed by the new dialog popup, then again go to the `Apps` panel.
	- Depending on your model, a `DEVELOP MODE` or similar message will disappear from the `Apps` panel at the top of the screen.
9. You can now launch Moonlight on your TV and then pair it with the host computer.
10. Also, make sure to adjust the settings and enjoy the streaming experience.

### Updating

1. Before updating the Moonlight app, you must delete the installed Moonlight app that you already have on your "Samsung Smart TV" to prevent errors during the update.
2. Now, whenever you want to install an updated version of Moonlight on your "Samsung Smart TV", you need to follow the [Installation](https://github.com/ndriqimlahu/moonlight-tizen#installation) instructions in order to successfully install the latest version of Moonlight on your TV.
3. After that, you can launch Moonlight on your TV and enjoy the streaming experience with the latest features.

### FAQ

1. How can I add the Moonlight app to the home screen for easy access?
- Once you install the Moonlight app, hover over the app icon and long press the "OK" button on your TV remote. Then select `Add to Home`. Use the cursor to move the icon where you want it to be in the app launcher row on the home screen.

2. How can I find information about my TV model and the Moonlight app?
- Using your remote or gamepad controller, follow these steps: `Settings` -> `About` -> `System information`.

3. What is the best performance that can be achieved in Moonlight?
- Based on the latest Samsung TVs specifications, the high-end devices are powerful enough to push streaming up to `4K 120 FPS HDR` with stereo sound.
- Streaming performance may vary based on your host device, client device and network setup. So, it is recommended that you adjust the streaming resolution, frame rate, bitrate, and other settings to achieve the best performance.

4. What video codecs are supported in Moonlight?
- Most common video codecs such as `H.264` and `HEVC (H.265 - Main, Main10)` are supported.
- In order to use HDR, then you are required to have an HDR10-capable device, a GPU that can encode HEVC Main 10, and HDR10-enabled game. Games that use DXGI/OS HDR also require an HDR display connected to your host PC.

5. Are keyboard and mouse inputs supported in Moonlight?
- Yes, Moonlight can support any Bluetooth or USB-wired keyboard and mouse input.

6. What are the supported gamepad controllers that I can use on my TV?
- You can use the most popular Bluetooth or USB-wired controllers such as `Xbox Series X/S`, `Xbox One`, `Xbox 360`, `Xbox Elite Wireless Series 2`, `Xbox Adaptive`, `PlayStation DualShock 4`, `PlayStation DualSense`, `Amazon Luna Wireless`, `NVIDIA Shield`, `Logitech F310/F510/F710`, `PowerA MOGA XP5-X Plus Bluetooth` and `Joytron CYVOX DX`.

7. Why am I having some problems with unsupported gamepad controllers on my TV?
- If you use any Bluetooth or USB 2.0 game controllers other than those mentioned in the previous question, then unfortunately you may encounter problems such as unresponsive Guide and D-PAD buttons, Y and X buttons switching, and other gamepad controller issues.
- We advise you to use one of the supported gamepad controllers to enjoy the best possible gaming experience.

8. How do I connect my Bluetooth gamepad controller to my TV?
- Using your remote, follow these steps: `Settings` -> `Connection` -> `External Device Manager` -> `Input Device Manager` -> `Bluetooth Device List` -> `Pair your controller`.

9. Does the rumble feature work for gamepad controllers in Moonlight?
- Yes, Moonlight supports any wired Bluetooth or USB gamepad controller that has a built-in vibration rumble motor.

10. How can I test the functionality of the gamepad controller on my TV?
- To test the functionality of the gamepad controller on Samsung Smart TV, you can use the [GamepadChecker](https://developer.samsung.com/smarttv/accessory/gamepad.html) application.
- Please visit the above link and follow all the instructions in the `Testing Gamepad Functionality` section to download and install the app on your Samsung Smart TV.

11. How can I stop the streaming session in Moonlight?
- Stopping the streaming session can be done in three ways as follows:
    - If you are using the remote control, simply press the `Red` button.
    - If you are using a keyboard, then simultaneously press the key combination: `CTRL` + `ALT` + `SHIFT` + `Q` or alternatively you can press the `F1` key.
    - If you are using a gamepad, then simultaneously press the button combination: `BACK` + `PLAY` + `LB` + `RB`.

## Changelogs

See the [CHANGELOG](https://github.com/ndriqimlahu/moonlight-tizen/blob/main/CHANGELOG.md) file for more information about the changes for each version of this project.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

If you have a suggestion that would make this project better, then feel free to fork the repo, create a pull request or open an issue.

Also, if you liked the project or found it useful, don't forget to give the project a star!

## License

This project is licensed under the `GNU General Public License v3.0`. See the [LICENSE](https://github.com/ndriqimlahu/moonlight-tizen/blob/main/LICENSE) file for more information.

## Acknowledgements
- Thanks to [Moonlight Developers](https://github.com/moonlight-stream/moonlight-chrome) for developing and maintaining Moonlight for Chrome OS.
- Thanks to [Samsung Developers](https://github.com/SamsungDForum/moonlight-chrome) for adapting and implementing Moonlight for Tizen OS which is based on Chrome OS version.
- Thanks to [jellyfin](https://github.com/jellyfin/jellyfin-tizen) and [babagreensheep](https://github.com/babagreensheep/jellyfin-tizen-docker) for adapting the Dockerfile and supporting files.
- Thanks to [pablojrl123](https://github.com/pablojrl123/moonlight-tizen-docker) for creating an easy method for building Moonlight on Tizen OS by re-adapting the Dockerfile.
- Thanks to [KyroFrCode](https://github.com/KyroFrCode/moonlight-chrome-tizen) for updating the content files and re-adapting the Dockerfile for better compatibility.
