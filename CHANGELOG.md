# Changelog

All notable changes to this project will be documented in this file.

## v1.0.14

### Added
- Expanded settings: Introduced '90 FPS' and '120 FPS' framerate options

### Changed
- Increased the bitrate slider for the bandwidth menu from '100' to '150'
- Updated server codec mode to 'SCM_HEVC_MAIN10' and changed supported video format to 'VIDEO_FORMAT_H265_MAIN10'

### Fixed
- Fixed focus navigation issue for settings items
- Fixed bitrate presets for '90 FPS' and '120 FPS' framerate options
- Fixed order of combination keys on the keyboard and buttons on the gamepad to stop streaming session

## v1.0.13

### Changed
- Updated 'opus' module to v1.4
- Updated wasm core implementation files

## v1.0.12

### Added
- Introduced a new feature: 'Rumble' gamepad support

### Changed
- Updated video codecs to a newer version
- Updated core implementation files

### Fixed
- Fixed garbled audio playback issue at the start of the stream

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

### Fixed
- Fixed spelling errors in the code

### Removed
- Removed extra white spaces and code formatting

## v1.0.1

### Changed
- Dockerfile has been updated for the build process
- Updated widget name and description
- Improved app logo icons for enhanced appearance in the Smart Hub
