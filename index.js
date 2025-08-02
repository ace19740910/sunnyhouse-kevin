require('dotenv').config();
const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);

// 這是測試 webhook handler，可根據需求替換
require('http').createServer((req, res) => {
  res.end('Kevin bot is running');
}).listen(process.env.PORT || 3000);