// route/auth/login.js
export function setupLogin(bot, supabase) {
  const waitingForFullName = new Map();

  bot.start(async (ctx) => {
    const telegramId = ctx.from.id;

    const { data: user } = await supabase
      .from("students")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (user) {
      await ctx.reply(`👋 Привет, ${user.name}! Вы уже авторизованы.`);
      return;
    }

    await ctx.reply("👋 Добро пожаловать!\nПожалуйста, введите ваше ФИО, чтобы подтвердить личность.");
    waitingForFullName.set(telegramId, true);
  });

  bot.on("text", async (ctx) => {
    const telegramId = ctx.from.id;

    if (waitingForFullName.has(telegramId)) {
      const fullName = ctx.message.text.trim();

      const { data: student, error } = await supabase
        .from("students")
        .select("id, name")
        .ilike("name", fullName)
        .single();

      if (error || !student) {
        await ctx.reply("⚠️ Ваше имя не найдено в базе. Попробуйте снова или обратитесь в техподдержку.");
        return;
      }

      await supabase
        .from("students")
        .update({ telegram_id: telegramId })
        .eq("id", student.id);

      waitingForFullName.delete(telegramId);

      await ctx.reply(`✅ Авторизация успешна!\nВаш Telegram-аккаунт теперь привязан к профилю ${student.name}.`);
    }
  });
}
