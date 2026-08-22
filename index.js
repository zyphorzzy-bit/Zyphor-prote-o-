const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, 
    ComponentType 
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

const OWNER_IDS = ['1527769881326522478', '1533306874513068093', '1521362851502227588'];

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
    users: '<:users:1539124702407168062>', linkexterno: '<:linkexterno:1539124690709385330>',
    setaE: '<:setaladoe:1539124867113295898>', setaD: '<:setaladod:1539124868727963651>'
};

let config = { 
    antiLink: true, antiSpam: true, logChannelId: null, 
    staffRoles: [], immuneRoles: [], 
    embedBan: { serverLink: 'https://discord.gg/tribunal' } 
};
let warnings = new Map();

async function sendLog(guild, title, fields, color = '#2F3136') {
    if (!config.logChannelId) return;
    const channel = guild.channels.cache.get(config.logChannelId);
    if (channel) {
        const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp().addFields(fields);
        channel.send({ embeds: [embed] }).catch(() => {});
    }
}

function getPage(page) {
    const embed = new EmbedBuilder().setColor('#2F3136').setFooter({ text: `Página ${page + 1}/4` });
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setEmoji(EMOJIS.setaE).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('next').setEmoji(EMOJIS.setaD).setStyle(ButtonStyle.Secondary)
    );

    if (page === 0) {
        embed.setTitle(`${EMOJIS.config} Proteções`).setDescription('Ative ou desative os sistemas de segurança.');
        return { embeds: [embed], components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_link').setLabel(`Anti-Link: ${config.antiLink ? 'On' : 'Off'}`).setStyle(config.antiLink ? 3 : 4),
            new ButtonBuilder().setCustomId('t_spam').setLabel(`Anti-Spam: ${config.antiSpam ? 'On' : 'Off'}`).setStyle(config.antiSpam ? 3 : 4)
        ), row] };
    }
    if (page === 1) {
        embed.setTitle(`${EMOJIS.users} Cargos`).setDescription('Configure os cargos de Staff e Imunes.');
        return { embeds: [embed], components: [
            new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('s_staff').setPlaceholder('Selecione cargos Staff')),
            new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('s_immune').setPlaceholder('Selecione cargos Imunes')),
            row
        ] };
    }
    if (page === 2) {
        embed.setTitle(`${EMOJIS.sms} Canal de Logs`).setDescription(`Canal atual: ${config.logChannelId ? `<#${config.logChannelId}>` : 'Não definido'}`);
        return { embeds: [embed], components: [new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('s_log').setPlaceholder('Selecione o canal de logs')), row] };
    }
    if (page === 3) {
        embed.setTitle(`${EMOJIS.suporte} Comandos`).setDescription('Gerenciamento:\n`f.warn`, `f.logs`, `f.delwarn`\n`f.ban`, `f.unban`\n`f.setlink <url>`');
        return { embeds: [embed], components: [row] };
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('f.')) return;

    // Anti-Link/Spam
    if ((config.antiLink && /(https?:\/\/[^\s]+)/g.test(message.content))) {
        message.delete().catch(() => {});
        sendLog(message.guild, `${EMOJIS.apagado} Link Removido`, [{ name: 'Usuário', value: `${message.author}` }, { name: 'Conteúdo', value: message.content }], 'Red');
    }

    const args = message.content.slice(2).split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'painel' && OWNER_IDS.includes(message.author.id)) {
        let p = 0;
        const msg = await message.channel.send(getPage(p));
        const col = msg.createMessageComponentCollector({ time: 600000 });
        col.on('collect', async (i) => {
            if (i.customId === 'next') p = (p + 1) % 4;
            else if (i.customId === 'prev') p = (p - 1 + 4) % 4;
            else if (i.customId === 't_link') config.antiLink = !config.antiLink;
            else if (i.customId === 't_spam') config.antiSpam = !config.antiSpam;
            await i.update(getPage(p));
        });
    }

    if (cmd === 'ban') {
        const user = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!user) return message.reply(`${EMOJIS.alerta} Marque alguém para banir.`);
        await user.ban({ reason });
        sendLog(message.guild, `${EMOJIS.banido} Banimento`, [{ name: 'Usuário', value: `${user.user.tag}` }, { name: 'Motivo', value: reason }, { name: 'Staff', value: message.author.tag }], 'Red');
    }

    if (cmd === 'unban') {
        const userId = args[0];
        await message.guild.members.unban(userId);
        sendLog(message.guild, `${EMOJIS.positivo} Desbanimento`, [{ name: 'ID', value: userId }, { name: 'Staff', value: message.author.tag }], 'Green');
    }

    if (cmd === 'warn') {
        const user = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        if (!user) return message.reply(`${EMOJIS.alerta} Marque alguém.`);
        if (!warnings.has(user.id)) warnings.set(user.id, []);
        warnings.get(user.id).push({ reason, admin: message.author.tag });
        sendLog(message.guild, `${EMOJIS.warn1} Warn Aplicado`, [{ name: 'Usuário', value: `${user}` }, { name: 'Motivo', value: reason }, { name: 'Staff', value: message.author.tag }], 'Yellow');
    }

    if (cmd === 'logs') {
        const user = message.mentions.members.first();
        if (!user || !warnings.has(user.id)) return message.reply('Sem registros.');
        const list = warnings.get(user.id).map((w, i) => `${i + 1}. ${w.reason} (Admin: ${w.admin})`).join('\n');
        message.reply(`**Registros de ${user.user.tag}:**\n${list}`);
    }

    if (cmd === 'delwarn') {
        const user = message.mentions.members.first();
        const index = parseInt(args[1]) - 1;
        const list = warnings.get(user.id);
        if (list && list[index]) {
            list.splice(index, 1);
            message.reply(`${EMOJIS.positivo} Warn removido.`);
        }
    }

    if (cmd === 'setlink') {
        config.embedBan.serverLink = args[0] || config.embedBan.serverLink;
        message.reply(`${EMOJIS.linkexterno} Link do Tribunal: ${config.embedBan.serverLink}`);
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isRoleSelectMenu()) {
        if (i.customId === 's_staff') config.staffRoles = Array.from(i.roles.keys());
        if (i.customId === 's_immune') config.immuneRoles = Array.from(i.roles.keys());
        i.reply({ content: `${EMOJIS.positivo} Salvo!`, ephemeral: true });
    }
    if (i.isChannelSelectMenu()) {
        config.logChannelId = i.values[0];
        i.reply({ content: `${EMOJIS.positivo} Canal definido!`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
