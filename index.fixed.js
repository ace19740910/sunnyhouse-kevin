
'use strict';

require('dotenv').config();
const line = require('@line/bot-sdk');
const express = require('express');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

// Middleware and webhook route
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('收到 Webhook 事件：', JSON.stringify(req.body, null, 2));

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('處理事件時發生錯誤：', err);
      res.status(500).end();
    });
});

// Event handler
function handleEvent(event) {
  console.log('收到事件：', JSON.stringify(event, null, 2));

  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('非文字訊息，略過處理。');
    return Promise.resolve(null);
  }

  const echo = { type: 'text', text: `你說的是：${event.message.text}` };
  return client.replyMessage(event.replyToken, echo).catch(err => {
    console.error('回覆訊息時發生錯誤：', err);
  });
}

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Kevin 機器人已啟動，正在監聽 ${port} 埠口...`);
});
