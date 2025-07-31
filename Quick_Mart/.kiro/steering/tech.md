# Quick Mart - Technical Stack

## Framework & Language
- **Language**: Swift
- **UI Framework**: SwiftUI
- **Platform**: iOS (iPhone)
- **Architecture**: MVVM with ObservableObject pattern

## Key Technologies
- **State Management**: `@StateObject`, `@EnvironmentObject`, `@State`, `@Binding`
- **Navigation**: NavigationView, TabView with tab-based architecture
- **Data Flow**: Combine framework for reactive programming
- **UI Components**: Native SwiftUI components with custom views

## Project Structure
- Standard Xcode project with `.xcodeproj` configuration
- Single target iOS app with unit tests and UI tests
- Asset catalog for images and colors
- No external dependencies (pure SwiftUI/Swift)

## Build System
- **Build Tool**: Xcode build system
- **Package Manager**: None currently (native iOS frameworks only)
- **Deployment Target**: Modern iOS versions

## Common Commands
```bash
# Open project in Xcode
open Quick_Mart.xcodeproj

# Build from command line
xcodebuild -project Quick_Mart.xcodeproj -scheme Quick_Mart build

# Run tests
xcodebuild test -project Quick_Mart.xcodeproj -scheme Quick_Mart -destination 'platform=iOS Simulator,name=iPhone 15'

# Clean build folder
xcodebuild clean -project Quick_Mart.xcodeproj
```

## Development Environment
- Requires Xcode 15+ for SwiftUI features
- iOS Simulator for testing
- No additional setup or dependencies required