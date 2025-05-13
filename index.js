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

const PORT = process.env.PORT || 3000;
const WEATHER_DESTINY = process.env.WEATHER_DESTINY;
const HOST = process.env.HOST;
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
  const userMessage = msg.body.trim();
  if (msg.body == "!ping") {
    await msg.reply("pong");
    return;
  }
  // console.log(msg, "***************");
  if (!activeWABot) return;
  try {
    const AIResponse = await AIChatResponse(userMessage);
    await msg.reply(`${AIResponse} - *_Respuesta generada por IA 🤖_*`);
  } catch (err) {
    console.error("Error getting AI response:", err);
  }
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
  const prompt = `You are a WhatsApp bot designed to provide friendly and concise weather updates. Write a warm, engaging message to inform users about the current weather conditions: ${weather}. Include relevant emojis (e.g., 🌧 for rain, 🌡 for temperature) and ensure the tone is casual and approachable.`;

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
              "Actúa como un asistente amigable y profesional en un bot de WhatsApp, representándome a mí, Yair. Responde a los mensajes entrantes de manera cálida, natural y en el mismo idioma del usuario (en este caso, español). Hazle saber al usuario que su mensaje ha sido recibido y que será leído pronto, sin prometer tiempos específicos. Usa un tono cercano, pero respetuoso, adaptándote al contexto del mensaje recibido. Si el mensaje es breve o informal, responde de forma breve y casual; si es más formal o detallado, usa un tono ligeramente más profesional. Evita respuestas genéricas y personaliza la respuesta según el contenido del mensaje, pero mantén la idea central de que el mensaje será atendido pronto. No uses emojis en exceso, pero incluye alguno si el tono del usuario lo amerita. 😊",
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Webhook server listening on port ${PORT} at ${currentHour}`);
  console.log(WEATHER_DESTINY);
});
export default client;
