import XCTest
import SwiftUI
@testable import Quick_Mart

final class FavoritesViewTests: XCTestCase {
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
            Product(name: "Test Milk", description: "Fresh milk", price: 3.99, category: .dairy, imageURL: "", isAvailable: true, stockCount: 5),
            Product(name: "Out of Stock Item", description: "Not available", price: 5.99, category: .vegetables, imageURL: "", isAvailable: false, stockCount: 0)
        ]
        
        // Clear any existing favorites
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
    
    func testFavoritesViewInitialization() {
        // Given - Empty favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Creating FavoritesView
        let favoritesView = FavoritesView()
            .environmentObject(favoritesManager)
            .environmentObject(cart)
        
        // Then - View should be created successfully
        XCTAssertNotNil(favoritesView)
    }
    
    func testEmptyFavoritesView() {
        // Given - No favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Creating EmptyFavoritesView
        let emptyView = EmptyFavoritesView()
        
        // Then - View should be created successfully
        XCTAssertNotNil(emptyView)
    }
    
    func testFavoriteProductsGrid() {
        // Given - Some favorite products
        let favoriteProducts = [sampleProducts[0], sampleProducts[1]]
        
        // When - Creating FavoriteProductsGrid
        let gridView = FavoriteProductsGrid(
            products: favoriteProducts,
            isSelectionMode: .constant(false),
            selectedProducts: .constant(Set<UUID>())
        )
        .environmentObject(favoritesManager)
        .environmentObject(cart)
        
        // Then - View should be created successfully
        XCTAssertNotNil(gridView)
    }
    
    func testFavoriteProductCard() {
        // Given - A sample product
        let product = sampleProducts[0]
        
        // When - Creating FavoriteProductCard
        let cardView = FavoriteProductCard(product: product)
            .environmentObject(cart)
            .environmentObject(favoritesManager)
        
        // Then - View should be created successfully
        XCTAssertNotNil(cardView)
    }
    
    func testFavoriteProductsFiltering() {
        // Given - Some products, some favorited
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[2])
        
        // When - Getting favorite products
        let favoriteProducts = favoritesManager.getFavoriteProducts(from: sampleProducts)
        
        // Then - Should return only favorited products
        XCTAssertEqual(favoriteProducts.count, 2)
        XCTAssertTrue(favoriteProducts.contains { $0.id == sampleProducts[0].id })
        XCTAssertTrue(favoriteProducts.contains { $0.id == sampleProducts[2].id })
        XCTAssertFalse(favoriteProducts.contains { $0.id == sampleProducts[1].id })
    }
    
    func testAddToCartFromFavorites() {
        // Given - Product in favorites and empty cart
        let product = sampleProducts[0]
        favoritesManager.addToFavorites(product)
        XCTAssertEqual(cart.itemCount, 0)
        
        // When - Adding product to cart
        cart.addItem(product)
        
        // Then - Product should be in cart
        XCTAssertEqual(cart.itemCount, 1)
        XCTAssertTrue(cart.items.contains { $0.product.id == product.id })
        
        // And - Product should still be in favorites
        XCTAssertTrue(favoritesManager.isFavorite(product))
    }
    
    func testRemoveFromFavorites() {
        // Given - Product in favorites
        let product = sampleProducts[0]
        favoritesManager.addToFavorites(product)
        XCTAssertTrue(favoritesManager.isFavorite(product))
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // When - Removing from favorites
        favoritesManager.removeFromFavorites(product)
        
        // Then - Product should not be in favorites
        XCTAssertFalse(favoritesManager.isFavorite(product))
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
    }
    
    func testClearAllFavorites() {
        // Given - Multiple products in favorites
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[1])
        favoritesManager.addToFavorites(sampleProducts[2])
        XCTAssertEqual(favoritesManager.favoritesCount, 3)
        
        // When - Clearing all favorites
        favoritesManager.clearAllFavorites()
        
        // Then - No products should be in favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[1]))
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[2]))
    }
    
    func testOutOfStockProductInFavorites() {
        // Given - Out of stock product
        let outOfStockProduct = sampleProducts[3]
        XCTAssertTrue(outOfStockProduct.isOutOfStock)
        
        // When - Adding to favorites
        favoritesManager.addToFavorites(outOfStockProduct)
        
        // Then - Product should be in favorites
        XCTAssertTrue(favoritesManager.isFavorite(outOfStockProduct))
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // And - Product should show correct availability
        XCTAssertEqual(outOfStockProduct.availabilityText, "Unavailable")
    }
    
    func testLowStockProductInFavorites() {
        // Given - Low stock product
        let lowStockProduct = sampleProducts[2] // stockCount: 5
        XCTAssertFalse(lowStockProduct.isOutOfStock)
        XCTAssertEqual(lowStockProduct.stockCount, 5)
        
        // When - Adding to favorites
        favoritesManager.addToFavorites(lowStockProduct)
        
        // Then - Product should be in favorites
        XCTAssertTrue(favoritesManager.isFavorite(lowStockProduct))
        
        // And - Product should show low stock warning
        XCTAssertEqual(lowStockProduct.availabilityText, "Only 5 left")
    }
    
    func testFavoriteProductCardWithDifferentStates() {
        // Test that FavoriteProductCard can handle different product states
        let availableProduct = sampleProducts[0]
        let outOfStockProduct = sampleProducts[3]
        
        // Both should be able to create cards
        let availableCard = FavoriteProductCard(product: availableProduct)
            .environmentObject(cart)
            .environmentObject(favoritesManager)
        
        let outOfStockCard = FavoriteProductCard(product: outOfStockProduct)
            .environmentObject(cart)
            .environmentObject(favoritesManager)
        
        XCTAssertNotNil(availableCard)
        XCTAssertNotNil(outOfStockCard)
    }
}