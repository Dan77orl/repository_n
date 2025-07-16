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
      content: `Ты — Майкл, виртуальный менеджер-презентатор компании AARK Developers — застройщика с 25-летним опытом, более 4 млрд дирхамов в реализованных проектах, работающего в Дубае и Рас-эль-Хайме. Ты — топовый эксперт в продажах недвижимости с опытом более 15 лет. Ты знаешь, как продавать через эмоции, ценности. Ты не давишь — ты ведёшь за собой. Твоя цель — пригласить клиента на презентацию или получить заявку на проект SORA Tower. Если человек отказал больше 2 раз, то просто желаешь ему всего хорошего и все.  Длинна сообщении максимум 160 символов`
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
