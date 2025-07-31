import SwiftUI

struct CartView: View {
    @EnvironmentObject var cart: Cart
    @State private var showingCheckout = false
    
    var body: some View {
        NavigationView {
            VStack {
                if cart.items.isEmpty {
                    EmptyCartView()
                } else {
                    List {
                        ForEach(cart.items) { item in
                            CartItemRow(item: item)
                                .environmentObject(cart)
                        }
                    }
                    .listStyle(PlainListStyle())
                    
                    CartSummary()
                        .environmentObject(cart)
                }
            }
            .navigationTitle("Cart")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if !cart.items.isEmpty {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Clear") {
                            cart.clearCart()
                        }
                        .foregroundColor(.red)
                    }
                }
            }
        }
    }
}

struct EmptyCartView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "cart")
                .font(.system(size: 80))
                .foregroundColor(.gray)
            
            Text("Your cart is empty")
                .font(.title2)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
            
            Text("Add some products to get started")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct CartItemRow: View {
    let item: CartItem
    @EnvironmentObject var cart: Cart
    
    var body: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .frame(width: 60, height: 60)
                .cornerRadius(8)
                .overlay(
                    Image(systemName: "photo")
                        .foregroundColor(.gray)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(item.product.name)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(item.product.formattedPrice)
                    .font(.subheadline)
                    .foregroundColor(.green)
                    .fontWeight(.medium)
            }
            
            Spacer()
            
            VStack(spacing: 8) {
                HStack(spacing: 12) {
                    Button(action: {
                        if item.quantity > 1 {
                            cart.updateQuantity(for: item.product, quantity: item.quantity - 1)
                        } else {
                            cart.removeItem(item.product)
                        }
                    }) {
                        Image(systemName: "minus")
                            .font(.caption)
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                            .background(Color.red)
                            .clipShape(Circle())
                    }
                    
                    Text("\(item.quantity)")
                        .font(.headline)
                        .frame(minWidth: 20)
                    
                    Button(action: {
                        cart.updateQuantity(for: item.product, quantity: item.quantity + 1)
                    }) {
                        Image(systemName: "plus")
                            .font(.caption)
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                            .background(Color.green)
                            .clipShape(Circle())
                    }
                }
                
                Text(String(format: "$%.2f", item.totalPrice))
                    .font(.subheadline)
                    .fontWeight(.bold)
            }
        }
        .padding(.vertical, 4)
    }
}

struct CartSummary: View {
    @EnvironmentObject var cart: Cart
    @State private var showingCheckout = false
    
    var body: some View {
        VStack(spacing: 16) {
            Divider()
            
            VStack(spacing: 8) {
                HStack {
                    Text("Subtotal")
                        .font(.headline)
                    Spacer()
                    Text(String(format: "$%.2f", cart.totalPrice))
                        .font(.headline)
                        .fontWeight(.bold)
                }
                
                HStack {
                    Text("Delivery Fee")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(cart.totalPrice >= 50 ? "FREE" : "$4.99")
                        .foregroundColor(cart.totalPrice >= 50 ? .green : .primary)
                        .fontWeight(.medium)
                }
                
                Divider()
                
                HStack {
                    Text("Total")
                        .font(.title2)
                        .fontWeight(.bold)
                    Spacer()
                    Text(String(format: "$%.2f", cart.totalPrice + (cart.totalPrice >= 50 ? 0 : 4.99)))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
            
            Button(action: {
                showingCheckout = true
            }) {
                Text("Proceed to Checkout")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .sheet(isPresented: $showingCheckout) {
            CheckoutView()
                .environmentObject(cart)
        }
    }
}

struct CheckoutView: View {
    @EnvironmentObject var cart: Cart
    @Environment(\.presentationMode) var presentationMode
    @State private var selectedAddress = 0
    @State private var selectedPayment = 0
    @State private var orderPlaced = false
    
    let sampleAddresses = [
        Address(street: "123 Main St", city: "New York", state: "NY", zipCode: "10001", isDefault: true),
        Address(street: "456 Oak Ave", city: "Brooklyn", state: "NY", zipCode: "11201", isDefault: false)
    ]
    
    let paymentMethods = PaymentMethod.allCases
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if orderPlaced {
                    OrderConfirmationView()
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Delivery Address")
                                    .font(.headline)
                                
                                ForEach(Array(sampleAddresses.enumerated()), id: \.offset) { index, address in
                                    AddressRow(
                                        address: address,
                                        isSelected: selectedAddress == index,
                                        action: { selectedAddress = index }
                                    )
                                }
                            }
                            
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Payment Method")
                                    .font(.headline)
                                
                                ForEach(Array(paymentMethods.enumerated()), id: \.offset) { index, method in
                                    PaymentMethodRow(
                                        method: method,
                                        isSelected: selectedPayment == index,
                                        action: { selectedPayment = index }
                                    )
                                }
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Order Summary")
                                    .font(.headline)
                                
                                ForEach(cart.items) { item in
                                    HStack {
                                        Text("\(item.quantity)x \(item.product.name)")
                                        Spacer()
                                        Text(String(format: "$%.2f", item.totalPrice))
                                    }
                                    .font(.subheadline)
                                }
                                
                                Divider()
                                
                                HStack {
                                    Text("Total")
                                        .fontWeight(.bold)
                                    Spacer()
                                    Text(String(format: "$%.2f", cart.totalPrice + (cart.totalPrice >= 50 ? 0 : 4.99)))
                                        .fontWeight(.bold)
                                        .foregroundColor(.green)
                                }
                            }
                        }
                        .padding()
                    }
                    
                    Button(action: {
                        orderPlaced = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            cart.clearCart()
                            presentationMode.wrappedValue.dismiss()
                        }
                    }) {
                        Text("Place Order")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .cornerRadius(12)
                    }
                    .padding()
                }
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}

struct AddressRow: View {
    let address: Address
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(address.fullAddress)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    if address.isDefault {
                        Text("Default")
                            .font(.caption)
                            .foregroundColor(.green)
                            .fontWeight(.medium)
                    }
                }
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .green : .gray)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
    }
}

struct PaymentMethodRow: View {
    let method: PaymentMethod
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Text(method.rawValue)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .green : .gray)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
    }
}

struct OrderConfirmationView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)
            
            Text("Order Placed!")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Your order has been placed successfully. You'll receive a confirmation shortly.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}


#Preview {
    CartView()
        .environmentObject(Cart())
}