import { GirlsClient } from "./src/discord/client";

import { SlashCommandBuilder } from "@discordjs/builders";
import { putGuildCommands } from "./src/discord/lib";

void new GirlsClient().run();

// TODO: put this somewhere better
const command = new SlashCommandBuilder()
  .setName("girls")
  .setDescription("interact with girls")
  .addSubcommandGroup((group) =>
    group
      .setName("config")
      .setDescription("configure how girls interact with your messages")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("six-month")
          .setDescription(
            "configure whether girls will delete reposts of 6+ month old links"
          )
          .addBooleanOption((option) =>
            option
              .setName("delete")
              .setDescription(
                "whether girls will delete reposts of 6+ month old links"
              )
              .setRequired(true)
          )
      )
  )
  .toJSON();

void putGuildCommands([command]);
