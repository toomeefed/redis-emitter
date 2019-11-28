/// <reference types="node" />
import EventEmitter from 'events';
import { RedisClient, ClientOpts } from 'redis';
declare type Listener = (...args: any[]) => void;
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
export declare class RedisEmitter {
    protected pub: RedisClient;
    protected sub: RedisClient;
    protected event: EventEmitter;
    protected encode: (...args: any[]) => string;
    protected decode: (data: string) => any;
    protected prefix: string;
    constructor(options?: Options);
    /**
     * Add a listener function to the specified event.
     * @param event Name of the event to attach the listener to.
     * @param listener Method to be called when the event is emitted.
     */
    on(event: string, listener: Listener): Promise<unknown>;
    /**
     * Remove a listener function from the specified event.
     * @param event Name of the event to remove the listener from.
     */
    off(event: string): Promise<unknown>;
    /**
     * Emit an event of your choice.
     * @param event Name of the event to emit and execute listeners for.
     * @param args Optional additional arguments to be passed to each listener.
     */
    emit(event: string, ...args: any[]): Promise<unknown>;
    /**
     * quit redis
     */
    quit(): Promise<boolean>;
}
export default RedisEmitter;
