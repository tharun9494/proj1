import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { DocumentSnapshot } from 'firebase-functions/v2/firestore';

admin.initializeApp();

// ... existing code ...

// Remove all FCM token and notification related functions
// Keep other existing functions that are not related to FCM tokens or notifications 