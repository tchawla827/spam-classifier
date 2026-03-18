/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended"],
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};
