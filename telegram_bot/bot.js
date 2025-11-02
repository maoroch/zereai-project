import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";
import https from "https";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { createClient } from "@supabase/supabase-js";
import schedule from "node-schedule";
import { google } from "googleapis";
import fetch from "node-fetch";
import { setupLogin } from "./route/auth/login.js";


const agent = new https.Agent({ family: 4 });

// БОТ
const bot = new Telegraf(process.env.BOT_TOKEN, { telegram: { agent } });

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const publicSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const pendingPayments = {};

// ================= Google Calendar ==================


setupLogin(bot, supabase);


const auth = new google.auth.GoogleAuth({
  keyFile: "config/zereai-0216377c62bb.json",
  scopes: ["https://www.googleapis.com/auth/calendar"],
});
const calendar = google.calendar({ version: "v3", auth });

async function getUpcomingEvents() {
  const res = await calendar.events.list({
    calendarId: "lyas200625@gmail.com",
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items || [];
}

// ================= PDF ==================

async function compressPdf(pdfPath) {
  const isWindows = os.platform() === "win32";
  const gsCmd = isWindows ? "gswin64c" : "gs";
  const stats = fs.statSync(pdfPath);
  if (stats.size < 1 * 1024 * 1024) return pdfPath;
  const compressedPath = pdfPath.replace(/\.pdf$/, "_compressed.pdf");
  const cmd = `${gsCmd} -sDEVICE=pdfwrite -dCompatibilityLevel=1.6 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${compressedPath}" "${pdfPath}"`;
  return new Promise((resolve, reject) => exec(cmd, (err) => err ? reject(err) : resolve(compressedPath)));
}

async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent, family: 4 }, (res) => {
      if (res.statusCode !== 200) return reject(new Error("Download failed"));
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on("finish", () => fileStream.close(resolve));
    }).on("error", reject);
  });
}

// ================= Signed URL Upload ==================

async function getUploadSignedUrl(studentId, fileName) {
  const filePath = `payments/${studentId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUploadUrl(filePath, { expiresIn: 60, upsert: true });

  if (error) throw error;
  return { url: data.signedUrl, filePath };
}


// ================= Start ==================

bot.start(async (ctx) => {
  const { data: student } = await supabase.from("students")
    .select("id, name, telegram_id")
    .eq("telegram_id", ctx.from.id)
    .single();

  // Если пользователь не авторизован — не продолжаем
  if (!student) return ctx.reply("⚠️ Вы ещё не авторизованы. Введите ваше ФИО, чтобы подтвердить личность.");

  // Дальше только для авторизованных
  await ctx.reply(
`Здравствуйте ${student.name}\n\n` +
      `Уведомляю вас о том, что в университете METU вам нужно оплатить за семестр.\n\n` +
      `Просим вас, чтобы удостовериться, что вы прочитали данное сообщение, нажать на кнопку "Прочитал сообщение".\n\n` +
      `Если вы оплатили за семестр, то нажмите на кнопку "Оплата за учёбу", а далее отправьте PDF.\n\n` +
      `Если вы оплатили, но всё ещё получаете сообщение — свяжитесь с техподдержкой.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Прочитал сообщение", callback_data: `read_${student.id}` }],
          [{ text: "💳 Оплата за учёбу", callback_data: `pay_${student.id}` }]
        ]
      }
    }
  );
});

// ================= Buttons ==================

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const studentId = data.split("_")[1];

  if (data.startsWith("read_")) {
    await supabase.from("students").update({ read: true }).eq("id", studentId);
    try { await ctx.answerCbQuery("Отмечено ✅"); } catch {}
    return;
  }

  if (data.startsWith("pay_")) {
    const { url, filePath } = await getUploadSignedUrl(studentId, "payment.pdf");
    pendingPayments[ctx.from.id] = { url, filePath };

    try { await ctx.answerCbQuery(); } catch {}
    return ctx.reply("Отправьте PDF подтверждение платежа 📎");
  }
});

// ================= PDF UPLOAD ==================

bot.on("document", async (ctx) => {
  try {
    const doc = ctx.message.document;
    if (!doc.mime_type.includes("pdf")) return ctx.reply("⚠️ Отправьте PDF.");

    const { data: student } = await supabase.from("students")
      .select("id")
      .eq("telegram_id", ctx.from.id)
      .single();

    if (!student) return ctx.reply("⚠️ Вас нет в базе.");

    const session = pendingPayments[ctx.from.id];
    if (!session) return ctx.reply("⚠️ Сначала нажмите 'Оплата за учёбу'.");

    const file = await ctx.telegram.getFile(doc.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const originalPath = path.join("uploads", doc.file_name);
    await downloadFile(url, originalPath);

    ctx.reply("⏳ Обрабатываю файл...");
    const processed = await compressPdf(originalPath);
    const buffer = fs.readFileSync(processed);

    await fetch(session.url, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: buffer
    });

    fs.unlinkSync(processed);
    delete pendingPayments[ctx.from.id];

    await supabase.from("students").update({ paid: true }).eq("id", student.id);
    ctx.reply("✅ Оплата подтверждена!");

  } catch {
    ctx.reply("⚠️ Ошибка при обработке файла.");
  }
});

// ================= Delay Helper ==================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ================= Notifiers ==================

// ================= Notifiers ==================

const notifiedEvents = new Set(); // 🧠 Запоминаем уже уведомлённые события

async function notifyUnpaidStudents() {
  const { data: students } = await supabase.from("students")
    .select("name, telegram_id")
    .eq("paid", false);

  for (const s of students) {
    if (!s.telegram_id) continue;
    await bot.telegram.sendMessage(s.telegram_id, `Напоминание: требуется оплата.`);
    await sleep(2000);
  }
}

async function notifyCalendarEvents() {
  const events = await getUpcomingEvents();
  if (!events.length) return;

  // Отбираем события, которые начнутся в ближайший час
  const now = new Date();
  const hourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const upcomingSoon = events.filter(event => {
    const start = new Date(event.start?.dateTime || event.start?.date);
    return start >= now && start <= hourLater;
  });

  if (!upcomingSoon.length) return;

  const { data: students } = await supabase.from("students")
    .select("id, name, telegram_id")
    .eq("paid", false);

  for (const event of upcomingSoon) {
    const eventId = event.id; // уникальный ID события Google Calendar
    if (notifiedEvents.has(eventId)) continue; // 🛑 Уже уведомляли — пропускаем

    // иначе уведомляем и помечаем как отправленное
    notifiedEvents.add(eventId);

    for (const student of students) {
      if (!student.telegram_id) continue;

      await bot.telegram.sendMessage(
        student.telegram_id,
        `Здравствуйте ${student.name}\n\n` +
        `Уведомляю вас о том, что в университете METU вам нужно оплатить за семестр.\n\n` +
        `Просим вас, чтобы удостовериться, что вы прочитали данное сообщение, нажать на кнопку "Прочитал сообщение".\n\n` +
        `Если вы оплатили за семестр, то нажмите на кнопку "Оплата за учёбу", а далее отправьте PDF.\n\n` +
        `Если вы оплатили, но всё ещё получаете сообщение — свяжитесь с техподдержкой.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Прочитал сообщение", callback_data: `read_${student.id}` }],
              [{ text: "💳 Оплата за учёбу", callback_data: `pay_${student.id}` }]
            ]
          }
        }
      );

      await sleep(2000);
    }
  }
}

// ⏱ уведомление каждые 2 минуты
setInterval(notifyCalendarEvents, 2 * 60 * 1000);

schedule.scheduleJob("0 */6 * * *", notifyUnpaidStudents); // каждые 6 часов

bot.launch();
(async () => {
  try {
    const events = await getUpcomingEvents();
    console.log("📅 Ближайшие события:");
    if (!events.length) console.log("Нет предстоящих событий.");
    else events.forEach(e =>
      console.log(`- ${e.summary} (${e.start?.dateTime || e.start?.date})`)
    );
  } catch (err) {
    console.error("❌ Ошибка при получении событий:", err);
  }
})();

console.log("✅ Бот запущен");

export { notifyUnpaidStudents };
