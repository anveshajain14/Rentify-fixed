import express from 'express';
import multer from 'multer';
import * as authController from '../controllers/authController.js';
import * as productsController from '../controllers/productsController.js';
import * as rentalsController from '../controllers/rentalsController.js';
import * as adminController from '../controllers/adminController.js';
import * as aiController from '../controllers/aiController.js';
import * as miscController from '../controllers/miscController.js';
import * as orderWorkflowController from '../controllers/orderWorkflowController.js';
import * as chatController from '../controllers/chatController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as notificationsController from '../controllers/notificationsController.js';
import * as reviewsController from '../controllers/reviewsController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { requireSeller } from '../middleware/requireSeller.js';

const upload = multer({ storage: multer.memoryStorage() });
const productImagesUpload = upload.fields([{ name: 'images', maxCount: 30 }]);
const sellerProfileUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'shopBanner', maxCount: 1 },
]);
const smartAnalyzeUpload = upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'spec_image', maxCount: 1 },
]);

const router = express.Router();

router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/login-otp', authController.loginOtp);
router.post('/api/auth/verify-login-otp', authController.verifyLoginOtp);
router.get('/api/auth/me', authController.me);
router.post('/api/auth/logout', authController.logout);
router.post('/api/auth/forgot-password', authController.forgotPassword);
router.post('/api/auth/reset-password', authController.resetPassword);
router.post('/api/auth/verify-email', authController.verifyEmail);
router.post('/api/auth/resend-verification-otp', authController.resendVerificationOtp);
router.get('/api/auth/google', authController.googleAuthStart);
router.get('/api/auth/google/callback', authController.googleAuthCallback);

router.get('/api/products', productsController.listProducts);
router.post('/api/products', requireSeller, productImagesUpload, productsController.createProduct);
router.get('/api/products/:id', productsController.getProduct);
router.put('/api/products/:id', productsController.updateProduct);
router.delete('/api/products/:id', productsController.deleteProduct);

router.get('/api/rentals', rentalsController.listRentals);
router.post('/api/rentals', rentalsController.createRental);
router.put('/api/rentals/:id', rentalsController.updateRental);
router.post('/api/rentals/checkout', rentalsController.checkoutSingle);
router.post('/api/rentals/checkout-cart', rentalsController.checkoutCart);
router.get('/api/rentals/:id/invoice', rentalsController.rentalInvoice);

router.get('/api/admin/users', requireAdmin, adminController.adminUsersGet);
router.put('/api/admin/users', requireAdmin, adminController.adminUsersPut);
router.delete('/api/admin/users', requireAdmin, adminController.adminUsersDelete);
router.get('/api/admin/stats', requireAdmin, adminController.adminStats);
router.get('/api/admin/reports', requireAdmin, adminController.adminReports);
router.put('/api/admin/approvals', requireAdmin, adminController.adminApprovals);
router.put('/api/admin/make-admin/:userId', requireAdmin, adminController.makeAdmin);
router.put('/api/admin/remove-admin/:userId', requireAdmin, adminController.removeAdmin);
router.put('/api/admin/approve-product/:id', requireAdmin, adminController.approveProduct);
router.put('/api/admin/approve-seller/:id', requireAdmin, adminController.approveSeller);

router.post('/api/ai/chat', aiController.aiChat);
router.get('/api/ai/similar', aiController.aiSimilar);
router.post('/api/ai/smart-analyze', smartAnalyzeUpload, aiController.aiSmartAnalyze);

router.post('/api/chatbot', miscController.chatbot);
router.post('/api/smart-listing', smartAnalyzeUpload, miscController.smartListing);

router.post('/api/report', miscController.reportUser);

router.post('/api/reviews', reviewsController.createReview);
router.get('/api/reviews', reviewsController.listReviewsLegacy);
router.post('/api/reviews/reply', reviewsController.replyToReview);
router.get('/api/reviews/product/:productId', reviewsController.getProductReviews);
router.get('/api/reviews/user/:userId', reviewsController.getUserReviews);

router.get('/api/seller/:id', miscController.getSeller);
router.patch('/api/seller/profile', requireSeller, sellerProfileUpload, miscController.patchSellerProfile);

router.get('/api/user/addresses', miscController.getAddresses);
router.post('/api/user/addresses', miscController.postAddress);
router.patch('/api/user/addresses/:id', miscController.patchAddress);
router.delete('/api/user/addresses/:id', miscController.deleteAddress);

router.post('/api/order-request', orderWorkflowController.createOrderRequest);
router.get('/api/order-request', orderWorkflowController.listOrderRequests);
router.patch('/api/order-request/accept', orderWorkflowController.acceptOrderRequest);
router.patch('/api/order-request/reject', orderWorkflowController.rejectOrderRequest);

router.post('/api/order', orderWorkflowController.createOrder);
router.get('/api/order/:orderId', orderWorkflowController.getOrderById);
router.patch('/api/order/status', orderWorkflowController.updateOrderStatus);
router.patch('/api/order/payment-status', orderWorkflowController.updateOrderPaymentStatus);
router.post('/api/payment/cod', paymentController.setCodPaymentPending);
router.post('/api/payment/create-order', paymentController.createRazorpayOrder);
router.post('/api/payment/verify', paymentController.verifyRazorpayPayment);
router.post('/api/payment/refund-deposit', paymentController.refundDeposit);

router.get('/api/notifications', notificationsController.listNotifications);
router.patch('/api/notifications/:id/read', notificationsController.markNotificationRead);
router.patch('/api/notifications/read-all', notificationsController.markAllRead);

router.post('/api/chat/conversation', chatController.createOrGetConversation);
router.get('/api/chat/conversations', chatController.getConversations);
router.get('/api/chat/messages/:conversationId', chatController.getMessages);
router.post('/api/chat/message', chatController.sendMessage);

export default router;
