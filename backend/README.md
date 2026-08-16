# Ubuntu Store - Backend

Node.js + Express API with Firebase Firestore.

## Setup
```bash
npm install
npm run dev
```

## .env file
```
PORT=3000
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
```

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/listings | Get all listings |
| GET | /api/listings/:id | Get one listing |
| POST | /api/listings | Create listing |
| PUT | /api/listings/:id | Update listing |
| DELETE | /api/listings/:id | Delete listing |
| POST | /api/payments/initiate | Start PayFast payment |
| POST | /api/payments/notify | PayFast payment callback |
| GET | /api/board | Get bulletin board posts |
| POST | /api/board | Create bulletin board post |
| POST | /api/reviews | Submit a review |
| GET | /api/reviews/:sellerId | Get reviews for a seller |
