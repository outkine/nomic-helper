import 'babel-polyfill'
import discord from 'discord.js'
import fs from 'fs'
import path from 'path'

let CONFIG_PATH
if (process.env.NODE_ENV === 'production') {
  CONFIG_PATH = './config.json'
} else {
  CONFIG_PATH = '../config.json'
}
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, CONFIG_PATH), 'utf8'))

const client = new discord.Client()

const BOT_NUMBER = 2
const YES = 'yes'
const NO = 'no'
const VOTING_CHANNEL = 'voting'

function role (message, name) {
  return message.guild.roles.find('name', name)
}

function memberRole(member, name) {
  return member.roles.find('name', name)
}

function totalMembers(guild) {
  return guild.memberCount - BOT_NUMBER
}

function membersNeeded(guild) {
  return Math.round(totalMembers(guild) / 2)
}

client.on('message', async message => {
  if (message.author.bot) return
  if (message.content.indexOf(config.prefix) !== 0) return

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
  const command = args.shift().toLowerCase()
  const { member, channel, guild } = message
  const roles = {
    [YES]: role(member, YES),
    [NO]: role(member, NO),
  }

  if (command === 'ping') {
    const m = await channel.send('Ping?')
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
  }

  else if (command === 'vote') {
    if (args[0] !== YES && args[0] !== NO) {
      channel.send(`You must vote "${YES}" or "${NO}"`)
      return
    }

    let yes_votes = args[0] === YES ? 1 : 0
    let no_votes = args[0] === NO ? 1 : 0
    const memberCountHalf = Math.round(totalMembers(guild) / 2)

    let end = false
    for (let member2 of guild.members.array()) {
      if (member2.id !== member.id) {
        if (memberRole(member2, YES)) yes_votes += 1
        else if (memberRole(member2, NO)) no_votes += 1

        if (yes_votes >= memberCountHalf || no_votes > memberCountHalf) {
          if (yes_votes >= memberCountHalf) {
            guild.channels.find('name', VOTING_CHANNEL).send('The proposal has been passed!')
          } else if (no_votes > memberCountHalf) {
            guild.channels.find('name', VOTING_CHANNEL).send('The proposal has been rejected!')
          }
          end = true
          break
        }

      }
    }

    if (end) {
      for (let member2 of guild.members.array()) {
        member2.removeRole(roles[NO])
        member2.removeRole(roles[YES])
      }

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
    let yes_votes = 0
    let no_votes = 0

    for (let member of guild.members.array()) {
      if (memberRole(member, YES)) yes_votes += 1
      else if (memberRole(member, NO)) no_votes += 1
    }
    channel.send(
      `Here:
      total members: ${totalMembers(guild)}
      members needed: ${membersNeeded(guild)}
      total for: ${yes_votes}
      total against: ${no_votes}`)
  }

  else {
    channel.send('I did not understand that')
  }
})

client.login(config.token)
