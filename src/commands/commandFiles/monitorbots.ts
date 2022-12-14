import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  NonThreadGuildBasedChannel,
  SelectMenuBuilder,
  SlashCommandBuilder
} from 'discord.js';
import InteractionHandler from '../../interactionHandler/interactionHandler';

import { getConfig } from '../../getConfig';
import { httpRequest } from '../../httpService/http';
import { MonitoringResponse } from '../../httpService/responseTypes';

export const data = new SlashCommandBuilder()
  .setName('monitorbots')
  .setDescription('Will allow users to set the bots to monitor');

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const interactionHandler = new InteractionHandler();

  const { PRESENCE_API_URL } = getConfig();
  const { SELECT_BOT, SELECT_CHANNEL } = interactionHandler.getCustomIds();

  //Get all bots from server
  const members = await interaction.guild?.members.fetch();
  const botsFromServer = members?.filter(
    (member) => member.user.bot && member.user.id !== '1025770076026183791'
  );

  //Get all bots that is being monitored right now
  const monitoredInfo: MonitoringResponse = await httpRequest(
    'get',
    `${PRESENCE_API_URL}/monitoring/${interaction.guildId}`
  );

  if (!botsFromServer) {
    interaction.reply(
      'Something went wrong... Could not find bots using Discord API'
    );
    return;
  }

  const botOptions = botsFromServer.map((bot) => {
    return {
      label: bot.displayName,
      value: bot.id,
      default: monitoredInfo.bots
        ? monitoredInfo.bots.includes(bot.user.id)
        : false
    };
  });

  const embed = new EmbedBuilder().setTitle(
    botsFromServer.size === 0
      ? 'There are no discord bots on this server. I can only monitor discord bots if they are on this server. Please invite them to this server and try again'
      : ' Select bots to monitor and the channel to send alerts'
  );

  const selectBotsRow = new ActionRowBuilder().addComponents(
    new SelectMenuBuilder()
      .setCustomId(SELECT_BOT)
      .setMinValues(0)
      .setMaxValues(botOptions.length)
      .setPlaceholder('Nothing selected')
      .addOptions(botOptions)
  );

  //Get all channels
  const channels = await interaction.guild?.channels.fetch();

  if (!channels) {
    interaction.reply(
      'Something went wrong... Could not find channels using Discord API'
    );
    return;
  }

  const channelOptions = channels
    .filter(
      (channel): channel is NonThreadGuildBasedChannel =>
        channel !== null && channel.isTextBased()
    )
    .map((channel) => {
      return {
        label: channel.name,
        value: channel.id,
        default: channel.id === monitoredInfo.channelId
      };
    });

  const selectChannelRow = new ActionRowBuilder().addComponents(
    new SelectMenuBuilder()
      .setCustomId(SELECT_CHANNEL)
      .setMinValues(1)
      .setMaxValues(1)
      .setPlaceholder('Nothing selected')
      .addOptions(channelOptions)
  );

  //have to use any here to avoid compilation error
  //this may be a bug in discordjs
  await interaction.reply({
    ephemeral: true,
    embeds: [embed],
    ...(botsFromServer.size === 0
      ? {}
      : { components: [selectBotsRow as any, selectChannelRow as any] })
  });
};
