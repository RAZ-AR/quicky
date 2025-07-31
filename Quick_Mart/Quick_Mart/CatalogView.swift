import SwiftUI

struct CatalogView: View {
    @EnvironmentObject var cart: Cart
    @Binding var selectedCategory: ProductCategory?
    @State private var searchText = ""
    
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
    
    var filteredProducts: [Product] {
        let categoryFiltered = selectedCategory == nil ? sampleProducts : sampleProducts.filter { $0.category == selectedCategory }
        
        if searchText.isEmpty {
            return categoryFiltered
        } else {
            return categoryFiltered.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                SearchBar(text: $searchText)
                    .padding(.horizontal)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        CategoryChip(
                            title: "All",
                            isSelected: selectedCategory == nil,
                            action: { selectedCategory = nil }
                        )
                        
                        ForEach(ProductCategory.allCases, id: \.self) { category in
                            CategoryChip(
                                title: category.rawValue,
                                isSelected: selectedCategory == category,
                                action: { selectedCategory = category }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 8)
                
                ScrollView {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 16) {
                        ForEach(filteredProducts) { product in
                            ProductCard(product: product)
                                .environmentObject(cart)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .navigationTitle("Shop")
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)
            
            TextField("Search products...", text: $text)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(10)
    }
}

struct CategoryChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.green : Color.gray.opacity(0.2))
                .cornerRadius(20)
        }
    }
}

struct ProductCard: View {
    let product: Product
    @EnvironmentObject var cart: Cart
    @EnvironmentObject var favoritesManager: FavoritesManager
    @State private var showingAddedFeedback = false
    
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
                
                // Favorite button overlay
                CompactFavoriteButton(product: product)
                    .environmentObject(favoritesManager)
                    .padding(8)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(product.name)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(product.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                // Availability indicator
                if product.isOutOfStock {
                    Text(product.availabilityText)
                        .font(.caption)
                        .foregroundColor(.red)
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
                        Image(systemName: showingAddedFeedback ? "checkmark" : "plus")
                            .font(.title3)
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(showingAddedFeedback ? Color.blue : (product.isOutOfStock ? Color.gray : Color.green))
                            .clipShape(Circle())
                    }
                    .disabled(product.isOutOfStock)
                    .animation(.easeInOut(duration: 0.2), value: showingAddedFeedback)
                }
            }
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    CatalogView(selectedCategory: .constant(nil))
        .environmentObject(Cart())
}