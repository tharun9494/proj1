import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/firebase_messaging_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Initialize Firebase Messaging Service
  final firebaseMessaging = FirebaseMessagingService();
  await firebaseMessaging.initialize();

  runApp(MyApp());
}

// ... rest of your app code ... 