# Quick Mart - Project Structure

## File Organization

### Main App Files
- `Quick_MartApp.swift` - App entry point with main WindowGroup
- `ContentView.swift` - Root content view (delegates to MainTabView)
- `MainTabView.swift` - Primary tab navigation container
- `Models.swift` - All data models and business logic

### View Files
- `CatalogView.swift` - Product browsing and search functionality
- `CartView.swift` - Shopping cart management and checkout
- `OrdersView.swift` - Order tracking and history
- `ProfileView.swift` - User profile and settings

### Assets
- `Assets.xcassets/` - App icons, colors, and image assets
- Standard iOS asset catalog structure

### Test Files
- `Quick_MartTests/` - Unit tests
- `Quick_MartUITests/` - UI automation tests

## Architecture Patterns

### View Structure
- Each major feature has its own view file
- Views are composed of smaller, reusable components
- Consistent naming: `[Feature]View.swift`

### Data Models
- All models centralized in `Models.swift`
- Use of `Identifiable`, `Codable` protocols
- ObservableObject pattern for shared state (Cart)

### Navigation Pattern
- Tab-based navigation as primary structure
- NavigationView within each tab for hierarchical navigation
- State binding for cross-tab communication

### Component Naming
- Main views: `[Feature]View`
- Sub-components: `[Feature][Component]` (e.g., `ProductCard`, `CartItemRow`)
- Data models: Descriptive nouns (e.g., `Product`, `Order`, `User`)

## Code Organization Principles
- Single responsibility per file
- Reusable components extracted into separate structs
- Consistent use of SwiftUI property wrappers
- Preview providers for all major views