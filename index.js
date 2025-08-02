const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');
const line = require('@line/bot-sdk');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

const client = new line.Client(config);

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

let autoReply = true;

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(async (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') return null;

    const userMessage = event.message.text;

    if (userMessage === "轉手動輸入") {
      autoReply = false;
      return client.replyMessage(event.replyToken, { type: 'text', text: '已切換為手動客服，請稍等真人回覆。' });
    }

    if (userMessage === "重新開啟自動回覆") {
      autoReply = true;
      return client.replyMessage(event.replyToken, { type: 'text', text: '已恢復自動回覆，由 Kevin 為您服務。' });
    }

    if (!autoReply) return null;

    const completion = await openai.createChatCompletion({
      model: process.env.MODEL,
      messages: [
        {
          role: "system",
          content: "你是 Kevin，陽光小屋旅遊的 AI 客服與業務助理，語氣自然溫暖、有點人味與幽默，專門幫助客戶了解行程與常見問題，若不確定就請客戶稍候與真人聯繫。"
        },
        { role: "user", content: userMessage }
      ]
    });

    const aiReply = completion.data.choices[0].message.content;
    return client.replyMessage(event.replyToken, { type: 'text', text: aiReply });
  }));

  res.json(results);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Kevin is running on port ${port}`);
});
