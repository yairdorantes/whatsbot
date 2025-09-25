import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

import puppeteer from "puppeteer";
import qrcode from "qrcode-terminal";
import axios from "axios";
import { scheduleJob } from "node-schedule";
import app from "./webhook.js";

process.loadEnvFile();

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    handleSIGINT: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

let botJournal = [];
const PORT = process.env.PORT || 3000;
const WEATHER_DESTINY = process.env.WEATHER_DESTINY;
// const HOST = "http://host.docker.internal";
const HOST = "http://pc.local";
let activeWABot = true;
process.on("SIGINT", async () => {
  console.log("(SIGINT) Shutting down...");
  await client.destroy();
  console.log("client destroyed");
  process.exit(0);
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});
client.on("authenticated", () => {
  console.log("Client is authenticated!");
});
client.on("auth_failure", (msg) => {
  console.error("Authentication failure:", msg);
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (msg) => {
  const journalResult = handleBotJournal(msg);

  // const userMessage = msg.body.trim();
  if (msg.body == "!ping") {
    await msg.reply("pong");
    return;
  }
  const msgContent = msg.body.toLocaleLowerCase();
  let lang = "es";

  if (msgContent.includes("summarize")) {
    if (msgContent.includes("in english")) {
      lang = "en";
    }
    try {
      const yt_url = msg.links[0].link;

      const summary = await axios.post(`${HOST}:8001/summarize`, {
        yt_url: yt_url,
        lang: lang,
      });
      const media = await MessageMedia.fromUrl(summary.data.thumbnail);

      // console.log(summary, summary.data);
      await client.sendMessage(msg.from, media, {
        caption: `*${summary.data.title}*\n${summary.data.summary}`,
      });
    } catch (error) {
      console.error("Error summarizing video:", error);
      await msg.reply("Sorry, I couldn't summarize the video.");
    }
  }
});
client.on("message_create", (msg) => {
  msg.fromMe && handleBotJournal(msg);
});

client.initialize();

process.env.TZ = "America/Mexico_City";
// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)

// dotenv.config();
// const apiKey = process.env.WEATHER_API_KEY;

const currentHour = new Date().getHours();

app.get("/WABot", (req, res) => {
  activeWABot = !activeWABot;
  res.status(200).send(`change received!, now: ${activeWABot}`);
});
const handleBotJournal = (msg) => {
  const today = new Date();
  const currentDate = today.toLocaleDateString("es-MX");

  let phoneTarget = msg.id.fromMe ? msg.to : msg.from;

  const match = phoneTarget.match(/(\d{10})(?=@)/);
  if (!match) return; // Invalid phone format

  phoneTarget = match[1]; // Extracted 10-digit phone

  let contact = botJournal.find((item) => item.phone === phoneTarget);

  if (contact) {
    if (contact.lastMessageDate === currentDate) {
      if (msg.id.fromMe) {
        contact.messages = 2; // If I replied, stop further bot replies
      } else {
        contact.messages += 1; // Count the incoming message
      }
    } else {
      // New day: reset counter and count this new message
      contact.messages = msg.id.fromMe ? 2 : 1;
      contact.lastMessageDate = currentDate;
    }
    return contact;
  } else {
    // New contact
    const newContact = {
      phone: phoneTarget,
      messages: msg.id.fromMe ? 2 : 1,
      lastMessageDate: currentDate,
    };
    botJournal.push(newContact);
    return newContact;
  }
};

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Webhook server listening on port ${PORT} at ${currentHour}`);
  console.log("weather destiny:", WEATHER_DESTINY);
});
export default client;
