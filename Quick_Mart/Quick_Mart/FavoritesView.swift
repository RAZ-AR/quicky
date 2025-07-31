import SwiftUI

// MARK: - Favorites View

struct FavoritesView: View {
    @EnvironmentObject var favoritesManager: FavoritesManager
    @EnvironmentObject var cart: Cart
    @Environment(\.presentationMode) var presentationMode
    @State private var isSelectionMode = false
    @State private var selectedProducts: Set<UUID> = []
    @State private var showingBulkActionAlert = false
    @State private var bulkActionResult: (added: Int, unavailable: Int) = (0, 0)
    
    // Sample products for demonstration (in real app, this would come from a service)
    let sampleProducts = [
        // Fruits
        Product(name: "Fresh Apples", description: "Crisp and sweet red apples", price: 3.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 50),
        Product(name: "Organic Bananas", description: "Ripe organic bananas", price: 2.49, category: .fruits, imageURL: "", isAvailable: true, stockCount: 30),
        Product(name: "Fresh Oranges", description: "Juicy Valencia oranges", price: 4.25, category: .fruits, imageURL: "", isAvailable: true, stockCount: 35),
        Product(name: "Strawberries", description: "Sweet red strawberries", price: 5.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 20),
        
        // Vegetables
        Product(name: "Fresh Carrots", description: "Organic orange carrots", price: 1.99, category: .vegetables, imageURL: "", isAvailable: true, stockCount: 40),
        Product(name: "Bell Peppers", description: "Colorful bell peppers", price: 3.49, category: .vegetables, imageURL: "", isAvailable: true, stockCount: 25),
        Product(name: "Broccoli", description: "Fresh green broccoli", price: 2.99, category: .vegetables, imageURL: "", isAvailable: true, stockCount: 30),
        Product(name: "Tomatoes", description: "Ripe red tomatoes", price: 3.99, category: .vegetables, imageURL: "", isAvailable: true, stockCount: 45),
        
        // Dairy
        Product(name: "Whole Milk", description: "Fresh whole milk 1L", price: 4.50, category: .dairy, imageURL: "", isAvailable: true, stockCount: 25),
        Product(name: "Greek Yogurt", description: "Creamy Greek yogurt", price: 6.99, category: .dairy, imageURL: "", isAvailable: true, stockCount: 18),
        Product(name: "Cheddar Cheese", description: "Sharp cheddar cheese", price: 7.49, category: .dairy, imageURL: "", isAvailable: true, stockCount: 22),
        Product(name: "Butter", description: "Unsalted butter", price: 5.25, category: .dairy, imageURL: "", isAvailable: true, stockCount: 15),
        
        // Meat
        Product(name: "Ground Beef", description: "Fresh ground beef 1lb", price: 8.99, category: .meat, imageURL: "", isAvailable: true, stockCount: 20),
        Product(name: "Chicken Breast", description: "Boneless chicken breast", price: 12.99, category: .meat, imageURL: "", isAvailable: true, stockCount: 15),
        Product(name: "Salmon Fillet", description: "Fresh Atlantic salmon", price: 16.99, category: .meat, imageURL: "", isAvailable: true, stockCount: 10),
        Product(name: "Pork Chops", description: "Thick cut pork chops", price: 11.49, category: .meat, imageURL: "", isAvailable: true, stockCount: 12),
        
        // Bakery
        Product(name: "Sourdough Bread", description: "Artisan sourdough bread", price: 5.99, category: .bakery, imageURL: "", isAvailable: true, stockCount: 15),
        Product(name: "Croissants", description: "Buttery croissants (6 pack)", price: 7.99, category: .bakery, imageURL: "", isAvailable: true, stockCount: 12),
        Product(name: "Bagels", description: "Everything bagels (12 pack)", price: 6.49, category: .bakery, imageURL: "", isAvailable: true, stockCount: 18),
        Product(name: "Muffins", description: "Blueberry muffins (4 pack)", price: 8.99, category: .bakery, imageURL: "", isAvailable: true, stockCount: 10),
        
        // Beverages
        Product(name: "Orange Juice", description: "Fresh squeezed orange juice", price: 5.49, category: .beverages, imageURL: "", isAvailable: true, stockCount: 24),
        Product(name: "Sparkling Water", description: "Sparkling mineral water", price: 3.99, category: .beverages, imageURL: "", isAvailable: true, stockCount: 30),
        Product(name: "Coffee Beans", description: "Premium coffee beans", price: 12.99, category: .beverages, imageURL: "", isAvailable: true, stockCount: 16),
        Product(name: "Green Tea", description: "Organic green tea bags", price: 4.99, category: .beverages, imageURL: "", isAvailable: true, stockCount: 20),
        
        // Snacks
        Product(name: "Potato Chips", description: "Crispy potato chips", price: 3.49, category: .snacks, imageURL: "", isAvailable: true, stockCount: 35),
        Product(name: "Mixed Nuts", description: "Roasted mixed nuts", price: 8.99, category: .snacks, imageURL: "", isAvailable: true, stockCount: 22),
        Product(name: "Chocolate Bar", description: "Dark chocolate bar", price: 4.25, category: .snacks, imageURL: "", isAvailable: true, stockCount: 28),
        Product(name: "Granola Bars", description: "Healthy granola bars (6 pack)", price: 6.99, category: .snacks, imageURL: "", isAvailable: true, stockCount: 25),
        
        // Household
        Product(name: "Paper Towels", description: "Absorbent paper towels", price: 8.99, category: .household, imageURL: "", isAvailable: true, stockCount: 40),
        Product(name: "Dish Soap", description: "Concentrated dish soap", price: 3.99, category: .household, imageURL: "", isAvailable: true, stockCount: 35),
        Product(name: "Laundry Detergent", description: "High-efficiency detergent", price: 12.49, category: .household, imageURL: "", isAvailable: true, stockCount: 18),
        Product(name: "Toilet Paper", description: "Soft toilet paper (12 pack)", price: 15.99, category: .household, imageURL: "", isAvailable: true, stockCount: 25)
    ]
    
    var favoriteProducts: [Product] {
        favoritesManager.getFavoriteProducts(from: sampleProducts)
    }
    
    var body: some View {
        NavigationView {
            Group {
                if favoriteProducts.isEmpty {
                    EmptyFavoritesView()
                } else {
                    FavoriteProductsGrid(
                        products: favoriteProducts,
                        isSelectionMode: $isSelectionMode,
                        selectedProducts: $selectedProducts
                    )
                }
            }
            .navigationTitle("Favorites")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if isSelectionMode {
                        Button("Cancel") {
                            isSelectionMode = false
                            selectedProducts.removeAll()
                        }
                        .foregroundColor(.green)
                    } else {
                        Button("Done") {
                            presentationMode.wrappedValue.dismiss()
                        }
                        .foregroundColor(.green)
                    }
                }
                
                if !favoriteProducts.isEmpty {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        if isSelectionMode {
                            Menu {
                                Button("Add Selected to Cart") {
                                    addSelectedToCart()
                                }
                                .disabled(selectedProducts.isEmpty)
                                
                                Button("Remove Selected", role: .destructive) {
                                    removeSelectedFromFavorites()
                                }
                                .disabled(selectedProducts.isEmpty)
                                
                                Button("Select All") {
                                    selectAllProducts()
                                }
                                
                                Button("Deselect All") {
                                    selectedProducts.removeAll()
                                }
                                .disabled(selectedProducts.isEmpty)
                            } label: {
                                Text("Actions")
                                    .foregroundColor(.green)
                            }
                        } else {
                            Menu {
                                Button("Select Items") {
                                    isSelectionMode = true
                                }
                                
                                Button("Add All to Cart") {
                                    addAllToCart()
                                }
                                
                                Divider()
                                
                                Button("Clear All Favorites", role: .destructive) {
                                    favoritesManager.clearAllFavorites()
                                }
                            } label: {
                                Image(systemName: "ellipsis.circle")
                                    .foregroundColor(.green)
                            }
                        }
                    }
                }
            }
            .alert("Items Added to Cart", isPresented: $showingBulkActionAlert) {
                Button("OK") { }
            } message: {
                if bulkActionResult.unavailable > 0 {
                    Text("Added \(bulkActionResult.added) items to cart. \(bulkActionResult.unavailable) items were unavailable.")
                } else {
                    Text("Added \(bulkActionResult.added) items to cart.")
                }
            }
        }
    }
    
    // MARK: - Bulk Operations Methods
    
    private func addSelectedToCart() {
        let selectedFavoriteProducts = favoriteProducts.filter { selectedProducts.contains($0.id) }
        var addedCount = 0
        var unavailableCount = 0
        
        for product in selectedFavoriteProducts {
            if product.isOutOfStock {
                unavailableCount += 1
            } else {
                cart.addItem(product)
                addedCount += 1
            }
        }
        
        bulkActionResult = (added: addedCount, unavailable: unavailableCount)
        showingBulkActionAlert = true
        
        // Exit selection mode
        isSelectionMode = false
        selectedProducts.removeAll()
    }
    
    private func removeSelectedFromFavorites() {
        let selectedFavoriteProducts = favoriteProducts.filter { selectedProducts.contains($0.id) }
        favoritesManager.removeMultipleFromFavorites(selectedFavoriteProducts)
        
        // Exit selection mode
        isSelectionMode = false
        selectedProducts.removeAll()
    }
    
    private func selectAllProducts() {
        selectedProducts = Set(favoriteProducts.map { $0.id })
    }
    
    private func addAllToCart() {
        let result = favoritesManager.addAllToCart(cart, from: sampleProducts)
        bulkActionResult = result
        showingBulkActionAlert = true
    }
}

// MARK: - Empty Favorites View

struct EmptyFavoritesView: View {
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "heart")
                .font(.system(size: 80))
                .foregroundColor(.gray.opacity(0.6))
            
            VStack(spacing: 8) {
                Text("No Favorites Yet")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text("Tap the heart icon on products you love to save them here for quick access")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 32)
            }
            
            VStack(spacing: 16) {
                HStack(spacing: 12) {
                    Image(systemName: "heart")
                        .font(.title3)
                        .foregroundColor(.red)
                    
                    Text("Tap to add favorites")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                HStack(spacing: 12) {
                    Image(systemName: "cart")
                        .font(.title3)
                        .foregroundColor(.green)
                    
                    Text("Quick add to cart")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Favorite Products Grid

struct FavoriteProductsGrid: View {
    let products: [Product]
    @EnvironmentObject var favoritesManager: FavoritesManager
    @EnvironmentObject var cart: Cart
    @Binding var isSelectionMode: Bool
    @Binding var selectedProducts: Set<UUID>
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 16) {
                ForEach(products) { product in
                    FavoriteProductCard(
                        product: product,
                        isSelectionMode: isSelectionMode,
                        isSelected: selectedProducts.contains(product.id)
                    ) {
                        toggleSelection(for: product)
                    }
                    .environmentObject(cart)
                    .environmentObject(favoritesManager)
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }
        .background(Color(.systemGroupedBackground))
    }
    
    private func toggleSelection(for product: Product) {
        if selectedProducts.contains(product.id) {
            selectedProducts.remove(product.id)
        } else {
            selectedProducts.insert(product.id)
        }
    }
}

// MARK: - Favorite Product Card

struct FavoriteProductCard: View {
    let product: Product
    let isSelectionMode: Bool
    let isSelected: Bool
    let onSelectionToggle: () -> Void
    @EnvironmentObject var cart: Cart
    @EnvironmentObject var favoritesManager: FavoritesManager
    @State private var showingAddedFeedback = false
    
    init(product: Product, isSelectionMode: Bool = false, isSelected: Bool = false, onSelectionToggle: @escaping () -> Void = {}) {
        self.product = product
        self.isSelectionMode = isSelectionMode
        self.isSelected = isSelected
        self.onSelectionToggle = onSelectionToggle
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 120)
                    .cornerRadius(8)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.title)
                            .foregroundColor(.gray)
                    )
                
                if isSelectionMode {
                    // Selection indicator
                    Button(action: onSelectionToggle) {
                        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                            .font(.title2)
                            .foregroundColor(isSelected ? .green : .gray)
                            .background(Color.white)
                            .clipShape(Circle())
                    }
                    .padding(8)
                } else {
                    // Favorite button overlay
                    FavoriteButton(product: product)
                        .environmentObject(favoritesManager)
                        .padding(4)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(product.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                // Category badge
                Text(product.category.rawValue)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
                
                // Availability indicator
                if product.isOutOfStock {
                    Text(product.availabilityText)
                        .font(.caption)
                        .foregroundColor(.red)
                        .fontWeight(.medium)
                } else if product.stockCount <= 5 {
                    Text(product.availabilityText)
                        .font(.caption)
                        .foregroundColor(.orange)
                        .fontWeight(.medium)
                }
                
                HStack {
                    Text(product.formattedPrice)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    
                    Spacer()
                    
                    Button(action: {
                        cart.addItem(product)
                        showingAddedFeedback = true
                        
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            showingAddedFeedback = false
                        }
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: showingAddedFeedback ? "checkmark" : "plus")
                            Text(showingAddedFeedback ? "Added" : "Add")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(showingAddedFeedback ? Color.blue : (product.isOutOfStock ? Color.gray : Color.green))
                        .cornerRadius(16)
                    }
                    .disabled(product.isOutOfStock)
                    .animation(.easeInOut(duration: 0.2), value: showingAddedFeedback)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Preview

#if DEBUG
struct FavoritesView_Previews: PreviewProvider {
    static var previews: some View {
        let favoritesManager = FavoritesManager()
        let cart = Cart()
        
        // Add some sample favorites
        let sampleProduct1 = Product(name: "Fresh Apples", description: "Crisp and sweet", price: 3.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 50)
        let sampleProduct2 = Product(name: "Organic Bananas", description: "Ripe organic", price: 2.49, category: .fruits, imageURL: "", isAvailable: true, stockCount: 30)
        
        favoritesManager.addToFavorites(sampleProduct1)
        favoritesManager.addToFavorites(sampleProduct2)
        
        return Group {
            // Favorites with items
            FavoritesView()
                .environmentObject(favoritesManager)
                .environmentObject(cart)
                .previewDisplayName("With Favorites")
            
            // Empty favorites
            FavoritesView()
                .environmentObject(FavoritesManager())
                .environmentObject(Cart())
                .previewDisplayName("Empty Favorites")
        }
    }
}
#endif