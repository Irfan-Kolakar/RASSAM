"use strict";

const connectDB = require("../../lib/mongo");
const crypto = require("crypto");

function isAdmin(req) {
  const expected = process.env.ADMIN_TOKEN || "";
  const supplied = req.headers["x-admin-token"] || "";

  if (
    typeof supplied !== "string" ||
    expected.length < 32 ||
    supplied.length !== expected.length
  ) {
    return false;
  }

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(supplied, "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    "https://rassam-market.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Admin-Token",
    );
  }

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  if (!isAdmin(req)) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required.",
    });
  }

  try {
    await connectDB();

    const db = require("mongoose").connection.db;

    const [products, sellers, orders, productCount, orderCount] =
      await Promise.all([
        db.collection("products")
          .find({})
          .sort({ createdAt: -1 })
          .limit(500)
          .project({ _id: 0 })
          .toArray(),

        db.collection("sellers")
          .find({})
          .sort({ createdAt: -1 })
          .limit(500)
          .project({ _id: 0 })
          .toArray(),

        db.collection("orders")
          .find({})
          .sort({ createdAt: -1 })
          .limit(200)
          .project({ _id: 0 })
          .toArray(),

        db.collection("products").countDocuments({}),
        db.collection("orders").countDocuments({}),
      ]);

    const uniqueSellerIds = new Set(
      sellers
        .map((seller) => String(seller.sellerMobile || "").trim())
        .filter(Boolean),
    );

    const uniqueBuyerIds = new Set(
      orders
        .map((order) => String(order.phone || "").replace(/\D/g, ""))
        .filter(Boolean),
    );

    return res.status(200).json({
      success: true,
      stats: {
        listings: productCount,
        sellerRecords: sellers.length,
        sellers: uniqueSellerIds.size,
        buyers: uniqueBuyerIds.size,
        orders: orderCount,
      },
      products,
      sellers,
      orders: orders.map((order) => ({
        ...order,
        messages: Array.isArray(order.messages)
          ? order.messages.slice(-100)
          : [],
      })),
    });
  } catch (error) {
    console.error("RASSAM admin data error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load admin data.",
    });
  }
};
