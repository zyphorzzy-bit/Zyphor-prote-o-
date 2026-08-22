const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ActivityType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// MAPA COMPLETO DOS EMOJIS FORNECIDOS
const EMOJIS = {
    desativado: '<a:desativado:1534611986539876463>',
    ativado: '<a:ativado:1534611985260609607>',
    alerta: '<:alerta:1534611993410015456>',
    horario: '<:horrio:1534611997335883886>',
    config: '<:config:1534611990633250937>',
    proibido: '<:Proibido:1534611991929290877>',
    warn1: '<:warn1:1540096479501357137>',
    warn2: '<:warn2:1540096480998596741>',
    warn3: '<:warn3:1540096477689290842>',
    apagado: '<:apagado:1539124689077665894>',
    id: '<:ID:1534611999085039786>',
    sms: '<:sms:1539125782335455292>',
    protecao: '<:proteo:1539125790711480331>',
    positivo: '<:positivo:1534611995742179419>',
    negativo: '<:negativo:1534612858548256921>',
    not: '<:not:1539815573981237388>',
    banido: '<:banido:1539124695448952973>',
    perfil: '<:perfil:1540557352602705990>'
};

// BANCO DE DADOS EM MEMÓRIA
const config = {
    antiLink: true,
    antiSpam: true,
    logChannelId: null,
    immuneRoles: [], // Até 10 cargos imunes
    staffRoles: [],  // Até 5 cargos de staff
    warnAction3: 'ban', // 'kick' ou 'ban'
    noCmdsRoleId: null,
    embedBan: {
        title: `${EMOJIS.banido} Você foi banido do servidor!`,
        description: 'Você foi banido por infringir as regras do servidor. Caso queira recorrer, abra um ticket no nosso tribunal.',
        imageUrl: '',
        footer: 'Sistema de Segurança & Moderação'
    }
};

const userWarns = new Map();
const spamMap = new Map();

// STATUS DE STREAM / TRANSMISSÃO
client.on('ready', () => {
    console.log(`${EMOJIS.positivo} Bot iniciado com sucesso como ${client.user.tag}!`);
    
    client.user.setActivity('INVESTIGAÇÃO', {
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/discord'
    });
});

// CHECAGEM DE PERMISSÕES
function isStaff(member) {
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return config.staffRoles.some(roleId => member.roles.cache.has(roleId));
}

function isImmune(member) {
    if (isStaff(member)) return true;
    return config.immuneRoles.some(roleId => member.roles.cache.has(roleId));
}

// PAINEL DE CONTROLE COM EMOJIS
function buildPanelEmbed() {
    const immuneList = config.immuneRoles.length > 0 ? config.immuneRoles.map(r => `<@&${r}>`).join(', ') : `${EMOJIS.negativo} Nenhum`;
    const staffList = config.staffRoles.length > 0 ? config.staffRoles.map(r => `<@&${r}>`).join(', ') : `${EMOJIS.negativo} Nenhum`;

    return new EmbedBuilder()
        .setTitle(`${EMOJIS.config} Configuração do Sistema de Proteção`)
        .setColor(0x2B2D31)
        .setDescription(`${EMOJIS.protecao} Gerencie os módulos de segurança, punições de warn e logs do servidor.`)
        .addFields(
            { name: `${EMOJIS.protecao} Moderação & Proteções`, value: `**Anti-Link:** ${config.antiLink ? EMOJIS.ativado : EMOJIS.desativado}\n**Anti-Spam:** ${config.antiSpam ? EMOJIS.ativado : EMOJIS.desativado}`, inline: true },
            { name: `${EMOJIS.alerta} Punições por Warn`, value: `${EMOJIS.warn1} **1º:** Remove CMDS\n${EMOJIS.warn2} **2º:** Mute (1 Dia)\n${EMOJIS.warn3} **3º:** ${config.warnAction3.toUpperCase()}`, inline: true },
            { name: `${EMOJIS.sms} Canal de Logs`, value: config.logChannelId ? `<#${config.logChannelId}>` : `${EMOJIS.negativo} Não configurado`, inline: false },
            { name: `${EMOJIS.perfil} Cargos Staff (Até 5)`, value: staffList, inline: true },
            { name: `${EMOJIS.proibido} Cargos Imunes (Até 10)`, value: immuneList, inline: true }
        )
        .setFooter({ text: 'Selecione a opção no menu abaixo' });
}

function buildPanelComponents() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('panel_select')
        .setPlaceholder('Escolha o que deseja configurar...')
        .addOptions([
            { label: 'Anti-Link', description: 'Ligar ou Desligar Anti-Link', value: 'toggle_antilink', emoji: '1539125790711480331' },
            { label: 'Anti-Spam', description: 'Ligar ou Desligar Anti-Spam', value: 'toggle_antispam', emoji: '1539125790711480331' },
            { label: 'Ação do 3º Warn', description: 'Alternar entre BAN ou KICK', value: 'toggle_warn3', emoji: '1540096477689290842' },
            { label: 'Canal de Logs', description: 'Definir canal de envio dos Bans/Warns', value: 'set_logs', emoji: '1539125782335455292' },
            { label: 'Editar Embed de Ban', description: 'Configurar a mensagem enviada na DM e Log', value: 'edit_embed_ban', emoji: '1539124695448952973' }
        ]);

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

// EVENTO DE MENSAGENS E COMANDOS
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // ANTI-LINK
    if (config.antiLink && !isImmune(message.member)) {
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        if (linkRegex.test(message.content)) {
            await message.delete().catch(() => {});
            return message.channel.send(`${EMOJIS.proibido} ${message.author}, links não são permitidos neste servidor! ${EMOJIS.alerta}`)
                .then(m => setTimeout(() => m.delete(), 4000));
        }
    }

    // ANTI-SPAM
    if (config.antiSpam && !isImmune(message.member)) {
        const LIMIT = 5;
        const TIME_FRAME = 4000;
        const userData = spamMap.get(message.author.id) || { count: 0, timer: null };
        userData.count++;

        if (userData.count === 1) {
            userData.timer = setTimeout(() => spamMap.delete(message.author.id), TIME_FRAME);
        }
        spamMap.set(message.author.id, userData);

        if (userData.count >= LIMIT) {
            await message.channel.bulkDelete(LIMIT, true).catch(() => {});
            spamMap.delete(message.author.id);
            return message.channel.send(`${EMOJIS.alerta} ${message.author}, evite o envio excessivo de mensagens (Spam)! ${EMOJIS.apagado}`)
                .then(m => setTimeout(() => m.delete(), 4000));
        }
    }

    if (!message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // COMANDO .PAINEL
    if (command === 'painel') {
        if (!isStaff(message.member)) return message.reply(`${EMOJIS.negativo} Você não possui permissão para acessar o painel.`);
        return message.channel.send({ embeds: [buildPanelEmbed()], components: buildPanelComponents() });
    }

    // COMANDO .WARN @membro <motivo>
    if (command === 'warn') {
        if (!isStaff(message.member)) return message.reply(`${EMOJIS.negativo} Sem permissão para aplicar advertências.`);

        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ');

        if (!target) return message.reply(`${EMOJIS.alerta} **Uso correto:** \`.warn @membro <motivo>\``);
        if (!reason) return message.reply(`${EMOJIS.alerta} **É obrigatório informar o motivo do aviso!**`);

        let warns = (userWarns.get(target.id) || 0) + 1;
        userWarns.set(target.id, warns);

        message.channel.send(`${EMOJIS.positivo} Advertência aplicada com sucesso em ${target}!\n${EMOJIS.horario} Contagem: **${warns}/3**\n${EMOJIS.sms} **Motivo:** ${reason}`);

        if (warns === 1) {
            if (config.noCmdsRoleId) await target.roles.add(config.noCmdsRoleId).catch(() => {});
            target.send(`${EMOJIS.warn1} Você recebeu o **1º Warn** no servidor **${message.guild.name}**!\n${EMOJIS.sms} **Motivo:** ${reason}`).catch(() => {});
        } else if (warns === 2) {
            await target.timeout(24 * 60 * 60 * 1000, `2º Warn: ${reason}`).catch(() => {});
            target.send(`${EMOJIS.warn2} Você recebeu o **2º Warn** no servidor **${message.guild.name}**!\n${EMOJIS.sms} **Motivo:** ${reason}\n${EMOJIS.horario} **Punição:** Mute por 24 horas.`).catch(() => {});
        } else if (warns >= 3) {
            target.send(`${EMOJIS.warn3} Você atingiu **3 Warns** no servidor **${message.guild.name}** e foi punido com **${config.warnAction3.toUpperCase()}**.\n${EMOJIS.sms} **Motivo Final:** ${reason}`).catch(() => {});
            setTimeout(async () => {
                if (config.warnAction3 === 'ban') {
                    await target.ban({ reason: `3 Warns: ${reason}` }).catch(() => {});
                } else {
                    await target.kick(`3 Warns: ${reason}`).catch(() => {});
                }
            }, 1000);
            userWarns.delete(target.id);
        }
    }

    // COMANDO .BAN @membro <motivo>
    if (command === 'ban') {
        if (!isStaff(message.member)) return message.reply(`${EMOJIS.negativo} Permissão negada para executar banimentos.`);

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        const reason = args.slice(1).join(' ');

        if (!target) return message.reply(`${EMOJIS.alerta} **Uso correto:** \`.ban @membro/ID <motivo>\``);
        if (!reason) return message.reply(`${EMOJIS.alerta} **É obrigatório incluir um motivo para o banimento!**`);

        if (!target.bannable) return message.reply(`${EMOJIS.negativo} Não tenho permissão suficiente para banir este usuário.`);

        const banEmbed = new EmbedBuilder()
            .setTitle(config.embedBan.title)
            .setColor(0xFF0000)
            .setDescription(`${EMOJIS.perfil} **Membro:** ${target.user} \`(${target.id})\`\n${EMOJIS.sms} **Motivo:** ${reason}\n\n${config.embedBan.description}`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `${config.embedBan.footer} • ${message.guild.name}` });

        if (config.embedBan.imageUrl) {
            banEmbed.setImage(config.embedBan.imageUrl);
        }

        // Envia na DM
        await target.send({ embeds: [banEmbed] }).catch(() => {});

        // Envia no Canal de Logs
        if (config.logChannelId) {
            const logChannel = message.guild.channels.cache.get(config.logChannelId);
            if (logChannel) await logChannel.send({ embeds: [banEmbed] });
        }

        // Executa o Ban
        await target.ban({ reason: reason });
        return message.channel.send(`${EMOJIS.banido} O usuário **${target.user.tag}** foi banido com sucesso!\n${EMOJIS.id} **ID:** \`${target.id}\`\n${EMOJIS.sms} **Motivo:** *${reason}*`);
    }
});

// INTERAÇÕES E SELECT MENUS
client.on('interactionCreate', async (interaction) => {
    if (!interaction.guild) return;

    if (interaction.isStringSelectMenu() && interaction.customId === 'panel_select') {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: `${EMOJIS.negativo} Você não tem permissão para alterar as configurações.`, ephemeral: true });
        }

        const value = interaction.values[0];

        if (value === 'toggle_antilink') {
            config.antiLink = !config.antiLink;
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'toggle_antispam') {
            config.antiSpam = !config.antiSpam;
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'toggle_warn3') {
            config.warnAction3 = config.warnAction3 === 'ban' ? 'kick' : 'ban';
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'set_logs') {
            return interaction.reply({ content: `${EMOJIS.sms} Envie o ID ou mencione o canal no qual os registros de BAN/WARN serão enviados.`, ephemeral: true });
        } else if (value === 'edit_embed_ban') {
            const modal = new ModalBuilder()
                .setCustomId('modal_edit_ban')
                .setTitle('Configurar Mensagem de Ban (DM/Log)');

            const titleInput = new TextInputBuilder()
                .setCustomId('ban_title')
                .setLabel('Título da Embed')
                .setStyle(TextInputStyle.Short)
                .setValue(config.embedBan.title);

            const descInput = new TextInputBuilder()
                .setCustomId('ban_desc')
                .setLabel('Descrição Principal')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(config.embedBan.description);

            const imageInput = new TextInputBuilder()
                .setCustomId('ban_image')
                .setLabel('URL do Banner / Imagem (Opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(config.embedBan.imageUrl);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput),
                new ActionRowBuilder().addComponents(imageInput)
            );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_edit_ban') {
        config.embedBan.title = interaction.fields.getTextInputValue('ban_title');
        config.embedBan.description = interaction.fields.getTextInputValue('ban_desc');
        config.embedBan.imageUrl = interaction.fields.getTextInputValue('ban_image') || '';

        await interaction.reply({ content: `${EMOJIS.positivo} Embed de banimento atualizada com sucesso!`, ephemeral: true });
    }
});

client.login('SEU_TOKEN_AQUI');
