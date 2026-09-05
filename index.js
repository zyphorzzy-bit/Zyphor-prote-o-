const {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  PermissionsBitField, REST, Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ==============================================
// 🔒 TOKEN — USA DISCORD_TOKEN (SUA VARIÁVEL)
// ==============================================
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.log('❌ ERRO: Variável DISCORD_TOKEN não definida!');
  process.exit(1);
}

// ==============================================
// 🎨 EMOJIS
// ==============================================
const EMOJIS = {
  ZYPHOR: '<:zyphor:1540096483276095621>',
  VERMELHO: '<:vermelho:1540096477689290842>',
  VERDE: '<:verde:1540096479501357137>',
  USER: '<:user:1539125800907968603>',
  CONFIG: '<:config:1534611990633250937>',
  ENGRENAGEM: '<:engrenagem:1539124700205023313>',
  PROTECAO: '<:proteo:1539124701232898111>',
  ALERTA: '<:alerta:1534611993410015456>',
  BANIDO: '<:banido:1539124695448952973>',
  ACEITAR: '<:aceitar:1539124696912756767>',
  RECUSAR: '<:recusar:1539124698338566257>',
  FECHAR: '<:fechar:1541318085435199569>',
  LINK_EXTERNO: '<:linkexterno:1539124690709385330>',
  MEDIADOR: '<:smediador:1539125793505153044>',
  REGRA: '<:rule:1539125787158908928>',
  HORARIO: '<:horrio:1534611997335883886>',
  DESATIVADO: '<a:desativado:1534611986539876463>',
  ATIVADO: '<a:ativado:1534611985260609607>',
  AJUDA: '❓'
};

// ==============================================
// 📂 CONFIGURAÇÃO
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
  ANTI_LINK_ENABLED: true,
  ANTI_SPAM_ENABLED: true,
  ANTI_RAID_ENABLED: true,
  ANTI_NUKE_ENABLED: true,
  MAX_BANS_PER_MINUTE: 10,
  MAX_ROLE_ACTIONS: 4,
  BAN_WINDOW_MS: 60000,
  ROLE_WINDOW_MS: 60000,
  PUNISH_BAN_MASS: 'ban',
  PUNISH_NUKE: 'ban',
  COMMAND_PERMS: { ban: { roles: [], users: [] }, unban: { roles: [], users: [] }, kick: { roles: [], users: [] }, mute: { roles: [], users: [] }, unmute: { roles: [], users: [] } },
  WHITELIST_LINKS: []
};

let guildData = {};
let banHistory = {};
let roleActionHistory = {};

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf8');
      const data = JSON.parse(raw);
      Object.keys(data).forEach(id => guildData[id] = { ...defaultConfig, ...data[id] });
    }
  } catch (e) { console.log('📂 Criando data.json...'); }
}
function saveData() { fs.writeFileSync(DATA_PATH, JSON.stringify(guildData, null, 2)); }
function getConfig(gid) { if (!guildData[gid]) guildData[gid] = { ...defaultConfig }; return guildData[gid]; }
loadData();

function isOwner(uid, gid) { return uid === getConfig(gid).OWNER_ID; }
function isProtected(member, gid) {
  if (!member) return false;
  const cfg = getConfig(gid);
  if (member.id === cfg.OWNER_ID) return true;
  if (cfg.PROTECTED_ROLE_ID && member.roles.cache.has(cfg.PROTECTED_ROLE_ID)) return true;
  return false;
}
function canUse(member, gid, cmd) {
  const cfg = getConfig(gid);
  if (member.id === cfg.OWNER_ID) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const perms = cfg.COMMAND_PERMS?.[cmd];
  if (!perms) return false;
  if (perms.users?.includes(member.id)) return true;
  if (perms.roles?.some(r => member.roles.cache.has(r))) return true;
  return false;
}

// ==============================================
// 📤 MANDAR PV COM EMBED COMPLETO
// ==============================================
async function sendDM(user, guild, type, motivo, mod, tribunal) {
  try {
    const cores = { ban: 0xED4245, kick: 0xFEE75C, mute: 0x9B59B6 };
    const titulos = { ban: `${EMOJIS.BANIDO} **VOCÊ FOI BANIDO!**`, kick: `${EMOJIS.ALERTA} **VOCÊ FOI EXPULSO!**`, mute: `${EMOJIS.ALERTA} **VOCÊ FOI MUTADO!**` };
    const embed = new EmbedBuilder()
      .setColor(cores[type])
      .setTitle(titulos[type])
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: `${EMOJIS.USER} Servidor`, value: `\`${guild.name}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${mod.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false },
        { name: `${EMOJIS.HORARIO} Data`, value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
      )
      .setTimestamp();
    if (tribunal) embed.addFields({ name: `${EMOJIS.LINK_EXTERNO} Tribunal`, value: `[Clique aqui](${tribunal})`, inline: false });
    await user.send({ embeds: [embed] });
  } catch (e) {}
}

// ==============================================
// 🤖 INICIAR BOT
// ==============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

client.login(token);
client.on('ready', async () => {
  console.log(`${EMOJIS.ZYPHOR} BOT LIGADO: ${client.user.tag}`);
  client.user.setActivity({ name: 'Zyphor System', type: 3 });

  // Registrar comandos de barra
  const cmds = [
    { name: 'ban', description: 'Banir usuário', options: [{ type:6, name:'usuário', required:true }, { type:3, name:'motivo' }] },
    { name: 'unban', description: 'Desbanir', options: [{ type:3, name:'id', required:true }] },
    { name: 'kick', description: 'Expulsar', options: [{ type:6, name:'usuário', required:true }, { type:3, name:'motivo' }] },
    { name: 'mute', description: 'Mutear', options: [{ type:6, name:'usuário', required:true }, { type:3, name:'motivo' }, { type:4, name:'tempo' }] },
    { name: 'unmute', description: 'Desmutear', options: [{ type:6, name:'usuário', required:true }] },
    { name: 'help', description: 'Ver todos os comandos' }
  ];
  const rest = new REST({ version:'10' }).setToken(token);
  await rest.put(Routes.applicationCommands(client.user.id), { body: cmds });
});

// ==============================================
// 📩 COMANDOS DE PREFIXO + PROTEÇÕES
// ==============================================
client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot) return;
  const cfg = getConfig(msg.guild.id);
  const prefix = cfg.PREFIX_LETTER + cfg.PREFIX_SYMBOL;

  // 🚫 AUTO-KICK CANAL
  if (cfg.AUTO_KICK_CHANNEL_ID && msg.channel.id === cfg.AUTO_KICK_CHANNEL_ID) {
    if (!isProtected(msg.member, msg.guild)) {
      await msg.member.kick('Canal restrito').catch(() => {});
      await msg.delete().catch(() => {});
      return;
    }
  }

  // 🔗 ANTI-LINK
  if (cfg.ANTI_LINK_ENABLED) {
    if (/(https?:\/\/[^\s]+)/gi.test(msg.content)) {
      const isOk = cfg.WHITELIST_LINKS.some(l => msg.content.includes(l));
      if (!isOk) { await msg.delete().catch(() => {}); return; }
    }
  }

  // 📩 COMANDOS
  if (!msg.content.toLowerCase().startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();

  // 📋 PAINEL
  if (cmd === 'painel' || cmd === 'config') {
    if (!isOwner(msg.author.id, msg.guild.id))
      return msg.reply(`${EMOJIS.PROTECAO} **SÓ O DONO PODE CONFIGURAR!**`);
    
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.CONFIG} PAINEL DE CONFIGURAÇÃO — ZYPHOR`)
      .addFields(
        { name: `${EMOJIS.USER} Dono`, value: `<@${cfg.OWNER_ID}>`, inline: true },
        { name: `${EMOJIS.PROTECAO} Cargo Protegido`, value: cfg.PROTECTED_ROLE_ID ? `<@&${cfg.PROTECTED_ROLE_ID}>` : `${EMOJIS.DESATIVADO} Não configurado`, inline: true },
        { name: `${EMOJIS.ENGRENAGEM} Prefixo`, value: `\`${prefix}\``, inline: true },
        { name: `${EMOJIS.BANIDO} Ban Massa`, value: `${cfg.MAX_BANS_PER_MINUTE}/min`, inline: true },
        { name: `${EMOJIS.ALERTA} Anti-Nuke`, value: `${cfg.MAX_ROLE_ACTIONS} ações`, inline: true },
        { name: `${EMOJIS.LINK_EXTERNO} Tribunal`, value: cfg.TRIBUNAL_URL ? `${EMOJIS.ATIVADO} Configurado` : `${EMOJIS.DESATIVADO} Não configurado`, inline: true }
      )
      .setThumbnail(client.user.displayAvatarURL());

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('painel_menu')
        .setPlaceholder(`${EMOJIS.CONFIG} Selecione uma opção...`)
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.ENGRENAGEM} Prefixo`).setValue('set_prefix'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.PROTECAO} Cargo Protegido`).setValue('set_protected_role'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.CONFIG} Canal de Logs`).setValue('set_log_channel'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.ALERTA} Canal Anti-Nuke`).setValue('set_nuke_channel'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.BANIDO} Ban Massa`).setValue('set_ban_mass'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.LINK_EXTERNO} URL do Tribunal`).setValue('set_tribunal'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.ALERTA} Auto-Kick Canal`).setValue('set_auto_kick'),
          new StringSelectMenuOptionBuilder().setLabel(`${EMOJIS.FECHAR} Fechar`).setValue('close')
        ])
    );
    return msg.reply({ embeds: [embed], components: [menu] });
  }

  // ❓ HELP
  if (cmd === 'help' || cmd === 'ajuda') {
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.AJUDA} TODOS OS COMANDOS — ZYPHOR`)
      .addFields(
        { name: `${EMOJIS.ENGRENAGEM} Configuração`, value: `\`${prefix}painel\` — Configurar\n\`${prefix}help\` — Ajuda`, inline: false },
        { name: `${EMOJIS.BANIDO} Moderação`, value: `\`${prefix}ban @user motivo\` — Banir\n\`${prefix}unban ID\` — Desbanir\n\`${prefix}kick @user motivo\` — Expulsar`, inline: false }
      );
    return msg.reply({ embeds: [embed] });
  }

  // 🔨 BAN
  if (cmd === 'ban') {
    if (!canUse(msg.member, msg.guild.id, 'ban')) return msg.reply(`${EMOJIS.PROTECAO} Sem permissão!`);
    const user = msg.mentions.users.first();
    const motivo = args.slice(1).join(' ') || 'Sem motivo';
    if (!user) return msg.reply(`${EMOJIS.ALERTA} Use: ${prefix}ban @usuario motivo`);
    const member = msg.guild.members.cache.get(user.id);
    if (member && isProtected(member, msg.guild.id)) return msg.reply(`${EMOJIS.PROTECAO} Usuário protegido!`);

    const emb = new EmbedBuilder().setColor(0xED4245).setTitle(`${EMOJIS.BANIDO} CONFIRMAR BANIMENTO`)
      .addFields({ name: `${EMOJIS.USER} Usuário`, value: `<@${user.id}> — \`${user.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${msg.author.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false })
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ban_confirm_${user.id}`).setLabel(`${EMOJIS.ACEITAR} Confirmar`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ban_cancel_${user.id}`).setLabel(`${EMOJIS.RECUSAR} Cancelar`).setStyle(ButtonStyle.Secondary)
    );
    return msg.reply({ embeds: [emb], components: [btn] });
  }

  // 🦵 KICK
  if (cmd === 'kick') {
    if (!canUse(msg.member, msg.guild.id, 'kick')) return msg.reply(`${EMOJIS.PROTECAO} Sem permissão!`);
    const user = msg.mentions.users.first();
    const motivo = args.slice(1).join(' ') || 'Sem motivo';
    if (!user) return msg.reply(`${EMOJIS.ALERTA} Use: ${prefix}kick @usuario motivo`);
    const member = msg.guild.members.cache.get(user.id);
    if (!member) return msg.reply(`${EMOJIS.ALERTA} Usuário não encontrado!`);
    if (isProtected(member, msg.guild.id)) return msg.reply(`${EMOJIS.PROTECAO} Usuário protegido!`);

    const emb = new EmbedBuilder().setColor(0xFEE75C).setTitle(`${EMOJIS.ALERTA} CONFIRMAR KICK`)
      .addFields({ name: `${EMOJIS.USER} Usuário`, value: `<@${user.id}> — \`${user.id}\``, inline: true },
        { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${msg.author.id}>`, inline: true },
        { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false })
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`kick_confirm_${user.id}`).setLabel(`${EMOJIS.ACEITAR} Confirmar`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`kick_cancel_${user.id}`).setLabel(`${EMOJIS.RECUSAR} Cancelar`).setStyle(ButtonStyle.Secondary)
    );
    return msg.reply({ embeds: [emb], components: [btn] });
  }
});

// ==============================================
// 🎯 INTERAÇÕES — MENUS, BOTÕES, MODAIS
// ==============================================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  // 📋 MENU DO PAINEL — TODAS AS OPÇÕES FUNCIONANDO
  if (interaction.isStringSelectMenu() && interaction.customId === 'painel_menu') {
    if (!isOwner(interaction.user.id, interaction.guild.id))
      return interaction.reply({ content: `${EMOJIS.PROTECAO} Apenas o dono!`, ephemeral: true });
    
    const val = interaction.values[0];
    if (val === 'close') return interaction.message.delete().catch(() => {});
    
    if (val === 'set_prefix') {
      const modal = new ModalBuilder().setCustomId('mod_prefix').setTitle('Novo Prefixo')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('p').setLabel('Prefixo (ex: k!)').setStyle(TextInputStyle.Short).setRequired(true)
        ));
      return interaction.showModal(modal);
    }
    if (val === 'set_protected_role') {
      const modal = new ModalBuilder().setCustomId('mod_role').setTitle('Cargo Protegido (ID)')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('r').setLabel('ID do cargo').setStyle(TextInputStyle.Short).setRequired(false)
        ));
      return interaction.showModal(modal);
    }
    if (val === 'set_log_channel') {
      const modal = new ModalBuilder().setCustomId('mod_log').setTitle('Canal de Logs (ID)')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('c').setLabel('ID do canal').setStyle(TextInputStyle.Short).setRequired(false)
        ));
      return interaction.showModal(modal);
    }
    if (val === 'set_nuke_channel') {
      const modal = new ModalBuilder().setCustomId('mod_nukec').setTitle('Canal Anti-Nuke (ID)')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('c').setLabel('ID do canal').setStyle(TextInputStyle.Short).setRequired(false)
        ));
      return interaction.showModal(modal);
    }
    if (val === 'set_ban_mass') {
      const modal = new ModalBuilder().setCustomId('mod_banmass').setTitle('Limite de Bans/Minuto')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('n').setLabel('Número (ex: 10)').setStyle(TextInputStyle.Short).setRequired(true)
        ));
      return interaction.showModal(modal);
    }
    if (val === 'set_tribunal') {
      const modal = new ModalBuilder().setCustomId('mod_tribunal').setTitle('URL do Tribunal')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('u').setLabel('Link completo').setStyle(TextInputStyle.Short).setRequired(true)
        ));
      return interaction.showModal(modal);
    }
    if (val === 'set_auto_kick') {
      const modal = new ModalBuilder().setCustomId('mod_autokick').setTitle('Canal Auto-Kick (ID)')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('c').setLabel('ID do canal').setStyle(TextInputStyle.Short).setRequired(false)
        ));
      return interaction.showModal(modal);
    }
  }

  // 💾 SALVAR MODAIS
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'mod_prefix') {
      const novo = interaction.fields.getTextInputValue('p');
      if (novo.length < 2) return interaction.reply({ content: `${EMOJIS.ALERTA} Use: letra+simbolo`, ephemeral: true });
      cfg.PREFIX_LETTER = novo[0]; cfg.PREFIX_SYMBOL = novo.slice(1); saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Prefixo: \`${novo}\``, ephemeral: true });
    }
    if (interaction.customId === 'mod_role') {
      const id = interaction.fields.getTextInputValue('r');
      cfg.PROTECTED_ROLE_ID = id || null; saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Cargo protegido ${id ? 'definido' : 'removido'}!`, ephemeral: true });
    }
    if (interaction.customId === 'mod_log') {
      const id = interaction.fields.getTextInputValue('c');
      cfg.LOG_CHANNEL_ID = id || null; saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Canal de logs ${id ? 'definido' : 'removido'}!`, ephemeral: true });
    }
    if (interaction.customId === 'mod_nukec') {
      const id = interaction.fields.getTextInputValue('c');
      cfg.NUKE_ALERT_CHANNEL_ID = id || null; saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Canal Anti-Nuke ${id ? 'definido' : 'removido'}!`, ephemeral: true });
    }
    if (interaction.customId === 'mod_banmass') {
      const n = parseInt(interaction.fields.getTextInputValue('n'));
      if (isNaN(n)) return interaction.reply({ content: `${EMOJIS.ALERTA} Número inválido!`, ephemeral: true });
      cfg.MAX_BANS_PER_MINUTE = n; saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Limite: ${n} bans/minuto`, ephemeral: true });
    }
    if (interaction.customId === 'mod_tribunal') {
      const url = interaction.fields.getTextInputValue('u');
      cfg.TRIBUNAL_URL = url; saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} URL do Tribunal salva!`, ephemeral: true });
    }
    if (interaction.customId === 'mod_autokick') {
      const id = interaction.fields.getTextInputValue('c');
      cfg.AUTO_KICK_CHANNEL_ID = id || null; saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Canal Auto-Kick ${id ? 'definido' : 'removido'}!`, ephemeral: true });
    }
  }

  // 🔘 BOTÕES DE BAN
  if (interaction.isButton() && interaction.customId.startsWith('ban_')) {
    const [acao, _, uid] = interaction.customId.split('_');
    const user = await client.users.fetch(uid).catch(() => null);
    if (!user) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });

    if (acao === 'confirm') {
      const member = interaction.guild.members.cache.get(uid);
      if (member && isProtected(member, interaction.guild.id))
        return interaction.reply({ content: `${EMOJIS.PROTECAO} Usuário protegido!`, ephemeral: true });
      const motivo = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Motivo'))?.value || 'Sem motivo';
      await sendDM(user, interaction.guild, 'ban', motivo, interaction.user, cfg.TRIBUNAL_URL);
      await interaction.guild.members.ban(uid, { reason: motivo }).catch(e =>
        interaction.reply({ content: `${EMOJIS.VERMELHO} Erro: ${e.message}`, ephemeral: true })
      );
      const emb = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x57F287).setTitle(`${EMOJIS.VERDE} BANIDO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }
    if (acao === 'cancel') {
      const emb = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x99AAB5).setTitle(`${EMOJIS.FECHAR} BANIMENTO CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }
  }

  // 🔘 BOTÕES DE KICK
  if (interaction.isButton() && interaction.customId.startsWith('kick_')) {
    const [acao, _, uid] = interaction.customId.split('_');
    const user = await client.users.fetch(uid).catch(() => null);
    const member = interaction.guild.members.cache.get(uid);
    if (!user || !member) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });

    if (acao === 'confirm') {
      if (isProtected(member, interaction.guild.id))
        return interaction.reply({ content: `${EMOJIS.PROTECAO} Usuário protegido!`, ephemeral: true });
      const motivo = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Motivo'))?.value || 'Sem motivo';
      await sendDM(user, interaction.guild, 'kick', motivo, interaction.user, cfg.TRIBUNAL_URL);
      await member.kick(motivo).catch(e =>
        interaction.reply({ content: `${EMOJIS.VERMELHO} Erro: ${e.message}`, ephemeral: true })
      );
      const emb = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x57F287).setTitle(`${EMOJIS.VERDE} EXPULSO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }
    if (acao === 'cancel') {
      const emb = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x99AAB5).setTitle(`${EMOJIS.FECHAR} KICK CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }
  }

  // ⚡ COMANDOS DE BARRA
  if (interaction.isChatInputCommand()) {
    const { commandName, options, user, guild, member } = interaction;

    if (commandName === 'help') {
      const emb = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(`${EMOJIS.AJUDA} COMANDOS DO BOT — ZYPHOR`)
        .addFields(
          { name: `${EMOJIS.ENGRENAGEM} Prefixo (s!)`, value: `painel — Configurar\nhelp — Ajuda\nban @user motivo\nkick @user motivo`, inline: false },
          { name: `${EMOJIS.BANIDO} Barra (/)`, value: `/ban /kick /mute /unban /unmute /help`, inline: false }
        );
      return interaction.reply({ embeds: [emb] });
    }

    if (commandName === 'ban') {
      if (!canUse(member, guild.id, 'ban')) return interaction.reply({ content: `${EMOJIS.PROTECAO} Sem permissão!`, ephemeral: true });
      const alvo = options.getUser('usuário');
      const motivo = options.getString('motivo') || 'Sem motivo';
      const alvoMember = guild.members.cache.get(alvo.id);
      if (alvoMember && isProtected(alvoMember, guild.id))
        return interaction.reply({ content: `${EMOJIS.PROTECAO} Usuário protegido!`, ephemeral: true });

      const emb = new EmbedBuilder().setColor(0xED4245).setTitle(`${EMOJIS.BANIDO} CONFIRMAR BANIMENTO`)
        .addFields({ name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — \`${alvo.id}\``, inline: true },
          { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
          { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false })
        .setThumbnail(alvo.displayAvatarURL({ dynamic: true }));
      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ban_confirm_${alvo.id}`).setLabel(`${EMOJIS.ACEITAR} Confirmar`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ban_cancel_${alvo.id}`).setLabel(`${EMOJIS.RECUSAR} Cancelar`).setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({ embeds: [emb], components: [btn] });
    }

    if (commandName === 'kick') {
      if (!canUse(member, guild.id, 'kick')) return interaction.reply({ content: `${EMOJIS.PROTECAO} Sem permissão!`, ephemeral: true });
      const alvo = options.getUser('usuário');
      const motivo = options.getString('motivo') || 'Sem motivo';
      const alvoMember = guild.members.cache.get(alvo.id);
      if (!alvoMember) return interaction.reply({ content: `${EMOJIS.ALERTA} Não está no servidor!`, ephemeral: true });
      if (isProtected(alvoMember, guild.id)) return interaction.reply({ content: `${EMOJIS.PROTECAO} Usuário protegido!`, ephemeral: true });

      const emb = new EmbedBuilder().setColor(0xFEE75C).setTitle(`${EMOJIS.ALERTA} CONFIRMAR KICK`)
        .addFields({ name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — \`${alvo.id}\``, inline: true },
          { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
          { name: `${EMOJIS.REGRA} Motivo`, value: `\`${motivo}\``, inline: false })
        .setThumbnail(alvo.displayAvatarURL({ dynamic: true }));
      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`kick_confirm_${alvo.id}`).setLabel(`${EMOJIS.ACEITAR} Confirmar`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`kick_cancel_${alvo.id}`).setLabel(`${EMOJIS.RECUSAR} Cancelar`).setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({ embeds: [emb], components: [btn] });
    }

    if (commandName === 'unban') {
      if (!canUse(member, guild.id, 'unban')) return interaction.reply({ content: `${EMOJIS.PROTECAO} Sem permissão!`, ephemeral: true });
      const id = options.getString('id');
      try { await guild.bans.remove(id); return interaction.reply(`${EMOJIS.VERDE} Desbanido com sucesso!`); }
      catch { return interaction.reply(`${EMOJIS.VERMELHO} Usuário não está banido!`); }
    }
  }
});

// ==============================================
// 🚨 ANTI-BAN EM MASSA + ANTI-NUKE
// ==============================================
client.on(Events.GuildBanAdd, async ban => {
  const cfg = getConfig(ban.guild.id);
  if (!cfg.ANTI_RAID_ENABLED) return;
  const audit = await ban.guild.fetchAuditLogs({ type: 22, limit: 3 }).catch(() => null);
  const mod = audit?.entries?.first()?.executor;
  if (!mod || mod.id === cfg.OWNER_ID) return;
  
  if (!banHistory[mod.id]) banHistory[mod.id] = [];
  banHistory[mod.id].push(Date.now());
  banHistory[mod.id] = banHistory[mod.id].filter(t => Date.now() - t < cfg.BAN_WINDOW_MS);
  
  if (banHistory[mod.id].length > cfg.MAX_BANS_PER_MINUTE) {
    const modMember = ban.guild.members.cache.get(mod.id);
    if (modMember && !isProtected(modMember, ban.guild.id)) {
      if (cfg.PUNISH_BAN_MASS === 'ban') await ban.guild.members.ban(mod.id, { reason: 'Banimento em massa detectado' }).catch(() => {});
      else if (cfg.PUNISH_BAN_MASS === 'kick') await modMember.kick('Banimento em massa detectado').catch(() => {});
    }
    if (cfg.NUKE_ALERT_CHANNEL_ID) {
      const ch = ban.guild.channels.cache.get(cfg.NUKE_ALERT_CHANNEL_ID);
      if (ch) ch.send(`${EMOJIS.ALERTA} **ALERTA DE BAN EM MASSA!** <@${mod.id}> — ${banHistory[mod.id].length} bans em pouco tempo!`).catch(() => {});
    }
  }
});

client.on(Events.GuildRoleCreate, async role => {
  const cfg = getConfig(role.guild.id);
  if (!cfg.ANTI_NUKE_ENABLED) return;
  const audit = await role.guild.fetchAuditLogs({ type: 30, limit: 3 }).catch(() => null);
  const executor = audit?.entries?.first()?.executor;
  if (!executor || executor.id === cfg.OWNER_ID) return;
  
  if (!roleActionHistory[executor.id]) roleActionHistory[executor.id] = [];
  roleActionHistory[executor.id].push(Date.now());
  roleActionHistory[executor.id] = roleActionHistory[executor.id].filter(t => Date.now() - t < cfg.ROLE_WINDOW_MS);
  
  if (roleActionHistory[executor.id].length >= cfg.MAX_ROLE_ACTIONS) {
    const member = role.guild.members.cache.get(executor.id);
    if (member && !isProtected(member, role.guild.id)) {
      if (cfg.PUNISH_NUKE === 'ban') await role.guild.members.ban(executor.id, { reason: 'Anti-Nuke: criação excessiva de cargos' }).catch(() => {});
      else if (cfg.PUNISH_NUKE === 'kick') await member.kick('Anti-Nuke: criação excessiva de cargos').catch(() => {});
    }
    if (cfg.NUKE_ALERT_CHANNEL_ID) {
      const ch = role.guild.channels.cache.get(cfg.NUKE_ALERT_CHANNEL_ID);
      if (ch) ch.send(`${EMOJIS.ALERTA} **ALERTA ANTI-NUKE!** <@${executor.id}> — criação excessiva de cargos!`).catch(() => {});
    }
  }
});

console.log(`${EMOJIS.ZYPHOR} ✅ Código carregado com sucesso!`);
