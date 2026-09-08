const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ActivityType, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const db = require('quick.db');
const config = require('./data.json');

// Mapeamento direto de emojis no index.js
const emojis = {
  desativado: "<a:desativado:1534611986539876463>",
  ativado: "<a:ativado:1534611985260609607>",
  avisos: "<:avisos:1539125781320433724>",
  perfil: "<:perfil:1540557352602705990>",
  suporte: "<:suporte:1539845832004870154>",
  linkExterno: "<:linkexterno:1539124690709385330>",
  loading: "<a:loanding:1534612861211377868>",
  setaEsquerda: "<:setaladoe:1539124867113295898>",
  setaDireita: "<:setaladod:1539124868727963651>",
  horario: "<:horrio:1534611997335883886>",
  gerenciar: "<:gerenciar:1540870215640809482>",
  rule: "<:rule:1539125787158908928>",
  seta: "<:seta:1539785898693234700>",
  setinha: "<:setinha:1539125798462685316>",
  sms: "<:sms:1539125782335455292>",
  fixo: "<:fixo:1541318082574684240>",
  edit: "<:edit:1534611988624310272>",
  config: "<:config:1534611990633250937>",
  protecao: "<:proteo:1539125790711480331>",
  banido: "<:banido:1539124695448952973>",
  apagado: "<:apagado:1539124689077665894>",
  arquivo: "<:arquivo:1539124693460713552>",
  amarelo: "<:amarelo:1540096480998596741>",
  verde: "<:verde:1540096479501357137>",
  vermelho: "<:vermelho:1540096477689290842>",
  not: "<:not:1539815573981237388>",
  positivo: "<:positivo:1534611995742179419>",
  negativo: "<:negativo:1534612858548256921>"
};

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

// Mensagem de erro de permissão com link de suporte
const NO_PERM_MSG = `${emojis.not} Você não tem permissão para usar este comando. Se caso isso foi um erro, entre em contato com o suporte: https://discord.gg/uAaSXMkUg4`;

// Função de verificação de imunidade
function isProtected(userId, guild) {
  return userId === config.ownerId || userId === guild.ownerId;
}

// DEFINIÇÃO DOS COMANDOS SLASH ( / )
const slashCommands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Painel de Controle e Segurança do Zyphor System')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um usuário do servidor (Motivo obrigatório)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuário a ser banido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do banimento').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unbanall')
    .setDescription('Desbanir todos os usuários com delay de segurança')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setstreaming')
    .setDescription('Definir o status de Live do Zyphor System')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('texto').setDescription('Texto da transmissão').setRequired(true))
    .addStringOption(opt => opt.setName('url').setDescription('Link da Twitch/YouTube').setRequired(false)),

  new SlashCommandBuilder()
    .setName('call')
    .setDescription('Gerenciar permanência em canais de voz 24/7')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('entrar').setDescription('Faz o bot entrar no seu canal de voz'))
    .addSubcommand(sub => sub.setName('sair').setDescription('Remove o bot do canal de voz')),

  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configura o sistema de boas-vindas do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('canal_envio').setDescription('Canal onde a mensagem será enviada').setRequired(true))
    .addIntegerOption(opt => opt.setName('tempo_segundos').setDescription('Tempo para a mensagem sumir (0 para não apagar)').setRequired(true))
    .addStringOption(opt => opt.setName('mensagem').setDescription('Texto da mensagem. Use {user} e {server}').setRequired(true))
    .addChannelOption(opt => opt.setName('botao_canal_1').setDescription('OPCIONAL: Primeiro canal para o botão').setRequired(false))
    .addStringOption(opt => opt.setName('botao_nome_1').setDescription('OPCIONAL: Nome do primeiro botão').setRequired(false))
    .addChannelOption(opt => opt.setName('botao_canal_2').setDescription('OPCIONAL: Segundo canal para o botão').setRequired(false))
    .addStringOption(opt => opt.setName('botao_nome_2').setDescription('OPCIONAL: Nome do segundo botão').setRequired(false))
];

// INICIALIZAÇÃO
client.once('ready', async () => {
  console.log(`${emojis.protecao} Zyphor System ativado como ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommands }
    );
    console.log(`${emojis.verde} Comandos Slash registrados!`);
  } catch (error) {
    console.error(`${emojis.vermelho} Erro ao registrar comandos:`, error);
  }

  const statusType = db.get('bot_status_type');
  const statusText = db.get('bot_status_text');
  const statusUrl = db.get('bot_status_url');

  if (statusType === 'STREAMING' && statusText) {
    client.user.setPresence({
      activities: [{ name: statusText, type: ActivityType.Streaming, url: statusUrl || 'https://www.twitch.tv/discord' }],
      status: 'online'
    });
  }

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
            selfDeaf: true
          });
        } catch (err) {}
      }
    }
  });
});

// EVENTO DE BOAS-VINDAS
client.on('guildMemberAdd', async (member) => {
  const { guild } = member;
  const configWelcome = db.get(`welcome_config_${guild.id}`);
  if (!configWelcome || !configWelcome.channelId) return;

  const channel = guild.channels.cache.get(configWelcome.channelId);
  if (!channel) return;

  let textoFinal = configWelcome.message || 'Seja bem-vindo(a), {user}!';
  textoFinal = textoFinal.replace(/{user}/g, `<@${member.id}>`).replace(/{server}/g, guild.name);

  const components = [];
  const buttons = [];

  if (configWelcome.btn1Channel) {
    const ch1 = guild.channels.cache.get(configWelcome.btn1Channel);
    if (ch1) {
      buttons.push(
        new ButtonBuilder()
          .setLabel(configWelcome.btn1Name || `#${ch1.name}`)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${ch1.id}`)
      );
    }
  }

  if (configWelcome.btn2Channel) {
    const ch2 = guild.channels.cache.get(configWelcome.btn2Channel);
    if (ch2) {
      buttons.push(
        new ButtonBuilder()
          .setLabel(configWelcome.btn2Name || `#${ch2.name}`)
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${ch2.id}`)
      );
    }
  }

  if (buttons.length > 0) {
    components.push(new ActionRowBuilder().addComponents(buttons));
  }

  try {
    const msg = await channel.send({ content: textoFinal, components });
    if (configWelcome.timeSeconds && configWelcome.timeSeconds > 0) {
      setTimeout(() => msg.delete().catch(() => {}), configWelcome.timeSeconds * 1000);
    }
  } catch (err) {}
});

// EXECUÇÃO DOS COMANDOS SLASH
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, user } = interaction;

  // /painel
  if (commandName === 'painel') {
    if (!isProtected(user.id, guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    const antiLinkStatus = db.get(`antilink_${guild.id}`) ? `${emojis.ativado} Ativado` : `${emojis.desativado} Desativado`;

    const embed = new EmbedBuilder()
      .setTitle(`${emojis.protecao} ZYPHOR SYSTEM — PAINEL DE CONTROLE`)
      .setDescription(
        `${emojis.config} **MÓDULOS DE SEGURANÇA**\n\n` +
        `${emojis.linkExterno} **Anti-Link:** ${antiLinkStatus}\n` +
        `${emojis.avisos} **Anti-Nuke:** ${emojis.ativado} Ativado (4 bans/min)\n` +
        `${emojis.gerenciar} **Call 24/7:** ${db.get(`voice_channel_${guild.id}`) ? `${emojis.ativado} Conectado` : `${emojis.desativado} Desconectado`}\n`
      )
      .setColor(0x00FBFF)
      .setFooter({ text: 'Zyphor System • Sistema de Proteção' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('toggle_antilink').setLabel('Alternar Anti-Link').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_suporte').setLabel('Suporte').setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // /ban
  if (commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers) && !isProtected(user.id, guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo');

    if (isProtected(targetUser.id, guild)) {
      return interaction.reply({ content: `${emojis.not} Este usuário possui imunidade no Zyphor System.`, ephemeral: true });
    }

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) return interaction.reply({ content: `${emojis.avisos} Usuário não encontrado no servidor.`, ephemeral: true });

    await member.ban({ reason }).catch(err => interaction.reply({ content: `Erro ao banir: ${err.message}`, ephemeral: true }));
    return interaction.reply({ content: `${emojis.banido} O usuário **${targetUser.tag}** foi banido pelo motivo: \`${reason}\`` });
  }

  // /unbanall
  if (commandName === 'unbanall') {
    if (!isProtected(user.id, guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const banList = await guild.bans.fetch().catch(() => null);
    if (!banList || banList.size === 0) return interaction.editReply(`${emojis.verde} Não há usuários banidos no servidor.`);

    let total = banList.size;
    let desbanidos = 0;

    await interaction.editReply(`${emojis.loading} Desbanindo **${total} usuários** com delay de 1.5s...`);

    for (const [userId] of banList) {
      try {
        await guild.members.unban(userId, 'Restauração autorizada');
        desbanidos++;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1500));
    }

    return interaction.editReply(`${emojis.verde} **Desbanimento concluído!** Total: **${desbanidos}/${total}**`);
  }

  // /setstreaming
  if (commandName === 'setstreaming') {
    if (!isProtected(user.id, guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    const texto = interaction.options.getString('texto');
    let url = interaction.options.getString('url') || 'https://www.twitch.tv/discord';
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;

    db.set('bot_status_type', 'STREAMING');
    db.set('bot_status_text', texto);
    db.set('bot_status_url', url);

    client.user.setPresence({
      activities: [{ name: texto, type: ActivityType.Streaming, url }],
      status: 'online'
    });

    return interaction.reply({ content: `${emojis.verde} Status alterado para **Transmitindo**: \`${texto}\``, ephemeral: true });
  }

  // /call
  if (commandName === 'call') {
    if (!isProtected(user.id, guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'entrar') {
      const member = await guild.members.fetch(user.id);
      const channel = member.voice.channel;

      if (!channel) return interaction.reply({ content: `${emojis.avisos} Você precisa estar em um canal de voz!`, ephemeral: true });

      joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true
      });

      db.set(`voice_channel_${guild.id}`, channel.id);
      return interaction.reply({ content: `${emojis.verde} Bot fixado na call <#${channel.id}> 24/7.`, ephemeral: true });
    }

    if (subcommand === 'sair') {
      const conn = getVoiceConnection(guild.id);
      if (conn) conn.destroy();
      db.delete(`voice_channel_${guild.id}`);
      return interaction.reply({ content: `${emojis.vermelho} Bot desconectado do canal de voz.`, ephemeral: true });
    }
  }

  // /welcome
  if (commandName === 'welcome') {
    if (!isProtected(user.id, guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    const canalEnvio = interaction.options.getChannel('canal_envio');
    const tempo = interaction.options.getInteger('tempo_segundos');
    const mensagem = interaction.options.getString('mensagem');

    const btn1Channel = interaction.options.getChannel('botao_canal_1');
    const btn1Name = interaction.options.getString('botao_nome_1');
    const btn2Channel = interaction.options.getChannel('botao_canal_2');
    const btn2Name = interaction.options.getString('botao_nome_2');

    db.set(`welcome_config_${guild.id}`, {
      channelId: canalEnvio.id,
      timeSeconds: tempo,
      message: mensagem,
      btn1Channel: btn1Channel ? btn1Channel.id : null,
      btn1Name: btn1Name || null,
      btn2Channel: btn2Channel ? btn2Channel.id : null,
      btn2Name: btn2Name || null
    });

    return interaction.reply({
      content: `${emojis.verde} **Boas-Vindas Configuradas!**\n\n` +
               `📍 **Canal:** <#${canalEnvio.id}>\n` +
               `⏱️ **Tempo:** ${tempo > 0 ? `${tempo} segundos` : 'Mensagem fixa'}\n` +
               `🔘 **Botões:** ${btn1Channel || btn2Channel ? 'Ativados' : 'Nenhum'}\n` +
               `💬 **Texto:** ${mensagem}`,
      ephemeral: true
    });
  }
});

// COMANDOS POR PREFIXO (s!)
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const prefix = config.prefix || 's!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const { guild, author } = message;

  if (command === 'ban') {
    if (!message.member.permissions.has('BanMembers') && !isProtected(author.id, guild)) {
      return message.reply(NO_PERM_MSG);
    }

    const target = message.mentions.members.first() || await guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply(`${emojis.avisos} Uso correto: \`${prefix}ban @usuario <motivo>\``);

    if (isProtected(target.id, guild)) {
      return message.reply(`${emojis.not} Usuário imune ao sistema.`);
    }

    const reason = args.slice(1).join(' ');
    if (!reason) {
      return message.reply(`${emojis.avisos} **Você precisa fornecer um motivo obrigatório para banir!**`);
    }

    await target.ban({ reason }).catch(err => message.reply(`Erro: ${err.message}`));
    return message.channel.send(`${emojis.banido} Usuário **${target.user.tag}** banido. **Motivo:** \`${reason}\``);
  }
});

// INTERAÇÃO COM BOTÕES
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'toggle_antilink') {
    if (!isProtected(interaction.user.id, interaction.guild)) {
      return interaction.reply({ content: NO_PERM_MSG, ephemeral: true });
    }

    const actual = db.get(`antilink_${interaction.guild.id}`);
    if (actual) {
      db.delete(`antilink_${interaction.guild.id}`);
      return interaction.reply({ content: `${emojis.desativado} **Anti-Link Desativado!**`, ephemeral: true });
    } else {
      db.set(`antilink_${interaction.guild.id}`, true);
      return interaction.reply({ content: `${emojis.ativado} **Anti-Link Ativado!**`, ephemeral: true });
    }
  }

  if (interaction.customId === 'btn_suporte') {
    return interaction.reply({ content: `${emojis.suporte} Servidor de Suporte: https://discord.gg/uAaSXMkUg4`, ephemeral: true });
  }
});

// FILTROS ANTI-LINK E ANTI-SPAM
const userSpamMap = new Map();

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (isProtected(message.author.id, message.guild)) return;

  const guildId = message.guild.id;

  const antiLinkOn = db.get(`antilink_${guildId}`);
  if (antiLinkOn && /(https?:\/\/[^\s]+)/g.test(message.content)) {
    if (!message.content.includes('tenor.com') && !message.content.includes('giphy.com')) {
      await message.delete().catch(() => {});
      const warning = await message.channel.send(`${emojis.not} ${message.author}, envio de links não é permitido.`);
      setTimeout(() => warning.delete().catch(() => {}), 4000);
      return;
    }
  }

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

// ANTI-NUKE
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

  if (actions.length > 4) {
    modActions.delete(executor.id);

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    await member.roles.set([]).catch(() => {});

    const isolatedChannel = await guild.channels.create({
      name: `containment-${member.user.username}`,
      permissionOverwrites: [
        { id: guild.id, deny: ['ViewChannel'] },
        { id: member.id, allow: ['ViewChannel', 'SendMessages'] },
        { id: config.ownerId, allow: ['ViewChannel', 'SendMessages'] }
      ]
    });

    const embedAlerta = new EmbedBuilder()
      .setTitle(`${emojis.avisos} AMEAÇA DETECTADA — BANIMENTO EM MASSA`)
      .setDescription(
        `O moderador <@${member.id}> foi isolado por tentativa de ataque.\n\n` +
        `${emojis.verde} Cargos removidos.\n` +
        `${emojis.verde} Canal isolado gerado.`
      )
      .setColor(0xFF0000)
      .setTimestamp();

    await isolatedChannel.send({
      content: `<@${config.ownerId}> <@${guild.ownerId}> **Ação Necessária!**`,
      embeds: [embedAlerta]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
