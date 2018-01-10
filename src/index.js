import 'babel-polyfill'
import discord from 'discord.js'
import config from 'config.json'

const client = new discord.Client()

const votes = {}

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

  if (command === 'ping') {
    const m = await channel.send('Ping?')
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
  }

  if (command === 'vote') {
    if (args[0] !== YES && args[0] !== NO) {
      channel.send(`You must vote "${YES}" or "${NO}"`)
      return
    }

    const roles = {
      [YES]: role(member, YES),
      [NO]: role(member, NO),
    }

    member.addRole(roles[args[0]])
    channel.send(`You have voted ${args[0]}!`)

    if (memberRole(member, YES) && memberRole(member, NO)) {
      console.log(args[0])
      if (args[0] === YES) member.removeRole(roles[NO])
      else member.removeRole(roles[YES])
    }
  }
})

client.login(config.token)
