import RedisEmitter from '../src';

let re: RedisEmitter;

beforeAll(() => {
  re = new RedisEmitter();
});

afterAll(() => {
  re.quit();
});

test('base', async (done) => {
  await re.on('hehe', (res) => {
    expect(res).toBe('haha');
    done();
  });

  await re.emit('hehe', 'haha');
  await re.off('hehe');
  await re.emit('hehe', 'haha');
});
