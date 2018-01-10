'use strict';

require('babel-polyfill');

var _discord = require('discord.js');

var _discord2 = _interopRequireDefault(_discord);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var config = {
  token: 'NDAwNjg2NzEzMjc1NTQ3NjU4.DTfQjA.scVNnpXI9igWQSJSiOJC8E1pI8g',
  prefix: '$'
};


var client = new _discord2.default.Client();

var votes = {};

var YES = 'yes';
var NO = 'no';

function role(message, name) {
  return message.guild.roles.find('name', name);
}

function memberRole(member, name) {
  return member.roles.find('name', name);
}

client.on('message', function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(message) {
    var args, command, member, channel, m, _roles, roles;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!message.author.bot) {
              _context.next = 2;
              break;
            }

            return _context.abrupt('return');

          case 2:
            if (!(message.content.indexOf(config.prefix) !== 0)) {
              _context.next = 4;
              break;
            }

            return _context.abrupt('return');

          case 4:
            args = message.content.slice(config.prefix.length).trim().split(/ +/g);
            command = args.shift().toLowerCase();
            member = message.member, channel = message.channel;

            if (!(command === 'ping')) {
              _context.next = 12;
              break;
            }

            _context.next = 10;
            return channel.send('Ping?');

          case 10:
            m = _context.sent;

            m.edit('Pong! Latency is ' + (m.createdTimestamp - message.createdTimestamp) + 'ms. API Latency is ' + Math.round(client.ping) + 'ms');

          case 12:
            if (!(command === 'vote')) {
              _context.next = 20;
              break;
            }

            if (!(args[0] !== YES && args[0] !== NO)) {
              _context.next = 16;
              break;
            }

            channel.send('You must vote "' + YES + '" or "' + NO + '"');
            return _context.abrupt('return');

          case 16:
            roles = (_roles = {}, _defineProperty(_roles, YES, role(member, YES)), _defineProperty(_roles, NO, role(member, NO)), _roles);


            member.addRole(roles[args[0]]);
            channel.send('You have voted ' + args[0] + '!');

            if (memberRole(member, YES) && memberRole(member, NO)) {
              console.log(args[0]);
              if (args[0] === YES) member.removeRole(roles[NO]);else member.removeRole(roles[YES]);
            }

          case 20:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}());

client.login(config.token);