import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import puppeteer from "puppeteer";

import qrcode from "qrcode-terminal";
import axios from "axios";
// import dotenv from "dotenv";
import { scheduleJob } from "node-schedule";

import app from "./webhook.js";
// test from github
process.loadEnvFile();

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    handleSIGINT: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});
// nicek
const PORT = process.env.PORT || 3000;

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
  sendWeather();
});

client.on("message", (msg) => {
  if (msg.body == "!ping") {
    msg.reply("pong");
  }
});
// test
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
const currentHour = new Date().getHours();

export const sendWeather = async (callback = null) => {
  console.log(`Current hour: ${currentHour}`);
  const jobMorning = scheduleJob("0 0 7 * * *", async function () {
    const weather = await getWeather();
    // callback(
    //   "5217293255577-1621863748@g.us",
    //   `¡Buenos días a todos! Les comparto el pronóstico del clima para hoy: ${weather}. Que tengan un excelente dia 😊`
    // );
    client.sendMessage("5217293737947@c.us", weather);
    // console.log("the weather is: ", weather);
  });
  // console.log(jobMorning.name);
};

// printWeather();
// console.log(printWeather());

// 0 0 7 * * *

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
});

export default client;

// jaaj
