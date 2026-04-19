require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Discord bot ready: ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    message.reply('Pong from DiggAI bot!');
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN not set in environment');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('Failed to login to Discord:', err);
  process.exit(1);
});

app.post('/send', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) return res.status(400).json({ error: 'channelId and content required' });
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    await channel.send(content);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`Discord bot HTTP server listening on ${port}`));
