import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
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
const HOST = process.env.HOST;
console.log("host", HOST);
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
  console.log(botJournal);

  // const userMessage = msg.body.trim();
  if (msg.body == "!ping") {
    await msg.reply("pong");
    return;
  }

  if (msg.body.toLocaleLowerCase().includes("summarize")) {
    try {
      const yt_url = msg.links[0].link;

      const summary = await axios.post("http://192.168.1.9:8001/summarize", {
        yt_url: yt_url,
      });

      // console.log(summary, summary.data);

      await msg.reply(summary.data);
    } catch (error) {
      console.error("Error summarizing video:", error);
    }
  }
  // console.log(msg, "***************");
  // if (!activeWABot) return;
  // if (journalResult.messages > 2) return;
  // try {
  //   const AIResponse = await AIChatResponse(userMessage);
  //   await msg.reply(`${AIResponse} - *_Atte: Asistente de Yair 🤖_*`);
  // } catch (err) {
  //   console.error("Error getting AI response:", err);
  // }
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
const apiKey = process.env.WEATHER_API_KEY;
// const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${19.2883}&lon=${-99.6672}&appid=${apiKey}`;
const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${19.2883}&lon=${-99.6672}&appid=${apiKey}`;

const getWeather = async () => {
  try {
    const res = await axios.get(apiUrl);
    const weatherData = res.data;
    const dailyWeather = weatherData.daily[0]; // Assuming you want the first day (index 0)
    const averageTemperature =
      "🌡️ " +
      ((dailyWeather.temp.max + dailyWeather.temp.min) / 2 - 273.15).toFixed(2);
    const weatherDescription = dailyWeather.weather[0].description;
    const precipitationProbability =
      "🌧️ " + (dailyWeather.pop * 100).toFixed(2);
    const weatherText = `${weatherDescription}, ${precipitationProbability}%, ${averageTemperature}°C`;
    return weatherText;
  } catch (err) {
    console.log(err);
  }
};

export const sendWeather = async (destiny) => {
  try {
    const weather = await getWeather(); // e.g., "It's sunny and 25°C"
    const AIWeather = await AIWeatherResult(weather); // e.g., "🌞 It's a bright day!"
    await client.sendMessage(`521${destiny}@c.us`, AIWeather);
    console.log(`Weather message sent to 521${destiny}@c.us`);
  } catch (error) {
    console.error("Failed to send weather update:", error.message);
  }
};

const AIWeatherResult = async (weather) => {
  const prompt = `You're a friendly WhatsApp bot. Briefly describe the current weather: ${weather}. Use a casual tone, include 1–3 emojis, and keep the message under 40 words.`;

  try {
    const response = await axios.post(
      `http://${HOST}:11434/api/generate`,
      {
        model: "dolphin3:latest",
        prompt,
        stream: true,
      },
      {
        responseType: "stream",
      }
    );

    let result = "";

    response.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            result += json.response;
            // process.stdout.write(json.response); // Optional: live print
          }
        } catch (err) {
          console.error("Invalid JSON chunk:", line);
        }
      }
    });

    return await new Promise((resolve) => {
      response.data.on("end", () => {
        resolve(result);
      });
    });
  } catch (err) {
    console.error("Error:", err.message);
    return "Error generating AI weather response.";
  }
};
scheduleJob("0 0 7 * * *", async function () {
  // 0 0 7 * * *
  sendWeather(WEATHER_DESTINY);
});

scheduleJob("0 0 13 * * *", async function () {
  // 0 0 7 * * *
  sendWeather(WEATHER_DESTINY);
});

const currentHour = new Date().getHours();

const AIChatResponse = async (message) => {
  try {
    const response = await axios.post(
      `http://${HOST}:11434/api/chat`,
      {
        model: "dolphin3:latest",
        messages: [
          {
            role: "system",
            content:
              "Actúa como un asistente virtual que representa a Yair en su WhatsApp personal. No eres un bot formal, sino alguien que responde como si fuera Yair: buena onda, relajado, con sentido del humor cuando se puede, pero siempre respetuoso. Tu objetivo es responder a los mensajes entrantes de forma cálida, respetuosa y natural, reflejando la personalidad de alguien accesible y atento. Sigue estas instrucciones: Detecta el tono del mensaje recibido (informal, casual, formal, urgente, emocional, etc.). Responde en español y en el mismo estilo del usuario: Si el mensaje es breve o informal, responde de manera breve, casual y cercana. Confirma que el mensaje ha sido recibido y que Yair lo leerá pronto, sin prometer tiempos específicos. Personaliza la respuesta según el contenido del mensaje. Evita respuestas genéricas o plantillas evidentes. No respondas directamente el contenido del mensaje, solo da una confirmación amigable y acorde al contexto. Puedes usar emojis con moderación, solo si el tono del usuario lo sugiere.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        responseType: "stream",
      }
    );

    let result = "";

    response.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message && json.message.content) {
            result += json.message.content;
            // process.stdout.write(json.message.content); // Optional: live print
          }
        } catch (err) {
          console.error("Invalid JSON chunk:", line);
        }
      }
    });

    return await new Promise((resolve) => {
      response.data.on("end", () => {
        resolve(result);
      });
    });
  } catch (err) {
    console.error("Error:", err.message);
    return "Error generating AI chat response.";
  }
};

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
