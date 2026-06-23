// Sets required env vars BEFORE any module (including env.ts) is loaded
// Jest runs setupFiles before importing any test module
process.env.PORT = '5000';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key-id';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.R2_PUBLIC_URL = 'http://localhost:9000';
process.env.RAZORPAY_KEY_ID = 'rzp_test_xxxx';
process.env.RAZORPAY_KEY_SECRET = 'test-razorpay-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
