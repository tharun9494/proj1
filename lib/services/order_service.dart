import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_firestore/firebase_firestore.dart';

class OrderService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<String> createOrder(Order order) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User must be logged in to create an order');
      }

      // Add user ID to order
      final orderData = {
        ...order.toMap(),
        'userId': user.uid,
        'createdAt': FieldValue.serverTimestamp(),
        'status': 'pending',
      };

      final docRef = await _firestore.collection('orders').add(orderData);
      print('Order created with ID: ${docRef.id}');
      print('Order data: $orderData');
      return docRef.id;
    } catch (e) {
      print('Error creating order: $e');
      throw Exception('Failed to create order');
    }
  }
} 