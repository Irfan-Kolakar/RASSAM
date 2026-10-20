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

  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

module.exports = async function handler(req, res) {
  const allowedOrigin = "https://rassam-market.vercel.app";
  const origin = req.headers.origin;

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Admin-Token",
    );
  }

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
  console.log("ADMIN AUTH DIAGNOSTIC:", {
    tokenConfigured: Boolean(process.env.ADMIN_TOKEN),
    tokenLength: (process.env.ADMIN_TOKEN || "").length,
    suppliedTokenReceived: Boolean(req.headers["x-admin-token"]),
    suppliedTokenLength: (req.headers["x-admin-token"] || "").length,
  });
  if (!isAdmin(req)) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required.",
    });
  }

  try {
    await connectDB();

    const db = require("mongoose").connection.db;

    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return res.status(200).json({
      success: true,
      orders: orders.map((order) => ({
        id: order.id,
        name: order.name,
        phone: order.phone,
        address: order.address,
        pincode: order.pincode,
        items: order.items || [],
        amountRupees: order.amountRupees,
        status: order.status,
        delivery: order.delivery,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        messages: Array.isArray(order.messages)
          ? order.messages.slice(-100)
          : [],
      })),
    });
  } catch (error) {
    console.error("RASSAM admin inbox error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load the admin inbox.",
    });
  }
};
