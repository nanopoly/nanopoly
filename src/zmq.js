'use strict';

const is = require('is_js');
const shortid = require('shortid');
const ZeroMQ = require('zeromq');

const { EventHandlerError, NanopolyError } = require('./errors');

/**
 * @description Wrapper class for ZeroMQ sockets
 *              This class is responsible of transportation
 * @class ZMQ
 */
class ZMQ {
    /**
     * @description Creates an instance of ZMQ.
     * @param {string} type     socket type
     * @memberof ZMQ
     */
    constructor(type) {
        this._id = shortid.generate();
        this._type = type;
        this._socket = ZeroMQ.socket(this._type);
    }

    /**
     * @description establishes a connection
     * @param {number} [port=8000]      server's port number
     * @param {string} [ip='0.0.0.0']   server's ip address
     * @throws NanopolyError
     * @memberof ZMQ
     */
    connect(port = 8000, ip = '0.0.0.0', method) {
        this._address = `${ ip }:${ port }`;
        if (is.not.function(this._socket[method]))
            throw new NanopolyError(`invalid method for working with ${ this._type } sockets`);

        this._socket[method](`tcp://${ ip }:${ port }`);
    }

    /**
     * @description sets message handler on zeromq socket
     * @param {string} [event]  event type
     * @param {function} fn     handler function
     * @memberof ZMQ
     */
    handle(event, fn) {
        if (is.function(event)) {
            fn = event;
            event = 'message';
        }
        if (is.not.function(fn)) throw new EventHandlerError(event, fn);

        this._socket.on(event, fn);
    }

    /**
     * @description alias method for sending new messages through zeromq socket
     * @param {string} msg      payload
     * @memberof ZMQ
     */
    send(msg) {
        try {
            this._socket.send(is.not.string(msg) ? JSON.stringify(msg) : msg);
        } catch (e) {
            return;
        }
    }

    /**
     * @description alias method for closing zeromq socket
     * @memberof ZMQ
     */
    disconnect() {
        this._socket.setsockopt(17, 1);
        this._socket.close();
    }
}

module.exports = ZMQ;
