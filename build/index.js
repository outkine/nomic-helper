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

var BOT_NUMBER = 2;
var YES = 'yes';
var NO = 'no';
var VOTING_CHANNEL = 'voting';

function role(message, name) {
	return message.guild.roles.find('name', name);
}

function memberRole(member, name) {
	return member.roles.find('name', name);
}

function totalMembers(guild) {
	return guild.memberCount - BOT_NUMBER;
}

function membersNeeded(guild) {
	return Math.round(totalMembers(guild) / 2);
}

client.on('message', function () {
	var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(message) {
		var _roles;

		var args, command, member, channel, guild, roles, m, yes_votes, no_votes, memberCountHalf, end, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, member2, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _member, _yes_votes, _no_votes, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _member2;

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
						member = message.member, channel = message.channel, guild = message.guild;
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
						_context.next = 110;
						break;

					case 15:
						if (!(command === 'vote')) {
							_context.next = 79;
							break;
						}

						if (!(args[0] !== YES && args[0] !== NO)) {
							_context.next = 19;
							break;
						}

						channel.send('You must vote "' + YES + '" or "' + NO + '"');
						return _context.abrupt('return');

					case 19:
						yes_votes = args[0] === YES ? 1 : 0;
						no_votes = args[0] === NO ? 1 : 0;
						memberCountHalf = Math.round(totalMembers(guild) / 2);
						end = false;
						_iteratorNormalCompletion = true;
						_didIteratorError = false;
						_iteratorError = undefined;
						_context.prev = 26;
						_iterator = guild.members.array()[Symbol.iterator]();

					case 28:
						if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
							_context.next = 39;
							break;
						}

						member2 = _step.value;

						if (!(member2.id !== member.id)) {
							_context.next = 36;
							break;
						}

						if (memberRole(member2, YES)) yes_votes += 1;else if (memberRole(member2, NO)) no_votes += 1;

						if (!(yes_votes >= memberCountHalf || no_votes > memberCountHalf)) {
							_context.next = 36;
							break;
						}

						if (yes_votes >= memberCountHalf) {
							guild.channels.find('name', VOTING_CHANNEL).send('The proposal has been passed!');
						} else if (no_votes > memberCountHalf) {
							guild.channels.find('name', VOTING_CHANNEL).send('The proposal has been rejected!');
						}
						end = true;
						return _context.abrupt('break', 39);

					case 36:
						_iteratorNormalCompletion = true;
						_context.next = 28;
						break;

					case 39:
						_context.next = 45;
						break;

					case 41:
						_context.prev = 41;
						_context.t0 = _context['catch'](26);
						_didIteratorError = true;
						_iteratorError = _context.t0;

					case 45:
						_context.prev = 45;
						_context.prev = 46;

						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}

					case 48:
						_context.prev = 48;

						if (!_didIteratorError) {
							_context.next = 51;
							break;
						}

						throw _iteratorError;

					case 51:
						return _context.finish(48);

					case 52:
						return _context.finish(45);

					case 53:
						if (!end) {
							_context.next = 75;
							break;
						}

						_iteratorNormalCompletion2 = true;
						_didIteratorError2 = false;
						_iteratorError2 = undefined;
						_context.prev = 57;

						for (_iterator2 = guild.members.array()[Symbol.iterator](); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							_member = _step2.value;

							_member.removeRole(roles[NO]);
							_member.removeRole(roles[YES]);
						}

						_context.next = 65;
						break;

					case 61:
						_context.prev = 61;
						_context.t1 = _context['catch'](57);
						_didIteratorError2 = true;
						_iteratorError2 = _context.t1;

					case 65:
						_context.prev = 65;
						_context.prev = 66;

						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}

					case 68:
						_context.prev = 68;

						if (!_didIteratorError2) {
							_context.next = 71;
							break;
						}

						throw _iteratorError2;

					case 71:
						return _context.finish(68);

					case 72:
						return _context.finish(65);

					case 73:
						_context.next = 77;
						break;

					case 75:
						member.addRole(roles[args[0]]);
						// channel.send(`You have voted ${args[0]}`)

						if (args[0] === YES && memberRole(member, NO)) {
							member.removeRole(roles[NO]);
						} else if (args[0] === NO && memberRole(member, YES)) {
							member.removeRole(roles[YES]);
						}

					case 77:
						_context.next = 110;
						break;

					case 79:
						if (!(command === 'unvote')) {
							_context.next = 84;
							break;
						}

						member.removeRole(roles[NO]);
						member.removeRole(roles[YES]);
						// channel.send('You have withdrawn your vote')
						_context.next = 110;
						break;

					case 84:
						if (!(command === 'vote-info')) {
							_context.next = 109;
							break;
						}

						_yes_votes = 0;
						_no_votes = 0;
						_iteratorNormalCompletion3 = true;
						_didIteratorError3 = false;
						_iteratorError3 = undefined;
						_context.prev = 90;


						for (_iterator3 = guild.members.array()[Symbol.iterator](); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
							_member2 = _step3.value;

							if (memberRole(_member2, YES)) _yes_votes += 1;else if (memberRole(_member2, NO)) _no_votes += 1;
						}
						_context.next = 98;
						break;

					case 94:
						_context.prev = 94;
						_context.t2 = _context['catch'](90);
						_didIteratorError3 = true;
						_iteratorError3 = _context.t2;

					case 98:
						_context.prev = 98;
						_context.prev = 99;

						if (!_iteratorNormalCompletion3 && _iterator3.return) {
							_iterator3.return();
						}

					case 101:
						_context.prev = 101;

						if (!_didIteratorError3) {
							_context.next = 104;
							break;
						}

						throw _iteratorError3;

					case 104:
						return _context.finish(101);

					case 105:
						return _context.finish(98);

					case 106:
						channel.send('Here:\n\t\t\ttotal members: ' + totalMembers(guild) + '\n\t\t\tmembers needed: ' + membersNeeded(guild) + '\n\t\t\ttotal for: ' + _yes_votes + '\n\t\t\ttotal against: ' + _no_votes);
						_context.next = 110;
						break;

					case 109:
						if (command === 'help') {
							channel.send('Here are my commands:\n\t\tvote [yes/no]   - vote for a proposal\n\t\tvote-info   - see the current vote statistics\n\t\tunvote   - cancel your vote\n\n\t\tping   - test my speed\n\t\t');
						} else {
							channel.send('I did not understand that');
						}

					case 110:
					case 'end':
						return _context.stop();
				}
			}
		}, _callee, undefined, [[26, 41, 45, 53], [46,, 48, 52], [57, 61, 65, 73], [66,, 68, 72], [90, 94, 98, 106], [99,, 101, 105]]);
	}));

	return function (_x) {
		return _ref.apply(this, arguments);
	};
}());

client.on('guildMemberAdd', function () {
	var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(member) {
		return regeneratorRuntime.wrap(function _callee2$(_context2) {
			while (1) {
				switch (_context2.prev = _context2.next) {
					case 0:
						member.guild.channels.find('name', INTRODUCTION_CHANNEL).send('\n\tWelcome ' + member.displayName + '! Please introduce yourself in this channel. You have been placed in the proposal queue: your turn is ' + 'some number of' + ' proposals away.\n\t');

					case 1:
					case 'end':
						return _context2.stop();
				}
			}
		}, _callee2, undefined);
	}));

	return function (_x2) {
		return _ref2.apply(this, arguments);
	};
}());

client.login(config.token);