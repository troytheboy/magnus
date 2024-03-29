// Imports
const CONFIG = require("../../json/config.json");
const UTILS = require("../utils");

// Global Constants
const NAME = "random";

// Exports
exports.name = NAME;
exports.aliases = ["roll", "d20", "rand", "r"];
exports.description =
  "I will give you a random number between 0 and x (defaults to 20)!";
exports.example = `${CONFIG.commandPrefix}${NAME}`;
exports.handleMessage = function (message) {
  return new Promise((resolve, _reject) => {
    // Takes a maximum number to roll between
    const max =
      parseInt(
        message.content.slice(message.content.indexOf(" ")).trim(),
        10
      ) || 20;
    resolve(UTILS.randomNum(0, max));
  });
};
