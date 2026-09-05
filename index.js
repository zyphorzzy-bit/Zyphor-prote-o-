const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const db = require('quick.db');
const config = require('./data.json');
const emojis = require('./config/emojis.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.commands = new Collection();

// Verificação de Imunidade Absoluta (Dono do Bot ou Posse do Servidor)
function isProtected(userId, guild) {
  return userId === config.ownerId || userId === guild.ownerId;
}

// -------------------------------------------------------------
// 1. INICIALIZAÇÃO E RESTAURAÇÃO DE ESTADOS
// -------------------------------------------------------------
client.once('ready', async () => {
  console.log(`${emojis.zyphor} Zyphor System ativado com sucesso como ${client.user.tag}`);

  // Restaura Status de Live / Streaming se configurado
  const statusType = db.get('bot_status_type');
  const statusText = db.get('bot_status_text');
  const statusUrl = db.get('bot_status_url');

  if (statusType === 'STREAMING' && statusText) {
    client.user.setPresence({
      activities: [{
        name: statusText,
        type: ActivityType.Streaming,
        url: statusUrl || 'https://www.twitch.tv/discord'
      }],
      status: 'online'
    });
  } else {
    client.user.setPresence({
      activities: [{ name: `${emojis.protecao} Zyphor System • Proteção Ativa`, type: ActivityType.Watching }],
      status: 'online'
    });
  }

  // Restaura Conexão no Canal de Voz (Call 24/7)
  client.guilds.cache.forEach(guild => {
    const savedChannelId = db.get(`voice_channel_${guild.id}`);
    if (savedChannelId) {
      const channel = guild.channels.cache.get(savedChannelId);
      if (channel) {
        try {
          joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
          });
          console.log(`${emojis.verde} Reconectado à call 24/7 no servidor: ${guild.name}`);
        } catch (err) {
          console.error(`Erro ao reconectar à call na guilda ${guild.id}:`, err);
        }
      }
    }
  });
});

// -------------------------------------------------------------
// 2. SISTEMA ANTI-NUKE / BANIMENTO EM MASSA & CONTENÇÃO
// -------------------------------------------------------------
const modActions = new Map();

client.on('guildBanAdd', async (ban) => {
  const { guild } = ban;
  const now = Date.now();

  const auditLogs = await guild.fetchAuditLogs({ type: 22, limit: 1 }).catch(() => null);
  if (!auditLogs) return;

  const entry = auditLogs.entries.first();
  if (!entry) return;

  const executor = entry.executor;
  if (!executor || isProtected(executor.id, guild) || executor.id === client.user.id) return;

  if (!modActions.has(executor.id)) modActions.set(executor.id, []);
  const actions = modActions.get(executor.id).filter(t => now - t < 60000);
  actions.push(now);
  modActions.set(executor.id, actions);

  // Gatilho: Mais de 4 bans em menos de 1 minuto
  if (actions.length > 4) {
    modActions.delete(executor.id);

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    // 1. Strip de cargos instantâneo
    await member.roles.set([]).catch(() => {});

    // 2. Criação do canal privado de contenção
    const isolatedChannel = await guild.channels.create({
      name: `containment-${member.user.username}`,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: member.id, allow: ['ViewChannel', 'SendMessages'] },
        { id: config.ownerId, allow: ['ViewChannel', 'SendMessages'] }
      ]
    });

    // 3. Embed de alerta
    const embedAlerta = new EmbedBuilder()
      .setTitle(`${emojis.alerta} AMEAÇA DETECTADA — BANIMENTO EM MASSA`)
      .setDescription(
        `${emojis.banido} O usuário <@${member.id}> (\`${member.id}\`) excedeu o limite de segurança.\n\n` +
        `**Medidas automáticas tomadas:**\n` +
        `${emojis.verde} Todos os cargos foram removidos.\n` +
        `${emojis.verde} Canal de contenção gerado.\n` +
        `${emojis.proibido} Convite para o Tribunal **NÃO** enviado ao infrator.`
      )
      .setColor(0xFF0000)
      .setFooter({ text: 'Zyphor System • Módulo Anti-Nuke' })
      .setTimestamp();

    await isolatedChannel.send({
      content: `<@${config.ownerId}> <@${guild.ownerId}> ${emojis.alerta} **Intervenção Urgente Requerida!**`,
      embeds: [embedAlerta]
    });
  }
});

// -------------------------------------------------------------
// 3. FILTROS DE CHAT (ANTI-LINK E ANTI-SPAM)
// -------------------------------------------------------------
const userSpamMap = new Map();

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (isProtected(message.author.id, message.guild)) return;

  const guildId = message.guild.id;

  // Anti-Link
  const antiLinkOn = db.get(`antilink_${guildId}`);
  if (antiLinkOn && /(https?:\/\/[^\s]+)/g.test(message.content)) {
    if (!message.content.includes('tenor.com') && !message.content.includes('giphy.com')) {
      await message.delete().catch(() => {});
      const warning = await message.channel.send(`${emojis.proibido} ${message.author}, envio de links não é permitido neste servidor!`);
      setTimeout(() => warning.delete().catch(() => {}), 4000);
      return;
    }
  }

  // Anti-Spam
  const now = Date.now();
  if (!userSpamMap.has(message.author.id)) userSpamMap.set(message.author.id, []);
  const timestamps = userSpamMap.get(message.author.id).filter(t => now - t < 5000);
  timestamps.push(now);
  userSpamMap.set(message.author.id, timestamps);

  if (timestamps.length > 5) {
    await message.delete().catch(() => {});
    userSpamMap.delete(message.author.id);
  }
});

// Login do bot
client.login(process.env.DISCORD_TOKEN);
