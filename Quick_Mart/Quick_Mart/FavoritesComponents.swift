import SwiftUI

// MARK: - Favorite Button Component

struct FavoriteButton: View {
    let product: Product
    @EnvironmentObject var favoritesManager: FavoritesManager
    @State private var isAnimating = false
    
    var body: some View {
        Button(action: {
            toggleFavorite()
        }) {
            Image(systemName: favoritesManager.isFavorite(product) ? "heart.fill" : "heart")
                .foregroundColor(favoritesManager.isFavorite(product) ? .red : .gray)
                .font(.title3)
                .scaleEffect(isAnimating ? 1.3 : 1.0)
                .animation(.easeInOut(duration: 0.2), value: isAnimating)
        }
        .frame(width: 44, height: 44) // Minimum touch target
        .contentShape(Rectangle()) // Expand touch area
        .accessibilityLabel(favoritesManager.isFavorite(product) ? "Remove from favorites" : "Add to favorites")
        .accessibilityHint("Double tap to toggle favorite status")
    }
    
    private func toggleFavorite() {
        // Add haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
        
        // Animate the button
        withAnimation(.easeInOut(duration: 0.2)) {
            isAnimating = true
        }
        
        // Toggle favorite status
        favoritesManager.toggleFavorite(product)
        
        // Reset animation after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            withAnimation(.easeInOut(duration: 0.2)) {
                isAnimating = false
            }
        }
    }
}

// MARK: - Compact Favorite Button

struct CompactFavoriteButton: View {
    let product: Product
    @EnvironmentObject var favoritesManager: FavoritesManager
    @State private var isAnimating = false
    
    var body: some View {
        Button(action: {
            toggleFavorite()
        }) {
            Image(systemName: favoritesManager.isFavorite(product) ? "heart.fill" : "heart")
                .foregroundColor(favoritesManager.isFavorite(product) ? .red : .gray)
                .font(.subheadline)
                .scaleEffect(isAnimating ? 1.2 : 1.0)
                .animation(.easeInOut(duration: 0.15), value: isAnimating)
        }
        .frame(width: 32, height: 32)
        .contentShape(Rectangle())
        .accessibilityLabel(favoritesManager.isFavorite(product) ? "Remove from favorites" : "Add to favorites")
    }
    
    private func toggleFavorite() {
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
        
        withAnimation(.easeInOut(duration: 0.15)) {
            isAnimating = true
        }
        
        favoritesManager.toggleFavorite(product)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(.easeInOut(duration: 0.15)) {
                isAnimating = false
            }
        }
    }
}

// MARK: - Favorite Button Styles

struct FavoriteButtonStyle {
    static let defaultSize: CGFloat = 44
    static let iconSize: Font = .title3
    static let animationDuration: Double = 0.2
    static let scaleEffect: CGFloat = 1.3
}

// MARK: - Preview Helpers

#if DEBUG
struct FavoriteButton_Previews: PreviewProvider {
    static var previews: some View {
        let sampleProduct = Product(
            name: "Sample Product",
            description: "A sample product for preview",
            price: 9.99,
            category: .fruits,
            imageURL: "",
            isAvailable: true,
            stockCount: 10
        )
        
        let favoritesManager = FavoritesManager()
        
        Group {
            // Regular favorite button
            VStack(spacing: 20) {
                Text("Regular Favorite Button")
                    .font(.headline)
                
                HStack(spacing: 30) {
                    VStack {
                        Text("Unfavorited")
                            .font(.caption)
                        FavoriteButton(product: sampleProduct)
                    }
                    
                    VStack {
                        Text("Favorited")
                            .font(.caption)
                        FavoriteButton(product: sampleProduct)
                            .onAppear {
                                favoritesManager.addToFavorites(sampleProduct)
                            }
                    }
                }
                
                Text("Compact Favorite Button")
                    .font(.headline)
                    .padding(.top)
                
                HStack(spacing: 30) {
                    VStack {
                        Text("Unfavorited")
                            .font(.caption)
                        CompactFavoriteButton(product: sampleProduct)
                    }
                    
                    VStack {
                        Text("Favorited")
                            .font(.caption)
                        CompactFavoriteButton(product: sampleProduct)
                    }
                }
            }
            .environmentObject(favoritesManager)
            .padding()
            .previewLayout(.sizeThatFits)
            .previewDisplayName("Favorite Buttons")
        }
    }
}
#endif