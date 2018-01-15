import discord from 'discord.js'
import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import schedule from 'node-schedule'
import createModels from './models.js'

function loadJson (filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function fixPath (filePath) {
	return path.resolve(__dirname, filePath)
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

const PRODUCTION_PREFIX = '$'
const GUILD = 'Northside Nomic'

const INTRODUCTION_CHANNEL = 'introductions'
const PROPOSAL_CHANNEL = 'current-proposal'
const PROPOSAL_DISCUSSION_CHANNEL = 'proposal-discussion'
const ANNOUNCEMENT_CHANNEL = 'announcements'
const ARCHIVE_CHANNEL = 'archived-proposals'
const MUTABLE_CHANNEL = 'mutable-ruleset'
const IMMUTABLE_CHANNEL = 'immutable-ruleset'
const FAQ_CHANNEL = 'faq'

const DEVELOPER_ROLE = 'react developer'
const YES = 'yes'
const NO = 'no'
const ADMIN_ROLE = 'gm'
const CURRENT_TURN_ROLE = 'my-turn'

function capitalize (string) {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

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

async function cleanChannel (guild, name) {
	await sendChannel(guild, PROPOSAL_CHANNEL, 'yes')
	await sendChannel(guild, PROPOSAL_CHANNEL, 'yes')
	return findChannel(guild, name).bulkDelete(100, true)
}

function totalMembers () {
	return proposalQueue.length
}

function membersNeeded (outcome) {
	return Math.floor(totalMembers() / 2) + (outcome ? 0 : 1)
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

async function initializeMemberTable (client) {
	for (let [id] of allMembers(client)) {
		await db.Member.findOrCreate({
			where: {
				id: id
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

function idToDiscordMember (id) {
	return currentGuild(client).members.find('id', id)
}


async function initiateNextTurn (guild, activeMemberId) {
	const previousTurnMember = currentTurnMember(guild)
	if (previousTurnMember) await previousTurnMember.removeRole(findRole(guild, CURRENT_TURN_ROLE))

	if (!activeMemberId) {
		const previousTurnI = proposalQueue.indexOf(previousTurnMember.id)
		let nextTurnI
		if (previousTurnI === proposalQueue.length - 1) {
			db.Misc.increment('cycles', { where: {} })
			nextTurnI = 0
		} else {
			nextTurnI = previousTurnI + 1
		}
		activeMemberId = proposalQueue[nextTurnI]
	}

	const activeTurnMember = guild.members.find('id', activeMemberId)
	activeTurnMember.addRole(findRole(guild, CURRENT_TURN_ROLE))

	await cleanChannel(guild, PROPOSAL_CHANNEL)
	sendChannel(guild, PROPOSAL_CHANNEL, `It is currently <@${activeTurnMember.id}>'s turn. Remember to use the \`proposal\` command when writing your proposal.`)

	await setNextProposalDeadline()
	await setDeadline(guild)

	return previousTurnMember
}

function setNextProposalDeadline () {
	return db.Misc.update({ nextProposalDeadline: Date.now() + 86400000 }, { where: {} })
}

async function setDeadline(guild) {
	proposalDeadlineJob = schedule.scheduleJob(parseInt((await db.Misc.findOne()).nextProposalDeadline), async () => {
		sendChannel(guild, ANNOUNCEMENT_CHANNEL, 'Time has run out - the proposal is rejected. :x:')
		initiateNextTurn(guild)
	})
}

function deletePoll (title) {
	db.Poll.destroy({ where: { title: title } })
	db.PollOption.destroy({ where: { poll: title } })
	db.PollVote.destroy({ where: { poll: title } })
}

function channelId (guild, name) {
	return guild.channels.find('name', name).id
}

const client = new discord.Client()
let proposalQueue, proposalDeadlineJob

const sequelize = new Sequelize('awesome-db', null, null, {
	dialect: 'sqlite',
	storage: DB_PATH,
})

const db = createModels(sequelize)

sequelize
	.sync({ force: false })
	.then(async () => {
		if (!(await db.Misc.count())) {
			db.Misc.create().catch(err => console.error(err))
		}
	})
	.catch(err => {
		console.error('Unable to connect to the database:', err)
	})

async function addMember (member) {
	proposalQueue.push(member.id)
	return db.Member.create({ daysInactive: 0, id: member.id })
}

async function removeMember (member) {
	proposalQueue = proposalQueue.filter(id => id !== member.id)
	return db.Member.destroy({
		where: {
			id: member.id
		}
	})
}

schedule.scheduleJob('0 0 * * *', async () => {
	// await db.Member.increment('daysInactive', { where: {} })

	const members = await db.Member.findAll({
		where: {
			daysInactive: 1
		}
	})

	for (let member of members) {
		const channel = await idToDiscordMember(member.id).createDM()
		await channel.send('Hello! This is a friendly reminder to check-in at Northside Nomic within the next 24 hours or you will be kicked.')
	}

	const members2 = await db.Member.findAll({
		where: {
			daysInactive: {
				[Sequelize.Op.gt]: 1
			}
		}
	})

	for (let member of members2) {
		const member2 = idToDiscordMember(member.id)
		// await sendChannel(currentGuild(client), ANNOUNCEMENT_CHANNEL, `<@${member2.id}> has been kicked.`)
		await member2.kick('You have failed to complete a check-in 2 consecutive times.')
	}
})

client.on('ready', async () => {
	proposalQueue = calculateProposalQueue(client)
	initializeMemberTable(client)
	setDeadline(currentGuild(client))
})

client.on('message', async message => {
	const { member, channel, guild } = message

	if (message.author.bot) return

	if (message.content.indexOf(CONFIG.prefix) !== 0 && message.channel.name !== PROPOSAL_CHANNEL) return

	if (process.env.NODE_ENV !== 'production' && !memberRole(message.member, DEVELOPER_ROLE)) {
		channel.send(`I am a tester bot. Use the ${PRODUCTION_PREFIX} instead.`)
		return
	}

	// https://stackoverflow.com/questions/18703669/split-string-but-not-words-inside-quotation-marks

	const args = [].concat.apply([], message.content.slice(CONFIG.prefix.length).split('"').map((v, i) => i % 2 ? v : v.split(' '))).filter(Boolean)
	console.log(args)

	if (!args.length) {
		channel.send('Please actually enter a command.')
		return
	}
	const command = args.shift().toLowerCase()

	if (!currentTurnMember(guild)) {
		message.channel.send(`Warning! No ${CURRENT_TURN_ROLE} role is set.`)
	}

	if (process.env.NODE_ENV === 'production') {
		if (message.content.indexOf(CONFIG.prefix) !== 0 && command !== 'proposal') {
			channel.send(
				`<@${member.id}> you can only post in #${channelId(guild, PROPOSAL_CHANNEL)} with the \`proposal\` command. Type \`${PRODUCTION_PREFIX}help\` for more information.`
			)
			message.delete()
			return
		}
	}

	const roles = {
		[YES]: findRole(guild, YES),
		[NO]: findRole(guild, NO),
		[CURRENT_TURN_ROLE]: findRole(guild, CURRENT_TURN_ROLE),
	}

	if (command === 'ping') {
		const m = await channel.send('Ping?')
		m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms.`)
	}

	else if (command === 'vote') {
		if (args[0] !== YES && args[0] !== NO) {
			channel.send(`You must vote '${YES}' or '${NO}'.`)
			return
		}

		let yesVotes = args[0] === YES ? 1 : 0
		let noVotes = args[0] === NO ? 1 : 0

		for (let [id, member2] of guild.members) {
			if (id !== member.id) {
				if (memberRole(member2, YES)) yesVotes += 1
				else if (memberRole(member2, NO)) noVotes += 1
			}
		}

		let end, difference
		if (yesVotes >= membersNeeded(true)) {
			sendChannel(guild, ANNOUNCEMENT_CHANNEL, 'The proposal has been passed! :white_check_mark:')
			end = 'passed'
			difference = yesVotes - noVotes
		} else if (noVotes >= membersNeeded(false)) {
			sendChannel(guild, ANNOUNCEMENT_CHANNEL, 'The proposal has been rejected! :x:')
			end = 'rejected'
			difference = noVotes - yesVotes
		}

		if (end) {
			for (let [id, member2] of guild.members) {
				member2.removeRole(roles[NO])
				member2.removeRole(roles[YES])
			}

			proposalDeadlineJob.cancel()

			const previousTurnMember = initiateNextTurn(guild)

			const misc = await db.Misc.findOne()
			if (end === 'passed') {
				sendChannel(guild, MUTABLE_CHANNEL,
`**${misc.proposalTitle} (rule ${misc.mutableProposalNumber}).** ${misc.proposalBody}`)
			}
			sendChannel(guild, ARCHIVE_CHANNEL, `
**Action: ${misc.proposalTitle}**
Sponsor: <@${previousTurnMember.id}>
Status: ${end} by ${difference} votes
__**Proposal Text**__
${misc.proposalBody}
			`)

			db.Misc.update({ proposalTitle: '', proposalBody: '', mutableProposalNumber: misc.mutableProposalNumber + 1 }, { where: {} })

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

		for (let [id, member2] of guild.members) {
			if (memberRole(member2, YES)) yesVotes += 1
			else if (memberRole(member2, NO)) noVotes += 1
		}
		channel.send(`Here:
total members: **${totalMembers()}**
total for: **${yesVotes}**
total against: **${noVotes}**
needed to pass: **${membersNeeded(true) - yesVotes}**
needed to fail: **${membersNeeded(false) - noVotes}**`)
	}

	else if (command === 'help') {
		channel.send(`Here are my commands:
\`vote [yes/no]\`   - vote for a proposal
\`vote-info\`   - see the current vote statistics
\`unvote\`   - cancel your vote

\`turn-info\`   - see the current turns

\`ping\`   - test my speed

\`check-in\`   - perform your daily check-in

\`random [low bound] [high bound]\`   - generate a number (note that the high bound is not included)

\`poll-create [title] [true/false] [description] [option1] [option2] [etc]\`   - create a new poll. The true/false refers to whether or not the poll should be a yes/no poll - if true then the choices are automatically created and a resolution automatically announced upon a consensus
\`poll-list\`   - list all current polls
\`poll [poll name] vote [option1/option2/etc]\`   - vote for an option
\`poll [poll name] unvote\`   - cancel your vote
\`poll [poll name] delete\`   - delete a poll

\`proposal [title/body] [value]\`   - add a part of a proposal. This is the only thing that can be done in #${channelId(guild, PROPOSAL_CHANNEL)}.

NOTE
Spaces seperate seperate commands unless they are surrounded by double quotes.
\`$poll-create test "this is a test" "this is boring" "this is not boring"\`
`)
	}

	else if (command === 'turn-info') {
		channel.send(`Here:
**Cycle: ${(await db.Misc.findOne()).cycles}**
${proposalQueue
	.map(id => {
			let name = guild.members.find('id', id).displayName
			try {
				if (id === currentTurnMember(guild).id) {
					name = `**${name} <- current turn**`
				}
			} catch (err) {
				console.log(err)
			}
			return name
		})
	.join('\n')
}
		`)
	}

	else if (command === 'check-in') {
		await db.Member.update({
			daysInactive: 0
		}, {
			where: {
				id: member.id
			}
		})
		channel.send('Success!')
	}

	else if (command === 'random') {
		const low = parseInt(args[0])
		const high = parseInt(args[1])

		if (isNaN(low) || isNaN(high)) {
			channel.send('Please actually enter numbers.')
			return
		} else if (low < 0 || high < 0) {
			channel.send('You cannot use negative numbers.')
			return
		} else if (low >= high) {
			channel.send('The lower bound must be less than the higher bound.')
			return
		}
		channel.send(Math.floor(Math.random() * (high - low) + low))
	}

	else if (command === 'poll-create') {
		if (args[0] && args[1] && args[2] && (args[1] || args[3])) {
			args[1] = args[1].toLowerCase() === 'true'

			if (await db.Poll.count({ where: { title: args[0] } })) {
				channel.send('Name taken!')
				return
			}
			db.Poll.create({ author: member.id, title: args[0], isYesNo: args[1], description: args[2], channel: channel.id })

			let options
			if (args[1]) {
				options = ['yes', 'no']
			} else {
				options = args.slice(3)
				if ((new Set(options)).size !== options.length) {
					channel.send('No duplicated options allowed.')
					return
				}
			}

			for (let option of options) {
				db.PollOption.create({ title: option, poll: args[0] }).catch(error => console.error(error))
			}

			channel.send(`Success! You can now vote with \`${PRODUCTION_PREFIX}poll "${args[0]}" vote [option]\`.`)
		} else if (!args[0]) {
			channel.send('You must enter a title.')
		} else if (!args[1]) {
			channel.send('You must enter the poll type.')
		} else if (!args[2]) {
			channel.send('You must enter a description.')
		} else {
			channel.send('You must enter at least one option.')
		}
	}

	else if (command === 'poll-list') {
		const polls = await db.Poll.findAll()
		if (polls.length) {
			channel.send('Here: \n' + polls.map(poll =>
`**${poll.title}** by @${idToDiscordMember(poll.author).displayName} - ${poll.description}`
			).join('\n'))
		} else {
			channel.send('There are no active polls.')
		}
	}

	else if (command === 'poll') {
		const poll = await db.Poll.findOne({
			where: {
				title: args[0]
			}
		})

		if (poll) {
			if (args[1] === 'vote') {
				const pollOption = await db.PollOption.find({
					where: { poll: args[0], title: args[2] }
				})

				if (pollOption) {
					await db.PollVote.destroy({ where: { poll: args[0], author: member.id } })
					await db.PollVote.create({ author: member.id, pollOption: pollOption.title, poll: args[0] }).catch(err => console.error(err))

					if (poll.isYesNo) {
						const votes = await db.PollVote.findAll({ where: { poll: args[0] } })
						const count = votes.reduce((cum, value) => {
							if (!(value.pollOption in cum)) cum[value.pollOption] = 0
							else cum[value.pollOption] += 1
							return cum
						}, {})

						if (count.yes >= membersNeeded(true)) {
							guild.channels.find('id', poll.channel).send('The vote has finished with an affirmative outcome! :white_check_mark:')
							deletePoll(args[0])
						} else if (count.no >= membersNeeded(false)) {
							guild.channels.find('id', poll.channel).send('The vote has finished with a negative outcome. :x:')
							deletePoll(args[0])
						}
					}

				} else {
					channel.send('That option does not exist. You can choose from: ' +
						(await db.PollOption.findAll({ where: { poll: args[0] } })).map(option => `**${option.title}**`).join(', ')
					)
				}

			}	else if (args[1] === 'unvote') {
				db.PollVote.destroy({ where: { poll: args[0], author: member.id } })

			} else if (args[1] === 'delete') {
				if (poll.author !== member.id) {
					channel.send('You have to be the owner of a poll to delete it.')
				} else {
					deletePoll(args[0])
					channel.send('Successfully deleted.')
				}
			} else {
				const options = await db.PollOption.findAll({ where: { poll: args[0] } })

				const optionsText = await Promise.all(options.map(async option => {
					const count = await db.PollVote.count({ where: { pollOption: option.title } })
					return (
`**${option.title}:** ${count} votes` + (count ? `, supported by ${
	(await db.PollVote.findAll({ where: { poll: args[0], pollOption: option.title, } })).map(vote => '@' + idToDiscordMember(vote.author).displayName).join(', ')
}` : ''))
				}))
				channel.send('Here are the options: \n' + optionsText.join('\n'))
			}

		} else {
			channel.send(`That poll does not exist.`)
		}
	}

	else if (command === 'proposal') {
		if (channel.name !== PROPOSAL_CHANNEL) {
			channel.send(`You can only use the \`proposal\` command in <#${channelId(guild, PROPOSAL_CHANNEL)}>.`)
			return
		}
		if (!args[1]) {
			channel.send('Please actually enter a value.')
			return
		}

		if (args[0] === 'title' || args[0] === 'body') {
			db.Misc.update({ ['proposal' + capitalize(args[0])]: args[1] }, { where: {} })
			if (args[1].split(' ').length === 1) {
				channel.send('Warning: you have entered a value with only one word. Please remember to use quotes.')
			}
		} else {
			channel.send('That is not a valid option. You can only set the `title` or `body`.')
		}
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'green') {
		for (let member2 of guild.members.array()) {
			member2.addRole(roles[YES])
		}
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'red') {
		for (let member2 of guild.members.array()) {
			member2.addRole(roles[NO])
		}
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'clear') {
		channel.bulkDelete(parseInt(args[0]) + 1)
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'set-turn') {
		initiateNextTurn(guild, guild.members.find('displayName', args[0]).id)
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'force-next-turn') {
		initiateNextTurn(guild, roles)
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'reset-check-in') {
		db.Member.update({ 'daysInactive': 0 }, { where: {} })
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'cancel-deadline') {
		db.Misc.update({ nextProposalDeadline: 0 }, { where: {} })
		proposalDeadlineJob.cancel()
	}

	else if (process.env.NODE_ENV !== 'production' && command === 'set-deadline') {
		await setNextProposalDeadline()
		setDeadline(guild)
	}

	else {
		channel.send('I did not understand that.')
	}
})


client.on('guildMemberAdd', async member => {
	if (!member.user.bot) {
		sendChannel(member.guild, INTRODUCTION_CHANNEL,
`Welcome <@${member.id}>! Please introduce yourself in this channel. You have been placed in the proposal queue: your can view your place with \`${PRODUCTION_PREFIX}turn-info\`. Read <#${channelId(member.guild, FAQ_CHANNEL)}> for more information on this game.`)
		addMember(member)
	}
})

client.on('guildMemberRemove', async member => {
	if (!member.user.bot) {
		if (currentTurnMember(member.guild).id === member.id) {
			await initiateNextTurn(member.guild)
		}
		await removeMember(member)
		sendChannel(member.guild, ANNOUNCEMENT_CHANNEL, `<@${member.id}> has left.`)
	}
})

client.login(CONFIG.token)
