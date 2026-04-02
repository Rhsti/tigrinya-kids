const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { startEmailWorker } = require("./queue/emailQueue");
const Course = require("./models/Course");
const defaultCourses = require("./data/defaultCourses");
const { logStripeDiagnostics } = require("./utils/stripeConfig");

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

async function seedCourses() {
  for (const course of defaultCourses) {
    await Course.updateOne(
      { courseId: course.courseId },
      {
        $set: {
          title: course.title,
          description: course.description,
          price: course.price,
          currency: course.currency,
          isActive: course.isActive,
        },
      },
      { upsert: true }
    );
  }
}

// Stripe webhook requires raw body, so it must be registered before express.json().
app.use("/payment/webhook", express.raw({ type: "application/json" }), require("./routes/paymentWebhook"));
app.use(express.json());

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/payment", require("./routes/payment"));
app.use("/letters", require("./routes/letters"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
async function startServer() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in backend/.env");
  }

  logStripeDiagnostics({ requireWebhook: true, context: 'startup' });

  await mongoose.connect(process.env.MONGO_URI);
  await seedCourses();

  app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
    try {
      const worker = startEmailWorker();
      if (worker) {
        console.log("📨 Email queue worker started");
      } else {
        console.log("📨 Email delivery active (direct mode)");
      }
    } catch (err) {
      console.error("Failed to start email queue worker:", err.message);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start backend:", err.message);
  process.exit(1);
});