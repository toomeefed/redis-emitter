const { RedisEmitter } = require('.');

const re = new RedisEmitter();

(async () => {
  await re.on('hehe', (res) => {
    console.log(res);
  });

  await re.emit('hehe', 'haha');

  await re.off('hehe');

  await re.emit('hehe', 'hoho');

  await re.quit();
})().catch(console.log);
