const assistantId = process.env.OPENAI_ASSISTANT_ID;

import 'dotenv/config';
import express from 'express';
import { middleware, Client } from '@line/bot-sdk';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot 設定
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(lineConfig);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let allowKevinReply = true; // 控制開關

app.post('/webhook', middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  const results = await Promise.all(events.map(async (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }

    const userMessage = event.message.text.trim();

    // 控制開關：手動接管
    if (userMessage === '手動接管') {
      allowKevinReply = false;
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '已切換為手動回覆模式，Kevin 暫時安靜。',
      });
    }

    // 控制開關：恢復 Kevin 回覆
    if (userMessage === '關閉手動') {
      allowKevinReply = true;
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '已恢復 Kevin 自動回覆。',
      });
    }

    if (!allowKevinReply) {
      return null;
    }

    try {
      const completion = await openai.beta.threads.createAndRun({
        assistant_id: assistantId,
        thread: {
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        },
      });

      const runId = completion.id;
      let messages = [];
      while (true) {
        const runStatus = await openai.beta.threads.runs.retrieve(runId);
        if (runStatus.status === 'completed') {
          const threadMessages = await openai.beta.threads.messages.list(runStatus.thread_id);
          messages = threadMessages.data;
          break;
        } else if (runStatus.status === 'failed') {
          throw new Error('Kevin 回覆失敗。');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const replyText = messages
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content.map(part => part.text.value).join('\n'))
        .join('\n')
        .trim();

      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: replyText || 'Kevin 沒有回覆任何內容。',
      });

    } catch (error) {
      console.error('Kevin 回覆錯誤:', error);
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '抱歉，Kevin 回覆時發生錯誤。',
      });
    }
  }));

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
