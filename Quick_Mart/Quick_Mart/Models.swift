import Foundation
import SwiftUI
import Combine

struct Product: Identifiable, Codable {
    let id = UUID()
    let name: String
    let description: String
    let price: Double
    let category: ProductCategory
    let imageURL: String
    let isAvailable: Bool
    let stockCount: Int
    
    var formattedPrice: String {
        return String(format: "$%.2f", price)
    }
}

enum ProductCategory: String, CaseIterable, Codable {
    case fruits = "Fruits"
    case vegetables = "Vegetables"
    case dairy = "Dairy"
    case meat = "Meat"
    case bakery = "Bakery"
    case beverages = "Beverages"
    case snacks = "Snacks"
    case household = "Household"
}

struct CartItem: Identifiable, Codable {
    let id = UUID()
    let product: Product
    var quantity: Int
    
    var totalPrice: Double {
        return product.price * Double(quantity)
    }
}

class Cart: ObservableObject {
    @Published var items: [CartItem] = []
    
    var totalPrice: Double {
        items.reduce(0) { $0 + $1.totalPrice }
    }
    
    var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }
    
    func addItem(_ product: Product) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += 1
        } else {
            items.append(CartItem(product: product, quantity: 1))
        }
    }
    
    func removeItem(_ product: Product) {
        items.removeAll { $0.product.id == product.id }
    }
    
    func updateQuantity(for product: Product, quantity: Int) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            if quantity > 0 {
                items[index].quantity = quantity
            } else {
                items.remove(at: index)
            }
        }
    }
    
    func clearCart() {
        items.removeAll()
    }
}

struct User: Identifiable, Codable {
    let id = UUID()
    let name: String
    let email: String
    let phoneNumber: String
    var addresses: [Address]
    let profileImageURL: String?
}

struct Address: Identifiable, Codable {
    let id = UUID()
    let street: String
    let city: String
    let state: String
    let zipCode: String
    let isDefault: Bool
    
    var fullAddress: String {
        return "\(street), \(city), \(state) \(zipCode)"
    }
}

struct Order: Identifiable, Codable {
    let id = UUID()
    let userId: UUID
    let items: [CartItem]
    let deliveryAddress: Address
    let orderDate: Date
    let estimatedDeliveryTime: Date
    var status: OrderStatus
    let totalAmount: Double
    let paymentMethod: PaymentMethod
    
    var formattedTotal: String {
        return String(format: "$%.2f", totalAmount)
    }
}

enum OrderStatus: String, CaseIterable, Codable {
    case placed = "Order Placed"
    case confirmed = "Confirmed"
    case preparing = "Preparing"
    case outForDelivery = "Out for Delivery"
    case delivered = "Delivered"
    case cancelled = "Cancelled"
}

enum PaymentMethod: String, CaseIterable, Codable {
    case creditCard = "Credit Card"
    case debitCard = "Debit Card"
    case applePay = "Apple Pay"
    case cashOnDelivery = "Cash on Delivery"
}

struct PromoBanner: Identifiable, Codable {
    let id = UUID()
    let title: String
    let subtitle: String
    let imageName: String
    let backgroundColor: String
    let actionText: String
    let discountText: String?
}

struct QuickAction: Identifiable, Codable {
    let id = UUID()
    let title: String
    let icon: String
    let color: String
    let action: String
}

struct PopularProduct: Identifiable, Codable {
    let id = UUID()
    let product: Product
    let badge: String?
    let originalPrice: Double?
    
    var hasDiscount: Bool {
        originalPrice != nil && originalPrice! > product.price
    }
    
    var discountPercentage: Int? {
        guard let original = originalPrice, original > product.price else { return nil }
        return Int(((original - product.price) / original) * 100)
    }
}

// MARK: - Product Extensions for Favorites

extension Product {
    // Note: isFavorite will be determined by FavoritesManager
    // This extension provides a place for future favorite-related computed properties
    
    var isOutOfStock: Bool {
        return !isAvailable || stockCount <= 0
    }
    
    var availabilityText: String {
        if !isAvailable {
            return "Unavailable"
        } else if stockCount <= 0 {
            return "Out of Stock"
        } else if stockCount <= 5 {
            return "Only \(stockCount) left"
        } else {
            return "In Stock"
        }
    }
}

// MARK: - Favorites Models

struct FavoriteItem: Identifiable, Codable {
    let id = UUID()
    let productId: UUID
    let dateAdded: Date
    
    init(productId: UUID) {
        self.productId = productId
        self.dateAdded = Date()
    }
}

// MARK: - Favorites Errors

enum FavoritesError: Error, LocalizedError {
    case persistenceFailure(String)
    case productNotFound(UUID)
    case duplicateProduct(UUID)
    case invalidOperation(String)
    case storageQuotaExceeded
    case corruptedData
    
    var errorDescription: String? {
        switch self {
        case .persistenceFailure(let message):
            return "Failed to save favorites: \(message)"
        case .productNotFound(let id):
            return "Product with ID \(id) not found"
        case .duplicateProduct(let id):
            return "Product with ID \(id) is already in favorites"
        case .invalidOperation(let message):
            return "Invalid operation: \(message)"
        case .storageQuotaExceeded:
            return "Cannot add more favorites: storage limit reached"
        case .corruptedData:
            return "Favorites data is corrupted and has been reset"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .persistenceFailure:
            return "Please try again. If the problem persists, restart the app."
        case .productNotFound:
            return "The product may have been removed from the catalog."
        case .duplicateProduct:
            return "This product is already in your favorites."
        case .invalidOperation:
            return "Please check your input and try again."
        case .storageQuotaExceeded:
            return "Remove some favorites to add new ones."
        case .corruptedData:
            return "Your favorites have been reset. Please add items again."
        }
    }
}

// MARK: - Favorites Persistence

class FavoritesPersistence {
    private let userDefaults = UserDefaults.standard
    private let favoritesKey = "user_favorites"
    private let maxFavoritesCount = 1000 // Reasonable limit
    
    func saveFavorites(_ favoriteItems: [FavoriteItem]) throws {
        // Check storage limits
        guard favoriteItems.count <= maxFavoritesCount else {
            throw FavoritesError.storageQuotaExceeded
        }
        
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(favoriteItems)
            
            // Check data size (UserDefaults has limits)
            guard data.count < 1_000_000 else { // 1MB limit
                throw FavoritesError.storageQuotaExceeded
            }
            
            userDefaults.set(data, forKey: favoritesKey)
            
            // Verify the save was successful
            guard userDefaults.data(forKey: favoritesKey) != nil else {
                throw FavoritesError.persistenceFailure("Data was not saved to UserDefaults")
            }
            
        } catch let error as FavoritesError {
            throw error
        } catch {
            throw FavoritesError.persistenceFailure(error.localizedDescription)
        }
    }
    
    func loadFavorites() throws -> [FavoriteItem] {
        guard let data = userDefaults.data(forKey: favoritesKey) else {
            return [] // No data is not an error
        }
        
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let items = try decoder.decode([FavoriteItem].self, from: data)
            
            // Validate loaded data
            guard items.count <= maxFavoritesCount else {
                throw FavoritesError.corruptedData
            }
            
            // Check for duplicate IDs
            let uniqueIds = Set(items.map { $0.productId })
            guard uniqueIds.count == items.count else {
                throw FavoritesError.corruptedData
            }
            
            return items
            
        } catch let error as FavoritesError {
            throw error
        } catch {
            throw FavoritesError.corruptedData
        }
    }
    
    func clearFavorites() throws {
        userDefaults.removeObject(forKey: favoritesKey)
        
        // Verify the clear was successful
        guard userDefaults.data(forKey: favoritesKey) == nil else {
            throw FavoritesError.persistenceFailure("Failed to clear favorites data")
        }
    }
    
    func getStorageInfo() -> (count: Int, sizeBytes: Int) {
        guard let data = userDefaults.data(forKey: favoritesKey) else {
            return (0, 0)
        }
        
        do {
            let items = try loadFavorites()
            return (items.count, data.count)
        } catch {
            return (0, data.count)
        }
    }
}

// MARK: - Favorites Manager

class FavoritesManager: ObservableObject {
    @Published var favoriteItems: [FavoriteItem] = []
    @Published var lastError: FavoritesError?
    @Published var isLoading = false
    
    private let persistence = FavoritesPersistence()
    
    var favoriteProductIds: Set<UUID> {
        Set(favoriteItems.map { $0.productId })
    }
    
    var favoritesCount: Int {
        favoriteItems.count
    }
    
    var hasError: Bool {
        lastError != nil
    }
    
    init() {
        loadFavorites()
    }
    
    func addToFavorites(_ product: Product) {
        guard !isFavorite(product) else { return }
        
        let favoriteItem = FavoriteItem(productId: product.id)
        favoriteItems.append(favoriteItem)
        saveFavorites()
    }
    
    func removeFromFavorites(_ product: Product) {
        favoriteItems.removeAll { $0.productId == product.id }
        saveFavorites()
    }
    
    func isFavorite(_ product: Product) -> Bool {
        favoriteProductIds.contains(product.id)
    }
    
    func toggleFavorite(_ product: Product) {
        if isFavorite(product) {
            removeFromFavorites(product)
        } else {
            addToFavorites(product)
        }
    }
    
    func getFavoriteProducts(from allProducts: [Product]) -> [Product] {
        let favoriteIds = favoriteProductIds
        return allProducts.filter { favoriteIds.contains($0.id) }
    }
    
    func clearAllFavorites() {
        favoriteItems.removeAll()
        clearFavorites()
    }
    
    // MARK: - Bulk Operations
    
    func addMultipleToFavorites(_ products: [Product]) {
        var hasChanges = false
        
        for product in products {
            if !isFavorite(product) {
                let favoriteItem = FavoriteItem(productId: product.id)
                favoriteItems.append(favoriteItem)
                hasChanges = true
            }
        }
        
        if hasChanges {
            saveFavorites()
        }
    }
    
    func removeMultipleFromFavorites(_ products: [Product]) {
        let productIds = Set(products.map { $0.id })
        let initialCount = favoriteItems.count
        
        favoriteItems.removeAll { productIds.contains($0.productId) }
        
        if favoriteItems.count != initialCount {
            saveFavorites()
        }
    }
    
    func addAllToCart(_ cart: Cart, from products: [Product]) -> (added: Int, unavailable: Int) {
        let favoriteProducts = getFavoriteProducts(from: products)
        var addedCount = 0
        var unavailableCount = 0
        
        for product in favoriteProducts {
            if product.isOutOfStock {
                unavailableCount += 1
            } else {
                cart.addItem(product)
                addedCount += 1
            }
        }
        
        return (added: addedCount, unavailable: unavailableCount)
    }
    
    func getFavoritesByCategory(from products: [Product]) -> [ProductCategory: [Product]] {
        let favoriteProducts = getFavoriteProducts(from: products)
        return Dictionary(grouping: favoriteProducts) { $0.category }
    }
    
    func getFavoritesCount(by category: ProductCategory, from products: [Product]) -> Int {
        return getFavoriteProducts(from: products).filter { $0.category == category }.count
    }
    
    func getRecentFavorites(from products: [Product], limit: Int = 5) -> [Product] {
        let sortedFavorites = favoriteItems.sorted { $0.dateAdded > $1.dateAdded }
        let recentIds = Set(sortedFavorites.prefix(limit).map { $0.productId })
        return products.filter { recentIds.contains($0.id) }
    }
    
    private func loadFavorites() {
        do {
            favoriteItems = try persistence.loadFavorites()
            lastError = nil
        } catch let error as FavoritesError {
            lastError = error
            favoriteItems = []
        } catch {
            lastError = FavoritesError.persistenceFailure(error.localizedDescription)
            favoriteItems = []
        }
    }
    
    private func saveFavorites() {
        do {
            try persistence.saveFavorites(favoriteItems)
            lastError = nil
        } catch let error as FavoritesError {
            lastError = error
        } catch {
            lastError = FavoritesError.persistenceFailure(error.localizedDescription)
        }
    }
    
    private func clearFavorites() {
        do {
            try persistence.clearFavorites()
            lastError = nil
        } catch let error as FavoritesError {
            lastError = error
        } catch {
            lastError = FavoritesError.persistenceFailure(error.localizedDescription)
        }
    }
}