const { PermissionsBitField } = require('discord.js');

// 🔴 SÓ ESSE ID PODE USAR
const DONO_ID = '1533306874513068093';

module.exports = {
  name: 'ban',
  description: '.ban all → Banir TODOS do servidor (seguro contra spam do Discord)',
  async execute(message, args) {
    // 🔒 BLOQUEIA TODO MUNDO MENOS VOCÊ
    if (message.author.id !== DONO_ID) {
      return message.reply('❌ Comando restrito! Apenas o dono pode usar.');
    }

    // VERIFICA SE ESCREVEU "all"
    if (args[0]?.toLowerCase() !== 'all') {
      return message.reply('⚠️ Uso correto: `.ban all`');
    }

    // AVISO INICIAL
    await message.reply('🚨 **INICIANDO BANIMENTO TOTAL...**\n🛡️ Modo seguro ativado (anti-spam)');

    // PEGA TODOS OS MEMBROS AUTOMATICAMENTE
    const membros = await message.guild.members.fetch();
    // TIRA VOCÊ E O BOT PRA NÃO SE BANIR
    const listaBanir = membros.filter(m => !m.user.bot && m.id !== DONO_ID);

    if (listaBanir.size === 0) {
      return message.channel.send('⚠️ Nenhum usuário para banir!');
    }

    let sucesso = 0, falha = 0;
    const total = listaBanir.size;

    await message.channel.send(`📋 ${total} usuários encontrados. Banindo...`);

    // BAN COM DELAY DE 150ms → DISCORD NÃO FLAGGA COMO SPAM
    for (const membro of listaBanir.values()) {
      try {
        await membro.ban({ reason: `Banimento total — Comando do dono` });
        sucesso++;
      } catch (e) {
        falha++;
      }
      // ⏱️ 150ms entre cada ban = SEGURANÇA MÁXIMA, não cai no rate limit
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // RESULTADO FINAL
    await message.channel.send(
      `✅ **BANIMENTO FINALIZADO!**\n` +
      `✅ Banidos: ${sucesso}\n` +
      `❌ Falhas: ${falha}\n` +
      `📊 Total processado: ${total}`
    );
  }
};
