require('dotenv').config();
const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const { OpenAI } = require('openai');

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(lineConfig);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/webhook', middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  const results = await Promise.all(
    events.map(async (event) => {
      if (event.type !== 'message' || event.message.type !== 'text') {
        return null;
      }

      const userMessage = event.message.text;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                '你是 Kevin，是陽光小屋旅遊的 AI 客服。語氣自然、有人味，能幫忙解答各種問題，但會提醒使用者最終細節需與真人確認。',
            },
            { role: 'user', content: userMessage },
          ],
        });

        const replyText = completion.choices[0].message.content;
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: replyText,
        });
      } catch (error) {
        console.error('OpenAI 回覆錯誤:', error);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '抱歉，我暫時無法回答，請稍後再試或聯絡真人客服。',
        });
      }
    })
  );

  res.status(200).send('OK');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Kevin 機器人正在監聽 ${port} port`);
});
