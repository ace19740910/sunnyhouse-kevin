require("dotenv").config();
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const line = require("@line/bot-sdk");

const app = express();
app.use(express.json());

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// GPT 初始化
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  try {
    const gptRes = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "你是陽光小屋的 AI 客服 Kevin，語氣自然、有點人味與幽默，幫客人貼心回答問題。若客人需要更進一步的資訊，請提醒他輸入『我想要通話』，你會轉交真人聯絡。",
        },
        { role: "user", content: userMessage },
      ],
    });

    const replyText = gptRes.data.choices[0].message.content;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText,
    });
  } catch (err) {
    console.error("GPT Error:", err);
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "Kevin 一時斷線了，請稍後再試看看 🙏",
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Kevin bot is running on port", port);
});