"use strict";

const connectDB = require("../lib/mongo");
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  const allowedOrigin = "https://rassam-market.vercel.app";
  const origin = req.headers.origin;

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");

    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  try {
    const orderId =
      req.method === "GET"
        ? req.query?.orderId
        : req.body?.orderId;

    if (
      typeof orderId !== "string" ||
      !/^ord-[a-f0-9-]{36}$/i.test(orderId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid order reference.",
      });
    }

    await connectDB();

    const db = require("mongoose").connection.db;
    const orders = db.collection("orders");

    if (req.method === "GET") {
      const order = await orders.findOne(
        { id: orderId },
        {
          projection: {
            _id: 0,
            id: 1,
            status: 1,
            delivery: 1,
            messages: 1,
          },
        },
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      return res.status(200).json({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          delivery: order.delivery,
        },
        messages: Array.isArray(order.messages)
          ? order.messages
          : [],
      });
    }

    const text =
      typeof req.body?.text === "string"
        ? req.body.text.trim()
        : "";

    if (!text || text.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Message must contain 1–500 characters.",
      });
    }

    const message = {
      id: crypto.randomUUID(),
      from: "customer",
      text,
      createdAt: new Date(),
    };

    const result = await orders.updateOne(
      { id: orderId },
      {
        $push: {
          messages: {
            $each: [message],
            $slice: -100,
          },
        },
        $set: {
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

    return res.status(201).json({
      success: true,
      message: "Your message has been saved.",
    });
  } catch (error) {
    console.error("RASSAM messages API error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process your message right now.",
    });
  }
};