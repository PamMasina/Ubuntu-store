# Ubuntu Store - Frontend

React + Vite web application.

## Setup
```bash
npm install
npm run dev
```

## Pages (matching wireframes)
- `/` - Home and browse listings
- `/login` - Login and signup
- `/register` - Create account
- `/listing/:id` - Product detail
- `/sell` - Create a listing
- `/board` - Community bulletin board
- `/profile` - User profile and ratings

## Folder structure
```
src/
├── components/    # Navbar, ProductCard, ListingForm, etc.
├── pages/         # One .jsx file per screen
├── context/       # AuthContext for login state
└── assets/        # Logo, icons, images
```
