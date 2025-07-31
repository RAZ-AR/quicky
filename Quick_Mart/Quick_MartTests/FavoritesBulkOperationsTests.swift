import XCTest
import SwiftUI
@testable import Quick_Mart

final class FavoritesBulkOperationsTests: XCTestCase {
    var favoritesManager: FavoritesManager!
    var cart: Cart!
    var sampleProducts: [Product]!
    
    override func setUp() {
        super.setUp()
        favoritesManager = FavoritesManager()
        cart = Cart()
        
        sampleProducts = [
            Product(name: "Apple", description: "Fresh apple", price: 1.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 10),
            Product(name: "Banana", description: "Ripe banana", price: 0.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 15),
            Product(name: "Milk", description: "Fresh milk", price: 3.99, category: .dairy, imageURL: "", isAvailable: true, stockCount: 5),
            Product(name: "Bread", description: "Whole wheat bread", price: 2.49, category: .bakery, imageURL: "", isAvailable: true, stockCount: 8),
            Product(name: "Out of Stock Item", description: "Not available", price: 5.99, category: .vegetables, imageURL: "", isAvailable: false, stockCount: 0)
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
    
    func testAddMultipleToFavorites() {
        // Given - Multiple products
        let productsToAdd = [sampleProducts[0], sampleProducts[1], sampleProducts[2]]
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        
        // When - Adding multiple products to favorites
        favoritesManager.addMultipleToFavorites(productsToAdd)
        
        // Then - All products should be in favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 3)
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[1]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[2]))
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[3]))
    }
    
    func testAddMultipleToFavoritesWithDuplicates() {
        // Given - One product already in favorites
        favoritesManager.addToFavorites(sampleProducts[0])
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        
        // When - Adding multiple products including the existing one
        let productsToAdd = [sampleProducts[0], sampleProducts[1], sampleProducts[2]]
        favoritesManager.addMultipleToFavorites(productsToAdd)
        
        // Then - Should not add duplicates
        XCTAssertEqual(favoritesManager.favoritesCount, 3)
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[1]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[2]))
    }
    
    func testRemoveMultipleFromFavorites() {
        // Given - Multiple products in favorites
        favoritesManager.addMultipleToFavorites(sampleProducts)
        XCTAssertEqual(favoritesManager.favoritesCount, 5)
        
        // When - Removing multiple products
        let productsToRemove = [sampleProducts[0], sampleProducts[2], sampleProducts[4]]
        favoritesManager.removeMultipleFromFavorites(productsToRemove)
        
        // Then - Only specified products should be removed
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[1]))
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[2]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[3]))
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[4]))
    }
    
    func testRemoveMultipleFromFavoritesWithNonExistent() {
        // Given - Some products in favorites
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[1])
        XCTAssertEqual(favoritesManager.favoritesCount, 2)
        
        // When - Removing products including non-existent ones
        let productsToRemove = [sampleProducts[0], sampleProducts[2], sampleProducts[3]]
        favoritesManager.removeMultipleFromFavorites(productsToRemove)
        
        // Then - Should only remove existing favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 1)
        XCTAssertFalse(favoritesManager.isFavorite(sampleProducts[0]))
        XCTAssertTrue(favoritesManager.isFavorite(sampleProducts[1]))
    }
    
    func testAddAllToCart() {
        // Given - Multiple products in favorites, including out of stock
        let availableProducts = [sampleProducts[0], sampleProducts[1], sampleProducts[2]]
        let outOfStockProduct = sampleProducts[4] // Out of stock
        favoritesManager.addMultipleToFavorites(availableProducts + [outOfStockProduct])
        XCTAssertEqual(cart.itemCount, 0)
        
        // When - Adding all favorites to cart
        let result = favoritesManager.addAllToCart(cart, from: sampleProducts)
        
        // Then - Available products should be added, unavailable should be counted
        XCTAssertEqual(result.added, 3)
        XCTAssertEqual(result.unavailable, 1)
        XCTAssertEqual(cart.itemCount, 3)
        
        // Verify specific products in cart
        XCTAssertTrue(cart.items.contains { $0.product.id == sampleProducts[0].id })
        XCTAssertTrue(cart.items.contains { $0.product.id == sampleProducts[1].id })
        XCTAssertTrue(cart.items.contains { $0.product.id == sampleProducts[2].id })
        XCTAssertFalse(cart.items.contains { $0.product.id == sampleProducts[4].id })
    }
    
    func testAddAllToCartWithNoFavorites() {
        // Given - No favorites
        XCTAssertEqual(favoritesManager.favoritesCount, 0)
        XCTAssertEqual(cart.itemCount, 0)
        
        // When - Adding all favorites to cart
        let result = favoritesManager.addAllToCart(cart, from: sampleProducts)
        
        // Then - Nothing should be added
        XCTAssertEqual(result.added, 0)
        XCTAssertEqual(result.unavailable, 0)
        XCTAssertEqual(cart.itemCount, 0)
    }
    
    func testGetFavoritesByCategory() {
        // Given - Products from different categories in favorites
        let fruitsProducts = [sampleProducts[0], sampleProducts[1]] // Apple, Banana
        let dairyProduct = [sampleProducts[2]] // Milk
        let bakeryProduct = [sampleProducts[3]] // Bread
        
        favoritesManager.addMultipleToFavorites(fruitsProducts + dairyProduct + bakeryProduct)
        
        // When - Getting favorites by category
        let favoritesByCategory = favoritesManager.getFavoritesByCategory(from: sampleProducts)
        
        // Then - Should be grouped correctly
        XCTAssertEqual(favoritesByCategory[.fruits]?.count, 2)
        XCTAssertEqual(favoritesByCategory[.dairy]?.count, 1)
        XCTAssertEqual(favoritesByCategory[.bakery]?.count, 1)
        XCTAssertNil(favoritesByCategory[.vegetables])
        
        // Verify specific products
        XCTAssertTrue(favoritesByCategory[.fruits]?.contains { $0.id == sampleProducts[0].id } ?? false)
        XCTAssertTrue(favoritesByCategory[.fruits]?.contains { $0.id == sampleProducts[1].id } ?? false)
        XCTAssertTrue(favoritesByCategory[.dairy]?.contains { $0.id == sampleProducts[2].id } ?? false)
    }
    
    func testGetFavoritesCountByCategory() {
        // Given - Products from different categories in favorites
        favoritesManager.addToFavorites(sampleProducts[0]) // Fruits
        favoritesManager.addToFavorites(sampleProducts[1]) // Fruits
        favoritesManager.addToFavorites(sampleProducts[2]) // Dairy
        
        // When - Getting count by category
        let fruitsCount = favoritesManager.getFavoritesCount(by: .fruits, from: sampleProducts)
        let dairyCount = favoritesManager.getFavoritesCount(by: .dairy, from: sampleProducts)
        let vegetablesCount = favoritesManager.getFavoritesCount(by: .vegetables, from: sampleProducts)
        
        // Then - Counts should be correct
        XCTAssertEqual(fruitsCount, 2)
        XCTAssertEqual(dairyCount, 1)
        XCTAssertEqual(vegetablesCount, 0)
    }
    
    func testGetRecentFavorites() {
        // Given - Products added at different times
        favoritesManager.addToFavorites(sampleProducts[0])
        
        // Simulate time passing
        Thread.sleep(forTimeInterval: 0.01)
        favoritesManager.addToFavorites(sampleProducts[1])
        
        Thread.sleep(forTimeInterval: 0.01)
        favoritesManager.addToFavorites(sampleProducts[2])
        
        Thread.sleep(forTimeInterval: 0.01)
        favoritesManager.addToFavorites(sampleProducts[3])
        
        // When - Getting recent favorites with limit
        let recentFavorites = favoritesManager.getRecentFavorites(from: sampleProducts, limit: 2)
        
        // Then - Should return most recently added items
        XCTAssertEqual(recentFavorites.count, 2)
        
        // Most recent should be included
        let recentIds = Set(recentFavorites.map { $0.id })
        XCTAssertTrue(recentIds.contains(sampleProducts[3].id)) // Most recent
        XCTAssertTrue(recentIds.contains(sampleProducts[2].id)) // Second most recent
    }
    
    func testGetRecentFavoritesWithLimitExceedingCount() {
        // Given - Fewer favorites than limit
        favoritesManager.addToFavorites(sampleProducts[0])
        favoritesManager.addToFavorites(sampleProducts[1])
        
        // When - Getting recent favorites with higher limit
        let recentFavorites = favoritesManager.getRecentFavorites(from: sampleProducts, limit: 5)
        
        // Then - Should return all available favorites
        XCTAssertEqual(recentFavorites.count, 2)
    }
    
    func testBulkOperationsPerformance() {
        // Given - Large number of products
        var largeProductList: [Product] = []
        for i in 0..<100 {
            largeProductList.append(Product(
                name: "Product \(i)",
                description: "Description \(i)",
                price: Double(i),
                category: .fruits,
                imageURL: "",
                isAvailable: true,
                stockCount: 10
            ))
        }
        
        // When - Performing bulk operations
        measure {
            favoritesManager.addMultipleToFavorites(largeProductList)
            let _ = favoritesManager.getFavoritesByCategory(from: largeProductList)
            favoritesManager.removeMultipleFromFavorites(Array(largeProductList.prefix(50)))
        }
        
        // Then - Operations should complete efficiently
        XCTAssertEqual(favoritesManager.favoritesCount, 50)
    }
}