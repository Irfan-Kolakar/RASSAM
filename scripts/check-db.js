"use strict";

require("dotenv").config({ path: ".env.local" });

const mongoose = require("mongoose");

async function checkDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env.local");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected successfully!");

    const db = mongoose.connection.db;

    console.log("Database:", db.databaseName);

    const productsCount = await db.collection("products").countDocuments();

    const ordersCount = await db.collection("orders").countDocuments();

    console.log("Products in database:", productsCount);
    console.log("Orders in database:", ordersCount);

    console.log("\n✅ Database connection test completed.");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
