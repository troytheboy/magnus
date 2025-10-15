// Imports
const yts = require("yt-search");
// Global constants
const OPTIONS = {
  pages: 1,
};

exports.search = function (queryString) {
  return new Promise((resolve, reject) => {
    yts(queryString).then((results) => {
      const firstResult = results.videos[0];
      console.log(firstResult);
      resolve(firstResult.url);
    }).catch(e => reject(e));
  });
};
