import SwiftUI
import Combine

struct MainTabView: View {
    @StateObject private var cart = Cart()
    @StateObject private var favoritesManager = FavoritesManager()
    @State private var selectedTab = 0
    @State private var selectedCategory: ProductCategory? = nil
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(selectedTab: $selectedTab, selectedCategory: $selectedCategory)
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
                .environmentObject(cart)
                .environmentObject(favoritesManager)
            
            CatalogView(selectedCategory: $selectedCategory)
                .tabItem {
                    Image(systemName: "grid.circle.fill")
                    Text("Shop")
                }
                .tag(1)
                .environmentObject(cart)
                .environmentObject(favoritesManager)
            
            CartView()
                .tabItem {
                    Image(systemName: "cart.fill")
                    Text("Cart")
                }
                .tag(2)
                .badge(cart.itemCount > 0 ? "\(cart.itemCount)" : "")
                .environmentObject(cart)
            
            OrdersView()
                .tabItem {
                    Image(systemName: "list.bullet.rectangle")
                    Text("Orders")
                }
                .tag(3)
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("Profile")
                }
                .tag(4)
                .environmentObject(favoritesManager)
        }
        .accentColor(.green)
    }
}

struct HomeView: View {
    @EnvironmentObject var cart: Cart
    @Binding var selectedTab: Int
    @Binding var selectedCategory: ProductCategory?
    @State private var selectedBannerIndex = 0
    
    let promoBanners = [
        PromoBanner(title: "Free Delivery", subtitle: "On orders over $25", imageName: "truck.box.fill", backgroundColor: "green", actionText: "Order Now", discountText: nil),
        PromoBanner(title: "50% OFF", subtitle: "Fresh fruits today only", imageName: "leaf.fill", backgroundColor: "orange", actionText: "Shop Fruits", discountText: "50%"),
        PromoBanner(title: "New Customer", subtitle: "Get $10 off first order", imageName: "gift.fill", backgroundColor: "purple", actionText: "Claim Offer", discountText: "$10"),
        PromoBanner(title: "Weekend Deal", subtitle: "Buy 2 Get 1 Free on snacks", imageName: "bag.fill", backgroundColor: "red", actionText: "Shop Snacks", discountText: "B2G1")
    ]
    
    let quickActions = [
        QuickAction(title: "Express", icon: "bolt.fill", color: "yellow", action: "express"),
        QuickAction(title: "Pharmacy", icon: "cross.fill", color: "red", action: "pharmacy"),
        QuickAction(title: "Alcohol", icon: "wineglass.fill", color: "purple", action: "alcohol"),
        QuickAction(title: "Flowers", icon: "leaf.fill", color: "pink", action: "flowers")
    ]
    
    var body: some View {
        NavigationView {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Header with location and cart
                    HeaderView(selectedTab: $selectedTab)
                    
                    // Promotional Carousel
                    PromoCarouselView(banners: promoBanners, selectedIndex: $selectedBannerIndex, selectedTab: $selectedTab, selectedCategory: $selectedCategory)
                    
                    // Quick Actions
                    QuickActionsView(actions: quickActions)
                    
                    // Categories Section
                    CategoriesSection(selectedTab: $selectedTab, selectedCategory: $selectedCategory)
                    
                    // Popular Products
                    PopularProductsSection(selectedTab: $selectedTab, selectedCategory: $selectedCategory)
                        .environmentObject(cart)
                    
                    // Special Offers
                    SpecialOffersSection()
                        .environmentObject(cart)
                }
            }
            .navigationBarHidden(true)
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct CategoryCard: View {
    let category: ProductCategory
    @Binding var selectedTab: Int
    @Binding var selectedCategory: ProductCategory?
    
    var body: some View {
        Button(action: {
            selectedCategory = category // Set specific category
            selectedTab = 1 // Navigate to Shop tab
        }) {
            VStack {
                Image(systemName: categoryIcon(for: category))
                    .font(.system(size: 40))
                    .foregroundColor(.green)
                    .padding()
                
                Text(category.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.primary)
            }
            .frame(height: 120)
            .frame(maxWidth: .infinity)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(12)
        }
    }
    
    private func categoryIcon(for category: ProductCategory) -> String {
        switch category {
        case .fruits:
            return "leaf.fill"
        case .vegetables:
            return "carrot.fill"
        case .dairy:
            return "drop.fill"
        case .meat:
            return "flame.fill"
        case .bakery:
            return "birthday.cake.fill"
        case .beverages:
            return "cup.and.saucer.fill"
        case .snacks:
            return "bag.fill"
        case .household:
            return "house.fill"
        }
    }
}

// MARK: - New Home Components

struct HeaderView: View {
    @Binding var selectedTab: Int
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "location.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                        Text("Deliver to")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("123 Main Street")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                HStack(spacing: 12) {
                    Button(action: {
                        // Navigate to notifications
                    }) {
                        Image(systemName: "bell")
                            .font(.title3)
                            .foregroundColor(.primary)
                    }
                    
                    Button(action: {
                        selectedTab = 4 // Navigate to Profile tab
                    }) {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundColor(.green)
                    }
                }
            }
            
            // Search Bar
            Button(action: {
                selectedTab = 1 // Navigate to Shop tab
            }) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    
                    Text("Search for groceries, pharmacy...")
                        .foregroundColor(.secondary)
                    
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .background(Color(.systemGroupedBackground))
    }
}

struct PromoCarouselView: View {
    let banners: [PromoBanner]
    @Binding var selectedIndex: Int
    @Binding var selectedTab: Int
    @Binding var selectedCategory: ProductCategory?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TabView(selection: $selectedIndex) {
                ForEach(Array(banners.enumerated()), id: \.offset) { index, banner in
                    PromoBannerCard(banner: banner, selectedTab: $selectedTab, selectedCategory: $selectedCategory)
                        .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle())
            .frame(height: 160)
            .onAppear {
                startAutoScroll()
            }
            
            // Page Indicators
            HStack {
                ForEach(0..<banners.count, id: \.self) { index in
                    Circle()
                        .fill(selectedIndex == index ? Color.green : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                        .animation(.easeInOut, value: selectedIndex)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
        }
        .padding(.top, 16)
    }
    
    private func startAutoScroll() {
        Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.5)) {
                selectedIndex = (selectedIndex + 1) % banners.count
            }
        }
    }
}

struct PromoBannerCard: View {
    let banner: PromoBanner
    @Binding var selectedTab: Int
    @Binding var selectedCategory: ProductCategory?
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                if let discount = banner.discountText {
                    Text(discount)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                
                Text(banner.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(banner.subtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))
                
                Button(action: {
                    handleBannerAction(banner.actionText)
                }) {
                    Text(banner.actionText)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(Color.white)
                        .cornerRadius(16)
                }
                .padding(.top, 4)
            }
            
            Spacer()
            
            Image(systemName: banner.imageName)
                .font(.system(size: 40))
                .foregroundColor(.white.opacity(0.8))
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [colorFromString(banner.backgroundColor), colorFromString(banner.backgroundColor).opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .padding(.horizontal, 16)
    }
    
    private func handleBannerAction(_ actionText: String) {
        switch actionText {
        case "Shop Fruits":
            selectedCategory = .fruits
            selectedTab = 1
        case "Shop Snacks":
            selectedCategory = .snacks
            selectedTab = 1
        default:
            selectedTab = 1
        }
    }
    
    private func colorFromString(_ colorName: String) -> Color {
        switch colorName.lowercased() {
        case "green": return .green
        case "orange": return .orange
        case "purple": return .purple
        case "red": return .red
        case "blue": return .blue
        default: return .green
        }
    }
}

struct QuickActionsView: View {
    let actions: [QuickAction]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Quick Actions")
                .font(.headline)
                .fontWeight(.semibold)
                .padding(.horizontal, 16)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(actions) { action in
                        QuickActionCard(action: action)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.top, 20)
    }
}

struct QuickActionCard: View {
    let action: QuickAction
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: action.icon)
                .font(.title2)
                .foregroundColor(colorFromString(action.color))
                .frame(width: 50, height: 50)
                .background(colorFromString(action.color).opacity(0.1))
                .cornerRadius(25)
            
            Text(action.title)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
        }
        .frame(width: 70)
    }
    
    private func colorFromString(_ colorName: String) -> Color {
        switch colorName.lowercased() {
        case "yellow": return .yellow
        case "red": return .red
        case "purple": return .purple
        case "pink": return .pink
        case "blue": return .blue
        default: return .green
        }
    }
}

struct CategoriesSection: View {
    @Binding var selectedTab: Int
    @Binding var selectedCategory: ProductCategory?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Categories")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Button("See All") {
                    selectedCategory = nil // Clear category filter
                    selectedTab = 1 // Navigate to Shop tab
                }
                .font(.subheadline)
                .foregroundColor(.green)
            }
            .padding(.horizontal, 16)
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 16) {
                ForEach(ProductCategory.allCases.prefix(8), id: \.self) { category in
                    CategoryCard(category: category, selectedTab: $selectedTab, selectedCategory: $selectedCategory)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.top, 24)
    }
}

struct PopularProductsSection: View {
    @EnvironmentObject var cart: Cart
    @Binding var selectedTab: Int
    @Binding var selectedCategory: ProductCategory?
    
    let popularProducts = [
        PopularProduct(product: Product(name: "Fresh Apples", description: "Crisp and sweet", price: 2.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 50), badge: "Popular", originalPrice: 3.99),
        PopularProduct(product: Product(name: "Organic Bananas", description: "Ripe organic", price: 1.99, category: .fruits, imageURL: "", isAvailable: true, stockCount: 30), badge: "Bestseller", originalPrice: nil),
        PopularProduct(product: Product(name: "Whole Milk", description: "Fresh milk 1L", price: 3.50, category: .dairy, imageURL: "", isAvailable: true, stockCount: 25), badge: "Sale", originalPrice: 4.50)
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Popular Right Now")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Button("See All") {
                    selectedCategory = nil // Clear category filter
                    selectedTab = 1 // Navigate to Shop tab
                }
                .font(.subheadline)
                .foregroundColor(.green)
            }
            .padding(.horizontal, 16)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(popularProducts) { item in
                        PopularProductCard(item: item)
                            .environmentObject(cart)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.top, 24)
    }
}

struct PopularProductCard: View {
    let item: PopularProduct
    @EnvironmentObject var cart: Cart
    @EnvironmentObject var favoritesManager: FavoritesManager
    @State private var showingAddedFeedback = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                Rectangle()
                    .fill(Color.gray.opacity(0.1))
                    .frame(width: 140, height: 100)
                    .cornerRadius(12)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.title)
                            .foregroundColor(.gray)
                    )
                
                HStack {
                    if let badge = item.badge {
                        Text(badge)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.red)
                            .cornerRadius(8)
                    }
                    
                    Spacer()
                    
                    // Favorite button
                    CompactFavoriteButton(product: item.product)
                        .environmentObject(favoritesManager)
                }
                .padding(8)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(item.product.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)
                
                HStack {
                    Text(item.product.formattedPrice)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    
                    if let originalPrice = item.originalPrice {
                        Text("$\(originalPrice, specifier: "%.2f")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .strikethrough()
                    }
                }
                
                // Availability indicator
                if item.product.isOutOfStock {
                    Text(item.product.availabilityText)
                        .font(.caption)
                        .foregroundColor(.red)
                        .fontWeight(.medium)
                }
                
                Button(action: {
                    cart.addItem(item.product)
                    showingAddedFeedback = true
                    
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        showingAddedFeedback = false
                    }
                }) {
                    HStack {
                        Image(systemName: showingAddedFeedback ? "checkmark" : "plus")
                        Text(showingAddedFeedback ? "Added" : "Add")
                    }
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(showingAddedFeedback ? .blue : (item.product.isOutOfStock ? .gray : .green))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(showingAddedFeedback ? Color.blue.opacity(0.1) : (item.product.isOutOfStock ? Color.gray.opacity(0.1) : Color.green.opacity(0.1)))
                    .cornerRadius(8)
                }
                .disabled(item.product.isOutOfStock)
                .animation(.easeInOut(duration: 0.2), value: showingAddedFeedback)
            }
        }
        .frame(width: 140)
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct SpecialOffersSection: View {
    @EnvironmentObject var cart: Cart
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Special Offers")
                .font(.headline)
                .fontWeight(.semibold)
                .padding(.horizontal, 16)
            
            VStack(spacing: 12) {
                OfferBanner(
                    title: "Weekend Special",
                    subtitle: "20% off on all fresh vegetables",
                    color: .green,
                    icon: "carrot.fill"
                )
                
                OfferBanner(
                    title: "Flash Sale",
                    subtitle: "Buy 3 Get 1 Free on dairy products",
                    color: .blue,
                    icon: "drop.fill"
                )
            }
            .padding(.horizontal, 16)
        }
        .padding(.top, 24)
        .padding(.bottom, 20)
    }
}

struct OfferBanner: View {
    let title: String
    let subtitle: String
    let color: Color
    let icon: String
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))
            }
            
            Spacer()
            
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(.white.opacity(0.8))
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [color, color.opacity(0.7)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(12)
    }
}

#Preview {
    MainTabView()
}