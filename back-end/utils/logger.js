const levels = { info: '📘', warn: '⚠️ ', error: '❌', debug: '🔍' };

function format(level, message, meta) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] ${levels[level]} `;
  return meta ? `${prefix}${message} ${JSON.stringify(meta)}` : `${prefix}${message}`;
}

const logger = {
  info:  (msg, meta) => console.log(format('info',  msg, meta)),
  warn:  (msg, meta) => console.warn(format('warn',  msg, meta)),
  error: (msg, meta) => console.error(format('error', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') console.log(format('debug', msg, meta));
  },
};

export default logger;
