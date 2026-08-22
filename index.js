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
    immuneRoles: [], staffRoles: [], warnAction3: 'ban',
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
            { label: 'Editar Embed Ban (Texto/Cor/Link)', value: 'edit_embed_ban', emoji: '1539124695448952973' },
            { label: 'Editar Imagens Ban', value: 'edit_embed_images', emoji: '1540557352602705990' }
        ]))];
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (config.antiLink && !isImmune(message.member) && /(https?:\/\/[^\s]+)/g.test(message.content)) {
        await message.delete().catch(() => {});
        return message.channel.send(`${EMOJIS.proibido} ${message.author}, envio de links é proibido!`).then(m => setTimeout(() => m.delete(), 4000));
    }

    if (config.antiSpam && !isImmune(message.member)) {
        const userData = spamMap.get(message.author.id) || { count: 0, timer: null };
        userData.count++;
        if (userData.count === 1) userData.timer = setTimeout(() => spamMap.delete(message.author.id), 4000);
        spamMap.set(message.author.id, userData);

        if (userData.count >= 5) {
            await message.channel.bulkDelete(5, true).catch(() => {});
            spamMap.delete(message.author.id);
            return message.channel.send(`${EMOJIS.alerta} ${message.author}, evite spam!`).then(m => setTimeout(() => m.delete(), 4000));
        }
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'call') {
        if (!isOwner(message.author.id)) return;
        const channel = message.guild.channels.cache.get(args[0]);
        if (!channel || channel.type !== 2) return message.reply(`${EMOJIS.negativo} ID de canal de voz inválido.`);
        joinVoiceChannel({ channelId: channel.id, guildId: message.guild.id, adapterCreator: message.guild.voiceAdapterCreator, selfMute: true, selfDeaf: true });
        return message.reply(`${EMOJIS.positivo} Conectado na call mutado/ensurdecido!`);
    }

    if (cmd === 'painel') {
        if (!isOwner(message.author.id)) return;
        return message.channel.send({ embeds: [buildPanelEmbed()], components: buildPanelComponents() });
    }

    if (cmd === 'ban') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        const reason = args.slice(1).join(' ');

        if (!target) return message.reply(`${EMOJIS.alerta} Uso correto: \`f.ban @membro <motivo>\``);
        if (!reason) return message.reply(`${EMOJIS.alerta} Informe um motivo.`);
        if (!target.bannable) return message.reply(`${EMOJIS.negativo} Não posso banir esse membro.`);

        const descText = `${EMOJIS.perfil} **Membro:** ${target.user}\n${EMOJIS.id} **ID:** \`${target.user.id}\`\n${EMOJIS.sms} **Motivo:** ${reason}\n\n${config.embedBan.description}`;

        const embed = new EmbedBuilder()
            .setTitle(config.embedBan.title)
            .setColor(config.embedBan.color || '#FF0000')
            .setDescription(descText)
            .setFooter({ text: config.embedBan.footer });

        if (config.embedBan.imageUrl) embed.setImage(config.embedBan.imageUrl);
        embed.setThumbnail(config.embedBan.thumbnailUrl || target.user.displayAvatarURL({ dynamic: true }));

        // BOTÃO COM O LINK DO TRIBUNAL
        const components = [];
        if (config.embedBan.serverLink && config.embedBan.serverLink.startsWith('http')) {
            const button = new ButtonBuilder()
                .setLabel('Recorrer no Tribunal')
                .setStyle(ButtonStyle.Link)
                .setURL(config.embedBan.serverLink)
                .setEmoji('1539124690709385330'); // Emoji do linkexterno
            
            components.push(new ActionRowBuilder().addComponents(button));
        }

        await target.send({ embeds: [embed], components }).catch(() => {});
        if (config.logChannelId) {
            const logChan = message.guild.channels.cache.get(config.logChannelId);
            if (logChan) await logChan.send({ embeds: [embed] });
        }

        await target.ban({ reason });
        return message.channel.send(`${EMOJIS.banido} O usuário **${target.user.tag}** foi banido!`);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'panel_select') {
        if (!isOwner(interaction.user.id)) return interaction.reply({ content: `${EMOJIS.negativo} Permissão negada.`, ephemeral: true });

        const value = interaction.values[0];
        if (value === 'toggle_antilink') {
            config.antiLink = !config.antiLink;
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'toggle_antispam') {
            config.antiSpam = !config.antiSpam;
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'set_staff_roles') {
            const modal = new ModalBuilder().setCustomId('modal_staff').setTitle('Configurar Cargos Staff');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roles').setLabel('IDs Staff (separados por vírgula)').setStyle(TextInputStyle.Paragraph).setValue(config.staffRoles.join(', '))));
            await interaction.showModal(modal);
        } else if (value === 'set_immune_roles') {
            const modal = new ModalBuilder().setCustomId('modal_immune').setTitle('Configurar Cargos Imunes');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roles').setLabel('IDs Imunes (separados por vírgula)').setStyle(TextInputStyle.Paragraph).setValue(config.immuneRoles.join(', '))));
            await interaction.showModal(modal);
        } else if (value === 'edit_embed_ban') {
            const modal = new ModalBuilder().setCustomId('modal_ban_text').setTitle('Configurar Ban');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Título').setStyle(TextInputStyle.Short).setValue(config.embedBan.title)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(config.embedBan.description)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Cor Hexadecimal (ex: #FF0000)').setStyle(TextInputStyle.Short).setValue(config.embedBan.color)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('link').setLabel('URL Completa do Tribunal (https://...)').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.embedBan.serverLink))
            );
            await interaction.showModal(modal);
        } else if (value === 'edit_embed_images') {
            const modal = new ModalBuilder().setCustomId('modal_ban_img').setTitle('Imagens da Embed');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('URL da Imagem/Banner (Opcional)').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.embedBan.imageUrl)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('thumb').setLabel('URL da Thumbnail (Opcional)').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.embedBan.thumbnailUrl))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_staff') {
            config.staffRoles = interaction.fields.getTextInputValue('roles').split(',').map(id => id.trim()).filter(id => id !== '');
            await interaction.reply({ content: `${EMOJIS.positivo} Cargos Staff atualizados!`, ephemeral: true });
        } else if (interaction.customId === 'modal_immune') {
            config.immuneRoles = interaction.fields.getTextInputValue('roles').split(',').map(id => id.trim()).filter(id => id !== '');
            await interaction.reply({ content: `${EMOJIS.positivo} Cargos Imunes atualizados!`, ephemeral: true });
        } else if (interaction.customId === 'modal_ban_text') {
            config.embedBan.title = interaction.fields.getTextInputValue('title');
            config.embedBan.description = interaction.fields.getTextInputValue('desc');
            config.embedBan.color = interaction.fields.getTextInputValue('color') || '#FF0000';
            config.embedBan.serverLink = interaction.fields.getTextInputValue('link') || '';
            await interaction.reply({ content: `${EMOJIS.positivo} Configurações salvas!`, ephemeral: true });
        } else if (interaction.customId === 'modal_ban_img') {
            config.embedBan.imageUrl = interaction.fields.getTextInputValue('image') || '';
            config.embedBan.thumbnailUrl = interaction.fields.getTextInputValue('thumb') || '';
            await interaction.reply({ content: `${EMOJIS.positivo} Imagens salvas!`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
