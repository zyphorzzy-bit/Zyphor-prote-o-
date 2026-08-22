const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, 
    StringSelectMenuBuilder, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle,
    ButtonBuilder, ButtonStyle
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates
    ]
});

const PREFIX = 'f.';
const OWNER_IDS = ['1527769881326522478', '1533306874513068093'];

const EMOJIS = {
    desativado: '<a:desativado:1534611986539876463>', ativado: '<a:ativado:1534611985260609607>',
    alerta: '<:alerta:1534611993410015456>', horario: '<:horrio:1534611997335883886>',
    config: '<:config:1534611990633250937>', proibido: '<:Proibido:1534611991929290877>',
    warn1: '<:warn1:1540096479501357137>', warn2: '<:warn2:1540096480998596741>',
    warn3: '<:warn3:1540096477689290842>', apagado: '<:apagado:1539124689077665894>',
    id: '<:ID:1534611999085039786>', sms: '<:sms:1539125782335455292>',
    protecao: '<:proteo:1539125790711480331>', positivo: '<:positivo:1534611995742179419>',
    negativo: '<:negativo:1534612858548256921>', not: '<:not:1539815573981237388>',
    banido: '<:banido:1539124695448952973>', perfil: '<:perfil:1540557352602705990>',
    suporte: '<:suporte:1539845832004870154>', usersalt: '<:usersalt:1539125796046639154>',
    users: '<:users:1539124702407168062>', linkexterno: '<:linkexterno:1539124690709385330>'
};

let config = {
    antiLink: true, antiSpam: true, logChannelId: null,
    immuneRoles: [], staffRoles: [],
    embedBan: { 
        title: `${EMOJIS.banido} Você foi banido do servidor!`, 
        description: 'Você foi banido por infringir nossas regras. Caso queira recorrer, acesse o nosso Tribunal pelo botão abaixo:',
        color: '#FF0000', imageUrl: '', thumbnailUrl: '',
        serverLink: 'https://discord.gg/seu-link-aqui', footer: 'Sistema de Segurança & Moderação' 
    }
};

const spamMap = new Map();

client.on('ready', () => {
    console.log(`${EMOJIS.positivo} Bot logado como ${client.user.tag}`);
    client.user.setActivity('INVESTIGAÇÃO', { type: ActivityType.Streaming, url: 'https://www.twitch.tv/discord' });
});

function isOwner(userId) { return OWNER_IDS.includes(userId); }
function isStaff(member) { return isOwner(member.id) || member.permissions.has(PermissionsBitField.Flags.Administrator) || config.staffRoles.some(r => member.roles.cache.has(r)); }
function isImmune(member) { return isStaff(member) || config.immuneRoles.some(r => member.roles.cache.has(r)); }

function buildPanelEmbed() {
    return new EmbedBuilder()
        .setTitle(`${EMOJIS.config} Painel de Controle de Segurança`)
        .setColor(config.embedBan.color || '#2B2D31')
        .addFields(
            { name: `${EMOJIS.protecao} Moderação`, value: `**Anti-Link:** ${config.antiLink ? EMOJIS.ativado : EMOJIS.desativado}\n**Anti-Spam:** ${config.antiSpam ? EMOJIS.ativado : EMOJIS.desativado}`, inline: true },
            { name: `${EMOJIS.users} Permissões`, value: `${EMOJIS.usersalt} **Staffs:** ${config.staffRoles.length}\n${EMOJIS.protecao} **Imunes:** ${config.immuneRoles.length}`, inline: true },
            { name: `${EMOJIS.linkexterno} Link do Tribunal`, value: config.embedBan.serverLink || 'Não configurado', inline: false }
        );
}

function buildPanelComponents() {
    return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('panel_select').setPlaceholder('Selecione uma opção para configurar...')
        .addOptions([
            { label: 'Anti-Link', value: 'toggle_antilink', emoji: '1539125790711480331' },
            { label: 'Anti-Spam', value: 'toggle_antispam', emoji: '1539125790711480331' },
            { label: 'Cargos Staff', value: 'set_staff_roles', emoji: '1539124702407168062' },
            { label: 'Cargos Imunes', value: 'set_immune_roles', emoji: '1539125796046639154' },
            { label: 'Editar Embed Ban', value: 'edit_embed_ban', emoji: '1539124695448952973' }
        ]))];
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (config.antiLink && !isImmune(message.member) && /(https?:\/\/[^\s]+)/g.test(message.content)) {
        await message.delete().catch(() => {});
        return message.channel.send(`${EMOJIS.proibido} ${message.author}, envio de links é proibido!`).then(m => setTimeout(() => m.delete(), 4000));
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'call') {
        if (!isOwner(message.author.id)) return;
        const channel = message.guild.channels.cache.get(args[0]);
        if (!channel || channel.type !== 2) return message.reply(`${EMOJIS.negativo} ID inválido.`);
        joinVoiceChannel({ channelId: channel.id, guildId: message.guild.id, adapterCreator: message.guild.voiceAdapterCreator, selfMute: true, selfDeaf: true });
        return message.reply(`${EMOJIS.positivo} Conectado!`);
    }

    if (cmd === 'painel') {
        if (!isOwner(message.author.id)) return;
        return message.channel.send({ embeds: [buildPanelEmbed()], components: buildPanelComponents() });
    }

    if (cmd === 'ban') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!target) return message.reply(`${EMOJIS.alerta} Uso: \`f.ban @membro <motivo>\``);
        
        const descText = `${EMOJIS.perfil} **Membro:** ${target.user}\n${EMOJIS.id} **ID:** \`${target.user.id}\`\n${EMOJIS.sms} **Motivo:** ${reason}\n\n${config.embedBan.description}`;
        const embed = new EmbedBuilder().setTitle(config.embedBan.title).setColor(config.embedBan.color).setDescription(descText).setFooter({ text: config.embedBan.footer });
        embed.setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

        const components = [];
        if (config.embedBan.serverLink) {
            components.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Recorrer no Tribunal').setStyle(ButtonStyle.Link).setURL(config.embedBan.serverLink).setEmoji('1539124690709385330')));
        }

        await target.send({ embeds: [embed], components }).catch(() => {});
        await target.ban({ reason });
        return message.channel.send(`${EMOJIS.banido} O usuário **${target.user.tag}** foi banido!`);
    }

    if (cmd === 'unban') {
        if (!isStaff(message.member)) return;
        const userId = args[0];
        if (!userId) return message.reply(`${EMOJIS.alerta} Uso: \`f.unban <ID>\``);
        try {
            await message.guild.members.unban(userId);
            return message.reply(`${EMOJIS.positivo} Usuário desbanido!`);
        } catch (e) { return message.reply(`${EMOJIS.negativo} Erro ao desbanir.`); }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu()) {
        const value = interaction.values[0];
        if (value === 'toggle_antilink') { config.antiLink = !config.antiLink; await interaction.update({ embeds: [buildPanelEmbed()] }); }
        if (value === 'edit_embed_ban') {
            const modal = new ModalBuilder().setCustomId('modal_ban').setTitle('Configurar Tribunal');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('link').setLabel('Link do Servidor (https://...)').setStyle(TextInputStyle.Short).setValue(config.embedBan.serverLink))
            );
            await interaction.showModal(modal);
        }
    }
    if (interaction.isModalSubmit()) {
        config.embedBan.serverLink = interaction.fields.getTextInputValue('link');
        await interaction.reply({ content: `${EMOJIS.positivo} Link atualizado!`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
