'use strict';

const is = require('is_js');
const shortid = require('shortid');

const Base = require('./base');
const ZMQ = require('./zmq');
const { NanopolyError } = require('./errors');

class Client extends Base {
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

    __serviceFound(data) {
        if (is.object(data) && is.string(data._) && is.string(data.i) && is.number(data.p) && is.array(data.s)) {
            this.logger.info({ s: 'found', d: data });
            for (let service of data.s) {
                if (!this._services.hasOwnProperty(service)) this._services[service] = {};
                if (!this._services[service].hasOwnProperty(data._)) {
                    const socket = new ZMQ('req');
                    socket._since = Date.now();
                    socket.handle('error', e => this.logger.error(e));
                    socket.handle(this.__onMessage.bind(this));
                    this._services[service][data._] = socket;
                } else this._services[service][data._]._since = Date.now();
            }
        }
    }

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
                            this.__flushMessages(socket._id);
                        } catch (e) {
                            this.logger.error(e);
                        }
                        delete this._services[service][id];
                    }
                }
            }
        }
    }

    __flushMessages(id) {
        for (let m of Object.keys(this._messages)) {
            if (is.object(this._messages[m]) && (this._messages[m]._ === id || !id)) {
                if (this._messages[m].t) clearTimeout(this._messages[m].t);
                delete this._messages[m];
            }
        }
    }

    __getSocket(service) {
        if (!this._services.hasOwnProperty(service)) throw new NanopolyError('INVALID_SERVICE');

        const sockets = Object.keys(this._services[service]);
        if (!sockets.length) throw new NanopolyError('EMPTY_SERVICE');

        return this._services[service][sockets[Math.floor(Math.random() * sockets.length)]];
    }

    __parseMessage(message) {
        try {
            const payload = JSON.parse(message);
            if (!payload || is.not.string(payload._) || is.not.existy(payload.d))
                return { _: '_' };
            return payload;
        } catch (error) {
            return {};
        }
    }

    __onMessage(payload) {
        let { _: id, d: response } = this.__parseMessage(payload);
        if (this._messages.hasOwnProperty(id)) {
            if (this._messages[id].t) clearTimeout(this._messages[id].t);
            if (is.existy(response) && is.not.string(response)) this._messages[id].c(response);
            else this._messages[id].c(is.string(response) ?
                new NanopolyError(response) : new NanopolyError('INVALID_RESPONSE'));
            delete this._messages[id];
        }
    }

    __generateMessage() {
        const id = shortid.generate();
        if (this._messages.hasOwnProperty(id)) return this.__generateMessage();

        this._messages[id] = { d: Date.now() };
        return id;
    }

    send(path, payload, cb) {
        if (is.not.string(path) || is.empty(path)) return cb(new NanopolyError('INVALID_PATH'));

        if (is.not.function(cb)) cb = function() {};
        const service = path.split(this.options.delimiter);
        if (service.length < 2) return cb(new NanopolyError('MISSING_METHOD'));
        else if (!service[1] || is.empty(service[1]) || service[1].charAt(0) === '_')
            return cb(new NanopolyError('INVALID_METHOD'));

        try {
            const socket = this.__getSocket(service[0]);
            const id = this.__generateMessage();
            this._messages[id]._ = socket._id;
            this._messages[id].c = cb;

            // ? is timeout enabled
            if (is.number(this.options.timeout) && this.options.timeout > 0)
                this._messages[id].t = setTimeout(() => {
                    if (!this._messages.hasOwnProperty(id)) return;

                    delete this._messages[id];
                    cb(new NanopolyError('REQUEST_TIMEOUT'));
                }, this.options.timeout);

            socket.send({ _: id, p: path, d: payload });
        } catch(e) {
            this.logger.error(e);
            cb(e);
        }
    }
}

module.exports = Client;
