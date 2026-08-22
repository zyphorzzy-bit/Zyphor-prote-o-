const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, 
    StringSelectMenuBuilder, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle,
    ButtonBuilder, ButtonStyle, Events
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
    antiLink: true, antiSpam: true, voiceLogs: true, logChannelId: null,
    immuneRoles: [], staffRoles: [],
    welcome: {
        enabled: true,
        channelId: null,
        roleToMention: null,
        text: 'Seja bem-vindo(a) ao **{server}**, {user}!',
        btnChannelId: null, // Canal para onde o botão vai redirecionar
        btnLabel: 'Ir para o Canal',
        deleteMinutes: 0 // 0 = Permanente
    },
    embedBan: { 
        title: `${EMOJIS.banido} Você foi banido do servidor!`, 
        description: 'Você foi banido por infringir nossas regras. Caso queira recorrer, acesse o nosso Tribunal pelo botão abaixo:',
        color: '#FF0000', imageUrl: '', thumbnailUrl: '',
        serverLink: 'https://discord.gg/seu-link-aqui', footer: 'Sistema de Segurança & Moderação' 
    }
};

const spamMap = new Map();
const warnings = new Map();

client.on('ready', () => {
    console.log(`${EMOJIS.positivo} Bot logado como ${client.user.tag}`);
    client.user.setActivity('INVESTIGAÇÃO', { type: ActivityType.Streaming, url: 'https://www.twitch.tv/discord' });
});

function isOwner(userId) { return OWNER_IDS.includes(userId); }
function isStaff(member) { return isOwner(member.id) || member.permissions.has(PermissionsBitField.Flags.Administrator) || config.staffRoles.some(r => member.roles.cache.has(r)); }
function isImmune(member) { return isStaff(member) || config.immuneRoles.some(r => member.roles.cache.has(r)); }

async function sendLog(guild, title, fields, color = '#2B2D31') {
    if (!config.logChannelId) return;
    const channel = guild.channels.cache.get(config.logChannelId);
    if (channel) {
        const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp().addFields(fields);
        channel.send({ embeds: [embed] }).catch(() => {});
    }
}

// Boas-Vindas ao Entrar Novo Membro
client.on(Events.GuildMemberAdd, async (member) => {
    if (!config.welcome.enabled || !config.welcome.channelId) return;
    const channel = member.guild.channels.cache.get(config.welcome.channelId);
    if (!channel) return;

    let textContent = config.welcome.text
        .replace(/{user}/g, `${member}`)
        .replace(/{server}/g, member.guild.name);

    if (config.welcome.roleToMention) {
        textContent = `<@&${config.welcome.roleToMention}> ` + textContent;
    }

    const components = [];
    if (config.welcome.btnChannelId) {
        const targetChannel = member.guild.channels.cache.get(config.welcome.btnChannelId);
        if (targetChannel) {
            const btn = new ButtonBuilder()
                .setLabel(config.welcome.btnLabel || 'Acessar Canal')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${member.guild.id}/${targetChannel.id}`);
            components.push(new ActionRowBuilder().addComponents(btn));
        }
    }

    const sentMessage = await channel.send({ content: textContent, components }).catch(() => {});

    // Apagar mensagem após tempo limite (se diferente de 0)
    if (sentMessage && config.welcome.deleteMinutes > 0) {
        setTimeout(() => {
            sentMessage.delete().catch(() => {});
        }, config.welcome.deleteMinutes * 60 * 1000);
    }
});

// Log de Calls
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (!config.voiceLogs || !config.logChannelId) return;
    if (!oldState.channelId && newState.channelId) {
        sendLog(newState.guild, '🎙️ Entrada em Call', [{ name: 'Usuário', value: `<@${newState.member.id}>` }, { name: 'Canal', value: `<#${newState.channelId}>` }], '#00FF00');
    }
    if (oldState.channelId && !newState.channelId) {
        sendLog(oldState.guild, '🎙️ Saída de Call', [{ name: 'Usuário', value: `<@${oldState.member.id}>` }, { name: 'Canal', value: `<#${oldState.channelId}>` }], '#FF0000');
    }
});

function buildPanelEmbed() {
    return new EmbedBuilder()
        .setTitle(`${EMOJIS.config} Painel de Controle de Segurança & Boas-Vindas`)
        .setColor(config.embedBan.color || '#2B2D31')
        .addFields(
            { name: `${EMOJIS.protecao} Moderação`, value: `**Anti-Link:** ${config.antiLink ? EMOJIS.ativado : EMOJIS.desativado}\n**Anti-Spam:** ${config.antiSpam ? EMOJIS.ativado : EMOJIS.desativado}\n**Logs Call:** ${config.voiceLogs ? EMOJIS.ativado : EMOJIS.desativado}`, inline: true },
            { name: `${EMOJIS.users} Permissões & Logs`, value: `${EMOJIS.usersalt} **Staffs:** ${config.staffRoles.length}\n${EMOJIS.protecao} **Imunes:** ${config.immuneRoles.length}\n${EMOJIS.sms} **Log:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Off'}`, inline: true },
            { name: `${EMOJIS.suporte} Boas-Vindas`, value: `**Status:** ${config.welcome.enabled ? EMOJIS.ativado : EMOJIS.desativado}\n**Canal:** ${config.welcome.channelId ? `<#${config.welcome.channelId}>` : 'Off'}\n**Cargo Notificar:** ${config.welcome.roleToMention ? `<@&${config.welcome.roleToMention}>` : 'Nenhum'}\n**Tempo Msg:** ${config.welcome.deleteMinutes === 0 ? 'Permanente' : `${config.welcome.deleteMinutes} min`}`, inline: false }
        );
}

function buildPanelComponents() {
    return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('panel_select').setPlaceholder('Selecione uma opção para configurar...')
        .addOptions([
            { label: 'Anti-Link', value: 'toggle_antilink', emoji: '1539125790711480331' },
            { label: 'Anti-Spam', value: 'toggle_antispam', emoji: '1539125790711480331' },
            { label: 'Logs de Call', value: 'toggle_voicelogs', emoji: '1534611997335883886' },
            { label: 'Boas-Vindas (On/Off)', value: 'toggle_welcome', emoji: '1539845832004870154' },
            { label: 'Configurar Boas-Vindas (Texto/Cargo/Tempo)', value: 'edit_welcome_text', emoji: '1539125782335455292' },
            { label: 'Canais de Boas-Vindas & Botão', value: 'edit_welcome_channels', emoji: '1539124690709385330' },
            { label: 'Cargos Staff', value: 'set_staff_roles', emoji: '1539124702407168062' },
            { label: 'Cargos Imunes', value: 'set_immune_roles', emoji: '1539125796046639154' },
            { label: 'Canal de Logs', value: 'set_log_channel', emoji: '1539125782335455292' },
            { label: 'Editar Embed Ban (Texto/Cor/Link)', value: 'edit_embed_ban', emoji: '1539124695448952973' },
            { label: 'Editar Imagens Ban', value: 'edit_embed_images', emoji: '1540557352602705990' }
        ]))];
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (config.antiLink && !isImmune(message.member) && /(https?:\/\/[^\s]+)/g.test(message.content)) {
        await message.delete().catch(() => {});
        sendLog(message.guild, `${EMOJIS.apagado} Link Deletado`, [{ name: 'Infrator', value: `${message.author}` }, { name: 'Conteúdo', value: message.content }], '#FF0000');
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
            sendLog(message.guild, `${EMOJIS.alerta} Spam Detectado`, [{ name: 'Infrator', value: `${message.author}` }], '#FFA500');
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

    if (cmd === 'warn') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Sem motivo informado';
        if (!target) return message.reply(`${EMOJIS.alerta} Marque um usuário.`);
        
        if (!warnings.has(target.id)) warnings.set(target.id, []);
        warnings.get(target.id).push({ reason, admin: message.author.tag, date: new Date().toLocaleDateString('pt-BR') });

        sendLog(message.guild, `${EMOJIS.warn1} Adv. Aplicada`, [{ name: 'Membro', value: `${target.user}` }, { name: 'Motivo', value: reason }, { name: 'Staff', value: `${message.author.tag}` }], '#FFFF00');
        return message.channel.send(`${EMOJIS.positivo} Advertência aplicada com sucesso em **${target.user.tag}**.`);
    }

    if (cmd === 'logs') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first();
        if (!target) return message.reply(`${EMOJIS.alerta} Marque um usuário.`);
        const userWarns = warnings.get(target.id);
        if (!userWarns || userWarns.length === 0) return message.reply(`${EMOJIS.positivo} Este membro não tem advertências.`);

        const list = userWarns.map((w, idx) => `**${idx + 1}.** ${w.reason} *(por ${w.admin} em ${w.date})*`).join('\n');
        return message.reply(`**Histórico de Advertências de ${target.user.tag}:**\n${list}`);
    }

    if (cmd === 'delwarn') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first();
        const index = parseInt(args[1]) - 1;
        if (!target || isNaN(index)) return message.reply(`${EMOJIS.alerta} Uso: \`f.delwarn @membro <número_do_warn>\``);
        const userWarns = warnings.get(target.id);
        if (!userWarns || !userWarns[index]) return message.reply(`${EMOJIS.negativo} Advertência não encontrada.`);

        userWarns.splice(index, 1);
        return message.reply(`${EMOJIS.positivo} Advertência removida com sucesso.`);
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

        const components = [];
        if (config.embedBan.serverLink && config.embedBan.serverLink.startsWith('http')) {
            const button = new ButtonBuilder()
                .setLabel('Recorrer no Tribunal')
                .setStyle(ButtonStyle.Link)
                .setURL(config.embedBan.serverLink)
                .setEmoji('1539124690709385330');
            
            components.push(new ActionRowBuilder().addComponents(button));
        }

        await target.send({ embeds: [embed], components }).catch(() => {});
        sendLog(message.guild, `${EMOJIS.banido} Banimento Aplicado`, [{ name: 'Membro', value: `${target.user.tag}` }, { name: 'Motivo', value: reason }, { name: 'Staff', value: `${message.author.tag}` }], '#FF0000');

        await target.ban({ reason });
        return message.channel.send(`${EMOJIS.banido} O usuário **${target.user.tag}** foi banido!`);
    }

    if (cmd === 'unban') {
        if (!isStaff(message.member)) return;
        const userId = args[0];
        if (!userId) return message.reply(`${EMOJIS.alerta} Forneça o ID do usuário.`);

        await message.guild.members.unban(userId).then(() => {
            sendLog(message.guild, `${EMOJIS.positivo} Desbanimento`, [{ name: 'ID Desbanido', value: userId }, { name: 'Staff', value: `${message.author.tag}` }], '#00FF00');
            message.channel.send(`${EMOJIS.positivo} Usuário desbanido com sucesso!`);
        }).catch(() => message.reply(`${EMOJIS.negativo} ID inválido ou usuário não está banido.`));
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
        } else if (value === 'toggle_voicelogs') {
            config.voiceLogs = !config.voiceLogs;
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'toggle_welcome') {
            config.welcome.enabled = !config.welcome.enabled;
            await interaction.update({ embeds: [buildPanelEmbed()] });
        } else if (value === 'edit_welcome_text') {
            const modal = new ModalBuilder().setCustomId('modal_welcome_text').setTitle('Configurar Texto de Boas-Vindas');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('text').setLabel('Texto ({user} = membro, {server} = server)').setStyle(TextInputStyle.Paragraph).setValue(config.welcome.text)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role').setLabel('ID do Cargo p/ Notificar (Opcional)').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.welcome.roleToMention || '')),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('time').setLabel('Minutos p/ apagar (0 = permanente)').setStyle(TextInputStyle.Short).setValue(String(config.welcome.deleteMinutes)))
            );
            await interaction.showModal(modal);
        } else if (value === 'edit_welcome_channels') {
            const modal = new ModalBuilder().setCustomId('modal_welcome_channels').setTitle('Canais de Boas-Vindas');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('welcome_chan').setLabel('ID do Canal de Boas-Vindas').setStyle(TextInputStyle.Short).setValue(config.welcome.channelId || '')),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('btn_chan').setLabel('ID do Canal p/ Botão de Atalho (Opcional)').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.welcome.btnChannelId || '')),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('btn_label').setLabel('Texto do Botão').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.welcome.btnLabel || 'Ir para o Canal'))
            );
            await interaction.showModal(modal);
        } else if (value === 'set_staff_roles') {
            const modal = new ModalBuilder().setCustomId('modal_staff').setTitle('Configurar Cargos Staff');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roles').setLabel('IDs Staff (separados por vírgula)').setStyle(TextInputStyle.Paragraph).setValue(config.staffRoles.join(', '))));
            await interaction.showModal(modal);
        } else if (value === 'set_immune_roles') {
            const modal = new ModalBuilder().setCustomId('modal_immune').setTitle('Configurar Cargos Imunes');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roles').setLabel('IDs Imunes (separados por vírgula)').setStyle(TextInputStyle.Paragraph).setValue(config.immuneRoles.join(', '))));
            await interaction.showModal(modal);
        } else if (value === 'set_log_channel') {
            const modal = new ModalBuilder().setCustomId('modal_log_channel').setTitle('Canal de Logs');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_id').setLabel('ID do Canal de Logs').setStyle(TextInputStyle.Short).setValue(config.logChannelId || '')));
            await interaction.showModal(modal);
        } else if (value === 'edit_embed_ban') {
            const modal = new ModalBuilder().setCustomId('modal_ban_text').setTitle('Configurar Ban');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Título').setStyle(TextInputStyle.Short).setValue(config.embedBan.title)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(config.embedBan.description)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Cor Hexadecimal (ex: #FF0000)').setStyle(TextInputStyle.Short).setValue(config.embedBan.color)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('link').setLabel('URL Completa do Tribunal').setStyle(TextInputStyle.Short).setRequired(false).setValue(config.embedBan.serverLink))
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
        if (interaction.customId === 'modal_welcome_text') {
            config.welcome.text = interaction.fields.getTextInputValue('text');
            config.welcome.roleToMention = interaction.fields.getTextInputValue('role').trim() || null;
            config.welcome.deleteMinutes = parseInt(interaction.fields.getTextInputValue('time')) || 0;
            await interaction.reply({ content: `${EMOJIS.positivo} Texto e configurações de Boas-Vindas atualizados!`, ephemeral: true });
        } else if (interaction.customId === 'modal_welcome_channels') {
            config.welcome.channelId = interaction.fields.getTextInputValue('welcome_chan').trim() || null;
            config.welcome.btnChannelId = interaction.fields.getTextInputValue('btn_chan').trim() || null;
            config.welcome.btnLabel = interaction.fields.getTextInputValue('btn_label').trim() || 'Ir para o Canal';
            await interaction.reply({ content: `${EMOJIS.positivo} Canais e Botão de Atalho atualizados!`, ephemeral: true });
        } else if (interaction.customId === 'modal_staff') {
            config.staffRoles = interaction.fields.getTextInputValue('roles').split(',').map(id => id.trim()).filter(id => id !== '');
            await interaction.reply({ content: `${EMOJIS.positivo} Cargos Staff atualizados!`, ephemeral: true });
        } else if (interaction.customId === 'modal_immune') {
            config.immuneRoles = interaction.fields.getTextInputValue('roles').split(',').map(id => id.trim()).filter(id => id !== '');
            await interaction.reply({ content: `${EMOJIS.positivo} Cargos Imunes atualizados!`, ephemeral: true });
        } else if (interaction.customId === 'modal_log_channel') {
            config.logChannelId = interaction.fields.getTextInputValue('log_id').trim();
            await interaction.reply({ content: `${EMOJIS.positivo} Canal de logs atualizado!`, ephemeral: true });
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
