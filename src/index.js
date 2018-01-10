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

const YES = 'yes'
const NO = 'no'

function role (message, name) {
  return message.guild.roles.find('name', name)
}

function memberRole(member, name) {
  return member.roles.find('name', name)
}

client.on('message', async message => {
  if (message.author.bot) return
  if (message.content.indexOf(config.prefix) !== 0) return

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
  const command = args.shift().toLowerCase()
  const { member, channel } = message
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

    member.addRole(roles[args[0]])
    channel.send(`You have voted ${args[0]}`)

    if (args[0] === YES && memberRole(member, NO)) {
      member.removeRole(roles[NO])
    } else if (args[0] === NO && memberRole(member, YES)) {
      member.removeRole(roles[YES])
    }
  }

  else if (command === 'unvote') {
    member.removeRole(roles[NO])
    member.removeRole(roles[YES])
    channel.send('You have withdrawn your vote')
  }

  else {
    channel.send('I did not understand that')
  }
})

client.login(config.token)
