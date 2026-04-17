import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';

import connectDB from './config/db.js';
import apiRoutes from './routes/index.js';
import { stripeWebhook } from './controllers/webhookController.js';
import { corsOptions } from './middleware/corsConfig.js';
import { initSocket } from './lib/socket.js';

// 🔥 GLOBAL ERROR HANDLING (VERY IMPORTANT)
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// 🔍 DEBUG ENV (remove later)
console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded ✅" : "Missing ❌");

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ✅ Stripe webhook (keep BEFORE express.json)
app.post(
  '/api/webhook/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    try {
      stripeWebhook(req, res);
    } catch (err) {
      console.error("Stripe webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);

// ✅ Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

// ✅ Routes
app.use(apiRoutes);

// ✅ Error middleware
app.use((err, req, res, next) => {
  console.error("❌ Express Error:", err);
  res.status(500).json({
    message: err.message || 'Server error'
  });
});

// 🚀 START SERVER ONLY AFTER DB CONNECTS
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to connect MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();

// import 'dotenv/config';
// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
// import connectDB from './config/db.js';
// import apiRoutes from './routes/index.js';
// import { stripeWebhook } from './controllers/webhookController.js';
// import { corsOptions } from './middleware/corsConfig.js';

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors(corsOptions));

// app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());

// app.use(apiRoutes);

// app.use((err, req, res, next) => {
//   console.error(err);
//   res.status(500).json({ message: err.message || 'Server error' });
// });

// await connectDB();

// app.listen(PORT, () => {
//   console.log(`API server listening on http://localhost:${PORT}`);
// });
