'use strict';

const is = require('is_js');

const Base = require('./base');
const ZMQ = require('./zmq');
const { NanopolyError } = require('./errors');

/**
 * @description This class is resposible for managing client sockets for each server instance
 * @class Client
 * @extends {Base}
 */
class Client extends Base {
    /**
     *Creates an instance of Client.
     * @param {object} options
     * @memberof Client
     */
    constructor(options) {
        super(options || {});

        this._messages = {};
        this._services = {};
        this.options.redis.on('message', (channel, data) => {
            try {
                data = JSON.parse(data);
                if (channel.startsWith('up')) this.__serviceFound(data);
                else if (channel.startsWith('down')) this.__serviceLost(data);
            } catch (e) {
                this.logger.error(e);
            }
        });
        if (is.array(this.options.group))
            for (let group of this.options.group)
                this.options.redis.subscribe(`up-${ group }`, `down-${ group }`);
    }

    /**
     * @description handler for living sockets
     * @param {object} data payload
     * @memberof Client
     */
    __serviceFound(data) {
        if (is.object(data) && is.string(data._) && is.string(data.i) && is.number(data.p) && is.array(data.s)) {
            this.logger.info({ s: 'found', d: data });
            for (let service of data.s) {
                if (!this._services.hasOwnProperty(service)) this._services[service] = {};
                if (!this._messages.hasOwnProperty(service)) this._messages[service] = {};
                if (!this._services[service].hasOwnProperty(data._)) {
                    const socket = new ZMQ('req');
                    socket._since = Date.now();
                    socket.handle('error', e => this.logger.error(e));
                    socket.handle(this.__onMessage.bind(this));
                    socket.connect(data.p, data.i, 'connect');
                    this._services[service][data._] = socket;
                } else this._services[service][data._]._since = Date.now();
                if (!this._messages[service].hasOwnProperty(data._))
                    this._messages[service][data._] = [];
            }
        }
    }

    /**
     * @description handler for dying sockets
     * @param {object} data
     * @memberof Client
     */
    __serviceLost(data) {
        if (is.object(data) && is.string(data._) && is.string(data.i) && is.number(data.p) && is.array(data.s)) {
            this.logger.info({ s: 'lost', d: data });
            for (let service of data.s) {
                if (this._services.hasOwnProperty(service)) {
                    for (let id in this._services[service]) {
                        if (id !== data._) continue;

                        try {
                            const socket = this._services[service][id];
                            if (socket) socket.disconnect();
                        } catch (e) {
                            this.logger.error(e);
                        }
                        delete this._services[service][id];
                    }
                }
                if (this._messages.hasOwnProperty(service)) {
                    for (let id in this._messages[service]) {
                        if (id !== data._) continue;

                        delete this._messages[service][id];
                    }
                }
            }
        }
    }

    /**
     * @description returns id of a random socket for a service
     * @param {string} service
     * @returns {string}
     * @memberof Client
     */
    __getSocket(service) {
        if (!this._services.hasOwnProperty(service)) throw new NanopolyError('INVALID_SERVICE');

        const sockets = Object.keys(this._services[service]);
        if (!sockets.length) throw new NanopolyError('INVALID_SERVICE');

        return sockets[Math.floor(Math.random() * sockets.length)];
    }

    /**
     * @description handles incoming messages
     * @param {object} payload message
     * @memberof Client
     */
    __onMessage(payload) {
        let { _: id, s: service, d: data } = this.__parseMessage(payload);
        if (service && this._messages.hasOwnProperty(service)) {
            if (id && this._messages[service].hasOwnProperty(id)) {
                if (!data || is.string(data)) data = is.string(data) ?
                    new NanopolyError(data) : new NanopolyError('EMPTY_RESPONSE');

                try {
                    const cb = this._messages[service][id].shift();
                    const r = cb(data);
                    if (r instanceof Promise)
                        r.catch(e => this.logger.error(e));
                } catch (e) {
                    this.logger.error(e);
                }
            }
        }
    }

    /**
     * @description background task
     * @memberof Client
     */
    __interval() {
        // TODO: implement removing dead connections
    }

    /**
     * @description schedules background job
     * @memberof Client
     */
    __flush() {
        if (this.flush) clearInterval(this.flush);
        this.flush = setInterval(this.__interval.bind(this), this.options.interval);
    }

    /**
     * @description sends a new message
     * @param {string} path
     * @param {*} data
     * @param {function} cb
     * @memberof Client
     */
    send(path, data, cb) {
        if (is.not.function(cb)) cb = function() {};
        if (is.not.string(path) || is.empty(path)) return cb(new NanopolyError('INVALID_PATH'));

        const service = path.split(this.options.delimiter);
        if (service.length < 2) return cb(new NanopolyError('MISSING_METHOD'));
        else if (!service[1] || is.empty(service[1]) || service[1].charAt(0) === '_')
            return cb(new NanopolyError('INVALID_METHOD'), () => {});

        try {
            const id = this.__getSocket(service[0]);
            this._messages[service[0]][id].push(cb);
            this._services[service[0]][id].send({ _: id, p: path, d: data });
        } catch(e) {
            this.logger.error(e);
            cb(e);
        }
    }

    /**
     * @description provides graceful shutdown
     * @param {boolean} remote flag to close connected servers too
     * @memberof Client
     */
    shutdown(remote) {
        for (let service in this._services) {
            for (let id in this._services[service]) {
                try {
                    if (remote) this._services[service][id]
                        .send({ _: '!', p: this.cmd.CLEAN_SHUTDOWN, d: true });
                    this._services[service][id].disconnect();
                } catch (e) {
                    this.logger.error(e);
                }
            }
        }
        this.options.redis.unsubscribe(() => this.options.redis.disconnect());
    }
}

module.exports = Client;
