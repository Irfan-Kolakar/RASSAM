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

  return crypto.timingSafeEqual(
    Buffer.from(supplied),
    Buffer.from(expected),
  );
}

module.exports = async function handler(req, res) {
  const allowedOrigin = "https://rassam-market.vercel.app";
  const origin = req.headers.origin;

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Admin-Token",
    );
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");

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
    const { orderId, delivery } = req.body || {};

    const allowedStatuses = ["packed", "shipped", "delivered"];

    if (
      typeof orderId !== "string" ||
      !/^ord-[a-f0-9-]{36}$/i.test(orderId) ||
      !allowedStatuses.includes(delivery)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid order and delivery status.",
      });
    }

    await connectDB();

    const db = require("mongoose").connection.db;

    const result = await db.collection("orders").updateOne(
      { id: orderId },
      {
        $set: {
          delivery,
          updatedAt: new Date(),
        },
      },
    );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery status saved.",
      orderId,
      delivery,
    });
  } catch (error) {
    console.error("RASSAM admin update error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save the delivery status.",
    });
  }
};