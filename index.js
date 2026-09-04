const { PermissionsBitField } = require('discord.js');

// 🔴 APENAS ESSE ID PODE USAR — NINGUÉM MAIS
const DONO_ID = '1533306874513068093';

module.exports = {
  name: 'f.ban',
  description: 'Banir até 100 usuários | APENAS DONO PODE USAR',
  async execute(message, args) {
    // 🔒 VERIFICAÇÃO OBRIGATÓRIA — SÓ O ID PODE USAR
    if (message.author.id !== DONO_ID) {
      return message.reply('❌ Esse comando é restrito! Apenas o dono pode usar.');
    }

    // Pega até 100 menções
    const listaBanir = message.mentions.users.first(100);

    if (listaBanir.length === 0) {
      return message.reply('⚠️ Mencione os usuários! Ex: f.ban @user1 @user2 ...');
    }

    const resultados = [];
    let sucesso = 0, falha = 0;

    // ⚠️ Ban com delay pra não dar rate limit
    for (const user of listaBanir) {
      try {
        await message.guild.members.ban(user.id, { reason: `Banimento em massa — Comando do dono` });
        resultados.push(`✅ ${user.tag}`);
        sucesso++;
      } catch (e) {
        resultados.push(`❌ ${user.tag}: erro ao banir`);
        falha++;
      }
      // Delay 200ms entre cada ban
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Resultado final
    await message.channel.send(
      `**📊 Banimento em massa — ${sucesso} banidos, ${falha} falhas**\n` +
      `Total: ${listaBanir.length} usuários processados\n\n` +
      resultados.join('\n').slice(0, 1900)
    );
  }
};
