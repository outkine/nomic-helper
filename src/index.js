import 'babel-polyfill'
import discord from 'discord.js'
import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import schedule from 'node-schedule'

function loadJson (filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function fixPath (filePath) {
	return path.resolve(__dirname, filePath)
}

function writeJson (filePath, data) {
	fs.writeFile(path.resolve(__dirname, filePath), JSON.stringify(data), 'utf8', err => {
		console.error(err)
	})
}

let CONFIG_PATH, DB_PATH
if (process.env.NODE_ENV === 'production') {
	CONFIG_PATH = './config.json'
	DB_PATH = './db.sqlite'
} else {
	CONFIG_PATH = '../config.json'
	DB_PATH = '../db.sqlite'
}
CONFIG_PATH = fixPath(CONFIG_PATH)
DB_PATH = fixPath(DB_PATH)
const CONFIG = loadJson(CONFIG_PATH)

const BOT_NUMBER = 2
const PRODUCTION_PREFIX = '$'
const GUILD = 'Northside Nomic'

const INTRODUCTION_CHANNEL = 'introductions'
const PROPOSAL_CHANNEL = 'current-proposal'
const ANNOUNCEMENT_CHANNEL = 'announcements'
const ARCHIVE_CHANNEL = 'archived-proposals'
const MUTABLE_CHANNEL = 'mutable-ruleset'
const IMMUTABLE_CHANNEL = 'immutable-ruleset'

const DEVELOPER_ROLE = 'react developer'
const YES = 'yes'
const NO = 'no'
const ADMIN_ROLE = 'gm'
const CURRENT_TURN_ROLE = 'my-turn'

function findRole (guild, name) {
	return guild.roles.find('name', name)
}

function memberRole (member, name) {
	return member.roles.find('name', name)
}

function findChannel (guild, name) {
	return guild.channels.find('name', name)
}

function sendChannel (guild, name, message) {
	return findChannel(guild, name).send(message)
}

function cleanChannel (guild, name) {
	findChannel(guild, name).bulkDelete(100, true)
}

function totalMembers () {
	return proposalQueue.length
}

function membersNeeded () {
	return Math.round(totalMembers() / 2)
}

function currentGuild (client) {
	return client.guilds.find('name', GUILD)
}

function allMembers (client) {
	return currentGuild(client).members.filter(member => !member.user.bot)
}

function calculateProposalQueue (client) {
	return allMembers(client)
		.sort((a, b) => {
			return a.joinedTimestamp - b.joinedTimestamp
		})
		.map(member => member.id)
}

var initializeMemberTable = async (client) => {
	for (let member of allMembers(client).array()) {
		await Member.findOrCreate({
			where: {
				id: member.id
			},
			defaults: {
				daysInactive: 0,
			}
		})
	}
}

function currentTurnMember (guild) {
	return guild.members.filterArray(member => memberRole(member, CURRENT_TURN_ROLE))[0]
}

function sqlToDiscordMember (member) {
	return currentGuild(client).members.find('id', member.get('id'))
}

const client = new discord.Client()
let proposalQueue

const sequelize = new Sequelize('awesome-db', null, null, {
	dialect: 'sqlite',
	storage: DB_PATH,
})

const Member = sequelize.define('Member', {
	id: {
		type: Sequelize.TEXT,
		primaryKey: true,
		allowNull: false,
	},
	daysInactive: {
		type: Sequelize.INTEGER,
		allowNull: false,
	},

}, {
	timestamps: false,
})

const Misc = sequelize.define('Misc', {
	cycles: {
		type: Sequelize.INTEGER,
		allowNull: false,
	},
}, {
	timestamps: false,
	freezeTableName: true,
})

sequelize
	.authenticate()
	.then(async () => {
		if (!(await Misc.count())) {
			Misc.create({ cycles: 0 }).catch(err => console.error(err))
		}
	})
	.catch(err => {
		console.error('Unable to connect to the database:', err)
	})

var addMember = async (member) => {
	proposalQueue.push(member.id)
	Member.create({ daysInactive: 0, id: member.id })
}

var removeMember = async (member) => {
	proposalQueue = proposalQueue.filter(member2 => member2.id !== member.id)
	Member.destroy({
		where: {
			id: member.id
		}
	})
}

schedule.scheduleJob('0 0 * * *', async () => {
	await Member.increment('daysInactive', { where: {} })

	const members = await Member.findAll({
		where: {
			daysInactive: 2
		}
	})

	Promise.all(members.map(async member => {
		const channel = await sqlToDiscordMember(member).createDM()
		return channel.send('Hello! This is a friendly reminder to check-in at Northside Nomic within the next 24 hours or you will be kicked.')
	}))

	const members2 = await Member.findAll({
		where: {
			daysInactive: {
				[Sequelize.Op.gt]: 2
			}
		}
	})

	Promise.all(members2.map(async member => {
		const member2 = sqlToDiscordMember(member)
		await sendChannel(currentGuild(client), ANNOUNCEMENT_CHANNEL, `@${member2.displayName} has been kicked.`)
		return member2.kick('You have failed to complete a check-in 2 consecutive times.')
	}))
})

client.on('ready', async () => {
	proposalQueue = calculateProposalQueue(client)
	initializeMemberTable(client)
})

client.on('message', async message => {
	if (message.author.bot) return
	if (message.content.indexOf(CONFIG.prefix) !== 0) return

	if (process.env.NODE_ENV !== 'production' && !memberRole(message.member, DEVELOPER_ROLE)) {
		message.channel.send(`I am a tester bot. Use the ${PRODUCTION_PREFIX} instead.`)
		return
	}

	if (!currentTurnMember(message.guild)) {
		message.channel.send(`Warning! No ${CURRENT_TURN_ROLE} role is set. **This must be fixed immediately >:(**.`)
		return
	}

	const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/g)
	const command = args.shift().toLowerCase()
	const { member, channel, guild } = message
	const roles = {
		[YES]: findRole(guild, YES),
		[NO]: findRole(guild, NO),
		[CURRENT_TURN_ROLE]: findRole(guild, CURRENT_TURN_ROLE),
	}

	if (command === 'ping') {
		const m = await channel.send('Ping?')
		m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
	}

	else if (command === 'vote') {
		if (args[0] !== YES && args[0] !== NO) {
			channel.send(`You must vote '${YES}' or '${NO}'`)
			return
		}

		let yesVotes = args[0] === YES ? 1 : 0
		let noVotes = args[0] === NO ? 1 : 0
		const memberCountHalf = membersNeeded()

		for (let member2 of guild.members.array()) {
			if (member2.id !== member.id) {
				if (memberRole(member2, YES)) yesVotes += 1
				else if (memberRole(member2, NO)) noVotes += 1
			}
		}

		let end, difference
		if (yesVotes >= memberCountHalf) {
			sendChannel(guild, ANNOUNCEMENT_CHANNEL, 'The proposal has been passed!')
			end = 'passed'
			difference = yesVotes - noVotes
		} else if (noVotes > memberCountHalf) {
			sendChannel(guild, ANNOUNCEMENT_CHANNEL, 'The proposal has been rejected!')
			end = 'rejected'
			difference = noVotes - yesVotes
		}

		if (end) {
			for (let member2 of guild.members.array()) {
				member2.removeRole(roles[NO])
				member2.removeRole(roles[YES])
			}

			const previousTurnMember = currentTurnMember(guild)

			previousTurnMember.removeRole(roles[CURRENT_TURN_ROLE])
			const previousTurnI = proposalQueue.indexOf(previousTurnMember.id)

			let nextTurnI
			if (previousTurnI === proposalQueue.length - 1) {
				Misc.increment('cycles', { where: {} })
				nextTurnI = 0
			} else {
				nextTurnI = previousTurnI + 1
			}
			const activeTurnMember = guild.members.find('id', proposalQueue[nextTurnI])
			activeTurnMember.addRole(roles[CURRENT_TURN_ROLE])

			const messages = findChannel(guild, PROPOSAL_CHANNEL).messages.array().slice(1)
			const title = message.shift()
			const body = messages.join('\n')
			sendChannel(guild, MUTABLE_CHANNEL, `
**${title}.** ${body}
			`)
			sendChannel(guild, ARCHIVE_CHANNEL, `
**Action: ${title}**
Sponsor: @${previousTurnMember.displayName}
Status: ${end} by ${difference} votes
__**Proposal Text**__
${body}
			`)
			cleanChannel(guild, PROPOSAL_CHANNEL)
			sendChannel(guild, PROPOSAL_CHANNEL, `Submit official proposals here. It is currently @${activeTurnMember.displayName}'s turn.`)
		} else {
			member.addRole(roles[args[0]])
			// channel.send(`You have voted ${args[0]}`)

			if (args[0] === YES && memberRole(member, NO)) {
				member.removeRole(roles[NO])
			} else if (args[0] === NO && memberRole(member, YES)) {
				member.removeRole(roles[YES])
			}
		}
	}

	else if (command === 'unvote') {
		member.removeRole(roles[NO])
		member.removeRole(roles[YES])
		// channel.send('You have withdrawn your vote')
	}
	else if (command === 'vote-info') {
		let yesVotes = 0
		let noVotes = 0

		for (let member2 of guild.members.array()) {
			if (memberRole(member2, YES)) yesVotes += 1
			else if (memberRole(member2, NO)) noVotes += 1
		}
		channel.send(`Here:
total members: **${totalMembers()}**
members needed: **${membersNeeded(guild)}**
total for: **${yesVotes}**
total against: **${noVotes}**
		`)
	}

	else if (command === 'help') {
		channel.send(`Here are my commands:
**vote [yes/no]**   - vote for a proposal
**vote-info**   - see the current vote statistics
**unvote**   - cancel your vote

**turn-info**   - see the current turns

**ping**   - test my speed

**check-in**   - perform your daily check-in
		`)
	}

	else if (command === 'turn-info') {
		channel.send(`Here:
**Cycle: ${(await Misc.findOne()).get('cycles')}**
${proposalQueue
	.map(id => {
			let name = guild.members.find('id', id).displayName
			if (id === currentTurnMember(guild).id) {
				name = `**${name} <- current turn**`
			}
			return name
		})
	.join('\n')
}
		`)
	}

	else if (command === 'check-in') {
		await Member.update({
			daysInactive: 0
		}, {
			where: {
				id: member.id
			}
		})
		channel.send('Success!')
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'green') {
		for (let member2 of guild.members.array()) {
			member2.addRole(roles[YES])
		}
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'clear') {
		channel.bulkDelete(parseInt(args[0]) + 1)
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'set-role') {
		const turnMember = currentTurnMember(guild)
		turnMember.removeRole(roles[CURRENT_TURN_ROLE])
		guild.members.find('displayName', args[0]).addRole(roles[CURRENT_TURN_ROLE])
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'reset-check-in') {
		Member.update({ 'daysInactive': 0 }, { where : {} })
	}

	else {
		channel.send('I did not understand that')
	}
})


client.on('guildMemberAdd', async member => {
	sendChannel(member.guild, INTRODUCTION_CHANNEL, `
Welcome @${member.displayName}! Please introduce yourself in this channel. You have been placed in the proposal queue: your can view your place with \`${PRODUCTION_PREFIX}turn-info\`.
	`)
	addMember()
})

client.on('guildMemberRemove', async () => {
	removeMember()
})

client.login(CONFIG.token)
