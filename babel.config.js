// eslint-disable-next-line @typescript-eslint/no-var-requires
const assert = require("assert");

module.exports = (api) => {
  assert(api.env("test"), "we only use Babel for jest");
  return {
    presets: [
      ["@babel/preset-env", { targets: { node: "current" } }],
      "@babel/preset-typescript",
    ],
  };
};
