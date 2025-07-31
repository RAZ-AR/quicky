import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var favoritesManager: FavoritesManager
    @EnvironmentObject var cart: Cart
    @State private var isEditingProfile = false
    @State private var showingSettings = false
    @State private var showingOrderHistory = false
    @State private var showingFavorites = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Profile Header
                    ProfileHeaderView()
                    
                    // Quick Stats
                    QuickStatsView()
                        .environmentObject(favoritesManager)
                    
                    // Menu Options
                    ProfileMenuView(
                        showingOrderHistory: $showingOrderHistory,
                        showingSettings: $showingSettings,
                        showingFavorites: $showingFavorites
                    )
                    .environmentObject(favoritesManager)
                }
                .padding(.vertical)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Edit") {
                        isEditingProfile = true
                    }
                    .foregroundColor(.green)
                }
            }
            .sheet(isPresented: $isEditingProfile) {
                EditProfileView()
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showingOrderHistory) {
                OrderHistoryView()
            }
            .sheet(isPresented: $showingFavorites) {
                FavoritesView()
                    .environmentObject(favoritesManager)
                    .environmentObject(cart)
            }
        }
    }
}

struct ProfileHeaderView: View {
    var body: some View {
        VStack(spacing: 16) {
            // Profile Image
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.1))
                    .frame(width: 100, height: 100)
                
                Image(systemName: "person.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.green)
            }
            
            VStack(spacing: 4) {
                Text("Armen Baghdasaryan")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("armen@example.com")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack {
                    Image(systemName: "location.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                    Text("123 Main Street, New York")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 4)
            }
        }
        .padding(.horizontal)
    }
}

struct QuickStatsView: View {
    @EnvironmentObject var favoritesManager: FavoritesManager
    
    var body: some View {
        HStack(spacing: 20) {
            StatCard(title: "Orders", value: "12", icon: "bag.fill", color: .green)
            StatCard(title: "Favorites", value: "\(favoritesManager.favoritesCount)", icon: "heart.fill", color: .red)
            StatCard(title: "Points", value: "150", icon: "star.fill", color: .orange)
        }
        .padding(.horizontal)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct ProfileMenuView: View {
    @Binding var showingOrderHistory: Bool
    @Binding var showingSettings: Bool
    @Binding var showingFavorites: Bool
    @EnvironmentObject var favoritesManager: FavoritesManager
    
    var body: some View {
        VStack(spacing: 0) {
            ProfileMenuItem(
                icon: "clock.fill",
                title: "Order History",
                subtitle: "View your past orders",
                color: .blue
            ) {
                showingOrderHistory = true
            }
            
            Divider().padding(.leading, 60)
            
            ProfileMenuItem(
                icon: "heart.fill",
                title: "Favorites",
                subtitle: favoritesManager.favoritesCount > 0 ? "\(favoritesManager.favoritesCount) saved items" : "Your saved items",
                color: .red
            ) {
                showingFavorites = true
            }
            
            Divider().padding(.leading, 60)
            
            ProfileMenuItem(
                icon: "location.fill",
                title: "Addresses",
                subtitle: "Manage delivery addresses",
                color: .green
            ) {
                // Action for addresses
            }
            
            Divider().padding(.leading, 60)
            
            ProfileMenuItem(
                icon: "creditcard.fill",
                title: "Payment Methods",
                subtitle: "Manage your cards",
                color: .purple
            ) {
                // Action for payment methods
            }
            
            Divider().padding(.leading, 60)
            
            ProfileMenuItem(
                icon: "bell.fill",
                title: "Notifications",
                subtitle: "Notification preferences",
                color: .orange
            ) {
                // Action for notifications
            }
            
            Divider().padding(.leading, 60)
            
            ProfileMenuItem(
                icon: "gearshape.fill",
                title: "Settings",
                subtitle: "App preferences",
                color: .gray
            ) {
                showingSettings = true
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

struct ProfileMenuItem: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                    .frame(width: 24, height: 24)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }
}

struct EditProfileView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var name = "Armen Baghdasaryan"
    @State private var email = "armen@example.com"
    @State private var phone = "+1 (555) 123-4567"
    
    var body: some View {
        NavigationView {
            Form {
                Section("Personal Information") {
                    TextField("Full Name", text: $name)
                    TextField("Email", text: $email)
                    TextField("Phone", text: $phone)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
                }
            }
        }
    }
}

struct SettingsView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var notificationsEnabled = true
    @State private var locationEnabled = true
    @State private var darkModeEnabled = false
    
    var body: some View {
        NavigationView {
            Form {
                Section("Preferences") {
                    Toggle("Push Notifications", isOn: $notificationsEnabled)
                    Toggle("Location Services", isOn: $locationEnabled)
                    Toggle("Dark Mode", isOn: $darkModeEnabled)
                }
                
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Terms of Service")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Privacy Policy")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.green)
                }
            }
        }
    }
}

struct OrderHistoryView: View {
    @Environment(\.presentationMode) var presentationMode
    
    let sampleOrders = [
        HistoryOrder(id: "001", date: Date(), status: .delivered, total: 45.99, itemCount: 5),
        HistoryOrder(id: "002", date: Calendar.current.date(byAdding: .day, value: -2, to: Date())!, status: .delivered, total: 32.50, itemCount: 3),
        HistoryOrder(id: "003", date: Calendar.current.date(byAdding: .day, value: -5, to: Date())!, status: .cancelled, total: 28.75, itemCount: 4)
    ]
    
    var body: some View {
        NavigationView {
            List(sampleOrders) { order in
                OrderHistoryRow(order: order)
            }
            .navigationTitle("Order History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.green)
                }
            }
        }
    }
}

struct HistoryOrder: Identifiable {
    let id: String
    let date: Date
    let status: OrderStatus
    let total: Double
    let itemCount: Int
}

struct OrderHistoryRow: View {
    let order: HistoryOrder
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Order #\(order.id)")
                    .font(.headline)
                    .fontWeight(.medium)
                
                Spacer()
                
                StatusBadge(status: order.status)
            }
            
            HStack {
                Text("\(order.itemCount) items")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("$\(order.total, specifier: "%.2f")")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
            }
            
            Text(order.date, style: .date)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct StatusBadge: View {
    let status: OrderStatus
    
    var body: some View {
        Text(status.rawValue)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor)
            .cornerRadius(8)
    }
    
    private var statusColor: Color {
        switch status {
        case .delivered:
            return .green
        case .confirmed, .preparing, .outForDelivery:
            return .blue
        case .placed:
            return .orange
        case .cancelled:
            return .red
        }
    }
}

#Preview {
    ProfileView()
}