import cron from 'node-cron';

async function callDaily() {
  await fetch(`${process.env.APP_URL}/api/cron/daily`, { method: 'POST', headers: { 'x-cron-key': process.env.CRON_SECRET! } });
}

cron.schedule('5 0 * * *', callDaily); // 00:05 local time
console.log('Local cron scheduled at 00:05 daily. Press Ctrl+C to stop.');


