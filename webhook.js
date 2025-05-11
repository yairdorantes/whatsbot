import express from "express";
import client from "./index.js";

const app = express();

const port = 3000;
app.use(express.json());

app.post("/webhook", (req, res) => {
  console.log("📥 Webhook received:", req.body);
  const { new_email } = req.body;
  client.sendMessage("5217293737947@c.us", new_email);
  res.status(200).send("Webhook received!");
});

app.post("/whatsapp", (req, res) => {
  const { destiny, msg } = req.body;
  try {
    client.sendMessage(`521${destiny}@c.us`, msg);
    res.status(200).send("success sending whatsapp message!");
  } catch (error) {
    console.log(error);
    res.status(500).send("something went wrong sending the message");
  }
});

export default app;
