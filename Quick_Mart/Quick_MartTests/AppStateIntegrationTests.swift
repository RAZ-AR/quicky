import XCTest
import SwiftUI
import Combine
@testable import Quick_Mart

final class AppStateIntegrationTests: XCTestCase {
    var favoritesManager: FavoritesManager!
    var cart: Cart!
    var sampleProducts: [Product]!
    
    override func setUp() {
        super.setUp()
        favoritesManager = FavoritesManager()
        cart = Cart()
        
        sampleProducts = [
            Product(name: "Test Apple", description: "Fresh apple", price: 1.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 10),
            Product(name: "Test Banana", description: "Ripe banana", price: 0.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 15),
            Product(name: "Test Milk", description: "Fresh milk", price: 3.99, category: .dairy, imageURL: "", isAvailable: true, stockCount: 5)
        ]
        
        // Clear any existing data
        favoritesManager.clearAllFavorites()
        cart.clearCart()
    }
    
    override func tearDown() {
        favoritesManager.clearAllFavorites()
        cart.clearCart()
        favoritesManager = nil
        cart = nil
        sampleProducts = nil
        super.tearDown()
    }
    
    func testMainTabViewInitialization() {
        // Given - MainTabView
        let mainTabView = MainTabView()
        
        // Then - View should be created successfully
        XCTAssertNotNil(mainTabView)
    }
    
    func testFavoritesManagerStateManagement() {
        // Given - Initial empty state
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        XCTAssertTrue(favoritesManager.favoriteProductIds.isEmpty)
        
        // When - Adding products to favorites
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[1])
        
        // Then - State should be updated
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        XCTAssertEqual(favoritesManager.favoriteProductIds.count, 2)
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[1]))
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[2]))
    }
    
    func testCartAndFavoritesIndependence() {
        // Given - Product in favorites but not in cart
        let product = sampleProducts[0]
        favoritesManager.addToFavorites(product)
        XCTAssertTrue(favoritesManager.isFavorite(product))
        XCTAssertEqual(cart.itemCount, 0)
        
        // When - Adding product to cart
        cart.addItem(product)
        
        // Then - Both favorites and cart should have the product
        XCTAssertTrue(favoritesManager.isFavorite(product))
        XCTAssertEqual(cart.itemCount, 1)
        XCTAssertTrue(cart.items.contains { $0.product.id == product.id })
        
        // When - Removing from favorites
        favoritesManager.removeFromFavorites(product)
        
        // Then - Should be removed from favorites but remain in cart
        XCTAssertFalse(favoritesManager.isFavorite(product))
        XCTAssertEqual(cart.itemCount, 1)
        XCTAssertTrue(cart.items.contains { $0.product.id == product.id })
        
        // When - Removing from cart
        cart.removeItem(product)
        
        // Then - Should be removed from cart
        XCTAssertFalse(favoritesManager.isFavorite(product))
        XCTAssertEqual(cart.itemCount, 0)
    }
    
    func testFavoritesPersistenceAcrossAppSessions() {
        // Given - Products added to favorites
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[1])
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        
        // When - Creating new FavoritesManager (simulating app restart)
        let newFavoritesManager = FavoritesManager()
        
        // Then - Favorites should be restored
        XCTAssertEqual(newFavoritesManager.favoritesCount, 2)
        XCTAssertTrue(newFavoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertTrue(newFavoritesManager.isFavorite(sampleProducts[1]))
        
        // Cleanup
        newFavoritesManager.clearAllFavorites()
    }
    
    func testFavoritesManagerObservableObjectBehavior() {
        // Given - Initial state
        var changeCount = 0
        let cancellable = favoritesManager.objectWillChange.sink {
            changeCount += 1
        }
        
        // When - Making changes to favorites
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[1])
        favoritesManager.removeFromFavorites(sampleProducts[0])
        favoritesManager.clearAllFavorites()
        
        // Then - Should have triggered change notifications
        XCTAssertGreaterThan(changeCount, 0)
        
        cancellable.cancel()
    }
    
    func testMultipleViewsAccessingSameState() {
        // Given - Product added to favorites
        let product = sampleProducts[0]
        favoritesManager.addToFavorites(product)
        
        // When - Creating multiple views that access favorites state
        let catalogView = CatalogView(selectedCategory: .constant(nil))
            .environmentObject(cart)
            .environmentObject(favoritesManager)
        
        let profileView = ProfileView()
            .environmentObject(favoritesManager)
            .environmentObject(cart)
        
        let favoritesView = FavoritesView()
            .environmentObject(favoritesManager)
            .environmentObject(cart)
        
        // Then - All views should be created successfully
        XCTAssertNotNil(catalogView)
        XCTAssertNotNil(profileView)
        XCTAssertNotNil(favoritesView)
        
        // And - State should be consistent across all views
        XCTAssertTrue(favoritesManager.isFavorite(product))
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
    }
    
    func testFavoriteButtonIntegration() {
        // Given - Product and favorite button
        let product = sampleProducts[0]
        XCTAssertFalse(favoritesManager.isFavorite(product))
        
        let favoriteButton = FavoriteButton(product: product)
            .environmentObject(favoritesManager)
        
        // Then - Button should be created successfully
        XCTAssertNotNil(favoriteButton)
        
        // When - Toggling favorite through manager (simulating button tap)
        favoritesManager.toggleFavorite(product)
        
        // Then - State should be updated
        XCTAssertTrue(favoritesManager.isFavorite(product))
        
        // When - Toggling again
        favoritesManager.toggleFavorite(product)
        
        // Then - State should be reverted
        XCTAssertFalse(favoritesManager.isFavorite(product))
    }
    
    func testCompactFavoriteButtonIntegration() {
        // Given - Product and compact favorite button
        let product = sampleProducts[0]
        XCTAssertFalse(favoritesManager.isFavorite(product))
        
        let compactButton = CompactFavoriteButton(product: product)
            .environmentObject(favoritesManager)
        
        // Then - Button should be created successfully
        XCTAssertNotNil(compactButton)
        
        // When - Adding to favorites through manager
        favoritesManager.addToFavorites(product)
        
        // Then - State should be updated
        XCTAssertTrue(favoritesManager.isFavorite(product))
    }
    
    func testStateConsistencyAcrossComponents() {
        // Given - Multiple products
        let product1 = sampleProducts[0]
        let product2 = sampleProducts[1]
        let product3 = sampleProducts[2]
        
        // When - Adding products to favorites in different ways
        favoritesManager.addToFavorites(product1)
        favoritesManager.toggleFavorite(product2) // Should add
        favoritesManager.toggleFavorite(product3) // Should add
        favoritesManager.toggleFavorite(product3) // Should remove
        
        // Then - Final state should be consistent
        XCTAssertTrue(favoritesManager.isFavorite(product1))
        XCTAssertTrue(favoritesManager.isFavorite(product2))
        XCTAssertFalse(favoritesManager.isFavorite(product3))
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        
        // When - Getting favorite products
        let favoriteProducts = favoritesManager.getFavoriteProducts(from: sampleProducts)
        
        // Then - Should return correct products
        XCTAssertEqual(favoriteProducts.count, 2)
        XCTAssertTrue(favoriteProducts.contains { $0.id == product1.id })
        XCTAssertTrue(favoriteProducts.contains { $0.id == product2.id })
        XCTAssertFalse(favoriteProducts.contains { $0.id == product3.id })
    }
    
    func testErrorHandlingInStateManagement() {
        // Given - Valid and invalid operations
        let product = sampleProducts[0]
        
        // When - Adding same product multiple times
        favoritesManager.addToFavorites(product)
        let initialCount = favoritesManager.favoritesCount
        favoritesManager.addToFavorites(product) // Should not add duplicate
        
        // Then - Count should remain the same
        XCTAssertEqual(favoritesManager.favoritesCount, initialCount)
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // When - Removing non-existent product
        let nonExistentProduct = Product(
            name: "Non-existent",
            description: "Does not exist",
            price: 99.99,
            category: .household,
            imageURL: "",
            isAvailable: false,
            stockCount: 0
        )
        favoritesManager.removeFromFavorites(nonExistentProduct)
        
        // Then - Should not affect existing favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        XCTAssertTrue(favoritesManager.isFavorite(product))
    }
}