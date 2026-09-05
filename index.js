const {
  Client, GatewayIntentBits, Collection, Events,
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ==============================================
// 🔒 TOKEN — LÊ DA VARIÁVEL DO SHARDCLOUD
// ==============================================
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!token) {
  console.log('❌ ERRO: Variável DISCORD_TOKEN não definida!');
  process.exit(1);
}

// ==============================================
// 🎨 EMOJIS ORIGINAIS DO SEU SERVIDOR
// ==============================================
const EMOJIS = {
  ZYPHOR: '<:zyphor:1540096483276095621>',
  VERMELHO: '❌',
  VERDE: '✅',
  USER_SALT: '<:usersalt:1539125796046639154>',
  USERS: '<:users:1539124702407168062>',
  USER: '👤',
  SUPORTE: '<:suporte:1539845832004870154>',
  REEMBOLSO: '<:sreembolso:1539125794549407785>',
  SMS: '💬',
  MEDIADOR: '🛡️',
  SETA_ESQUERDA: '⬅️',
  SETA_DIREITA: '➡️',
  SETA_ACIMA: '⬆️',
  SETA_ABAIXO: '⬇️',
  PESQUISA: '🔍',
  REGRA: '📜',
  CARREGANDO: '⏳',
  LINK_EXTERNO: '🔗',
  ID: '🆔',
  HORARIO: '⏰',
  ACEITAR: '✅',
  ALERTA: '⚠️',
  AMARELO: '🟨',
  APAGADO: '<:apagado:1539124689077665894>',
  ARQUIVO: '📁',
  NEGATIVO: '❌',
  ATENDER: '<:atender:1541318084210720799>',
  ATIVADO: '🟢',
  AVISOS: '📢',
  PASSAR_POSSE: '<:passarposse:1539125801851813970>',
  PERFIL: '👤',
  BANIDO: '🔨',
  BOM: '👍',
  CONFIG: '⚙️',
  DESATIVADO: '🔴',
  EDIT: '✏️',
  ENGRENAGEM: '⚙️',
  FECHAR: '✖️',
  FIXO: '📌',
  PROTECAO: '🛡️',
  PROTECAO2: '🛡️',
  PROIBIDO: '🚫',
  POSITIVO: '✅',
  PING_RUIM: '🔴',
  PING_BOM: '🟢',
  SETA: '▶️',
  RUIM: '👎',
  RECUSAR: '❌',
  AJUDA: '❓'
};

// ==============================================
// 📂 SISTEMA DE CONFIGURAÇÃO
// ==============================================
const DATA_PATH = path.join(__dirname, 'data.json');

const defaultConfig = {
  OWNER_ID: '1533306874513068093',
  PROTECTED_ROLE_ID: null,
  PREFIX_LETTER: 's',
  PREFIX_SYMBOL: '!',
  LOG_CHANNEL_ID: null,
  NUKE_ALERT_CHANNEL_ID: null,
  TRIBUNAL_URL: null,
  AUTO_KICK_CHANNEL_ID: null,
  ANTI_RAID_PUNISH: 'mute',
  ANTI_SPAM_PUNISH: 'mute',
  MUTE_DURATION: 3600000,
  MAX_BANS_PER_MINUTE: 10,
  BAN_WINDOW_MS: 60000,
  PUNISH_BAN_MASS_ACTION: 'ban',
  MAX_ROLE_ACTIONS: 4,
  ROLE_ACTION_WINDOW: 60000,
  AUTO_PUNISH_NUKE: true,
  NUKE_PUNISH_ACTION: 'ban',
  COMMAND_PERMS: {
    ban: { roles: [], users: [] },
    unban: { roles: [], users: [] },
    kick: { roles: [], users: [] },
    mute: { roles: [], users: [] },
    unmute: { roles: [], users: [] }
  },
  STAFF_ROLES: [],
  WHITELIST_LINKS: [],
  STREAM_TITLE: null,
  STREAM_URL: null
};

let guildData = {};

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf8');
      const data = JSON.parse(raw);
      Object.keys(data).forEach(id => {
        guildData[id] = { ...defaultConfig, ...data[id] };
      });
    }
  } catch (e) {
    console.log('⚠️ data.json não encontrado, criando novo...');
  }
}

function saveData() {
  const out = {};
  Object.keys(guildData).forEach(id => {
    out[id] = guildData[id];
  });
  fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2));
}

function getConfig(guildId) {
  if (!guildData[guildId]) {
    guildData[guildId] = { ...defaultConfig };
    saveData();
  }
  return guildData[guildId];
}

loadData();

// ==============================================
// 🔐 FUNÇÕES DE PERMISSÃO
// ==============================================
function isOwner(userId, guildId) {
  return userId === getConfig(guildId).OWNER_ID;
}

function isProtected(member, guildId) {
  if (!member) return false;
  const cfg = getConfig(guildId);
  if (member.id === cfg.OWNER_ID) return true;
  if (cfg.PROTECTED_ROLE_ID && member.roles.cache.has(cfg.PROTECTED_ROLE_ID)) return true;
  return false;
}

function canUseCommand(member, guildId, commandName) {
  const cfg = getConfig(guildId);
  const userId = member.id;
  if (userId === cfg.OWNER_ID) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const perms = cfg.COMMAND_PERMS?.[commandName];
  if (!perms) return false;
  if (perms.users?.includes(userId)) return true;
  if (perms.roles?.length > 0) {
    return perms.roles.some(roleId => member.roles.cache.has(roleId));
  }
  return false;
}

// ==============================================
// 📤 FUNÇÃO DE MANDAR PV COM EMBED + THUMBNAIL + URL
// ==============================================
async function sendPunishmentDM(user, guild, type, motivo, moderator, tribunalUrl) {
  try {
    const cores = {
      ban: 0xED4245,
      kick: 0xFEE75C,
      mute: 0x9B59B6
    };
    const titulos = {
      ban: `${EMOJIS.BANIDO} **VOCÊ FOI BANIDO!**`,
      kick: `${EMOJIS.ALERTA} **VOCÊ FOI EXPULSO!**`,
      mute: `${EMOJIS.SMS} **VOCÊ FOI MUTADO!**`
    };

    const embed = new EmbedBuilder()
      .setColor(cores[type])
      .setTitle(titulos[type])
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: `${EMOJIS.SETA} Servidor`, value: `\`${guild.name}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${moderator.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false },
        { name: `${EMOJIS.HORARIO} Data`, value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    if (tribunalUrl) {
      embed.addFields({
        name: `${EMOJIS.LINK_EXTERNO} Tribunal`,
        value: `[Clique aqui para ver](${tribunalUrl})`,
        inline: false
      });
    }

    await user.send({ embeds: [embed] });
    return true;
  } catch (e) {
    console.log(`Não consegui mandar PV para ${user.tag}:`, e.message);
    return false;
  }
}

// ==============================================
// 🤖 INICIALIZAR BOT
// ==============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ]
});

client.login(token);

client.on('ready', () => {
  console.log(`${EMOJIS.ZYPHOR} BOT LIGADO COMO ${client.user.tag}!`);
  client.user.setActivity({ name: 'Zyphor System', type: 3 });
});

// ==============================================
// 📩 SISTEMA DE PREFIXO
// ==============================================
client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  const cfg = getConfig(message.guild.id);
  const prefix = cfg.PREFIX_LETTER + cfg.PREFIX_SYMBOL;
  if (!message.content.toLowerCase().startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();

  // 📋 PAINEL
  if (cmd === 'painel' || cmd === 'config') {
    if (!isOwner(message.author.id, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} **SÓ O DONO PODE CONFIGURAR O BOT!**`);
    }
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.CONFIG} PAINEL DE CONFIGURAÇÃO — ZYPHOR`)
      .addFields(
        { name: `${EMOJIS.USER} Dono`, value: `<@${cfg.OWNER_ID}>`, inline: true },
        { name: `${EMOJIS.PROTECAO} Cargo Protegido`, value: cfg.PROTECTED_ROLE_ID ? `<@&${cfg.PROTECTED_ROLE_ID}>` : `${EMOJIS.DESATIVADO} Não configurado`, inline: true },
        { name: `${EMOJIS.ENGRENAGEM} Prefixo`, value: `\`${prefix}\``, inline: true },
        { name: `${EMOJIS.BANIDO} Ban Massa`, value: `${cfg.MAX_BANS_PER_MINUTE}/min → ${cfg.PUNISH_BAN_MASS_ACTION}`, inline: true },
        { name: `${EMOJIS.ALERTA} Anti-Nuke`, value: `${cfg.MAX_ROLE_ACTIONS} ações → ${cfg.NUKE_PUNISH_ACTION}`, inline: true },
        { name: `${EMOJIS.LINK_EXTERNO} Tribunal`, value: cfg.TRIBUNAL_URL ? `✅ Configurado` : `${EMOJIS.DESATIVADO} Não configurado`, inline: true }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Zyphor System`, iconURL: client.user.displayAvatarURL() });

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('painel_menu')
        .setPlaceholder('Selecione uma opção...')
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel('Prefixo').setValue('set_prefix'),
          new StringSelectMenuOptionBuilder().setLabel('Cargo Protegido').setValue('set_protected_role'),
          new StringSelectMenuOptionBuilder().setLabel('Canal de Logs').setValue('set_log_channel'),
          new StringSelectMenuOptionBuilder().setLabel('Canal Anti-Nuke').setValue('set_nuke_channel'),
          new StringSelectMenuOptionBuilder().setLabel('Ban Massa').setValue('set_ban_mass'),
          new StringSelectMenuOptionBuilder().setLabel('URL do Tribunal').setValue('set_tribunal_url'),
          new StringSelectMenuOptionBuilder().setLabel('Permissões').setValue('set_perms'),
          new StringSelectMenuOptionBuilder().setLabel('Fechar').setValue('close')
        ])
    );
    return message.reply({ embeds: [embed], components: [menu] });
  }

  // 🔑 MUDAR PREFIXO
  if (cmd === 'prefix' || cmd === 'setprefix') {
    if (!isOwner(message.author.id, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} Apenas o dono pode mudar o prefixo!`);
    }
    const novo = args[0];
    if (!novo || novo.length < 2) {
      return message.reply(`${EMOJIS.ALERTA} Use: \`${prefix}prefix <letra+simbolo>\` | Exemplo: \`${prefix}prefix k!\``);
    }
    cfg.PREFIX_LETTER = novo[0];
    cfg.PREFIX_SYMBOL = novo.slice(1) || '!';
    saveData();
    return message.reply(`${EMOJIS.VERDE} Prefixo alterado para: \`${cfg.PREFIX_LETTER}${cfg.PREFIX_SYMBOL}\``);
  }

  // ❓ HELP
  if (cmd === 'help' || cmd === 'ajuda') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.AJUDA} COMANDOS DO BOT — ZYPHOR`)
      .addFields(
        { name: `${EMOJIS.ENGRENAGEM} Configuração (Dono)`, value: `\`${prefix}painel\` — Abre o painel\n\`${prefix}prefix <novo>\` — Muda o prefixo`, inline: false },
        { name: `${EMOJIS.BANIDO} Moderação (Prefixo)`, value: `\`${prefix}ban @user <motivo>\` — Banir\n\`${prefix}unban <ID>\` — Desbanir\n\`${prefix}kick @user <motivo>\` — Expulsar\n\`${prefix}mute @user <motivo> [tempo]\` — Mutar\n\`${prefix}unmute @user\` — Desmutear`, inline: false },
        { name: `${EMOJIS.BANIDO} Moderação (Comando Barra)`, value: `/ban /unban /kick /mute /unmute /help`, inline: false },
        { name: `${EMOJIS.AJUDA} Outros`, value: `\`${prefix}help\` — Mostra esta mensagem\n/help — Lista de comandos`, inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Zyphor System`, iconURL: client.user.displayAvatarURL() });
    return message.reply({ embeds: [helpEmbed] });
  }

  // 🔨 BAN — PREFIXO
  if (cmd === 'ban') {
    if (!canUseCommand(message.member, message.guild.id, 'ban')) {
      return message.reply(`${EMOJIS.PROIBIDO} Você não tem permissão para usar este comando!`);
    }
    const user = message.mentions.users.first();
    const motivo = args.slice(1).join(' ') || 'Sem motivo';
    if (!user) return message.reply(`${EMOJIS.ALERTA} Use: \`${prefix}ban @usuario motivo\``);
    const member = message.guild.members.cache.get(user.id);
    if (member && isProtected(member, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} Este usuário está protegido e não pode ser punido!`);
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${EMOJIS.BANIDO} CONFIRMAR BANIMENTO`)
      .addFields(
        { name: `${EMOJIS.USER} Usuário`, value: `<@${user.id}> — \`${user.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${message.author.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ban_confirm_${user.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`ban_cancel_${user.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return message.reply({ embeds: [confirmEmbed], components: [btn] });
  }

  // 🔓 UNBAN — PREFIXO
  if (cmd === 'unban') {
    if (!canUseCommand(message.member, message.guild.id, 'unban')) {
      return message.reply(`${EMOJIS.PROIBIDO} Você não tem permissão para usar este comando!`);
    }
    const userId = args[0];
    if (!userId) return message.reply(`${EMOJIS.ALERTA} Use: \`${prefix}unban <ID_do_usuario>\``);

    try {
      await message.guild.bans.remove(userId);
      return message.reply(`${EMOJIS.VERDE} Usuário \`${userId}\` desbanido com sucesso!`);
    } catch (e) {
      return message.reply(`${EMOJIS.VERMELHO} Erro ao desbanir: Usuário não está banido ou ID inválido!`);
    }
  }

  // 🦵 KICK — PREFIXO
  if (cmd === 'kick') {
    if (!canUseCommand(message.member, message.guild.id, 'kick')) {
      return message.reply(`${EMOJIS.PROIBIDO} Você não tem permissão para usar este comando!`);
    }
    const user = message.mentions.users.first();
    const motivo = args.slice(1).join(' ') || 'Sem motivo';
    if (!user) return message.reply(`${EMOJIS.ALERTA} Use: \`${prefix}kick @usuario motivo\``);
    const member = message.guild.members.cache.get(user.id);
    if (!member) return message.reply(`${EMOJIS.ALERTA} Usuário não encontrado no servidor!`);
    if (isProtected(member, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} Este usuário está protegido e não pode ser punido!`);
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${EMOJIS.ALERTA} CONFIRMAR KICK`)
      .addFields(
        { name: `${EMOJIS.USER} Usuário`, value: `<@${user.id}> — \`${user.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${message.author.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`kick_confirm_${user.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Warning),
      new ButtonBuilder().setCustomId(`kick_cancel_${user.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return message.reply({ embeds: [confirmEmbed], components: [btn] });
  }

  // 🔇 MUTE — PREFIXO
  if (cmd === 'mute') {
    if (!canUseCommand(message.member, message.guild.id, 'mute')) {
      return message.reply(`${EMOJIS.PROIBIDO} Você não tem permissão para usar este comando!`);
    }
    const user = message.mentions.users.first();
    const tempo = parseInt(args.find(a => /^\d+$/.test(a))) || 60;
    const motivo = args.filter(a => !/^\d+$/.test(a) && !a.startsWith('<@')).join(' ') || 'Sem motivo';
    if (!user) return message.reply(`${EMOJIS.ALERTA} Use: \`${prefix}mute @usuario motivo [tempo_min]\``);
    const member = message.guild.members.cache.get(user.id);
    if (!member) return message.reply(`${EMOJIS.ALERTA} Usuário não encontrado no servidor!`);
    if (isProtected(member, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} Este usuário está protegido e não pode ser punido!`);
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`${EMOJIS.SMS} CONFIRMAR MUTE`)
      .addFields(
        { name: `${EMOJIS.USER} Usuário`, value: `<@${user.id}> — \`${user.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${message.author.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false },
        { name: `${EMOJIS.HORARIO} Duração`, value: `\`${tempo} minutos\``, inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mute_confirm_${user.id}_${tempo}`).setLabel('Confirmar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mute_cancel_${user.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return message.reply({ embeds: [confirmEmbed], components: [btn] });
  }

  // 🔊 UNMUTE — PREFIXO
  if (cmd === 'unmute') {
    if (!canUseCommand(message.member, message.guild.id, 'unmute')) {
      return message.reply(`${EMOJIS.PROIBIDO} Você não tem permissão para usar este comando!`);
    }
    const user = message.mentions.users.first();
    if (!user) return message.reply(`${EMOJIS.ALERTA} Use: \`${prefix}unmute @usuario\``);
    const member = message.guild.members.cache.get(user.id);
    if (!member) return message.reply(`${EMOJIS.ALERTA} Usuário não encontrado no servidor!`);

    const muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    if (!muteRole || !member.roles.cache.has(muteRole.id)) {
      return message.reply(`${EMOJIS.ALERTA} Este usuário não está mutado!`);
    }

    await member.roles.remove(muteRole.id);
    return message.reply(`${EMOJIS.VERDE} Usuário <@${user.id}> desmutado com sucesso!`);
  }
});

// ==============================================
// 🎯 INTERAÇÕES — BOTÕES E MENUS
// ==============================================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  // 📋 MENU DO PAINEL
  if (interaction.isStringSelectMenu() && interaction.customId === 'painel_menu') {
    if (!isOwner(interaction.user.id, interaction.guild.id)) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Apenas o dono pode configurar!`, ephemeral: true });
    }
    const value = interaction.values[0];

    if (value === 'close') {
      return interaction.message.delete().catch(() => {});
    }
    if (value === 'set_tribunal_url') {
      const modal = new ModalBuilder()
        .setCustomId('modal_tribunal')
        .setTitle('URL do Tribunal')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('url').setLabel('Link do Tribunal').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://discord.com/channels/...').setValue(cfg.TRIBUNAL_URL || '')
          )
        );
      return interaction.showModal(modal);
    }
    if (value === 'set_prefix') {
      const modal = new ModalBuilder()
        .setCustomId('modal_prefix')
        .setTitle('Novo Prefixo')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('prefix').setLabel('Prefixo (ex: k!)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('s!')
          )
        );
      return interaction.showModal(modal);
    }
    return interaction.reply({ content: `${EMOJIS.CARREGANDO} Em desenvolvimento...`, ephemeral: true });
  }

  // 💾 SALVAR MODAIS
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_tribunal') {
      cfg.TRIBUNAL_URL = interaction.fields.getTextInputValue('url');
      saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} URL do Tribunal salva com sucesso!`, ephemeral: true });
    }
    if (interaction.customId === 'modal_prefix') {
      const novo = interaction.fields.getTextInputValue('prefix');
      if (!novo || novo.length < 2) {
        return interaction.reply({ content: `${EMOJIS.VERMELHO} Prefixo inválido! Use: letra+simbolo (ex: k!)`, ephemeral: true });
      }
      cfg.PREFIX_LETTER = novo[0];
      cfg.PREFIX_SYMBOL = novo.slice(1);
      saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Prefixo alterado para: \`${novo}\``, ephemeral: true });
    }
  }

  // 🔘 BOTÕES DE BAN
  if (interaction.isButton() && interaction.customId.startsWith('ban_')) {
    const [acao, _, userId] = interaction.customId.split('_');
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });

    if (acao === 'confirm') {
      const member = interaction.guild.members.cache.get(userId);
      if (member && isProtected(member, interaction.guild.id)) {
        return interaction.reply({ content: `${EMOJIS.PROIBIDO} Usuário protegido!`, ephemeral: true });
      }
      const motivo = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Motivo'))?.value || 'Sem motivo';
      
      await sendPunishmentDM(user, interaction.guild, 'ban', motivo, interaction.user, cfg.TRIBUNAL_URL);
      await interaction.guild.members.ban(userId, { reason: motivo }).catch(e => {
        return interaction.reply({ content: `${EMOJIS.VERMELHO} Erro ao banir: ${e.message}`, ephemeral: true });
      });

      const emb = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57F287)
        .setTitle(`${EMOJIS.VERDE} USUÁRIO BANIDO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }
    if (acao === 'cancel') {
      const emb = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x99AAB5)
        .setTitle(`${EMOJIS.FECHAR} BANIMENTO CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }
  }

  // 🔘 BOTÕES DE KICK
  if (interaction.isButton() && interaction.customId.startsWith('kick_')) {
    const [acao, _, userId] = interaction.customId.split('_');
    const user = await client.users.fetch(userId).catch(() => null);
    const member = interaction.guild.members.cache.get(userId);
    if (!user || !member) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });

    if (acao === 'confirm') {
      if (isProtected(member, interaction.guild.id)) {
        return interaction.reply({ content: `${EMOJIS.PROIBIDO} Usuário protegido!`, ephemeral: true });
      }
      const motivo = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Motivo'))?.value || 'Sem motivo';
      
      await sendPunishmentDM(user, interaction.guild, 'kick', motivo, interaction.user, cfg.TRIBUNAL_URL);
      await member.kick(motivo).catch(e => {
        return interaction.reply({ content: `${EMOJIS.VERMELHO} Erro ao expulsar: ${e.message}`, ephemeral: true });
      });

      const emb = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57F287)
        .setTitle(`${EMOJIS.VERDE} USUÁRIO EXPULSO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }
    if (acao === 'cancel') {
      const emb = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x99AAB5)
        .setTitle(`${EMOJIS.FECHAR} KICK CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }
  }

  // 🔘 BOTÕES DE MUTE
  if (interaction.isButton() && interaction.customId.startsWith('mute_')) {
    const parts = interaction.customId.split('_');
    const acao = parts[1];
    const userId = parts[2];
    const tempo = parseInt(parts[3]) || 60;
    const user = await client.users.fetch(userId).catch(() => null);
    const member = interaction.guild.members.cache.get(userId);
    if (!user || !member) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });

    if (acao === 'confirm') {
      if (isProtected(member, interaction.guild.id)) {
        return interaction.reply({ content: `${EMOJIS.PROIBIDO} Usuário protegido!`, ephemeral: true });
      }
      const motivo = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Motivo'))?.value || 'Sem motivo';
      
      await sendPunishmentDM(user, interaction.guild, 'mute', motivo, interaction.user, cfg.TRIBUNAL_URL);
      
      let muteRole = interaction.guild.roles.cache.find(r => r.name === 'Muted');
      if (!muteRole) {
        muteRole = await interaction.guild.roles.create({
          name: 'Muted',
          color: 0x808080,
          permissions: [],
          reason: 'Cargo de mute automático'
        });
        interaction.guild.channels.cache.forEach(async ch => {
          await ch.permissionOverwrites.create(muteRole, { SendMessages: false, AddReactions: false, Speak: false }).catch(() => {});
        });
      }
      await member.roles.add(muteRole.id, motivo).catch(e => {
        return interaction.reply({ content: `${EMOJIS.VERMELHO} Erro ao mutar: ${e.message}`, ephemeral: true });
      });

      setTimeout(async () => {
        if (member.roles.cache.has(muteRole.id)) {
          await member.roles.remove(muteRole.id, 'Tempo de mute expirado').catch(() => {});
        }
      }, tempo * 60000);

      const emb = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57F287)
        .setTitle(`${EMOJIS.VERDE} USUÁRIO MUTADO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }
    if (acao === 'cancel') {
      const emb = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x99AAB5)
        .setTitle(`${EMOJIS.FECHAR} MUTE CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }
  }
});

// ==============================================
// 📌 REGISTRAR COMANDOS DE BARRA
// ==============================================
const COMANDOS = [
  {
    name: 'ban',
    description: 'Banir um usuário',
    options: [
      { type: 6, name: 'usuário', description: 'Usuário para banir', required: true },
      { type: 3, name: 'motivo', description: 'Motivo do banimento', required: false }
    ]
  },
  {
    name: 'unban',
    description: 'Desbanir um usuário',
    options: [
      { type: 3, name: 'id', description: 'ID do usuário', required: true }
    ]
  },
  {
    name: 'kick',
    description: 'Expulsar um usuário',
    options: [
      { type: 6, name: 'usuário', description: 'Usuário para expulsar', required: true },
      { type: 3, name: 'motivo', description: 'Motivo da expulsão', required: false }
    ]
  },
  {
    name: 'mute',
    description: 'Mutear um usuário',
    options: [
      { type: 6, name: 'usuário', description: 'Usuário para mutar', required: true },
      { type: 3, name: 'motivo', description: 'Motivo do mute', required: false },
      { type: 4, name: 'tempo', description: 'Tempo em minutos (padrão 60)', required: false }
    ]
  },
  {
    name: 'unmute',
    description: 'Desmutear um usuário',
    options: [
      { type: 6, name: 'usuário', description: 'Usuário para desmutear', required: true }
    ]
  },
  {
    name: 'help',
    description: 'Mostra todos os comandos do bot'
  }
];

// 🔄 REGISTRO E REMOÇÃO DE COMANDOS ANTIGOS
client.on('ready', async () => {
  try {
    console.log(`${EMOJIS.ZYPHOR} Limpando comandos antigos...`);
    // Limpa os comandos registrados anteriormente
    await client.application.commands.set([]);
    
    console.log(`${EMOJIS.ZYPHOR} Registrando novos comandos de barra...`);
    // Registra a lista atualizada de comandos
    await client.application.commands.set(COMANDOS);
    
    console.log(`${EMOJIS.ZYPHOR} Comandos de barra atualizados com sucesso!`);
  } catch (error) {
    console.error('Erro ao atualizar comandos de barra:', error);
  }
});

// ==============================================
// ⚡ EXECUTAR COMANDOS DE BARRA
// ==============================================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);
  const { commandName, options, user, guild, member } = interaction;

  // ❓ HELP
  if (commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.AJUDA} COMANDOS DO BOT — ZYPHOR`)
      .addFields(
        { name: `${EMOJIS.ENGRENAGEM} Comandos de Prefixo`, value: `\`s!painel\` — Painel de configuração\n\`s!prefix <novo>\` — Mudar prefixo\n\`s!ban @user motivo\` — Banir\n\`s!kick @user motivo\` — Expulsar\n\`s!mute @user motivo tempo\` — Mutar\n\`s!unban ID\` — Desbanir\n\`s!unmute @user\` — Desmutear\n\`s!help\` — Ajuda`, inline: false },
        { name: `${EMOJIS.BANIDO} Comandos de Barra`, value: `/ban /unban /kick /mute /unmute /help`, inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Zyphor System`, iconURL: client.user.displayAvatarURL() });
    return interaction.reply({ embeds: [helpEmbed] });
  }

  // 🔨 BAN
  if (commandName === 'ban') {
    if (!canUseCommand(member, guild.id, 'ban')) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Você não tem permissão!`, ephemeral: true });
    }
    const alvo = options.getUser('usuário');
    const motivo = options.getString('motivo') || 'Sem motivo';
    const alvoMember = guild.members.cache.get(alvo.id);
    if (alvoMember && isProtected(alvoMember, guild.id)) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Usuário protegido!`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${EMOJIS.BANIDO} CONFIRMAR BANIMENTO`)
      .addFields(
        { name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — \`${alvo.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false }
      )
      .setThumbnail(alvo.displayAvatarURL({ dynamic: true }));

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ban_confirm_${alvo.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`ban_cancel_${alvo.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [btn] });
  }

  // 🦵 KICK
  if (commandName === 'kick') {
    if (!canUseCommand(member, guild.id, 'kick')) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Você não tem permissão!`, ephemeral: true });
    }
    const alvo = options.getUser('usuário');
    const motivo = options.getString('motivo') || 'Sem motivo';
    const alvoMember = guild.members.cache.get(alvo.id);
    if (!alvoMember) return interaction.reply({ content: `${EMOJIS.ALERTA} Usuário não está no servidor!`, ephemeral: true });
    if (isProtected(alvoMember, guild.id)) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Usuário protegido!`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${EMOJIS.ALERTA} CONFIRMAR KICK`)
      .addFields(
        { name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — \`${alvo.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false }
      )
      .setThumbnail(alvo.displayAvatarURL({ dynamic: true }));

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`kick_confirm_${alvo.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Warning),
      new ButtonBuilder().setCustomId(`kick_cancel_${alvo.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [btn] });
  }

  // 🔇 MUTE
  if (commandName === 'mute') {
    if (!canUseCommand(member, guild.id, 'mute')) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Você não tem permissão!`, ephemeral: true });
    }
    const alvo = options.getUser('usuário');
    const motivo = options.getString('motivo') || 'Sem motivo';
    const tempo = options.getInteger('tempo') || 60;
    const alvoMember = guild.members.cache.get(alvo.id);
    if (!alvoMember) return interaction.reply({ content: `${EMOJIS.ALERTA} Usuário não está no servidor!`, ephemeral: true });
    if (isProtected(alvoMember, guild.id)) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Usuário protegido!`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`${EMOJIS.SMS} CONFIRMAR MUTE`)
      .addFields(
        { name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — \`${alvo.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false },
        { name: `${EMOJIS.HORARIO} Duração`, value: `\`${tempo} minutos\``, inline: true }
      )
      .setThumbnail(alvo.displayAvatarURL({ dynamic: true }));

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mute_confirm_${alvo.id}_${tempo}`).setLabel('Confirmar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mute_cancel_${alvo.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [btn] });
  }

  // 🔓 UNBAN
  if (commandName === 'unban') {
    if (!canUseCommand(member, guild.id, 'unban')) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Você não tem permissão!`, ephemeral: true });
    }
    const userId = options.getString('id');
    try {
      await guild.bans.remove(userId);
      return interaction.reply(`${EMOJIS.VERDE} Usuário \`${userId}\` desbanido com sucesso!`);
    } catch (e) {
      return interaction.reply(`${EMOJIS.VERMELHO} Erro ao desbanir: Usuário não está banido ou ID inválido!`);
    }
  }

  // 🔊 UNMUTE
  if (commandName === 'unmute') {
    if (!canUseCommand(member, guild.id, 'unmute')) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} Você não tem permissão!`, ephemeral: true });
    }
    const alvo = options.getUser('usuário');
    const membro = guild.members.cache.get(alvo.id);
    if (!membro) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado no servidor!`, ephemeral: true });
    
    const muteRole = guild.roles.cache.find(r => r.name === 'Muted');
    if (!muteRole || !membro.roles.cache.has(muteRole.id)) {
      return interaction.reply({ content: `${EMOJIS.ALERTA} Usuário não está mutado!`, ephemeral: true });
    }
    
    await membro.roles.remove(muteRole.id);
    return interaction.reply(`${EMOJIS.VERDE} Usuário <@${alvo.id}> desmutado com sucesso!`);
  }
});
