// Simple in-memory store for demo/testing when MongoDB is not available
// This allows the payment flow to work for testing purposes

const users = new Map();
const purchases = [];

// Helper to create a demo user
const createDemoUser = (id, email, password) => ({
    _id: id,
    id,
    email,
    password,
    purchasedCourses: [],
    learnedLetters: [],
    subscriptionActive: false
});

// Demo users for testing (password: "demo123")
const demoUsers = [
    createDemoUser('demo1', 'demo@example.com', '$2a$10$X7VYwQ5Y5Q5Q5Q5Q5Q5Q5O5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q'),
    createDemoUser('demo2', 'test@test.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
];

// Initialize demo users
demoUsers.forEach(user => users.set(user._id, user));

// Helper to find user by email
const findUserByEmail = (email) => {
    for (const user of users.values()) {
        if (user.email === email) {
            return user;
        }
    }
    return null;
};

module.exports = {
    users,
    purchases,
    getUser: (id) => users.get(id),
    setUser: (id, data) => users.set(id, data),
    findUserByEmail,
    findPurchaseBySessionId: (checkoutSessionId) => purchases.find((purchase) => purchase.checkoutSessionId === checkoutSessionId) || null,
    addPurchase: (purchase) => {
        purchases.unshift(purchase);
        return purchase;
    },
    getPurchasesByUserId: (userId) => purchases.filter((purchase) => purchase.userId === userId),
    getAllPurchases: () => [...purchases],
    addUser: (user) => {
        users.set(user._id, user);
        return user;
    },
    getAllUsers: () => Array.from(users.values())
};

