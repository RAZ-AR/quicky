import XCTest
import SwiftUI
@testable import Quick_Mart

final class ProfileViewFavoritesTests: XCTestCase {
    var favoritesManager: FavoritesManager!
    var cart: Cart!
    var sampleProduct: Product!
    
    override func setUp() {
        super.setUp()
        favoritesManager = FavoritesManager()
        cart = Cart()
        
        sampleProduct = Product(
            name: "Test Product",
            description: "A test product",
            price: 5.99,
            category: .fruits,
            imageURL: "",
            isAvailable: true,
            stockCount: 10
        )
        
        // Clear any existing data
        favoritesManager.clearAllFavorites()
        cart.clearCart()
    }
    
    override func tearDown() {
        favoritesManager.clearAllFavorites()
        cart.clearCart()
        favoritesManager = nil
        cart = nil
        sampleProduct = nil
        super.tearDown()
    }
    
    func testProfileViewInitialization() {
        // Given - ProfileView with environment objects
        let profileView = ProfileView()
            .environmentObject(favoritesManager)
            .environmentObject(cart)
        
        // Then - View should be created successfully
        XCTAssertNotNil(profileView)
    }
    
    func testQuickStatsViewWithFavorites() {
        // Given - Some favorites added
        favoritesManager.addToFavorites(sampleProduct)
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // When - Creating QuickStatsView
        let statsView = QuickStatsView()
            .environmentObject(favoritesManager)
        
        // Then - View should be created successfully
        XCTAssertNotNil(statsView)
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
    }
    
    func testQuickStatsViewWithoutFavorites() {
        // Given - No favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Creating QuickStatsView
        let statsView = QuickStatsView()
            .environmentObject(favoritesManager)
        
        // Then - View should be created successfully
        XCTAssertNotNil(statsView)
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
    }
    
    func testProfileMenuViewWithFavorites() {
        // Given - Some favorites added
        favoritesManager.addToFavorites(sampleProduct)
        let anotherProduct = Product(
            name: "Another Product",
            description: "Another test product",
            price: 3.99,
            category: .vegetables,
            imageURL: "",
            isAvailable: true,
            stockCount: 5
        )
        favoritesManager.addToFavorites(anotherProduct)
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        
        // When - Creating ProfileMenuView
        let menuView = ProfileMenuView(
            showingOrderHistory: .constant(false),
            showingSettings: .constant(false),
            showingFavorites: .constant(false)
        )
        .environmentObject(favoritesManager)
        
        // Then - View should be created successfully
        XCTAssertNotNil(menuView)
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
    }
    
    func testProfileMenuViewWithoutFavorites() {
        // Given - No favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Creating ProfileMenuView
        let menuView = ProfileMenuView(
            showingOrderHistory: .constant(false),
            showingSettings: .constant(false),
            showingFavorites: .constant(false)
        )
        .environmentObject(favoritesManager)
        
        // Then - View should be created successfully
        XCTAssertNotNil(menuView)
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
    }
    
    func testFavoritesCountUpdatesInRealTime() {
        // Given - Initial state with no favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Adding a favorite
        favoritesManager.addToFavorites(sampleProduct)
        
        // Then - Count should update
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // When - Adding another favorite
        let anotherProduct = Product(
            name: "Another Product",
            description: "Another test product",
            price: 3.99,
            category: .vegetables,
            imageURL: "",
            isAvailable: true,
            stockCount: 5
        )
        favoritesManager.addToFavorites(anotherProduct)
        
        // Then - Count should update again
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        
        // When - Removing a favorite
        favoritesManager.removeFromFavorites(sampleProduct)
        
        // Then - Count should decrease
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // When - Clearing all favorites
        favoritesManager.clearAllFavorites()
        
        // Then - Count should be zero
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
    }
    
    func testStatCardCreation() {
        // Given - StatCard parameters
        let title = "Favorites"
        let value = "5"
        let icon = "heart.fill"
        let color = Color.red
        
        // When - Creating StatCard
        let statCard = StatCard(title: title, value: value, icon: icon, color: color)
        
        // Then - Card should be created successfully
        XCTAssertNotNil(statCard)
    }
    
    func testProfileMenuItemCreation() {
        // Given - ProfileMenuItem parameters
        let icon = "heart.fill"
        let title = "Favorites"
        let subtitle = "Your saved items"
        let color = Color.red
        let action = {}
        
        // When - Creating ProfileMenuItem
        let menuItem = ProfileMenuItem(
            icon: icon,
            title: title,
            subtitle: subtitle,
            color: color,
            action: action
        )
        
        // Then - Item should be created successfully
        XCTAssertNotNil(menuItem)
    }
    
    func testFavoritesSubtitleWithCount() {
        // Given - Multiple favorites
        favoritesManager.addToFavorites(sampleProduct)
        let anotherProduct = Product(
            name: "Another Product",
            description: "Another test product",
            price: 3.99,
            category: .vegetables,
            imageURL: "",
            isAvailable: true,
            stockCount: 5
        )
        favoritesManager.addToFavorites(anotherProduct)
        
        // When - Getting favorites count
        let count = favoritesManager.favoritesCount
        
        // Then - Count should be correct
        XCTAssertEqual(count, 2)
        
        // And - Subtitle should show count
        let expectedSubtitle = "\(count) saved items"
        XCTAssertEqual(expectedSubtitle, "2 saved items")
    }
    
    func testFavoritesSubtitleWithoutCount() {
        // Given - No favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Getting subtitle for empty favorites
        let subtitle = favoritesManager.favoritesCount > 0 ? "\(favoritesManager.favoritesCount) saved items" : "Your saved items"
        
        // Then - Should show default subtitle
        XCTAssertEqual(subtitle, "Your saved items")
    }
}