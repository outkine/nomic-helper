import 'babel-polyfill'
import discord from 'discord.js'
import config from 'config.json'

const client = new discord.Client()

const votes = {}

client.on('message', async message => {
  if (message.author.bot) return
  if (message.content.indexOf(config.prefix) !== 0) return

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
  const command = args.shift().toLowerCase()

  if (command === 'ping') {
    const m = await message.channel.send('Ping?')
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
  }

  if (command === 'vote') {
    if (args[0] !== 'yes1' && args[0] !== 'no1') {
      message.channel.send('You must vote "yes1" or "no1"')
      return
    }
    message.member.addRole(message.guild.roles.find('name', args[0]))
  }
})

client.login(config.token)
