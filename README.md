# Navy Blue War Room Dashboard

This is the real-time legislative dashboard for the Navy Blue Mock Congress simulation. It uses React (via Vite) and Firebase for real-time synchronization.

## Setup Instructions

Since Node.js isn't installed locally, the standard scaffold files (`package.json`, `index.html`, etc.) have been provided. Once you are ready to run this locally:

1. Install [Node.js](https://nodejs.org/).
2. Open a terminal in this `navy-blue-war-room` folder.
3. Run `npm install` to install dependencies.
4. Run `npm run dev` to start the local development server.

## Firebase Configuration

Inside `src/FirebaseConfig.js`, you'll see placeholder values for the Firebase configuration. You will need to replace these with your actual Firebase project settings:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Firestore Security Rules

For the duration of the simulation, you requested **Public Read/Write** access. To set this up:

1. Go to your Firebase Console > Firestore Database.
2. Click on the **Rules** tab.
3. Replace the existing rules with the following snippet:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // WARNING: This allows anyone to read and write to your database.
      // Use this ONLY for the duration of the simulation, then change it back to false.
      allow read, write: if true;
    }
  }
}
```

4. Click **Publish**.

## Features Included

- **Password Gate**: Hardcoded to `NAVY2026` (saved in local storage).
- **Navy Blue Theme**: Accessible aesthetic aligned with project requirements.
- **Firebase Sync**: Real-time subscriptions to the `bills` collection using `onSnapshot`.
- **Whip Tools**: Quick up/down voting for Yes/No/Undecided with real-time percentage thresholds.
- **Veto Warning**: Automatically turns red to warn if a Royal Blue non-aligned bill passes committee.
- **Projected Score**: Follows the `+10`, `+2`, and `-5` conditional rules automatically.

---
*Ready for the next step? Handing it back to you to walk me through the Firebase project setup!*
