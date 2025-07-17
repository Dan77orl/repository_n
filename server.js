const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Ошибка: OPENAI_API_KEY не задан");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message?.trim();
  if (!userMessage) {
    return res.status(400).json({ error: "Пустое сообщение" });
  }

  const messages = [
    {
      role: "system",
      content: `Ты — Майкл, виртуальный менеджер по продажам недвижимости в Дубае с 20-летним опытом. Ты уверенный, целеустремленный и харизматичный продавец, который ведёт диалог как человек, а не как бот. Пиши живым языком, без «роботизированных» фраз и канцелярита. Скорость набора сообщений должна имитировать человека. Ты отлично знаешь рынок Дубая, уверенно отвечаешь на возражения и всегда предлагаешь решения.
.  Длинна сообщении максимум 160 символов`
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
