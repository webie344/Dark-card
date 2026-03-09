// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC9uL_BX14Z6rRpgG4MT9Tca1opJl8EviQ",
    authDomain: "dating-connect.firebaseapp.com",
    projectId: "dating-connect",
    storageBucket: "dating-connect.appspot.com",
    messagingSenderId: "1062172180210",
    appId: "1:1062172180210:web:0c9b3c1578a5dbae58da6b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Lock Address Generator
const lockAddresses = [
    "0x7d4ef38e0f4f8b9c2e3a5b1c8d9e4f5a6b7c8d9e",
    "0x3a5b1c8d9e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    "0x8d9e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
    "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
    "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f"
];

let addressIndex = 0;

// Update lock address every 30 seconds
function updateLockAddress() {
    const lockElement = document.getElementById('lockAddress');
    if (lockElement) {
        addressIndex = (addressIndex + 1) % lockAddresses.length;
        const address = lockAddresses[addressIndex];
        const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        lockElement.textContent = `Secured by Blockchain: ${shortAddress}`;
    }
}

// Initial update
setInterval(updateLockAddress, 30000);

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Authentication State Observer
auth.onAuthStateChanged(async (user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Protected pages
    const protectedPages = ['account.html', 'fund.html'];
    
    if (user) {
        console.log('User logged in:', user.email);
        
        // Update user data in Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Redirect from auth pages if logged in
        if (currentPage === 'login.html' || currentPage === 'signup.html') {
            window.location.href = 'index.html';
        }
        
        // Load user-specific data based on page
        if (currentPage === 'account.html') {
            loadAccountPage(user);
        } else if (currentPage === 'fund.html') {
            loadFundPage(user);
        }
    } else {
        console.log('User logged out');
        
        // Redirect to login if accessing protected page
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
    
    // Load page-specific content
    loadPageContent(currentPage);
});

// Page-specific content loading
function loadPageContent(page) {
    switch(page) {
        case 'cards.html':
            loadCardsPage();
            break;
        case 'fund.html':
            if (!auth.currentUser) break;
            loadFundPage(auth.currentUser);
            break;
    }
}

// Cards Page
async function loadCardsPage() {
    try {
        const cardsContainer = document.getElementById('cardsContainer');
        const countryFilter = document.getElementById('countryFilter');
        
        if (!cardsContainer) return;
        
        // Show loading
        cardsContainer.innerHTML = '<div class="loading">Loading cards...</div>';
        
        // Fetch cards from Firestore
        const cardsSnapshot = await db.collection('cards').get();
        
        if (cardsSnapshot.empty) {
            // Seed initial cards if none exist
            await seedCards();
        }
        
        // Fetch again after seeding
        const updatedSnapshot = await db.collection('cards').get();
        const cards = [];
        
        updatedSnapshot.forEach(doc => {
            cards.push({ id: doc.id, ...doc.data() });
        });
        
        // Populate country filter
        const countries = [...new Set(cards.map(card => card.country))];
        countries.sort().forEach(country => {
            if (countryFilter) {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countryFilter.appendChild(option);
            }
        });
        
        // Display cards
        displayCards(cards);
        
        // Add search and filter listeners
        const searchInput = document.getElementById('searchCards');
        if (searchInput) {
            searchInput.addEventListener('input', () => filterCards(cards));
        }
        
        if (countryFilter) {
            countryFilter.addEventListener('change', () => filterCards(cards));
        }
        
    } catch (error) {
        console.error('Error loading cards:', error);
        if (cardsContainer) {
            cardsContainer.innerHTML = '<p class="error">Error loading cards. Please refresh.</p>';
        }
    }
}

// Seed initial cards
async function seedCards() {
    const cardTypes = ['Visa', 'Mastercard', 'American Express', 'Discover'];
    const countries = [
        'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
        'France', 'Japan', 'Singapore', 'UAE', 'Brazil', 'India', 'China',
        'South Korea', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'Sweden',
        'Norway', 'Denmark', 'Finland', 'Belgium', 'Austria', 'Ireland',
        'New Zealand', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru'
    ];
    
    const batch = db.batch();
    
    for (let i = 0; i < 30; i++) {
        const cardRef = db.collection('cards').doc();
        const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        const country = countries[i % countries.length];
        
        batch.set(cardRef, {
            name: `${country} ${cardType} Card`,
            type: cardType,
            country: country,
            cardNumber: generateCardNumber(),
            expiryDate: generateExpiryDate(),
            holderName: 'Virtual Card',
            cvv: '***',
            free: true,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    await batch.commit();
    console.log('Cards seeded successfully');
}

// Generate random card number
function generateCardNumber() {
    const groups = [];
    for (let i = 0; i < 4; i++) {
        groups.push(Math.floor(1000 + Math.random() * 9000));
    }
    return groups.join(' ');
}

// Generate random expiry date
function generateExpiryDate() {
    const month = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0');
    const year = (new Date().getFullYear() + Math.floor(1 + Math.random() * 5)).toString().slice(-2);
    return `${month}/${year}`;
}

// Display cards
function displayCards(cards) {
    const cardsContainer = document.getElementById('cardsContainer');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = '';
    
    cards.forEach(card => {
        const cardElement = createCardElement(card);
        cardsContainer.appendChild(cardElement);
    });
}

// Create card element
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
        <div class="card-header">
            <span class="card-type">${card.type}</span>
            <span class="card-country"><i class="fas fa-globe"></i> ${card.country}</span>
        </div>
        <div class="card-number">${card.cardNumber}</div>
        <div class="card-details">
            <div class="card-holder">
                <span>Card Holder</span>
                <p>${card.holderName}</p>
            </div>
            <div class="card-expiry">
                <span>Expires</span>
                <p>${card.expiryDate}</p>
            </div>
        </div>
        <div class="card-footer">
            <span class="card-balance">FREE</span>
            <button class="btn-get-card" onclick="purchaseCard('${card.id}')">Get Card</button>
        </div>
    `;
    
    return div;
}

// Filter cards
function filterCards(allCards) {
    const searchTerm = document.getElementById('searchCards')?.value.toLowerCase() || '';
    const selectedCountry = document.getElementById('countryFilter')?.value || '';
    
    const filtered = allCards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchTerm) ||
                             card.country.toLowerCase().includes(searchTerm);
        const matchesCountry = !selectedCountry || card.country === selectedCountry;
        return matchesSearch && matchesCountry;
    });
    
    displayCards(filtered);
}

// Purchase card (global function)
window.purchaseCard = async function(cardId) {
    const user = auth.currentUser;
    
    if (!user) {
        showToast('Please login to get a card', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    try {
        // Check if user already has this card
        const existingCard = await db.collection('userCards')
            .where('userId', '==', user.uid)
            .where('cardId', '==', cardId)
            .get();
        
        if (!existingCard.empty) {
            showToast('You already have this card!', 'warning');
            return;
        }
        
        // Get card details
        const cardDoc = await db.collection('cards').doc(cardId).get();
        const cardData = cardDoc.data();
        
        // Add to user's cards
        await db.collection('userCards').add({
            userId: user.uid,
            cardId: cardId,
            cardName: cardData.name,
            cardNumber: cardData.cardNumber,
            expiryDate: cardData.expiryDate,
            type: cardData.type,
            country: cardData.country,
            balance: 0,
            status: 'active',
            purchasedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Add to activity
        await db.collection('activity').add({
            userId: user.uid,
            type: 'card_purchased',
            description: `Purchased ${cardData.name}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Card added successfully!');
        
        // Redirect to fund page
        setTimeout(() => {
            window.location.href = 'fund.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error purchasing card:', error);
        showToast('Error purchasing card. Please try again.', 'error');
    }
};

// Fund Page
async function loadFundPage(user) {
    try {
        // Load user's cards
        await loadUserCards(user);
        
        // Load crypto wallets
        loadCryptoWallets();
        
        // Setup currency converter
        setupCurrencyConverter();
        
    } catch (error) {
        console.error('Error loading fund page:', error);
    }
}

// Load user's cards for funding
async function loadUserCards(user) {
    const cardSelect = document.getElementById('cardSelect');
    if (!cardSelect) return;
    
    try {
        const userCardsSnapshot = await db.collection('userCards')
            .where('userId', '==', user.uid)
            .where('status', '==', 'active')
            .get();
        
        if (userCardsSnapshot.empty) {
            cardSelect.innerHTML = '<option value="">No cards available - Get a card first</option>';
            return;
        }
        
        userCardsSnapshot.forEach(doc => {
            const card = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${card.cardName} - ${card.cardNumber.slice(-4)}`;
            cardSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading user cards:', error);
    }
}

// Load crypto wallets
function loadCryptoWallets() {
    const walletsContainer = document.getElementById('walletsContainer');
    if (!walletsContainer) return;
    
    const wallets = [
        { crypto: 'Bitcoin (BTC)', icon: 'fa-btc', color: '#f7931a', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
        { crypto: 'Ethereum (ETH)', icon: 'fa-ethereum', color: '#627eea', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
        { crypto: 'Tether (USDT)', icon: 'fa-dollar-sign', color: '#26a17b', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { crypto: 'Binance Coin (BNB)', icon: 'fa-bnb', color: '#f3ba2f', address: 'bnb1xlvns0n2mhxo3a7ywp3q6m3q6m3q6m3q6m3q6m' },
        { crypto: 'Solana (SOL)', icon: 'fa-sun', color: '#9945ff', address: 'solana-address-here-1234567890abcdefghijklmnop' },
        { crypto: 'Cardano (ADA)', icon: 'fa-ad', color: '#0033ad', address: 'addr1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
        { crypto: 'Polkadot (DOT)', icon: 'fa-dot-circle', color: '#e6007a', address: 'polkadot-address-1234567890abcdefghijklmnopqrstuv' }
    ];
    
    walletsContainer.innerHTML = '';
    
    wallets.forEach(wallet => {
        const walletElement = document.createElement('div');
        walletElement.className = 'wallet-item';
        walletElement.innerHTML = `
            <div class="wallet-header" style="color: ${wallet.color}">
                <i class="fab ${wallet.icon}"></i>
                <h4>${wallet.crypto}</h4>
            </div>
            <div class="wallet-address">${wallet.address}</div>
            <button class="copy-address" onclick="copyAddress('${wallet.address}')">
                <i class="far fa-copy"></i> Copy Address
            </button>
        `;
        walletsContainer.appendChild(walletElement);
    });
}

// Copy address function (global)
window.copyAddress = function(address) {
    navigator.clipboard.writeText(address).then(() => {
        showToast('Address copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy address', 'error');
    });
};

// Setup currency converter
function setupCurrencyConverter() {
    const amountInput = document.getElementById('amount');
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');
    const convertedAmount = document.getElementById('convertedAmount');
    
    if (!amountInput || !fromCurrency || !toCurrency || !convertedAmount) return;
    
    // Mock exchange rates (in production, use a real API)
    const rates = {
        USD: { BTC: 0.000029, ETH: 0.00042, USDT: 1, BNB: 0.0023, SOL: 0.045, ADA: 2.5, DOT: 0.18 },
        EUR: { BTC: 0.000027, ETH: 0.00039, USDT: 0.92, BNB: 0.0021, SOL: 0.041, ADA: 2.3, DOT: 0.17 },
        GBP: { BTC: 0.000024, ETH: 0.00035, USDT: 0.82, BNB: 0.0019, SOL: 0.037, ADA: 2.1, DOT: 0.15 }
    };
    
    function convert() {
        const amount = parseFloat(amountInput.value) || 0;
        const from = fromCurrency.value;
        const to = toCurrency.value;
        
        if (rates[from] && rates[from][to]) {
            const result = amount * rates[from][to];
            convertedAmount.value = result.toFixed(8);
        } else {
            convertedAmount.value = '0';
        }
    }
    
    amountInput.addEventListener('input', convert);
    fromCurrency.addEventListener('change', convert);
    toCurrency.addEventListener('change', convert);
    
    // Initial conversion
    convert();
}

// Account Page
async function loadAccountPage(user) {
    try {
        // Load user profile
        document.getElementById('userName').textContent = user.displayName || 'User';
        document.getElementById('userEmail').textContent = user.email;
        
        // Load user stats
        await loadUserStats(user);
        
        // Load recent activity
        await loadRecentActivity(user);
        
    } catch (error) {
        console.error('Error loading account page:', error);
    }
}

// Load user stats
async function loadUserStats(user) {
    try {
        // Get total cards
        const cardsSnapshot = await db.collection('userCards')
            .where('userId', '==', user.uid)
            .get();
        
        document.getElementById('totalCards').textContent = cardsSnapshot.size;
        
        // Get active cards
        const activeCards = cardsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
        document.getElementById('activeCards').textContent = activeCards;
        
        // Calculate total spent (mock data)
        const totalSpent = cardsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().balance || 0), 0);
        document.getElementById('totalSpent').textContent = `$${totalSpent}`;
        
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Load recent activity
async function loadRecentActivity(user) {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    try {
        const activitySnapshot = await db.collection('activity')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        if (activitySnapshot.empty) {
            activityContainer.innerHTML = '<p class="no-activity">No recent activity</p>';
            return;
        }
        
        activityContainer.innerHTML = '';
        
        activitySnapshot.forEach(doc => {
            const activity = doc.data();
            const date = activity.timestamp?.toDate() || new Date();
            
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.innerHTML = `
                <div class="activity-icon">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <p>${activity.description}</p>
                    <span>${formatDate(date)}</span>
                </div>
            `;
            activityContainer.appendChild(activityElement);
        });
        
    } catch (error) {
        console.error('Error loading activity:', error);
        activityContainer.innerHTML = '<p class="error">Error loading activity</p>';
    }
}

// Get activity icon
function getActivityIcon(type) {
    switch(type) {
        case 'card_purchased': return 'fa-credit-card';
        case 'card_funded': return 'fa-coins';
        case 'payment_made': return 'fa-shopping-cart';
        default: return 'fa-circle';
    }
}

// Format date
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
}

// Authentication Forms
document.addEventListener('DOMContentLoaded', () => {
    
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                showToast('Login successful!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Login error:', error);
                showToast(error.message, 'error');
            }
        });
    }
    
    // Signup Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match!', 'error');
                return;
            }
            
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // Update profile
                await userCredential.user.updateProfile({
                    displayName: fullName
                });
                
                // Create user document
                await db.collection('users').doc(userCredential.user.uid).set({
                    fullName: fullName,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showToast('Account created successfully!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Signup error:', error);
                showToast(error.message, 'error');
            }
        });
    }
    
    // Google Login
    const googleLogin = document.getElementById('googleLogin');
    const googleSignUp = document.getElementById('googleSignUp');
    
    if (googleLogin || googleSignUp) {
        const googleProvider = new firebase.auth.GoogleAuthProvider();
        
        const handleGoogleAuth = async () => {
            try {
                const result = await auth.signInWithPopup(googleProvider);
                showToast('Authentication successful!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Google auth error:', error);
                showToast(error.message, 'error');
            }
        };
        
        if (googleLogin) googleLogin.addEventListener('click', handleGoogleAuth);
        if (googleSignUp) googleSignUp.addEventListener('click', handleGoogleAuth);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                showToast('Logged out successfully!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                showToast(error.message, 'error');
            }
        });
    }
});

