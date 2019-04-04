'use strict';

const Client = require('../src/client');
const is = require('is_js');
const Redis = require('ioredis');

const client = new Client({ redis: new Redis(), logs: 'fatal' });

const total = { time: 0, count: 0, error: 0 }, limit = 25000;
let started = 0;

function request(i) {
    const now = Date.now();
    client.send('s.echo', { i }, response => {
        if (is.error(response)) total.error++;
        total.count++;

        const duration = Date.now() - now;
        total.time += duration;
        if (!total.hasOwnProperty('min')) total.min = duration;
        if (!total.hasOwnProperty('max')) total.max = duration;
        if (duration < total.min) total.min = duration;
        if (duration > total.max) total.max = duration;

        if (i === limit) {
            client.shutdown(true);
            console.log(`total time spent for ${ limit } requests is ${ ((Date.now() - started) / 1000).toFixed(2) } seconds`);
            console.log(`min processing time is ${ (total.min / 1000).toFixed(2) } seconds`);
            console.log(`max processing time is ${ (total.max / 1000).toFixed(2) } seconds`);
            console.log(`average processing time is ${ (total.time / total.count / 1000).toFixed(2) } seconds`);
            if (total.error) console.log(`${ total.error } request(s) has been failed`);
        }
    });
}

const interval = setInterval(() => {
    if (is.not.empty(client._services)) {
        clearInterval(interval);
        console.log('benchmark started');
        started = Date.now();
        for (let i=1 ; i<=limit ; i++) process.nextTick(() => request(i));
    }
}, 1000);

console.log('waiting for the server to start the benchmark');
