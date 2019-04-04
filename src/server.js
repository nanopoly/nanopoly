'use strict';

const is = require('is_js');
const localIP = require('local-ip');
const portFinder = require('portfinder');

const Base = require('./base');
const ServiceManager = require('./service-manager');
const ZMQ = require('./zmq');
const { NanopolyError } = require('./errors');

class Server extends Base {
    constructor(serviceManager, options) {
        super(options || {});

        if (!(serviceManager instanceof ServiceManager))
            throw new NanopolyError('services must be an instance of service manager');

        this._started = false;
        this.serviceManager = serviceManager;
        this._socket = new ZMQ();
        this._socket.handle('bind', () => this.__broadcast());
        this._socket.handle('error', e => this.logger.error(e));
        this._socket.handle(this.__onMessage.bind(this));
    }

    async start(cb) {
        if (is.not.function(cb)) cb = () => {};
        if (this._started) {
            const error = new NanopolyError(`already started on #${ this.options.port }`);
            this.logger.error(error);
            return cb(error);
        } else if (this.serviceManager.isEmpty()) {
            const error = new NanopolyError('no service added');
            this.logger.error(error);
            return cb(error);
        }

        this._started = true;
        const startFrom = is.number(this.options.port) ? Math.abs(this.options.port) : undefined;
        try {
            const port = await portFinder.getPortPromise({ port: startFrom });
            this.options.port = port;
            this._socket.connect(this.options.port);
        } catch (error) {
            this.logger.error(error);
            cb(error);
        }
    }

    __onMessage(payload) {
        let { _: id, d: data, p: path } = this.__parseMessage(payload);
        if (is.string(id) && is.string(path)) {
            path = is.string(path) ? path.split(this.options.delimiter || '.') : [];
            const service = path.shift(), method = path.shift();
            if (!this.serviceManager.hasService(service)) {
                if (service === this.cmd.CLEAN_SHUTDOWN)
                    this.shutdown();
                else this._socket.send({ _: id, s: service, d: 'INVALID_SERVICE' });
            } else {
                const handler = this.serviceManager.getService(service, method);
                if (is.function(handler)) {
                    try {
                        const p = handler(data, r =>
                            this._socket.send({ _: id, s: service, d: r instanceof Error ? r.message : r }));
                        if (p instanceof Promise)
                            p.catch(e => this._socket.send({ _: id, s: service, d: e.message }));
                    } catch (e) {
                        this._socket.send({ _: id, s: service, d: e.message });
                    }
                } else this._socket.send({ _: id, s: service, d: 'INVALID_METHOD' });
            }
        } else  this._socket.send({ _: id, d: 'INVALID_MESSAGE' });
    }

    __payload() {
        try {
            return JSON.stringify({
                _: this._socket._id,
                i: localIP(this.options.iface),
                p: this.options.port,
                s: Object.keys(this.serviceManager._services)
            });
        } catch (e) {
            this.logger.error(e);
            return '{}';
        }
    }

    __interval() {
        if (this.options.redis.status === 'ready' || is.array(this.options.group))
            for (let group of this.options.group)
                this.options.redis.publish(`up-${ group }`, this.__payload());
    }

    __broadcast() {
        this.logger.info(`#${ this.options.port } is up and running`);
        if (this.broadcast) clearInterval(this.broadcast);
        this.__interval();
        this.broadcast = setInterval(this.__interval.bind(this), this.options.interval);
    }

    shutdown() {
        this._socket.disconnect();
        if (this.broadcast) clearInterval(this.broadcast);
        if (is.array(this.options.group))
            for (let group of this.options.group)
                this.options.redis.publish(`down-${ group }`, this.__payload());
        this.options.redis.disconnect();
    }
}

module.exports = Server;
