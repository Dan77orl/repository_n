const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const fetch = require("node-fetch");
const csv = require("csv-parser");
const { Readable } = require("stream");
const dayjs = require("dayjs");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Ошибка: OPENAI_API_KEY не задан");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const prices = {
  "30 выходов": "€9.40",
  "спонсорство": "от €400 в месяц",
  "джингл": "от €15"
};

// Путь к CSV-версии Google Таблицы
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYscFQEwGmJMM4hxoWEBrYam3JkQMD9FKbKpcwMrgfSdhaducl_FeHNqwPe-Sfn0HSyeQeMnyqvgtN/pub?gid=0&single=true&output=csv";

async function fetchSongs() {
  const res = await fetch(sheetUrl);
  const text = await res.text();

  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from([text])
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message?.trim();
  if (!userMessage) {
    return res.status(400).json({ error: "Пустое сообщение" });
  }

  // Проверка цен
  for (let key in prices) {
    if (userMessage.toLowerCase().includes(key)) {
      const reply = `Стоимость услуги "${key}": ${prices[key]}`;
      return res.json({ reply });
    }
  }

  // Поиск даты и времени
  const dateRegex = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;
  const timeRegex = /\b(\d{1,2})[:.](\d{2})\b/;

  const dateMatch = userMessage.match(dateRegex);
  const timeMatch = userMessage.match(timeRegex);

  if (dateMatch && timeMatch) {
    const date = dayjs(
      `${dateMatch[1].padStart(2, "0")}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3].padStart(4, "20")}`,
      "DD.MM.YYYY"
    ).format("DD.MM.YYYY");

    const time = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;

    try {
      const songs = await fetchSongs();

      const song = songs.find((row) => {
        const rowDate = row["Дата"]?.trim();
        const rowTime = row["Время"]?.trim().slice(0, 5);
        return rowDate === date && rowTime === time;
      });

      if (song) {
        return res.json({
          reply: `🎶 В ${time} (${date}) играла песня: ${song["Песня"]}`
        });
      } else {
        return res.json({
          reply: `🤷 Не нашёл песню на ${time} ${date}`
        });
      }
    } catch (err) {
      console.error("Ошибка чтения таблицы:", err);
      return res.status(500).json({ error: "Ошибка чтения таблицы" });
    }
  }

  // GPT-ответ, если не дата и не цена
  const messages = [
    {
      role: "system",
      content: `Ты — Майкл, виртуальный менеджер-презентатор компании AARK Developers — застройщика с 25-летним опытом, более 4 млрд дирхамов в реализованных проектах, работающего в Дубае и Рас-эль-Хайме.
Ты — топовый эксперт в продажах недвижимости с опытом более 15 лет. Ты знаешь, как продавать через эмоции, ценности и результат. Ты не давишь — ты ведёшь за собой. Твоя цель — пригласить клиента на презентацию или получить заявку на проект SORA Tower.
`
    },
    { role: "user", content: userMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = completion.choices?.[0]?.message?.content || "⚠️ Не получил ответ от GPT";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI ошибка:", err);
    res.status(500).json({ error: "Ошибка GPT", detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ RuWave сервер запущен на порту ${PORT}`));
