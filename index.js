client.on('ready', async () => {
  try {
    console.log(`${EMOJIS.ZYPHOR} Removendo comandos antigos e atualizando...`);
    
    // Limpa todos os comandos registrados anteriormente no bot
    await client.application.commands.set([]);
    
    // Registra apenas a nova lista de comandos atualizada
    await client.application.commands.set(COMANDOS);
    
    console.log(`${EMOJIS.ZYPHOR} Comandos de barra atualizados com sucesso!`);
  } catch (error) {
    console.error('Erro ao atualizar comandos de barra:', error);
  }
});
