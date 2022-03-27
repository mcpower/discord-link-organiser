# discord-link-organiser

aka "girls-ts"

## Notes

Most of these things haven't even been implemented yet...

- All removals should happen within a second or two of the message being posted.
  This is to prevent unexpected removals.

- Messages without any attachments or links will be removed.

- A message is removed if there is a message which was posted or edited less
  than 6 months ago which contains any Twitter or Pixiv link.

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
    is a Discord API limitation and can technically be worked around... by
    retrieving all messages in the channel, which isn't great. Therefore, if a
    message is deleted while the bot is offline, the bot will still think that
    links in the message were posted, and if a message was edited while the bot
    is offline, the bot will still think that the message is the original
    message (so it thinks that links in the old message were posted, and links
    in the new message _aren't_ posted).

    - TODO: fix this by retrieving the "original message" to see if it wasn't
      deleted or edited since the bot last looked at it.

## License

I don't see why anyone would use this code... but if you really want to, this is
licensed under the MIT license (IANAL but basically "include the license text if
you use this")
