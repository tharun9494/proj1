import * as admin from 'firebase-admin';

admin.initializeApp();

async function getFCMTokens() {
  try {
    const tokensSnapshot = await admin.firestore()
      .collection('fcmTokens')
      .get();

    console.log('FCM Tokens in Firestore:');
    console.log('========================');
    
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Token: ${data.token}`);
      console.log(`User ID: ${data.userId}`);
      console.log(`Platform: ${data.platform}`);
      console.log(`Updated At: ${data.updatedAt}`);
      console.log('------------------------');
    });
  } catch (error) {
    console.error('Error getting FCM tokens:', error);
  }
}

getFCMTokens(); 