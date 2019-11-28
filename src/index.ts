import EventEmitter from 'events';
import { RedisClient, ClientOpts } from 'redis';

type Listener = (...args: any[]) => void;

interface Options extends ClientOpts {
  /**
   * Data encoding method
   */
  encode?: (...args: any[]) => string;
  /**
   * Data decoding method
   */
  decode?: (data: string) => any;
}

/**
 * promisify
 * @param fn
 */
function pify(fn: (done: (res?: any) => void) => void) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(reject, 2000, Error('Emitter timeout'));
    fn((res) => {
      clearTimeout(id);
      resolve(res);
    });
  });
}

/**
 * redis quit
 * @param client the client
 */
function quit(client: RedisClient) {
  return new Promise((resolve, reject) => {
    client.quit((err, reply) => err ? reject(err) : resolve(reply));
  });
}

export class RedisEmitter {
  protected pub: RedisClient;
  protected sub: RedisClient;
  protected event: EventEmitter;
  protected encode: (...args: any[]) => string;
  protected decode: (data: string) => any;
  protected prefix = '';

  constructor(options: Options = {}) {
    this.prefix = options.prefix || 'rex:';
    this.encode = options.encode || JSON.stringify;
    this.decode = options.decode || JSON.parse;

    delete options.encode;
    delete options.decode;

    this.pub = new RedisClient(options);
    this.sub = this.pub.duplicate();
    this.event = new EventEmitter();

    const { pub, sub, event, prefix } = this;

    const onerror = (type: string) => (error: any) => {
      error.type = type;
      event.emit('error', error);
    };

    pub.on('error', onerror('publish'));
    sub.on('error', onerror('subscribe'));

    const rePrefix = (s: string) => s.substring(prefix.length);

    sub.on('message', (channel, message) => {
      channel = rePrefix(channel);
      // debug('Received message - event: %s, message: %s', channel, message);

      try {
        event.emit(channel, ...this.decode(message));
      } catch (err) {
        // debug('Error while parsing message');
        err.type = 'message';
        event.emit('error', err);
      }
    });
  }

  /**
   * Add a listener function to the specified event.
   * @param event Name of the event to attach the listener to.
   * @param listener Method to be called when the event is emitted.
   */
  on(event: string, listener: Listener) {
    // debug('Adding listener for %s', event);
    return pify((resolve) => {
      this.sub.subscribe(`${this.prefix}${event}`, () => {
        this.event.addListener(event, listener);
        resolve();
      });
    });
  }

  /**
   * Remove a listener function from the specified event.
   * @param event Name of the event to remove the listener from.
   */
  off(event: string) {
    return pify((done) => {
      this.sub.unsubscribe(`${this.prefix}${event}`, () => {
        this.event.removeAllListeners(event);
        done();
      });
    });
  }

  /**
   * Emit an event of your choice.
   * @param event Name of the event to emit and execute listeners for.
   * @param args Optional additional arguments to be passed to each listener.
   */
  emit(event: string, ...args: any[]) {
    return pify((done) => {
      this.pub.publish(`${this.prefix}${event}`, this.encode(args), done);
    });
  }

  /**
   * quit redis
   */
  quit() {
    return Promise.all([quit(this.pub), quit(this.sub)]).then(([pub, sub]) => {
      return pub === sub && pub === 'OK';
    });
  }
}

export default RedisEmitter;
