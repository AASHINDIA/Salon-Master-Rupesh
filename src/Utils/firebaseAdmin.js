
import admin from 'firebase-admin';
import serviceAccount from './path-to-your-service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
