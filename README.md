# Ubuntu Store



Ubuntu Store is a web-based marketplace platform built for campus communities. Students, local vendors, faculty, and nearby residents can buy, sell, and trade goods and services in a safe and verified environment.



---

## Team

| Name | Role |
|---|---|
| Sinentlantla Slayi | Project Manager |
| Abongile Zinja | Backend Developer / Security |
| Olona Williams | Frontend Developer / Cloud |
| Zahrah Vermaak | Frontend Developer / QA |
| Andile Pamela Masina | Community Liaison / QA Engineer |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Payments | PayFast Sandbox |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
ubuntu-store/
├── frontend/              # React + Vite web app
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # App screens
│       ├── context/       # Global state
│       └── assets/        # Images and static files
├── backend/               # Node.js + Express API
│   ├── routes/            # API route handlers
│   ├── controllers/       # Business logic
│   ├── middleware/        # Auth and validation
│   └── config/            # Firebase config
├── docs/                  # All project documentation
└── README.md
```

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/[your-username]/ubuntu-store.git
cd ubuntu-store
```

### 2. Frontend setup
```bash
cd frontend
npm install
npm run dev
```
Runs at: http://localhost:5173

### 3. Backend setup
```bash
cd backend
npm install
npm run dev
```
Runs at: http://localhost:3000

### 4. Environment variables
Create a `.env` file inside both `frontend/` and `backend/`.
Get the Firebase config values from Pamela. Never commit `.env` files.

---

## App Features

- Student registration with university email verification
- Vendor account registration
- Product listings with photos, title, price, category
- Search and filter by category and price
- Secure checkout via PayFast sandbox
- Community bulletin board for events and announcements
- Seller dashboard to manage listings
- Ratings and reviews system
- Report a listing feature

---

## Branch Rules

| Branch | Purpose |
|---|---|
| `main` | Stable working code only |
| `dev` | Main development branch |
| `feature/[name]` | Individual feature branches |

Never push directly to `main`. Always create a pull request to `dev` first.

---

## Sprint Plan

| Sprint | Period | Focus |
|---|---|---|
| Sprint 1 | April - May 2026 | Auth, listings, search |
| Sprint 2 | May - June 2026 | Payments, bulletin board, reviews |
| Sprint 3 | July - August 2026 | QA, final features, demo prep |

---


