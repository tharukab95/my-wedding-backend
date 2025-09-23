import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Initialize Firebase Admin SDK
      const firebaseConfig = {
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      };

      if (!firebaseConfig.projectId || !firebaseConfig.privateKey || !firebaseConfig.clientEmail) {
        console.warn('Firebase configuration is incomplete. Firebase features will be disabled.');
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        projectId: firebaseConfig.projectId,
      });

      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error('Invalid Firebase ID token');
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      throw new Error('User not found');
    }
  }

  async createUser(userData: {
    uid?: string;
    email?: string;
    phoneNumber?: string;
    displayName?: string;
  }): Promise<admin.auth.UserRecord> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      return await admin.auth().createUser(userData);
    } catch (error) {
      throw new Error('Failed to create user');
    }
  }

  async updateUser(uid: string, userData: {
    email?: string;
    phoneNumber?: string;
    displayName?: string;
  }): Promise<admin.auth.UserRecord> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      return await admin.auth().updateUser(uid, userData);
    } catch (error) {
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(uid: string): Promise<void> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      throw new Error('Failed to delete user');
    }
  }

  // Listen for user creation events
  async setupUserCreationListener() {
    if (!this.firebaseApp) {
      console.warn('Firebase Admin SDK not initialized. User creation listener not set up.');
      return;
    }

    // This would typically be set up as a Firebase Function or Cloud Function
    // For now, we'll handle user creation through the API endpoints
    console.log('User creation listener setup would be implemented here');
  }
}
