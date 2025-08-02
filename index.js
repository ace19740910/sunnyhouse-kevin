require('dotenv').config();
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const line = require('@line/bot-sdk');
const axios = require('axios');

const app = express();
app.use(express.json());

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;

  const results = await Promise.all(events.map(async (event) => {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;

      const completion = await openai.createChatCompletion({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: '你是Kevin，一位受過專業訓練的旅行社AI客服，負責回答客人提出的問題。' },
          { role: 'user', content: userMessage }
        ]
      });

      const replyText = completion.data.choices[0].message.content;
      return client.replyMessage(event.replyToken, { type: 'text', text: replyText });
    }
  }));

  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});