# Changelog

All notable changes to this project will be documented in this file.

## v1.2.13

### Added
- Added the application logo with animation to the splash screen

### Changed
- Increased the spinner size with rounded corners and enhanced text visibility
- Adjusted the size of the 'Add Host' and 'Host Container' icons for better visibility
- Moved the 'icons' folder to the 'static' directory for better organization of assets
- Replaced the function to stop the streaming session with the correct one for keyboard input

### Removed
- Removed unused styling properties and incompatible event listeners

### Fixed
- Fixed a performance issue when navigating game cards in the 'Apps' view

## v1.2.12

### Added
- Added the 'Tizen' profile: 'TV Samsung' to determine the type of device used in the application

### Changed
- Disabled the 'ChromeOS' network service discovery feature, which is not compatible with Tizen OS

### Removed
- Removed the 'Exit app' button from 'Settings' that was used to immediately terminate the app
- Removed the 'Game Mode' metadata to prevent app crash issue when starting streaming on newer Tizen OS

### Fixed
- Fixed an issue with the application icon file path causing a configuration error
- Fixed an issue during address polling when the host status is online or offline
- Fixed a focus issue on the 'Settings' button when returning to the 'Hosts' navigation bar

## v1.2.11

### Added
- Introduced a new 'HDR mode' setting that allows HDR streaming on HDR-capable devices
- Implemented logic to load the stored HDR value and start the stream in HDR mode
- Implemented functionality to update and save the video codec value and the HDR state

### Changed
- Handled switching between standard and Main10 codec profiles based on selected codec and HDR state
- Improved the 'Video codec' setting to better handle codec switching during HDR state changes
- Updated the QR code in the 'Support' dialog that redirects to the new guide

## v1.2.10

### Added
- Introduced a new 'Wake On LAN' feature for waking up the host PC
- Implemented functionality to update and store the valid MAC address for the host PC
- Added a new 'Wake PC' option to the 'Host Menu' dialog to allow waking the host PC
- Introduced a new 'Host Details' dialog and its corresponding view
- Added a new 'View details' option to the 'Host Menu' dialog to view host details

### Fixed
- Minor bug fixes, code refactoring and general improvements

## v1.2.9

### Added
- Added a new 'Menu' icon for the 'Host Menu' button
- Introduced a 'Host Menu' button to show host button options
- Introduced a new 'Host Menu' dialog and its corresponding view
- Implemented functionality to clear box arts from internal storage
- Added a new 'Refresh apps' option to the 'Host Menu' dialog to refresh apps and games
- Added a new 'Delete PC' option to the 'Host Menu' dialog to allow removing the host PC

## v1.2.8

### Added
- Introduced a new 'Flip A/B face buttons' setting that swaps the 'A' and 'B' button mapping for the gamepad
- Introduced a new 'Flip X/Y face buttons' setting that swaps the 'X' and 'Y' button mapping for the gamepad
- Implemented logic to handle different layouts of gamepad face buttons based on toggle state

### Changed
- Optimized functionality to save and load box arts to internal storage for better performance

## v1.2.7

### Added
- Introduced a new 'Input Settings' category which will be used to hold input settings
- Introduced a new 'Rumble feedback' setting that allows changing the state of the rumble feature for the gamepad
- Introduced a new 'Mouse emulation' setting that allows changing the state of the mouse feature for the gamepad

### Fixed
- Minor bug fixes, improved visual styling and general improvements

### Dependencies
- Updated 'material-icons' library to the latest version

## v1.2.6

### Added
- Introduced a new 'Sort apps and games' setting to change the sorting order of apps and games
- Implemented functionality to change the sort order for the list of apps and games

### Fixed
- Fixed a warning issue where casing did not match for 'as' and 'FROM' keywords

### Dependencies
- Updated 'moonlight-common-c' module to the latest version

## v1.2.5

### Added
- Implemented functionality to handle repeat actions and navigation delay for gamepad while in-app
- Implemented a workaround to send the escape key to the host by pressing the ESC key twice on the keyboard

### Removed
- Removed global navigation delay from remote control while in-app

### Fixed
- Minor bug fixes and refactored code for improved readability

### Dependencies
- Updated 'tizen-studio' tool to the latest version

## v1.2.4

### Added
- Added a new 'Navigation' icon for the 'Navigation Guide' button
- Introduced a new 'Navigation Guide' button to learn about navigation controls
- Introduced a new 'Navigation Guide' dialog and its corresponding view
- Implemented functionality for handling the 'Navigation Guide' dialog

### Changed
- Minor enhancements in visual stylization and general improvements

## v1.2.3

### Added
- Added a new 'Tizen' metadata: 'Game Mode' which enables the app to use game mode
- Added the 'Buy Me a Coffee' platform for developer support

### Changed
- Show the 'Restart Moonlight' dialog after restoring default settings instead of the snackbar
- Quick switching to the alternate IP address field can now be done by pressing 'Channel Up/P+' or 'Select/Back' button

### Fixed
- Fixed an issue with the server codec mode support value not displaying correctly

## v1.2.2

### Added
- Added a new 'Tizen' privilege: 'Media Storage' that gives access to the TV's internal storage
- Added additional detailed logging for debugging purposes

### Changed
- Improved existing logs for better debugging and understanding

### Fixed
- Refactored code for improved readability and maintainability

## v1.2.1

### Added
- Introduced a new 'Mouse Emulation' feature for gamepad input
- Added snackbar notifications for mouse emulation state changes
- Implemented logic to handle mouse movements with the Left Stick
- Implemented logic to handle mouse scrolls with the Right Stick
- Implemented logic to handle mouse buttons with the Face Buttons

## v1.2.0

### Added
- Introduced 'AV1' as a new video codec option in the 'Video codec' settings
- Implemented logic to handle server codec mode support checks
- Added the High Level 5.1 profiles for AV1 and AV1 Main10 codecs

### Fixed
- Fixed navigation issues when switching between views

## v1.1.20

### Added
- Added a new 'Tizen' metadata: 'Voice Guide' which disables the voice guide in the app
- Implemented navigation to go to the previous or next row in 'Hosts' view
- Added a navigation delay for the bitrate slider when adjusting the value
- Implemented navigation to go to the previous or next option in 'Settings' view

### Fixed
- Refactored code for improved structure and readability

## v1.1.19

### Added
- Added a new 'Tizen' privilege: 'Fullscreen' which allows the application to use the full screen view
- Disabled the 'Continue' button to prevent multiple connection requests when adding a host
- Re-enabled the 'Continue' button upon successful, failed or cancel processing when adding a host

### Changed
- Enhanced visual styling across multiple elements in the application

### Fixed
- Fixed a navigation issue to ensure proper bound checking for previous/next row

## v1.1.18

### Added
- Added a FUNDING file to enable project funding based on supported model platforms
- Implemented logic to handle focus for the active element based on the IP address switch state

### Changed
- Enhanced navigation controls for the 'Add Host' dialog view
- Updated implementation logic to initialize IP address fields with predefined values

### Fixed
- Fixed navigation issue after removing a host, preventing focus from shifting out of view

## v1.1.17

### Added
- Introduced a new 'IP address field mode' setting to change the field mode when entering the IP address
- Implemented functionality to toggle and save the preferred mode for the IP address field

### Changed
- Enhanced the 'Add Host' dialog to provide two different IP address fields
- Improved navigation for the 'Add Host' dialog view to support both IP address fields

## v1.1.16

### Added
- Added additional navigation controls for special cases
- Added the ability to remove a host by pressing 'Channel Up/P+' (remote) or 'Select/Back' (gamepad) while hovering over the host
- Implemented a rumble vibration effect when the gamepad is connected

### Fixed
- Minor bug fixes and general improvements

## v1.1.15

### Added
- Added a new 'Restart' icon for the 'Restart App' button
- Introduced a 'Restart App' button for instant application restart
- Added additional query parameters for launch and resume requests

### Fixed
- Refactored code for improved structure and readability

## v1.1.14

### Added
- Added a new 'Drop Down' icon for multi-select buttons

### Changed
- Adjusted the size of the 'Add Host' and 'Host Container' icons for better visibility
- Changed the color of the 'Power Off' icon to white as the default
- Enhanced the visual stylization application-wide

## v1.1.13

### Added
- Expanded settings: Reintroduced '90 FPS' frame rate option
- Added bitrate presets for '90 FPS' frame rate option

### Changed
- Improved visibility and readability of tooltips
- Improved snackbar design for enhanced user experience

## v1.1.12

### Added
- Introduced a new 'Video codec' setting that allows selection of video codec
- Implemented functionality to select, save, and initiate the stream with the preferred video codec
- Introduced a new 'Restart Moonlight' dialog and its corresponding view
- Implemented functionality for handling the 'Restart Moonlight' with confirmation dialog
- Added a navigation view for interacting with the new 'Video codec' setting

## v1.1.11

### Added
- Added snackbar notification to warn user to restart app after restoring default settings

### Changed
- Updated the icon of the 'Quit Running App' button for improved appearance
- Improved the snackbar notifications when quitting the running app to provide better clarity
- Upgraded H.264 codec from High Level 4.2 to High Level 5.1 profile

### Removed
- Removed audio encryption flags from stream configurations

### Fixed
- Minor bug fixes and general improvements

## v1.1.10

### Added
- Added bitrate presets for '120 FPS' frame rate option
- Added GitHub Action for automated Docker image publishing

### Changed
- Optimized Dockerfile using multi-stage build to reduce Docker image size

### Fixed
- Fixed gamepad button mapping issue with 'X' and 'Y' buttons

## v1.1.9

### Added
- Added a new 'Power Off' icon for the 'Exit App' button
- Introduced a 'Exit App' button for immediate application termination

### Changed
- Enhanced the visual stylization of the 'Settings' container

### Fixed
- Fixed control navigation issues in multiple views

## v1.1.8

### Added
- Introduced a new 'Restore Defaults' button in the 'Settings' navigation bar
- Introduced a new 'Restore Defaults' dialog and its corresponding view
- Implemented a function to reset all settings to their default values
- Implemented functionality for handling the 'Restore Defaults' with confirmation dialog

## v1.1.7

### Added
- Introduced a new 'About' category that contains a 'System Info' button as a placeholder
- Added three new 'Tizen' privileges that grant access to app and system information
- Implemented functionality to load system information in the 'System Info' button
- Implemented all navigation views for full interaction within the 'Settings' container
- Implemented navigation to go to the previous or next category in 'Settings' view
- Implemented functionality to handle category clicks and show the settings options in the right pane

## v1.1.6

### Added
- Introduced a new 'Settings' button and created a 'Settings' container
- Implemented functionality for managing the 'Settings' container
- Grouped all settings categories and added them to the left pane of the container
- Expanded settings: Reintroduced '120 FPS' frame rate option

### Changed
- Increased the bitrate slider for the bandwidth menu from '100' to '120'
- Grouped and migrated existing settings options to the right pane of the container
- Converted all settings using 'Material Icon Toggle' to the 'Material Switch' for improved appearance

## v1.1.5

### Added
- Introduced a new way to stop the streaming session using the 'Red' button on the remote control
- Implemented a reusable function for terminating the application

### Changed
- Improved host deletion functionality

### Fixed
- Minor bug fixes and general improvements
- Refactored code for improved structure and readability

### Dependencies
- Updated 'moonlight-common-c' module to the latest version

## v1.1.4

### Added
- Added gamepad timestamp for accurate detection of valid gamepads

### Changed
- Rearranged elements for improved structure
- Minor enhancements in visual stylization application-wide

### Fixed
- Fixed header display issues during the loading of host and game views
- Refactored code for improved structure and readability

## v1.1.3

### Changed
- Improved the header style for better appearance
- Updated the navigation logo and title to dynamically change based on the current view
- Enhanced the visual presentation of the host and game grids
- Enhanced the appearance of buttons in the navigation bar

### Removed
- Removed unnecessary media queries from the styling

## v1.1.2

### Changed
- Changed the root directory name for the build package
- Updated directory paths for certain core files

### Removed
- Removed all unnecessary core files of the 'ChromeOS' version
- Removed all unnecessary code components of the 'ChromeOS' version

### Fixed
- Fixed spelling errors in the code

## v1.1.1

### Changed
- Decreased the bitrate slider for the bandwidth menu from '150' to '100'
- Improved text readability of the 'Pairing' and 'Support' dialogs
- Improved the stream settings structure for better clarity

### Dependencies
- Updated 'tizen-studio' tool to the latest version

## v1.1.0

### Changed
- Updated stream configurations to align with the latest versions of modules

### Dependencies
- Updated 'moonlight-common-c' module to the latest version
- Updated 'opus' module to the latest version

## v1.0.20

### Changed
- Improved audio synchronization for a better streaming experience
- Reverted the order of combination keys for keyboard to the previous configuration for stopping streaming sessions
- Adjusted the bitrate presets for each resolution and frame rate options
- Improved the structure of the 'Wasm Player' and added comments to improve code clarity and understanding

### Removed
- Temporarily removed the '90 FPS' and '120 FPS' frame rate options due to functionality issues causing screen freezes

## v1.0.19

### Added
- Added additional TV key buttons and associated key codes
- Added and included a favicon created for the homepage
- Added snackbar notifications for gamepad connection and disconnection events

### Changed
- Improved navigation functionality for both remote control and gamepad input methods

### Removed
- Removed the sound effects to resolve a black screen issue occurring during stream startup

## v1.0.18

### Added
- Added a validation for 'IP Address' input field which allows only a maximum of 15 numerical characters
- Implemented the action of clearing the 'IP Address' input field after successful processing

### Changed
- Minor enhancements in visual stylization

### Fixed
- Fixed the gamepad disconnection issue
- Fixed the 'Volume UI' issue where it would not appear when changing the volume on the TV
- Refactored code for improved structure and readability

## v1.0.17

### Added
- Added a new 'Tizen' privilege: 'IME' which allows entering characters and symbols into text field
- Implemented navigation to go to the previous or next row in 'Apps' view

### Changed
- Improved error handling for missing audio capture device

### Fixed
- Fixed navigation blockage caused by bitrate slider sticking issue in 'Hosts' navigation bar

## v1.0.16

### Added
- Added additional app icon sizes
- Introduced sound effects to enhance the app experience

### Changed
- Minor enhancements in visual stylization

### Fixed
- Refactored code for improved structure and readability

## v1.0.15

### Added
- Added a snackbar notification for offline hosts
- Implemented logic to handle the Left Stick axis for in-app navigation
- Implemented a delay for smoother in-app navigation

### Changed
- Changed bitrate to custom presets for more options
- Updated tooltip text for all 'Settings' options

### Fixed
- Fixed spelling errors in the code

## v1.0.14

### Added
- Expanded settings: Introduced '90 FPS' and '120 FPS' frame rate options

### Changed
- Increased the bitrate slider for the bandwidth menu from '100' to '150'
- Updated server codec and video format

### Fixed
- Fixed focus navigation issue for settings items
- Fixed bitrate presets for '90 FPS' and '120 FPS' frame rate options
- Fixed the order of combination keys for both keyboard and gamepad buttons to stop streaming sessions

## v1.0.13

### Changed
- Updated all core implementation files for 'Tizen'

### Dependencies
- Updated 'opus' module to the latest version

## v1.0.12

### Added
- Introduced a new 'Rumble Feedback' feature for gamepad input

### Changed
- Updated video codecs to a newer version
- Updated all core implementation files for 'ChromeOS'

### Removed
- Removed the 'SLOW_AUDIO_DECODER' condition to resolve a garbled audio playback issue occurring at the beginning of the stream

## v1.0.11

### Added
- Introduced a new 'Support' button and a new 'Support' dialog
- Added the QR code to 'Support' dialog which redirects to a guide
- Implemented functionality for handling the 'Support' dialog

### Changed
- Minor enhancements in visual stylization application-wide

## v1.0.10

### Added
- Introduced a new button: 'Remove All Hosts' in the navigation bar
- Implemented functionality for handling the 'Remove All Hosts' with confirmation

### Fixed
- Fixed control navigation issues in multiple views
- Refactored code for improved structure and readability

## v1.0.9

### Added
- Introduced a new 'Pointing Device' feature for mouse input
- Added tooltip for 'Back' icon button
- Enhancement the UI: Added 'Overlay' for all dialogs

### Changed
- Enhanced overall visual stylization application-wide

## v1.0.8

### Added
- Disabled text selection highlighting application-wide

### Changed
- Reverted a change and added comments for improved code clarity
- Optimized control navigation application-wide

### Fixed
- Refactored code for improved structure and readability

## v1.0.7

### Added
- Enhanced card hover styles for better appearance

### Changed
- Aligned 'Add Host' and 'Hosts PC' text to the center
- Increased the font size application-wide for better readability
- Changed the text content in the 'Pairing' dialog for better clarity
- Improved the readability of dialog texts and snack bar logs

## v1.0.6

### Added
- Enhanced button focus styles for better appearance

### Changed
- Adjusted the width of dialogs application-wide
- Adjusted padding for title and content text in dialogs
- Increased the width of the input field in the 'Add Host' dialog
- Adjusted dialog buttons to increase their size

## v1.0.5

### Added
- Introduced a new 'Exit Moonlight' dialog
- Implemented dynamic handling for 'Exit Moonlight' dialog
- Show 'Exit Moonlight' dialog via 'Back' button on 'Hosts' view

## v1.0.4

### Added
- Added comments to improve code clarity and understanding

### Changed
- Updated '480p' resolution setting
- Updated default bitrate setting to '20 Mbps'
- Reordered 'STOP_STREAM_BUTTONS_FLAGS' buttons

## v1.0.3

### Added
- Expanded settings: Introduced '480p' resolution option
- Added bitrate presets for '480p' resolution option

### Changed
- Changed default bitrate and resolution settings from '720p' to '1080p'

## v1.0.2

### Changed
- Updated the 'Frame Pacing' icon for better appearance in the Settings menu
- Enhanced dialog and error messages application-wide

### Removed
- Removed extra white spaces and code formatting

### Fixed
- Fixed spelling errors in the code

## v1.0.1

### Changed
- Dockerfile has been updated for the build process
- Updated widget name and description
- Improved app logo icons for enhanced appearance in the Smart Hub

## v1.0.0

### Added
- Expanded settings: Introduced '1440p' resolution option
- Added bitrate presets for '1440p' resolution option
- Added a new 'Tizen' privilege: 'TV Audio' which allows to change the volume in the application
- Expanded TV key functionality to allow changing the volume from the remote control
- Implemented 'STOP_STREAM_BUTTONS_FLAGS' condition to specify a combination of buttons on the gamepad for stopping streaming sessions
