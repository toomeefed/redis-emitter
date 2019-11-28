"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const redis_1 = require("redis");
/**
 * promisify
 * @param fn
 */
function pify(fn) {
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
function quit(client) {
    return new Promise((resolve, reject) => {
        client.quit((err, reply) => err ? reject(err) : resolve(reply));
    });
}
class RedisEmitter {
    constructor(options = {}) {
        this.prefix = '';
        this.prefix = options.prefix || 'rex:';
        this.encode = options.encode || JSON.stringify;
        this.decode = options.decode || JSON.parse;
        delete options.encode;
        delete options.decode;
        this.pub = new redis_1.RedisClient(options);
        this.sub = this.pub.duplicate();
        this.event = new events_1.default();
        const { pub, sub, event, prefix } = this;
        const onerror = (type) => (error) => {
            error.type = type;
            event.emit('error', error);
        };
        pub.on('error', onerror('publish'));
        sub.on('error', onerror('subscribe'));
        const rePrefix = (s) => s.substring(prefix.length);
        sub.on('message', (channel, message) => {
            channel = rePrefix(channel);
            // debug('Received message - event: %s, message: %s', channel, message);
            try {
                event.emit(channel, ...this.decode(message));
            }
            catch (err) {
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
    on(event, listener) {
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
    off(event) {
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
    emit(event, ...args) {
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
exports.RedisEmitter = RedisEmitter;
exports.default = RedisEmitter;
