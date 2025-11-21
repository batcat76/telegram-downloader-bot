import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import cron from 'cron';
import path from 'path';

// مسیرهای فایل‌ها
const USERS_DB = path.resolve(__dirname, 'yt-ig-bot', 'users.json');
const ADS_DB = path.resolve(__dirname, 'yt-ig-bot', 'ads.json');

// لود دیتابیس
const users = fs.readJSONSync(USERS_DB, { throws: false }) || {};
let ads = fs.readJSONSync(ADS_DB, { throws: false }) || {};

// ذخیره تغییرات
function saveUsers() {
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
}

// وقتی یکی /start زد
const bot = new Telegraf("YOUR_BOT_TOKEN");  // توکن رباتت رو اینجا بذار

bot.start(async (ctx) => {
  const id = ctx.from.id.toString();

  if (!users[id]) {
    users[id] = { id, first_name: ctx.from.first_name };
    saveUsers();
  }

  await ctx.reply(
    "سلام! 👋\nلینک اینستاگرام یا یوتیوب بده تا دانلودش کنم ✔️\n\n" +
    "📢 تبلیغات در ربات: " + ads.channel_broadcast
  );
});

// گرفتن پیام کاربر (= لینک)
bot.on("text", async (ctx) => {
  const url = ctx.message.text.trim();

  // چک کنیم لینک هست یا نه
  if (!url.startsWith("http")) {
    return ctx.reply("لطفاً یک لینک معتبر بده 🙂");
  }

  try {
    await ctx.reply("⏳ در حال پردازش لینک...");

    // API دانلود چندمنظوره → فقط تستی
    const apiUrl = `https://api.dlsnap.com/api/download?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.video && !data.audio) {
      return ctx.reply("❌ نتونستم فایل رو پیدا کنم.");
    }

    // ارسال ویدیو یا صدا
    if (data.video) {
      await ctx.replyWithVideo({ url: data.video });
    } else if (data.audio) {
      await ctx.replyWithAudio({ url: data.audio });
    }

    // تبلیغ زیر هر دانلود 🔥
    await ctx.reply("📢 اسپانسر: " + ads.sponsor_message);

  } catch (err) {
    console.log(err);
    return ctx.reply("⚠️ خطایی رخ داد. دوباره امتحان کن.");
  }
});

// ارسال پیام تبلیغاتی هر ۱۰ ساعت به همه
const job = new cron.CronJob('0 */10 * * *', async () => {
  console.log("Broadcast Started...");

  for (const uid in users) {
    try {
      await bot.telegram.sendMessage(uid, "📢 " + ads.channel_broadcast);
    } catch (e) {}
  }
});

job.start();

// اجرا
bot.launch();
console.log("Bot is running...");
