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
        this._services = serviceManager;
        this._socket = new ZMQ();
        this._socket.handle('bind', () => this.__broadcast());
        this._socket.handle('error', e => this.logger.error(e));
        this._socket.handle(this.__onMessage.bind(this));
    }

    async start(cb) {
        if (this._started) {
            const error = new NanopolyError(`already started on #${ this.options.port }`);
            this.logger.error(error);
            if (is.not.function(cb)) cb = () => {};
            return cb(error);
        } else if (this._services.isEmpty()) {
            const error = new NanopolyError('no service added');
            this.logger.error(error);
            if (is.not.function(cb)) cb = () => {};
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
            if (is.function(cb)) cb(error);
        }
    }

    __parseMessage(message) {
        try {
            const payload = JSON.parse(message);
            if (is.not.object(payload) || is.not.existy(payload.p) || is.not.existy(payload.d))
                return {};
            return payload;
        } catch (error) {
            return {};
        }
    }

    __onMessage(payload) {
        let { p: path, d: data } = this.__parseMessage(payload);
        path = is.string(path) ? path.split(this.options.delimiter || '.') : [];
        const service = path.shift(), method = path.shift();
        if (!this._services.hasService(service)) {
            if (service === this.cmd.CLEAN_SHUTDOWN)
                this.shutdown();
            else this._socket.send('INVALID_SERVICE');
        } else {
            const handler = this._services.getService(service, method);
            if (is.function(handler)) {
                try {
                    const p = handler(data, r =>
                        this._socket.send(r instanceof Error ? r.message : r));
                    if (p instanceof Promise)
                        p.catch(e => this._socket.send(e.message));
                } catch (e) {
                    this._socket.send(e.message);
                }
            } else this._socket.send('INVALID_METHOD');
        }
    }

    __payload() {
        try {
            return JSON.stringify({
                i: localIP(this.options.iface),
                p: this.options.port,
                s: Object.keys(this._services)
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
        this.broadcast = setInterval(() => this.__interval.bind(this), this.options.interval);
    }

    shutdown() {
        if (this.broadcast) clearInterval(this.broadcast);
        this._socket.disconnect();
        if (is.array(this.options.group))
            for (let group of this.options.group)
                this.options.redis.publish(`down-${ group }`, this.__payload());
        setTimeout(() => this.options.redis.disconnect(), this.options.interval);
    }
}

module.exports = Server;
