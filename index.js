import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(config);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let enableAutoReply = true;

app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text.trim();

        if (userMessage === '關閉AI') {
          enableAutoReply = false;
          await lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: '已關閉 Kevin 自動回覆功能。',
          });
          continue;
        }

        if (userMessage === '開啟AI') {
          enableAutoReply = true;
          await lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: '已開啟 Kevin 自動回覆功能。',
          });
          continue;
        }

        if (!enableAutoReply) continue;

        const thread = await openai.beta.threads.create();
        const msg = await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: userMessage,
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: process.env.OPENAI_ASSISTANT_ID,
        });

        let runStatus;
        do {
          runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          if (runStatus.status !== 'completed') {
            await new Promise(r => setTimeout(r, 1500));
          }
        } while (runStatus.status !== 'completed');

        const messages = await openai.beta.threads.messages.list(thread.id);
        const reply = messages.data
          .filter(m => m.role === 'assistant')
          .map(m => m.content[0].text.value)
          .join('
')
          .trim();

        await lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: reply || 'Kevin 沒有給出回覆喔！',
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Kevin Bot is running on port ${port}`);
});