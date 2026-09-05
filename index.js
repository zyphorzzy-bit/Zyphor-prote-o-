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
const token = process.env.TOKEN;
if (!token) {
  console.log('❌ ERRO: Variável TOKEN não definida no ShardCloud!');
  process.exit(1);
}

// ==============================================
// 🎨 EMOJIS PERSONALIZADOS — ZYPHOR
// ==============================================
const EMOJIS = {
  VERDE: '<:verde:1540096479501357137>',
  POSITIVO: '<:positivo:1534611995742179419>',
  ACEITAR: '<:aceitar:1539124696912756767>',
  BOM: '<:bom:1539124707222093915>',
  PING_BOM: '<a:pingbom:1539786201551077386>',
  ATIVADO: '<a:ativado:1534611985260609607>',
  VERMELHO: '<:vermelho:1540096477689290842>',
  NEGATIVO: '<:negativo:1534612858548256921>',
  PROIBIDO: '<:Proibido:1534611991929290877>',
  RECUSAR: '<:recusar:1539124698338566257>',
  FECHAR: '<:fechar:1541318085435199569>',
  RUIM: '<:ruim:1539124703992614912>',
  PING_RUIM: '<a:pingruim:1539786202822217731>',
  DESATIVADO: '<a:desativado:1534611986539876463>',
  AMARELO: '<:amarelo:1540096480998596741>',
  ALERTA: '<:alerta:1534611993410015456>',
  USER: '<:user:1539125800907968603>',
  USERS: '<:users:1539124702407168062>',
  USER_SALT: '<:usersalt:1539125796046639154>',
  PERFIL: '<:perfil:1540557352602705990>',
  BANIDO: '<:banido:1539124695448952973>',
  PASSAR_POSSE: '<:passarposse:1539125801851813970>',
  PROTEÇÃO: '<:proteo:1539125790711480331>',
  PROTEÇÃO2: '<:proteo:1539124701232898111>',
  FIXO: '<:fixo:1541318082574684240>',
  CONFIG: '<:config:1534611990633250937>',
  ENGRENAGEM: '<:engrenagem:1539124700205023313>',
  EDIT: '<:edit:1534611988624310272>',
  ID: '<:ID:1534611999085039786>',
  HORÁRIO: '<:horrio:1534611997335883886>',
  REGRA: '<:rule:1539125787158908928>',
  ARQUIVO: '<:arquivo:1539124693460713552>',
  APAGADO: '<:apagado:1539124689077665894>',
  SEARCH: '<:search:1539125799947468890>',
  LOADING: '<a:loanding:1534612861211377868>',
  SETA: '<:seta:1539785898693234700>',
  SETA_ESQUERDA: '<:setaladoe:1539124867113295898>',
  SETA_DIREITA: '<:setaladod:1539124868727963651>',
  SETA_ACIMA: '<:setacima:1539124869818753085>',
  SETA_ABAIXO: '<:setabaixo:1539124864625938581>',
  LINK_EXTERNO: '<:linkexterno:1539124690709385330>',
  SMS: '<:sms:1539125782335455292>',
  AVISOS: '<:avisos:1539125781320433724>',
  ATENDER: '<:atender:1541318084210720799>',
  MEDIADOR: '<:smediador:1539125793505153044>',
  SUPORTE: '<:suporte:1539845832004870154>',
  REEMBOLSO: '<:sreembolso:1539125794549407785>',
  ZYPHOR: '<:zyphor:1540096483276095621>'
};

// ==============================================
// 📂 SISTEMA DE CONFIGURAÇÃO — data.json
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

  // 📋 PAINEL — SÓ DONO
  if (cmd === 'painel' || cmd === 'config') {
    if (!isOwner(message.author.id, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} **SÓ O DONO PODE CONFIGURAR O BOT!**`);
    }
    const cfg = getConfig(message.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.CONFIG} PAINEL DE CONFIGURAÇÃO — ZYPHOR`)
      .addFields(
        { name: `${EMOJIS.USER} Dono`, value: `<@${cfg.OWNER_ID}>`, inline: true },
        { name: `${EMOJIS.PROTEÇÃO} Cargo Protegido`, value: cfg.PROTECTED_ROLE_ID ? `<@&${cfg.PROTECTED_ROLE_ID}>` : '❌ Não configurado', inline: true },
        { name: `${EMOJIS.ENGRENAGEM} Prefixo`, value: `${cfg.PREFIX_LETTER}${cfg.PREFIX_SYMBOL}`, inline: true },
        { name: `${EMOJIS.BANIDO} Ban Massa`, value: `${cfg.MAX_BANS_PER_MINUTE}/min → ${cfg.PUNISH_BAN_MASS_ACTION}`, inline: true },
        { name: `${EMOJIS.ALERTA} Anti-Nuke`, value: `${cfg.MAX_ROLE_ACTIONS} ações → ${cfg.NUKE_PUNISH_ACTION}`, inline: true },
        { name: `${EMOJIS.ENGRENAGEM} Anti-Raid`, value: cfg.ANTI_RAID_PUNISH, inline: true }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Zyphor System • ${EMOJIS.ZYPHOR}`, iconURL: client.user.displayAvatarURL() });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('painel_menu')
      .setPlaceholder(`${EMOJIS.ENGRENAGEM} Selecione uma opção...`)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel('🔑 Prefixo').setValue('set_prefix').setEmoji('🔑'),
        new StringSelectMenuOptionBuilder().setLabel('🛡️ Cargo Protegido').setValue('set_protected_role').setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder().setLabel('📜 Canal de Logs').setValue('set_log_channel').setEmoji('📜'),
        new StringSelectMenuOptionBuilder().setLabel('🚨 Canal Anti-Nuke').setValue('set_nuke_channel').setEmoji('🚨'),
        new StringSelectMenuOptionBuilder().setLabel('🔨 Ban Massa').setValue('set_ban_mass').setEmoji('🔨'),
        new StringSelectMenuOptionBuilder().setLabel('💥 Anti-Nuke').setValue('set_anti_nuke').setEmoji('💥'),
        new StringSelectMenuOptionBuilder().setLabel('🛡️ Permissões de Comandos').setValue('set_command_perms').setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder().setLabel('📺 Streaming').setValue('set_stream').setEmoji('📺')
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    return message.reply({ embeds: [embed], components: [row] });
  }

  // 🔑 MUDAR PREFIXO — SÓ DONO
  if (cmd === 'prefix' || cmd === 'setprefix') {
    if (!isOwner(message.author.id, message.guild.id)) {
      return message.reply(`${EMOJIS.PROIBIDO} Apenas o dono pode mudar o prefixo!`);
    }
    const novo = args[0];
    if (!novo || novo.length < 2) {
      return message.reply(`${EMOJIS.ALERTA} Use: ${prefix}prefix <letra+simbolo> | Exemplo: s!prefix k!`);
    }
    getConfig(message.guild.id).PREFIX_LETTER = novo[0];
    getConfig(message.guild.id).PREFIX_SYMBOL = novo[1] || '!';
    saveData();
    return message.reply(`${EMOJIS.VERDE} Prefixo alterado para: **${novo[0]}${novo[1] || '!'}**`);
  }
});

// ==============================================
// 🎯 SISTEMA DE MENUS E BOTÕES
// ==============================================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  // 📋 MENU PRINCIPAL DO PAINEL
  if (interaction.isStringSelectMenu() && interaction.customId === 'painel_menu') {
    if (!isOwner(interaction.user.id, interaction.guild.id)) {
      return interaction.reply({ content: `${EMOJIS.PROIBIDO} SÓ O DONO PODE CONFIGURAR!`, ephemeral: true });
    }
    const value = interaction.values[0];

    if (value === 'set_protected_role') {
      const roles = interaction.guild.roles.cache
        .filter(r => r.id !== interaction.guild.id && !r.managed)
        .sort((a, b) => b.position - a.position)
        .first(25);
      const menu = new StringSelectMenuBuilder()
        .setCustomId('save_protected_role')
        .setPlaceholder('Escolha o cargo IMUNE...')
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel('❌ Desativar').setValue('none').setEmoji('❌'),
          ...roles.map(r => new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.id)
            .setDefault(cfg.PROTECTED_ROLE_ID === r.id))
        ]);
      return interaction.reply({
        content: `${EMOJIS.PROTEÇÃO} **Cargo de Proteção — quem tiver esse cargo = IMUNE a Ban, Kick, Mute, Anti-Nuke!**`,
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }

    if (value === 'set_prefix') {
      const modal = new ModalBuilder()
        .setCustomId('modal_prefix')
        .setTitle('🔑 Mudar Prefixo')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('letra').setLabel('Letra').setStyle(TextInputStyle.Short).setMaxLength(1).setValue(cfg.PREFIX_LETTER).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('simbolo').setLabel('Símbolo').setStyle(TextInputStyle.Short).setMaxLength(1).setValue(cfg.PREFIX_SYMBOL).setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    return interaction.reply({ content: `${EMOJIS.LOADING} Em desenvolvimento...`, ephemeral: true });
  }

  // 💾 SALVAR CARGO PROTEGIDO
  if (interaction.isStringSelectMenu() && interaction.customId === 'save_protected_role') {
    if (!isOwner(interaction.user.id, interaction.guild.id)) return;
    const val = interaction.values[0];
    if (val === 'none') {
      cfg.PROTECTED_ROLE_ID = null;
      saveData();
      return interaction.reply({ content: `${EMOJIS.VERDE} Cargo de Proteção **DESATIVADO!**`, ephemeral: true });
    }
    cfg.PROTECTED_ROLE_ID = val;
    saveData();
    return interaction.reply({ content: `${EMOJIS.VERDE} Cargo de Proteção definido: <@&${val}> — IMUNE A TUDO!`, ephemeral: true });
  }

  // 💾 SALVAR PREFIXO DO MODAL
  if (interaction.isModalSubmit() && interaction.customId === 'modal_prefix') {
    if (!isOwner(interaction.user.id, interaction.guild.id)) return;
    cfg.PREFIX_LETTER = interaction.fields.getTextInputValue('letra');
    cfg.PREFIX_SYMBOL = interaction.fields.getTextInputValue('simbolo');
    saveData();
    return interaction.reply({ content: `${EMOJIS.VERDE} Prefixo alterado para: **${cfg.PREFIX_LETTER}${cfg.PREFIX_SYMBOL}**`, ephemeral: true });
  }

  // 🔨 COMANDOS DE BARRA — BAN, KICK, MUTE
  if (interaction.isChatInputCommand()) {
    const { commandName, options, guild, member, user } = interaction;

    if (commandName === 'ban') {
      if (!canUseCommand(member, guild.id, 'ban')) {
        return interaction.reply({ content: `${EMOJIS.PROIBIDO} Sem permissão para usar /ban!`, ephemeral: true });
      }
      const alvo = options.getUser('usuário');
      const motivo = options.getString('motivo') || 'Sem motivo';
      const membro = guild.members.cache.get(alvo.id);

      if (isProtected(membro, guild.id)) {
        return interaction.reply({ content: `${EMOJIS.PROTEÇÃO} **IMPOSSÍVEL! Esse usuário está PROTEGIDO!**`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${EMOJIS.BANIDO} CONFIRMAR BANIMENTO`)
        .addFields(
          { name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — ${alvo.tag}`, inline: true },
          { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
          { name: `${EMOJIS.REGRA} Motivo`, value: motivo, inline: false }
        );

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_ban_${alvo.id}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`cancel_ban_${alvo.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [btn], ephemeral: false });
    }

    if (commandName === 'kick') {
      if (!canUseCommand(member, guild.id, 'kick')) {
        return interaction.reply({ content: `${EMOJIS.PROIBIDO} Sem permissão para usar /kick!`, ephemeral: true });
      }
      const alvo = options.getUser('usuário');
      const motivo = options.getString('motivo') || 'Sem motivo';
      const membro = guild.members.cache.get(alvo.id);

      if (isProtected(membro, guild.id)) {
        return interaction.reply({ content: `${EMOJIS.PROTEÇÃO} **IMPOSSÍVEL! Esse usuário está PROTEGIDO!**`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${EMOJIS.ALERTA} CONFIRMAR KICK`)
        .addFields(
          { name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — ${alvo.tag}`, inline: true },
          { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
          { name: `${EMOJIS.REGRA} Motivo`, value: motivo, inline: false }
        );

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_kick_${alvo.id}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`cancel_kick_${alvo.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [btn], ephemeral: false });
    }

    if (commandName === 'mute') {
      if (!canUseCommand(member, guild.id, 'mute')) {
        return interaction.reply({ content: `${EMOJIS.PROIBIDO} Sem permissão para usar /mute!`, ephemeral: true });
      }
      const alvo = options.getUser('usuário');
      const motivo = options.getString('motivo') || 'Sem motivo';
      const tempo = options.getInteger('tempo') || 60;
      const membro = guild.members.cache.get(alvo.id);

      if (isProtected(membro, guild.id)) {
        return interaction.reply({ content: `${EMOJIS.PROTEÇÃO} **IMPOSSÍVEL! Esse usuário está PROTEGIDO!**`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`🔇 CONFIRMAR MUTE`)
        .addFields(
          { name: `${EMOJIS.USER} Usuário`, value: `<@${alvo.id}> — ${alvo.tag}`, inline: true },
          { name: `${EMOJIS.MEDIADOR} Moderador`, value: `<@${user.id}>`, inline: true },
          { name: `${EMOJIS.REGRA} Motivo`, value: motivo, inline: false },
          { name: `${EMOJIS.HORÁRIO} Duração`, value: `${tempo} minutos`, inline: true }
        );

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_mute_${alvo.id}_${tempo}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`cancel_mute_${alvo.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [btn], ephemeral: false });
    }
  }

  // ✅ BOTÕES DE CONFIRMAÇÃO
  if (interaction.isButton()) {
    const { customId, guild, user, message } = interaction;
    const cfg = getConfig(guild.id);

    if (customId.startsWith('confirm_ban_')) {
      const alvoId = customId.split('_')[2];
      const membro = guild.members.cache.get(alvoId);
      if (!membro) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });
      await membro.ban({ reason: 'Banido via painel' });
      const emb = EmbedBuilder.from(message.embeds[0])
        .setColor(0x57F287)
        .setTitle(`${EMOJIS.VERDE} USUÁRIO BANIDO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }

    if (customId.startsWith('cancel_ban_')) {
      const emb = EmbedBuilder.from(message.embeds[0])
        .setColor(0x99AAB5)
        .setTitle(`${EMOJIS.FECHAR} BANIMENTO CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }

    if (customId.startsWith('confirm_kick_')) {
      const alvoId = customId.split('_')[2];
      const membro = guild.members.cache.get(alvoId);
      if (!membro) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });
      await membro.kick('Kick via painel');
      const emb = EmbedBuilder.from(message.embeds[0])
        .setColor(0x57F287)
        .setTitle(`${EMOJIS.VERDE} USUÁRIO KICKADO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }

    if (customId.startsWith('cancel_kick_')) {
      const emb = EmbedBuilder.from(message.embeds[0])
        .setColor(0x99AAB5)
        .setTitle(`${EMOJIS.FECHAR} KICK CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }

    if (customId.startsWith('confirm_mute_')) {
      const [, , alvoId, tempo] = customId.split('_');
      const membro = guild.members.cache.get(alvoId);
      if (!membro) return interaction.reply({ content: `${EMOJIS.VERMELHO} Usuário não encontrado!`, ephemeral: true });
      let muteRole = guild.roles.cache.find(r => r.name === 'Muted');
      if (!muteRole) {
        muteRole = await guild.roles.create({ name: 'Muted', color: 0x808080, permissions: [] });
      }
      await membro.roles.add(muteRole.id);
      setTimeout(async () => {
        if (membro.roles.cache.has(muteRole.id)) {
          await membro.roles.remove(muteRole.id).catch(() => {});
        }
      }, parseInt(tempo) * 60000);
      const emb = EmbedBuilder.from(message.embeds[0])
        .setColor(0x57F287)
        .setTitle(`${EMOJIS.VERDE} USUÁRIO MUTADO COM SUCESSO!`);
      return interaction.update({ embeds: [emb], components: [] });
    }

    if (customId.startsWith('cancel_mute_')) {
      const emb = EmbedBuilder.from(message.embeds[0])
        .setColor(0x99AAB5)
        .setTitle(`${EMOJIS.FECHAR} MUTE CANCELADO`);
      return interaction.update({ embeds: [emb], components: [] });
    }
  }
});

// ==============================================
// 📌 REGISTRAR COMANDOS (só executa uma vez)
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
      { type: 3, name: 'motivo', description: 'Motivo', required: false }
    ]
  },
  {
    name: 'mute',
    description: 'Mutear um usuário',
    options: [
      { type: 6, name: 'usuário', description: 'Usuário', required: true },
      { type: 3, name: 'motivo', description: 'Motivo', required: false },
      { type: 4, name: 'tempo', description: 'Tempo em minutos (padrão: 60)', required: false }
    ]
  },
  {
    name: 'unmute',
    description: 'Desmutear um usuário',
    options: [
      { type: 6, name: 'usuário', description: 'Usuário', required: true }
    ]
  }
];

client.on('ready', async () => {
  console.log(`${EMOJIS.ZYPHOR} Comandos prontos!`);
  await client.application.commands.set(COMANDOS);
});

// ==============================================
// 🚨 ANTI-BAN EM MASSA
// ==============================================
const banCache = new Collection();
client.on(Events.GuildBanAdd, async ban => {
  const { guild, user } = ban;
  const audit = await guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
  const entry = audit?.entries?.first();
  if (!entry) return;
  const modId = entry.executor.id;
  if (modId === client.user.id) return;
  const modMember = guild.members.cache.get(modId);
  if (isProtected(modMember, guild.id)) return;

  if (!banCache.has(modId)) banCache.set(modId, []);
  banCache.get(modId).push(Date.now());
  const cfg = getConfig(guild.id);
  const recent = banCache.get(modId).filter(t => Date.now() - t < cfg.BAN_WINDOW_MS);
  banCache.set(modId, recent);

  if (recent.length >= cfg.MAX_BANS_PER_MINUTE) {
    const mod = guild.members.cache.get(modId);
    if (mod && cfg.PUNISH_BAN_MASS_ACTION === 'ban') {
      await mod.ban({ reason: `${EMOJIS.ALERTA} Ban em massa detectado` }).catch(() => {});
    }
    if (cfg.LOG_CHANNEL_ID) {
      const ch = guild.channels.cache.get(cfg.LOG_CHANNEL_ID);
      if (ch) ch.send(`${EMOJIS.ALERTA} **BAN EM MASSA DETECTADO!** <@${modId}> — ${recent.length} bans em 1 minuto!`);
    }
    banCache.delete(modId);
  }
});

// ==============================================
// 💥 ANTI-NUKE DE CARGOS
// ==============================================
const roleCache = new Collection();
async function checkRoleAction(guild, executor, actionType) {
  if (executor.bot) return;
  const member = guild.members.cache.get(executor.id);
  if (isProtected(member, guild.id)) return;
  const cfg = getConfig(guild.id);
  if (!roleCache.has(executor.id)) roleCache.set(executor.id, []);
  roleCache.get(executor.id).push(Date.now());
  const recent = roleCache.get(executor.id).filter(t => Date.now() - t < cfg.ROLE_ACTION_WINDOW);
  roleCache.set(executor.id, recent);
  if (recent.length >= cfg.MAX_ROLE_ACTIONS) {
    if (cfg.AUTO_PUNISH_NUKE && cfg.NUKE_PUNISH_ACTION === 'ban' && member) {
      await member.ban({ reason: `${EMOJIS.ALERTA} Anti-Nuke: ${actionType} em massa` }).catch(() => {});
    }
    if (cfg.NUKE_ALERT_CHANNEL_ID) {
      const ch = guild.channels.cache.get(cfg.NUKE_ALERT_CHANNEL_ID);
      if (ch) ch.send(`${EMOJIS.ALERTA} @everyone **ALERTA DE NUKE!** <@${executor.id}> — ${actionType} em massa detectado!`);
    }
    roleCache.delete(executor.id);
  }
}

client.on(Events.RoleCreate, role => checkRoleAction(role.guild, role.client.user, 'Criação de Cargo'));
client.on(Events.RoleDelete, role => checkRoleAction(role.guild, role.client.user, 'Exclusão de Cargo'));

// ==============================================
// 🚫 AUTO-KICK CANAL
// ==============================================
client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot) return;
  const cfg = getConfig(msg.guild.id);
  if (!cfg.AUTO_KICK_CHANNEL_ID || msg.channel.id !== cfg.AUTO_KICK_CHANNEL_ID) return;
  const member = msg.guild.members.cache.get(msg.author.id);
  if (isProtected(member, msg.guild.id)) return;
  await msg.delete().catch(() => {});
  if (member) await member.kick(`Canal restrito — mensagem enviada`).catch(() => {});
});

// ==============================================
// ❌ TRATAMENTO DE ERROS
// ==============================================
client.on('error', err => console.error('❌ Erro do bot:', err));
process.on('unhandledRejection', err => console.error('❌ Erro não tratado:', err));
