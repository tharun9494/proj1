import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class FirebaseMessagingService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    try {
      print('Starting Firebase Messaging initialization...');

      // Request permission for iOS
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      print('Notification permission status: ${settings.authorizationStatus}');

      // Get FCM token and save it
      print('Requesting FCM token...');
      String? token = await _firebaseMessaging.getToken();
      print('FCM Token received: ${token ?? "No token received"}');

      if (token != null) {
        print('Attempting to save token to Firestore...');
        await _saveTokenToFirestore(token);
      } else {
        print('WARNING: No FCM token received from Firebase!');
      }

      // Listen for token refresh
      _firebaseMessaging.onTokenRefresh.listen((newToken) async {
        print('Token refresh detected. New token: $newToken');
        await _saveTokenToFirestore(newToken);
      });

      // Initialize local notifications
      print('Initializing local notifications...');
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
          print('Notification tapped with payload: ${details.payload}');
        },
      );
      print('Local notifications initialized successfully');

      // Create notification channel for Android
      print('Creating Android notification channel...');
      await _flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(const AndroidNotificationChannel(
            'orders',
            'Order Notifications',
            description: 'Notifications for new orders',
            importance: Importance.max,
            enableVibration: true,
            playSound: true,
          ));
      print('Android notification channel created');

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      print('Background message handler registered');

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Received foreground message: ${message.messageId}');
        print('Message data: ${message.data}');
        print('Message notification: ${message.notification?.title}');
        _showNotification(message);
      });

      // Handle when app is opened from notification
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print('Notification opened app: ${message.data}');
      });

      // Subscribe to admin topic
      print('Subscribing to admin topic...');
      await _firebaseMessaging.subscribeToTopic('admin');
      print('Successfully subscribed to admin topic');

      print('Firebase Messaging initialization completed successfully');
    } catch (e) {
      print('ERROR in Firebase Messaging initialization: $e');
      print('Error stack trace: ${StackTrace.current}');
    }
  }

  Future<void> _saveTokenToFirestore(String token) async {
    try {
      print('Starting token save process...');
      print('Token to save: $token');
      
      // First, check for any existing tokens
      print('Checking for existing tokens...');
      final existingTokensQuery = await FirebaseFirestore.instance
          .collection('fcmTokens')
          .where('userId', isEqualTo: 'admin')
          .get();

      print('Found ${existingTokensQuery.docs.length} existing tokens');

      // Delete any old tokens
      for (var doc in existingTokensQuery.docs) {
        print('Deleting old token: ${doc.id}');
        await doc.reference.delete();
      }

      // Add the new token
      print('Adding new token to Firestore...');
      final docRef = await FirebaseFirestore.instance.collection('fcmTokens').add({
        'token': token,
        'userId': 'admin',
        'platform': 'android',
        'updatedAt': FieldValue.serverTimestamp(),
      });
      
      print('Token saved successfully with ID: ${docRef.id}');
    } catch (e) {
      print('ERROR saving token to Firestore: $e');
      print('Error stack trace: ${StackTrace.current}');
    }
  }

  Future<void> _showNotification(RemoteMessage message) async {
    try {
      const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
        'orders',
        'Order Notifications',
        channelDescription: 'Notifications for new orders',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        enableLights: true,
        showWhen: true,
      );

      const DarwinNotificationDetails iOSDetails = DarwinNotificationDetails(
        presentSound: true,
        presentBadge: true,
        presentAlert: true,
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
      print('Notification shown successfully');
    } catch (e) {
      print('Error showing notification: $e');
    }
  }
}

// Handle background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
  print('Background message data: ${message.data}');
  print('Background message notification: ${message.notification?.title}');

  // Initialize notifications plugin
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  
  // Initialize Android settings
  const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const InitializationSettings initSettings = InitializationSettings(android: androidSettings);
  
  await flutterLocalNotificationsPlugin.initialize(initSettings);

  // Create notification channel
  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(const AndroidNotificationChannel(
        'orders',
        'Order Notifications',
        description: 'Notifications for new orders',
        importance: Importance.max,
        enableVibration: true,
        playSound: true,
      ));

  // Show the notification
  const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
    'orders',
    'Order Notifications',
    channelDescription: 'Notifications for new orders',
    importance: Importance.max,
    priority: Priority.high,
    playSound: true,
    enableVibration: true,
    enableLights: true,
    showWhen: true,
  );

  const NotificationDetails notificationDetails = NotificationDetails(
    android: androidDetails,
  );

  await flutterLocalNotificationsPlugin.show(
    message.hashCode,
    message.notification?.title ?? 'New Order',
    message.notification?.body ?? '',
    notificationDetails,
    payload: message.data.toString(),
  );
} 