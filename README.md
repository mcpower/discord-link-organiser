# discord-link-organiser

aka "girls-ts"

## Notes

- Currently only supports a single channel.

- All removals should happen within a second or two of the message being posted.
  This is to prevent unexpected removals.

- Gracefully falls back if the bot can't:

  - DM the user - the bot sends a message in the channel mentioning the user,
    then deletes it a few moments later.

  - delete messages in the channel - the bot asks the user to delete it for
    them.

- Messages without any attachments or links will be removed... unless the user
  has manage messages permission for the channel (i.e. moderators).

- A message is removed if there is a message which was posted or edited less
  than 6 months ago which contains any Twitter or Pixiv link.

  - You can extend this to be "any time" by using a slash command.

- Deleted links, and links that were in a previous version of the message but
  later edited out, can be posted again.

- Editing a message to include a previously posted link will cause the message
  the message to be removed, even if the previously posted link was posted after
  the edited message was originally sent.

- While the bot is offline...

  - Reposts will not be removed. If a repost occurs while the bot is offline,
    the bot will completely ignore it the next time it comes back online. This
    is to prevent unexpected removals.

  - Any messages which are deleted or edited can't be picked up by the bot. This
    is a Discord API limitation which isn't easy to work around. As a result:

    - Some reposts may slip through if a message is _edited_ with new links.

    - No messages will be incorrectly deleted if the supposed "previous post"
      was deleted since the bot last looked at it - as the both fetches the
      "previous post" before deleting.

- If your server can't compile TypeScript, here's my deploy script:

  ```
  npx tsc && scp -r build server:git/discord-link-organiser/ && \
    ssh server "cp ~/git/discord-link-organiser/config.json \
      ~/git/discord-link-organiser/build"
  ```

## License

I don't see why anyone would use this code... but if you really want to, this is
licensed under the MIT license (IANAL but basically "include the license text if
you use this")
