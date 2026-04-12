As of b1a9d95f, upgrading the following results in issues:

- Typescript 5.3 -> 5.4: MikroORM deps (Knex, ts-morph, type-fest) has type errors.
- @discordjs/ws 1.0 -> 1.1: TypeScript 5.3 is too old.
