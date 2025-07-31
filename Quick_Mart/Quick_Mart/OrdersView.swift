import SwiftUI

struct OrdersView: View {
    @State private var selectedSegment = 0
    let segments = ["Active", "History"]
    
    // Sample active orders
    let activeOrders = [
        ActiveOrder(id: "004", items: ["Fresh Apples", "Organic Milk"], status: .outForDelivery, total: 23.50, estimatedTime: "15 min"),
        ActiveOrder(id: "005", items: ["Bread", "Cheese", "Tomatoes"], status: .preparing, total: 18.75, estimatedTime: "25 min")
    ]
    
    // Sample order history
    let orderHistory = [
        HistoryOrderItem(id: "001", date: Date(), status: .delivered, total: 45.99, itemCount: 5),
        HistoryOrderItem(id: "002", date: Calendar.current.date(byAdding: .day, value: -2, to: Date())!, status: .delivered, total: 32.50, itemCount: 3),
        HistoryOrderItem(id: "003", date: Calendar.current.date(byAdding: .day, value: -5, to: Date())!, status: .cancelled, total: 28.75, itemCount: 4)
    ]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Segmented Control
                Picker("Orders", selection: $selectedSegment) {
                    ForEach(0..<segments.count, id: \.self) { index in
                        Text(segments[index]).tag(index)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content based on selected segment
                if selectedSegment == 0 {
                    ActiveOrdersView(orders: activeOrders)
                } else {
                    OrderHistoryListView(orders: orderHistory)
                }
            }
            .navigationTitle("Orders")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ActiveOrdersView: View {
    let orders: [ActiveOrder]
    
    var body: some View {
        if orders.isEmpty {
            EmptyActiveOrdersView()
        } else {
            List(orders) { order in
                ActiveOrderCard(order: order)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
            }
            .listStyle(PlainListStyle())
        }
    }
}

struct EmptyActiveOrdersView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Active Orders")
                .font(.title2)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
            
            Text("Your active orders will appear here")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

struct ActiveOrderCard: View {
    let order: ActiveOrder
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Order #\(order.id)")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text(order.items.joined(separator: ", "))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(order.formattedTotal)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    
                    Text(order.estimatedTime)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Status Progress
            OrderStatusProgress(status: order.status)
            
            // Action Buttons
            HStack(spacing: 12) {
                Button("Track Order") {
                    // Track order action
                }
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.green)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.green.opacity(0.1))
                .cornerRadius(8)
                
                Button("Contact Driver") {
                    // Contact driver action
                }
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.blue)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
        .padding(.vertical, 6)
    }
}

struct OrderStatusProgress: View {
    let status: OrderStatus
    
    let allStatuses: [OrderStatus] = [.placed, .confirmed, .preparing, .outForDelivery, .delivered]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(status.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                
                Spacer()
                
                if status == .outForDelivery {
                    HStack(spacing: 4) {
                        Image(systemName: "truck.box.fill")
                            .font(.caption)
                            .foregroundColor(.green)
                        Text("On the way")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
            }
            
            // Progress bar
            HStack(spacing: 4) {
                ForEach(0..<allStatuses.count, id: \.self) { index in
                    Rectangle()
                        .fill(index <= currentStatusIndex ? Color.green : Color.gray.opacity(0.3))
                        .frame(height: 4)
                        .cornerRadius(2)
                }
            }
        }
    }
    
    private var currentStatusIndex: Int {
        allStatuses.firstIndex(of: status) ?? 0
    }
}

struct OrderHistoryListView: View {
    let orders: [HistoryOrderItem]
    
    var body: some View {
        if orders.isEmpty {
            EmptyOrderHistoryView()
        } else {
            List(orders) { order in
                OrderHistoryItemRow(order: order)
            }
            .listStyle(PlainListStyle())
        }
    }
}

struct EmptyOrderHistoryView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.text")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Order History")
                .font(.title2)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
            
            Text("Your past orders will appear here")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}

struct OrderHistoryItemRow: View {
    let order: HistoryOrderItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Order #\(order.id)")
                    .font(.headline)
                    .fontWeight(.medium)
                
                Spacer()
                
                OrderStatusBadge(status: order.status)
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
            
            HStack {
                Text(order.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button("Reorder") {
                    // Reorder action
                }
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.green)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Color.green.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding(.vertical, 4)
    }
}

struct OrderStatusBadge: View {
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

// Data Models
struct ActiveOrder: Identifiable {
    let id: String
    let items: [String]
    let status: OrderStatus
    let total: Double
    let estimatedTime: String
    
    var formattedTotal: String {
        return String(format: "$%.2f", total)
    }
}

struct HistoryOrderItem: Identifiable {
    let id: String
    let date: Date
    let status: OrderStatus
    let total: Double
    let itemCount: Int
}

#Preview {
    OrdersView()
}