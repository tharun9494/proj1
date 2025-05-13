import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'services/firebase_messaging_service.dart';
import 'package:http/http.dart' as http;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    print('Initializing Firebase...');
    await Firebase.initializeApp();
    print('Firebase initialized successfully');
    
    // Initialize Firebase Messaging Service
    final firebaseMessaging = FirebaseMessagingService();
    await firebaseMessaging.initialize();

    runApp(MyApp());
  } catch (e) {
    print('ERROR initializing Firebase: $e');
    print('Error stack trace: ${StackTrace.current}');
  }
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pittas',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const MyHomePage(),
    );
  }
}

class MyHomePage extends StatelessWidget {
  const MyHomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pittas'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('FCM Token:'),
            StreamBuilder<String?>(
              stream: FirebaseMessaging.instance.onTokenRefresh,
              builder: (context, snapshot) {
                return Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: SelectableText(
                    snapshot.data ?? 'No token available',
                    style: const TextStyle(fontSize: 12),
                  ),
                );
              },
            ),
            ElevatedButton(
              onPressed: () async {
                String? newToken = await FirebaseMessaging.instance.getToken();
                print('New FCM Token: $newToken');
                
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Token refreshed! Check console.')),
                );
              },
              child: const Text('Refresh Token'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                try {
                  final response = await http.get(
                    Uri.parse('https://us-central1-pittas-fb2a8.cloudfunctions.net/sendTestNotification'),
                  );
                  print('Test notification response: ${response.body}');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Test notification sent: ${response.body}')),
                  );
                } catch (e) {
                  print('Error sending test notification: $e');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              },
              child: const Text('Send Test Notification'),
            ),
          ],
        ),
      ),
    );
  }
}

// ... rest of your app code ... 