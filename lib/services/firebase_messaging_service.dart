import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class FirebaseMessagingService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Request permission for iOS
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get FCM token and save it
    String? token = await _firebaseMessaging.getToken();
    if (token != null) {
      print('FCM Token: $token'); // For debugging
      await _saveTokenToFirestore(token);
    }

    // Listen for token refresh
    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      print('New FCM Token: $newToken'); // For debugging
      _saveTokenToFirestore(newToken);
    });

    // Initialize local notifications
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iOSSettings = DarwinInitializationSettings(
      requestSoundPermission: true,
      requestBadgePermission: true,
      requestAlertPermission: true,
    );
    
    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iOSSettings,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification tap
        final payload = details.payload;
        if (payload != null) {
          // Navigate to order details or handle the action
          print('Notification payload: $payload');
        }
      },
    );

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Received foreground message: ${message.messageId}'); // For debugging
      _showNotification(message);
    });

    // Handle when app is opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification opened app: ${message.data}');
      // Navigate to appropriate screen based on the notification
    });

    // Subscribe to admin topic for order notifications
    await _firebaseMessaging.subscribeToTopic('admin');
  }

  Future<void> _saveTokenToFirestore(String token) async {
    try {
      print('Attempting to save FCM token: $token');
      
      // Check if token already exists
      final querySnapshot = await FirebaseFirestore.instance
          .collection('fcmTokens')
          .where('token', isEqualTo: token)
          .get();

      print('Existing tokens found: ${querySnapshot.docs.length}');

      if (querySnapshot.docs.isEmpty) {
        // Token doesn't exist, add new one
        final docRef = await FirebaseFirestore.instance.collection('fcmTokens').add({
          'token': token,
          'userId': 'admin',
          'platform': 'android',
          'updatedAt': FieldValue.serverTimestamp(),
        });
        print('New token saved to Firestore successfully with ID: ${docRef.id}');
      } else {
        // Token exists, update it
        await querySnapshot.docs.first.reference.update({
          'updatedAt': FieldValue.serverTimestamp(),
        });
        print('Existing token updated in Firestore with ID: ${querySnapshot.docs.first.id}');
      }
    } catch (e) {
      print('Error saving token to Firestore: $e');
      // Print the full error stack trace
      print('Error stack trace: ${StackTrace.current}');
    }
  }

  Future<void> _showNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'orders', // channel id
      'Order Notifications', // channel name
      channelDescription: 'Notifications for new orders',
      importance: Importance.max,
      priority: Priority.high,
      sound: RawResourceAndroidNotificationSound('notification'),
      playSound: true,
      enableVibration: true,
      enableLights: true,
    );

    const DarwinNotificationDetails iOSDetails = DarwinNotificationDetails(
      presentSound: true,
      presentBadge: true,
      presentAlert: true,
      sound: 'notification.mp3',
    );

    const NotificationDetails notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iOSDetails,
    );

    await _flutterLocalNotificationsPlugin.show(
      message.hashCode,
      message.notification?.title ?? 'New Order',
      message.notification?.body ?? '',
      notificationDetails,
      payload: message.data.toString(),
    );
  }
}

// Handle background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
  // You can also show a notification here if needed
} 