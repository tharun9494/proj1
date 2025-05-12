import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'services/firebase_messaging_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Get and print FCM token
  String? token = await FirebaseMessaging.instance.getToken();
  print('==========================================');
  print('FCM TOKEN: $token');
  print('==========================================');
  
  // Initialize Firebase Messaging Service
  final firebaseMessaging = FirebaseMessagingService();
  await firebaseMessaging.initialize();

  runApp(MyApp(token: token));
}

class MyApp extends StatelessWidget {
  final String? token;
  
  const MyApp({Key? key, this.token}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pittas',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(token: token),
    );
  }
}

class MyHomePage extends StatelessWidget {
  final String? token;
  
  const MyHomePage({Key? key, this.token}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Pittas'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('FCM Token:'),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SelectableText(
                token ?? 'No token available',
                style: TextStyle(fontSize: 12),
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                String? newToken = await FirebaseMessaging.instance.getToken();
                print('New FCM Token: $newToken');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Token refreshed! Check console.')),
                );
              },
              child: Text('Refresh Token'),
            ),
          ],
        ),
      ),
    );
  }
}

// ... rest of your app code ... 