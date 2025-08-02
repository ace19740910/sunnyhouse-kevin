import express from 'express';
import { config } from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { middleware, Client } from '@line/bot-sdk';

config();

const app = express();
const port = process.env.PORT || 3000;

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(lineConfig);

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
);

const assistantId = process.env.OPENAI_ASSISTANT_ID;
let manualMode = false;

app.post('/webhook', middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text.trim();

  if (userMessage === '我想要通話') {
    manualMode = true;
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '已為您通知真人，稍後會與您聯繫。'
    });
  }

  if (userMessage === '取消通話' || userMessage === '可以繼續說話了') {
    manualMode = false;
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '好的，Kevin 繼續為您服務。'
    });
  }

  if (manualMode) return null;

  try {
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage
    });
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    let responseText = 'Kevin 正在思考中...';

    while (true) {
      const status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (status.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMsg = messages.data.find(m => m.role === 'assistant');
        responseText = lastMsg?.content?.map(c => c.text?.value).join('\n') || '很抱歉，我沒有收到回覆。';
        break;
      } else if (status.status === 'failed') {
        responseText = '很抱歉，Kevin 沒有回應成功，請稍後再試。';
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: responseText
    });
  } catch (err) {
    console.error('Error:', err);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '發生錯誤，請稍後再試。'
    });
  }
}

app.listen(port, () => {
  console.log(`Kevin bot is listening on port ${port}`);
});
