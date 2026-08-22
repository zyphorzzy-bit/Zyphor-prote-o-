const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, 
    StringSelectMenuBuilder, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildVoiceStates
    ]
});

// IDS DOS DONOS
const OWNER_IDS = ['1527769881326522478', '1533306874513068093'];

// EMOJIS (Você pode atualizar os IDs se necessário)
const EMOJIS = {
    desativado: '<a:desativado:1534611986539876463>', ativado: '<a:ativado:1534611985260609607>',
    alerta: '<:alerta:1534611993410015456>', config: '<:config:1534611990633250937>', 
    proibido: '<:Proibido:1534611991929290877>', positivo: '<:positivo:1534611995742179419>',
    negativo: '<:negativo:1534612858548256921>', banido: '<:banido:1539124695448952973>',
    sms: '<:sms:1539125782335455292>', proteo: '<:proteo:1539125790711480331>',
    perfil: '<:perfil:1540557352602705990>'
};

// CONFIGURAÇÕES PADRÃO (Salvas na memória)
let config = {
    antiLink: true, antiSpam: true, logChannelId: null,
    immuneRoles: [], staffRoles: [], warnAction3: 'ban',
    embedBan: { 
        title: `${EMOJIS.banido} Você foi banido!`, 
        description: 'Você foi banido por infringir nossas regras.',
        color: '#FF0000', imageUrl: '', thumbnailUrl: '',
        serverLink: '', footer: 'Sistema de Segurança' 
    }
};

const spamMap = new Map();

client.on('ready', () => {
    console.log(`${EMOJIS.positivo} Bot logado como ${client.user.tag}`);
    client.user.setActivity('INVESTIGAÇÃO', { type: ActivityType.Streaming, url: 'https://www.twitch.tv/discord' });
});

// FUNÇÕES DE VERIFICAÇÃO
function isOwner(userId) { return OWNER_IDS.includes(userId); }
function isStaff(member) { return isOwner(member.id) || member.permissions.has(PermissionsBitField.Flags.Administrator) || config.staffRoles.some(r => member.roles.cache.has(r)); }
function isImmune(member) { return isStaff(member) || config.immuneRoles.some(r => member.roles.cache.has(r)); }

// INTERFACE DO PAINEL
function buildPanelEmbed() {
    return new EmbedBuilder()
        .setTitle(`${EMOJIS.config} Painel de Controle`)
        .setColor(config.embedBan.color || '#2B2D31')
        .addFields(
            { name: `${EMOJIS.proteo} Moderação`, value: `**Link:** ${config.antiLink ? 'On' : 'Off'} | **Spam:** ${config.antiSpam ? 'On' : 'Off'}`, inline: true },
            { name: `🛡️ Cargos`, value: `**Staff:** ${config.staffRoles.length}\n**Imunes:** ${config.immuneRoles.length}`, inline: true }
        );
}

function buildPanelComponents() {
    return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('panel_select').setPlaceholder('Selecione uma ação...')
        .addOptions([
            { label: 'Toggle Anti-Link', value: 'toggle_antilink', emoji: '🔗' },
            { label: 'Toggle Anti-Spam', value: 'toggle_antispam', emoji: '🚫' },
            { label: 'Configurar Cargos Staff', value: 'set_staff_roles', emoji: '👮' },
            { label: 'Configurar Cargos Imunes', value: 'set_immune_roles', emoji: '🛡️' },
            { label: 'Editar Visual Ban', value: 'edit_embed_ban', emoji: '🎨' },
            { label: 'Editar Imagens Ban', value: 'edit_embed_images', emoji: '🖼️' }
        ]))];
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Proteções
    if (config.antiLink && !isImmune(message.member) && /(https?:\/\/[^\s]+)/g.test(message.content)) {
        await message.delete().catch(() => {});
        return message.channel.send(`${EMOJIS.proibido} Links proibidos!`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (!message.content.startsWith('.')) return;
    const args = message.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    // COMANDO CALL
    if (cmd === 'call') {
        if (!isOwner(message.author.id)) return;
        const channel = message.guild.channels.cache.get(args[0]);
        if (!channel || channel.type !== 2) return message.reply("ID inválido.");
        joinVoiceChannel({ channelId: channel.id, guildId: message.guild.id, adapterCreator: message.guild.voiceAdapterCreator, selfMute: true, selfDeaf: true });
        message.reply(`${EMOJIS.positivo} Entrando na call mutado.`);
    }

    // COMANDO PAINEL
    if (cmd === 'painel') {
        if (!isOwner(message.author.id)) return;
        return message.channel.send({ embeds: [buildPanelEmbed()], components: buildPanelComponents() });
    }

    // COMANDO BAN
    if (cmd === 'ban') {
        if (!isStaff(message.member)) return;
        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply("Mencione alguém.");
        
        let desc = `${EMOJIS.perfil} **Membro:** ${target.user}\n${EMOJIS.sms} **Motivo:** ${args.slice(1).join(' ') || 'Nenhum'}\n\n${config.embedBan.description}`;
        if (config.embedBan.serverLink) desc += `\n\n**Link:** ${config.embedBan.serverLink}`;

        const embed = new EmbedBuilder().setTitle(config.embedBan.title).setColor(config.embedBan.color).setDescription(desc).setFooter({ text: config.embedBan.footer });
        if (config.embedBan.imageUrl) embed.setImage(config.embedBan.imageUrl);
        embed.setThumbnail(config.embedBan.thumbnailUrl || target.user.displayAvatarURL());

        await target.send({ embeds: [embed] }).catch(() => {});
        await target.ban({ reason: args.slice(1).join(' ') });
        message.reply(`${EMOJIS.banido} Usuário banido.`);
    }
});

// INTERAÇÕES
client.on('interactionCreate', async (i) => {
    if (i.isStringSelectMenu() && i.customId === 'panel_select') {
        const val = i.values[0];
        if (val === 'toggle_antilink') { config.antiLink = !config.antiLink; i.update({ embeds: [buildPanelEmbed()] }); }
        else if (val === 'toggle_antispam') { config.antiSpam = !config.antiSpam; i.update({ embeds: [buildPanelEmbed()] }); }
        else if (val === 'set_staff_roles') {
            const m = new ModalBuilder().setCustomId('modal_staff').setTitle('IDs Staff').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('r').setLabel('IDs (sep. vírgula)').setStyle(TextInputStyle.Paragraph).setValue(config.staffRoles.join(', '))));
            i.showModal(m);
        } else if (val === 'set_immune_roles') {
            const m = new ModalBuilder().setCustomId('modal_immune').setTitle('IDs Imunes').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('r').setLabel('IDs (sep. vírgula)').setStyle(TextInputStyle.Paragraph).setValue(config.immuneRoles.join(', '))));
            i.showModal(m);
        } else if (val === 'edit_embed_ban') {
            const m = new ModalBuilder().setCustomId('modal_ban_text').setTitle('Texto/Cor/Link').addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t').setLabel('Título').setStyle(TextInputStyle.Short).setValue(config.embedBan.title)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('d').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(config.embedBan.description)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c').setLabel('Cor (Hex)').setStyle(TextInputStyle.Short).setValue(config.embedBan.color)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('l').setLabel('Link').setStyle(TextInputStyle.Short).setValue(config.embedBan.serverLink))
            );
            i.showModal(m);
        }
    }

    if (i.isModalSubmit()) {
        if (i.customId === 'modal_staff') { config.staffRoles = i.fields.getTextInputValue('r').split(',').map(s => s.trim()); i.reply({ content: 'Salvo!', ephemeral: true }); }
        else if (i.customId === 'modal_immune') { config.immuneRoles = i.fields.getTextInputValue('r').split(',').map(s => s.trim()); i.reply({ content: 'Salvo!', ephemeral: true }); }
        else if (i.customId === 'modal_ban_text') {
            config.embedBan.title = i.fields.getTextInputValue('t');
            config.embedBan.description = i.fields.getTextInputValue('d');
            config.embedBan.color = i.fields.getTextInputValue('c');
            config.embedBan.serverLink = i.fields.getTextInputValue('l');
            i.reply({ content: 'Salvo!', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
