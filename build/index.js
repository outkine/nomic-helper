'use strict';

require('babel-polyfill');

var _discord = require('discord.js');

var _discord2 = _interopRequireDefault(_discord);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var CONFIG_PATH = void 0;
if (process.env.NODE_ENV === 'production') {
  CONFIG_PATH = './config.json';
} else {
  CONFIG_PATH = '../config.json';
}
var config = JSON.parse(_fs2.default.readFileSync(_path2.default.resolve(__dirname, CONFIG_PATH), 'utf8'));

var client = new _discord2.default.Client();

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
    var _roles;

    var args, command, member, channel, roles, m;
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
            roles = (_roles = {}, _defineProperty(_roles, YES, role(member, YES)), _defineProperty(_roles, NO, role(member, NO)), _roles);

            if (!(command === 'ping')) {
              _context.next = 15;
              break;
            }

            _context.next = 11;
            return channel.send('Ping?');

          case 11:
            m = _context.sent;

            m.edit('Pong! Latency is ' + (m.createdTimestamp - message.createdTimestamp) + 'ms. API Latency is ' + Math.round(client.ping) + 'ms');
            _context.next = 25;
            break;

          case 15:
            if (!(command === 'vote')) {
              _context.next = 24;
              break;
            }

            if (!(args[0] !== YES && args[0] !== NO)) {
              _context.next = 19;
              break;
            }

            channel.send('You must vote "' + YES + '" or "' + NO + '"');
            return _context.abrupt('return');

          case 19:

            member.addRole(roles[args[0]]);
            channel.send('You have voted ' + args[0]);

            if (args[0] === YES && memberRole(member, NO)) {
              member.removeRole(roles[NO]);
            } else if (args[0] === NO && memberRole(member, YES)) {
              member.removeRole(roles[YES]);
            }
            _context.next = 25;
            break;

          case 24:
            if (command === 'unvote') {
              member.removeRole(roles[NO]);
              member.removeRole(roles[YES]);
              channel.send('You have withdrawn your vote');
            } else {
              channel.send('I did not understand that');
            }

          case 25:
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