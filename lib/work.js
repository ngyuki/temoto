'use strict';

var sys = require('util');
var spawn = require('child_process').spawn;

module.exports = function (commandArgs, cwd, socket, log) {

    if (cwd == null) {
        cwd = process.env.HOME;
    }

    if (log == null) {
        log = function log() {};
    }

    log('exec', sys.format('(%s)', cwd), commandArgs);
    var proc = spawn('bash', ['-c', 'cd "$1" && shift && "$@"', '--', cwd].concat(commandArgs), {});

    proc.on('error', function (err) {
        log('proc.error', err.message);
        socket.emit('stderr', err.message + "\n");
        socket.emit('exit', 255);
        socket.disconnect();
    });

    proc.on('exit', function (code, signal) {
        log('proc.exit', [code, signal]);
        socket.emit('exit', code);
        socket.disconnect();
    });

    proc.on('close', function (code, signal) {
        log('proc.close', [code, signal]);
        socket.emit('exit', code);
        socket.disconnect();
    });

    ['stdout', 'stderr'].forEach(function (name) {
        proc[name].on('data', function (data) {
            log(name, data.length);
            socket.emit(name, data);
        });

        proc[name].on('end', function () {
            log(name, 'end');
        });

        proc[name].on('close', function () {
            log(name, 'close');
        });
    });

    ['stdin', 'stdout', 'stderr'].forEach(function (name) {
        proc[name].on('error', function () {
            log(name, 'error', err.message);
            socket.disconnect();
        });
    });

    socket.on('signal', function (sig) {
        log('signal', sig);
        if (sig === 'SIGINT') {
            sig = 'SIGTERM';
        }
        proc.kill(sig);
    });

    socket.on('stdin', function (data) {
        log('stdin', data.length);
        proc.stdin.write(data);
    });

    socket.on('stdin.end', function () {
        log('stdin', 'end');
        proc.stdin.end();
    });
};