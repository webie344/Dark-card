# NNPC Investment Platform — Self-Hosted Setup Guide

A complete mobile-first investment platform (6 static HTML/CSS/JS files) powered by **Firebase** (auth + Firestore + Storage), **Cloudinary** (image uploads), **Opay** (payments), and **Telegram Bot** (admin alerts).

---

## 📁 File Overview

| File | Purpose |
|------|---------|
| `index.html` | Main user-facing app (auth + dashboard) |
| `style.css` | All styles |
| `app.js` | All client logic (Firebase, investment engine, etc.) |
| `admin.html` | Admin dashboard |
| `admin.css` | Admin styles |
| `admin.js` | Admin logic (approve deposits, withdrawals, etc.) |

---

## 🚀 Quick Start — 5 Steps

### Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and click **Add project**
2. Name it (e.g. `nnpc-invest`), disable Google Analytics (optional), click **Create**
3. In **Authentication → Sign-in method**, enable **Email/Password**
4. In **Firestore Database**, click **Create database** → start in **test mode** (you'll add security rules later)
5. In **Storage**, click **Get started** → start in **test mode**

### Step 2 — Get Your Firebase Config

1. In your Firebase project, click the **gear icon → Project settings**
2. Scroll to **Your apps → Add app → Web** (the `</>` icon)
3. Register the app — copy the `firebaseConfig` object that looks like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "nnpc-invest.firebaseapp.com",
  projectId: "nnpc-invest",
  storageBucket: "nnpc-invest.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. Open `app.js` and replace the placeholder at the top:
```js
const firebaseConfig = { /* PASTE YOUR CONFIG HERE */ };
```

5. Do the same in `admin.js` — same config object.

### Step 3 — Set Up Cloudinary (Image Uploads)

Cloudinary stores deposit receipt images.

1. Sign up free at [https://cloudinary.com](https://cloudinary.com)
2. In your Cloudinary dashboard, note your **Cloud Name**
3. Go to **Settings → Upload → Add upload preset**
   - Set **Signing Mode** to `Unsigned`
   - Note the preset name (e.g. `nnpc_receipts`)
4. In `app.js`, replace the Cloudinary config near the top:
```js
const CLOUDINARY_CLOUD_NAME = "your-cloud-name";
const CLOUDINARY_UPLOAD_PRESET = "nnpc_receipts";
```

### Step 4 — Set Up the Telegram Bot (Admin Alerts)

You'll get instant Telegram notifications for every signup, deposit, and withdrawal.

#### 4a — Create a Bot via BotFather

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g. `NNPC Admin Alerts`) and a username (e.g. `nnpc_invest_bot`)
4. BotFather gives you a **bot token** like: `7123456789:AAF_abc123xyz...`

#### 4b — Get Your Admin Chat ID

1. Search for **@userinfobot** on Telegram and send it `/start`
2. It replies with your numeric **Chat ID** (e.g. `987654321`)

#### 4c — Set the Config in app.js

Near the top of `app.js`, replace:
```js
const TELEGRAM_BOT_TOKEN     = "YOUR_BOT_TOKEN_HERE";
const TELEGRAM_ADMIN_CHAT_ID = "YOUR_CHAT_ID_HERE";
const TELEGRAM_BOT_USERNAME  = "your_bot_username";   // without @
```

The platform sends alerts for:
- 🆕 New user registrations
- 💰 Deposit requests (with receipt)
- 💸 Withdrawal requests (with bank details)

### Step 5 — Set Admin Emails

In `admin.js`, replace the admin email list:
```js
const ADMIN_EMAILS = ["youremail@gmail.com"];
```

Only these emails can log into the admin dashboard.

---

## 🏦 Opay Payment Setup

The deposit modal shows your Opay account details and a 30-minute countdown timer.

In `index.html`, find the payment modal (`modal-payment`) and update:
```html
<div class="payment-account-number">1234567890</div>
<div class="payment-account-name">NNPC INVESTMENT LTD</div>
<div class="payment-bank-name">OPay</div>
```

After a user pays, they upload a screenshot → you approve it in the admin dashboard → their balance is credited.

---

## 🔥 Firestore Security Rules (Production)

After testing, replace **Firestore → Rules** with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /transactions/{id} {
      allow read: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
    match /deposits/{id} {
      allow read, write: if request.auth != null;
    }
    match /withdrawals/{id} {
      allow read, write: if request.auth != null;
    }
    match /announcements/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 📊 Investment Plans

| Plan | Min. Deposit | Daily ROI | Duration | Total Return |
|------|-------------|-----------|----------|--------------|
| Bronze | ₦4,000 | 20% | 55 days | ₦48,000 |
| Silver | ₦10,000 | 20% | 55 days | ₦120,000 |
| Gold | ₦20,000 | 20% | 55 days | ₦240,000 |
| Platinum | ₦50,000 | 20% | 55 days | ₦600,000 |
| Diamond | ₦100,000 | 20% | 55 days | ₦1,200,000 |
| Executive | ₦250,000 | 20% | 55 days | ₦3,000,000 |

---

## 💰 Balance Types

| Balance | Description | When Withdrawable |
|---------|-------------|-------------------|
| `balance` | Deposited funds (admin credited) | After admin approves deposit |
| `bonusBalance` | Signup bonus (₦2,000) + referral bonuses (₦2,000/referral) | After making your first deposit |
| `earningsBalance` | Daily plan ROI earnings | After Day 2 of your active plan |

Withdrawal order: **bonusBalance deducted first**, then earningsBalance.

---

## 🛠 Admin Dashboard Features

- View all pending deposits → **Approve / Reject**
- View all withdrawal requests → **Mark as Paid / Reject**
- View all registered users
- Post platform announcements
- See deposit receipts (Cloudinary images)

Admin URL: open `admin.html` in browser (or host alongside `index.html`)

---

## 🌐 Hosting

### Option A — Firebase Hosting (recommended, free)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # set public dir to "." (current folder)
firebase deploy
```

### Option B — Any static host
Upload all 6 files to Netlify, Vercel, Hostinger, cPanel File Manager, etc.

### Option C — GitHub Pages
Push the 6 files to a GitHub repo, enable Pages in Settings.

---

## 🔧 Common Customisations

| What | Where |
|------|-------|
| Signup bonus amount | `app.js` → `const SIGNUP_BONUS = 2000` |
| Referral bonus amount | `app.js` → `const REFERRAL_BONUS = 2000` |
| Withdrawal unlock day | `app.js` → `const WITHDRAW_DELAY_DAYS = 2` |
| Plan names/amounts/ROI | `app.js` → `const PLANS = [...]` |
| Opay account number | `index.html` → `modal-payment` section |
| Admin emails | `admin.js` → `const ADMIN_EMAILS` |
| Platform name/logo | `index.html` → update title + logo letters |
| App colours | `style.css` → `:root` CSS variables |

---

## 🆘 Support & FAQ

**Q: Users can't log in after registering**  
A: Ensure Email/Password is enabled in Firebase Authentication.

**Q: Images won't upload**  
A: Check Cloudinary cloud name + upload preset is set to "Unsigned".

**Q: Telegram alerts not arriving**  
A: Verify bot token and chat ID. Send a test message to your bot first.

**Q: "Missing indexes" error in console**  
A: Firebase will show a link in the browser console — click it to auto-create the required composite index.

**Q: Admin dashboard shows blank**  
A: Make sure your email is in `ADMIN_EMAILS` in `admin.js` and you're logged in with that email.
