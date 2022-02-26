// NOTE: Every entity which uses a Discord snowflake as an sqlite signed
// int8/bigint will not work in September 2084.
// Twitter snowflakes will have the same problem in July 2080, but that is WAI
// as Twitter snowflakes are intended to be 63 bits.
// Solution: store them in the db as (num - 2**63) in 2080.
export * from "./Post";
