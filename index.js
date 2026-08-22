const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, 
    StringSelectMenuBuilder, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences
    ]
});

// IDS DOS DONOS (Apenas eles podem mexer no .painel)
const OWNER_IDS = ['1527769881326522478', '1533306874513068093'];

// EMOJIS
const EMOJIS = {
    desativado: '<a:desativado:1534611986539876463>', ativado: '<a:ativado:1534611985260609607>',
    alerta: '<:alerta:1534611993410015456>', horario: '<:horrio:1534611997335883886>',
    config: '<:config:1534611990633250937>', Proibido: '<:Proibido:1534611991929290877>',
    warn1: '<:warn1:1540096479501357137>', warn2: '<:warn2:1540096480998596741>',
    warn3: '<:warn3:1540096477689290842>', apagado: '<:apagado:1539124689077665894>',
    ID: '<:ID:1534611999085039786>', sms: '<:sms:1539125782335455292>',
    proteo: '<:proteo:1539125790711480331>', positivo: '<:positivo:1534611995742179419>',
    negativo: '<:negativo:1534612858548256921>', not: '<:not:1539815573981237388>',
    banido: '<:banido:1539124695448952973>', perfil: '<:perfil:1540557352602705990>'
};

// CONFIGURAÇÕES INTERNAS DO BOT
const config = {
    antiLink: true, antiSpam: true, logChannelId: null,
    immuneRoles: [], staffRoles: [], warnAction3: 'ban',
    embedBan: { 
        title: `${EMOJIS.banido} Você foi banido do servidor!`, 
        description: 'Você foi banido por infringir nossas regras. Caso queira recorrer, abra um ticket no nosso tribunal.',
        imageUrl: '', footer: 'Sistema de Segurança & Moderação' 
    }
};

const userWarns = new Map(), spamMap = new Map();

// STATUS DE STREAM ("INVESTIGAÇÃO")
client.on('ready', () => {
    console.log(`${EMOJIS.positivo} Bot logado com sucesso como ${client.user.tag}`);
    client.user.setActivity('INVESTIGAÇÃO', { type: ActivityType.Streaming, url: 'https://www.twitch.tv/discord' });
});

// FUNÇÕES DE VERIFICAÇÃO DE PERMISSÃO
function isOwner(userId) { return OWNER_IDS.includes(userId); }
function isStaff(member) { return isOwner(member.id) || member.permissions.has(PermissionsBitField.Flags.Administrator) || config.staffRoles.some(r => member.roles.cache.has(r)); }
function isImmune(member) { return isStaff(member) || config.immuneRoles.some(r => member.roles.cache.has(r)); }

// PAINEL DE CONTROLE (EMBED & SELECT MENU)
function buildPanelEmbed() {
    return new EmbedBuilder()
        .setTitle(`${EMOJIS.config} Painel de Controle de Segurança`)
        .setColor(0x2B2D31)
        .addFields(
            { name: `${EMOJIS.proteo} Moderação`, value: `**Anti-Link:** ${config.antiLink ? EMOJIS.ativado : EMOJIS.desativado}\n**Anti-Spam:** ${config.antiSpam ? EMOJIS.ativado : EMOJIS.desativado}`, inline: true },
            { name: `${EMOJIS.alerta} Ação 3º Warn`, value: `**Ação:** ${config.warnAction3.toUpperCase()}`, inline: true }
        );
}

function buildPanelComponents() {
    return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('panel_select').setPlaceholder('Selecione o que deseja configurar...')
        .addOptions([
            { label: 'Anti-Link', value: 'toggle_antilink', emoji: '1539125790711480331' },
            { label: 'Anti-Spam', value: 'toggle_antispam', emoji: '1539125790711480331' },
            { label: 'Ação 3º Warn', value: 'toggle_warn3', emoji: '1540096477689290842' },
            { label: 'Editar Embed Ban', value: 'edit_embed_ban', emoji: '1539124695448952973' }
        ]))];
}

// EVENTO DE MENSAGENS E COMANDOS
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Proteção Anti-Link
    if (config.antiLink && !isImmune(message.member) && /(https?:\/\/[^\s]+)/g.test(message.content)) {
        await message.delete().catch(() => {});
        return message.channel.send(`${EMOJIS.proibido} ${message.author}, links são proibidos por aqui!`).then(m => setTimeout(() => m.delete(), 4000));
    }

    // Proteção Anti-Spam
    if (config.antiSpam && !isImmune(message.member)) {
        const userData = spamMap.get(message.author.id) || { count: 0, timer: null };
        userData.count++;
        if (userData.count === 1) {
            userData.timer = setTimeout(() => spamMap.delete(message.author.id), 4000);
        }
        spamMap.set(message.author.id, userData);

        if (userData.count >= 5) {
            await message.channel.bulkDelete(5, true).catch(() => {});
            spamMap.delete(message.author.id);
            return message.channel.send(`${EMOJIS.alerta} ${message.author}, evite enviar spam!`).then(m => setTimeout(() => m.delete(), 4000));
        }
    }

    if (!message.content.startsWith('.')) return;

    const args = message.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Comando do Painel (Restrito aos Donos)
    if (cmd === 'painel') {
        if (!isOwner(message.author.id)) return message.reply(`${EMOJIS.negativo} Apenas os Donos do bot têm acesso ao painel.`);
        return message.channel.send({ embeds: [buildPanelEmbed()], components: buildPanelComponents() });
    }

    // Comando de Ban (.ban @membro motivo)
    if (cmd === 'ban') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        const reason = args.slice(1).join(' ');

        if (!target) return message.reply(`${EMOJIS.alerta} Uso correto: \`.ban @membro <motivo>\``);
        if (!reason) return message.reply(`${EMOJIS.alerta} É obrigatório especificar um motivo para o banimento.`);

        if (!target.bannable) return message.reply(`${EMOJIS.negativo} Não tenho permissão para banir este membro.`);

        const embed = new EmbedBuilder()
            .setTitle(config.embedBan.title)
            .setColor(0xFF0000)
            .setDescription(`${EMOJIS.perfil} **Membro:** ${target.user}\n${EMOJIS.sms} **Motivo:** ${reason}\n\n${config.embedBan.description}`)
            .setFooter({ text: config.embedBan.footer });

        if (config.embedBan.imageUrl) embed.setImage(config.embedBan.imageUrl);

        // Envia DM e Log
        await target.send({ embeds: [embed] }).catch(() => {});
        if (config.logChannelId) {
            const logChan = message.guild.channels.cache.get(config.logChannelId);
            if (logChan) await logChan.send({ embeds: [embed] });
        }

        await target.ban({ reason });
        return message.channel.send(`${EMOJIS.banido} O usuário **${target.user.tag}** foi banido com sucesso!`);
    }
});

// INTERAÇÕES DE PAINEL E MODAL
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'panel_select') {
        if (!isOwner(interaction.user.id)) return interaction.reply({ content: `${EMOJIS.negativo} Apenas os donos podem usar este menu.`, ephemeral: true });

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
        } else if (value === 'edit_embed_ban') {
            const modal = new ModalBuilder().setCustomId('modal_ban').setTitle('Configurar Embed de Ban');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Título').setStyle(TextInputStyle.Short).setValue(config.embedBan.title)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(config.embedBan.description))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_ban') {
        config.embedBan.title = interaction.fields.getTextInputValue('title');
        config.embedBan.description = interaction.fields.getTextInputValue('desc');
        await interaction.reply({ content: `${EMOJIS.positivo} Embed de Ban atualizada com sucesso!`, ephemeral: true });
    }
});

// LOGIN USANDO A VARIÁVEL DE AMBIENTE DO RAILWAY
client.login(process.env.TOKEN);
