# Changelog

All notable changes to this project will be documented in this file.

## v1.1.7

### Added
- Introduced a new 'About' category that contains a 'System Info' button as a placeholder
- Introduced three new 'Tizen' privileges that grant access to app and system information
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
- Introduced a new option to stop the streaming session using the 'Red' button on the remote control
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
- Added and included a favicon specifically designed for the main page
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
- Introduced a new 'Tizen' privilege: 'IME' which allows entering characters and symbols into text field
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
- Implemented 'Left Analog Stick' axis handling logic to navigate application-wide
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
- Introduced a new feature: 'Rumble' gamepad support

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
- Introduced a new feature: 'Pointing Device' mouse support
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
- Introduced a new feature: 'Terminate Moonlight' dialog
- Implemented dynamic handling for 'Terminate Moonlight' dialog
- Show 'Terminate Moonlight' dialog via 'Back' button on 'Hosts' view

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
- Introduced a new 'Tizen' privilege: 'TV.AUDIO' which allows the application to change the volume
- Expanded TV key functionality to allow changing the volume from the remote control
- Implemented 'STOP_STREAM_BUTTONS_FLAGS' condition to specify a combination of buttons on the gamepad for stopping streaming sessions