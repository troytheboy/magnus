// Imports
const Discord = require("discord.js");
const omdb = require("../apis/omdb");
const youtube = require("../apis/youtube");
const CONFIG = require("../../json/config.json");
const MSG = require("../../json/messages.json");

// Global Constants
const NAME = "movie";

// Exports
exports.name = NAME;
exports.aliases = ["film", "m", "mov"];
exports.description = "I will search IMDB for information on a movie.";
exports.example = `${CONFIG.commandPrefix}${NAME} bloodsport`;
exports.handleMessage = function (message) {
  return new Promise((resolve, reject) => {
    const queryString = message.content
      .slice(message.content.indexOf(" "))
      .trim();

    const ctx = {
      user: message.author.tag,
      command: NAME,
      channel: message.author.channel,
    };

    if (queryString) {
      omdb
        .query(queryString, 'movie')

        // OMDB query results handler
        .then((json) => {
          if (json.Title) {
            const ratings = json.Ratings;
            let ratingsString = "";

            const embed = new Discord.EmbedBuilder()
              .setColor("#0099ff")
              .setTitle(json.Title)
              .setDescription(json.Plot)
              .addFields({name: "Starring", value: json.Actors, inline: false})
              .addFields(
                {name: "Released", value: json.Released, inline: true},
                {name: "Genre", value: json.Genre, inline: true},
                {name: "Rated", value: json.Rated, inline: true},
                {name: "Directed By", value: json.Director, inline: true},
                {name: "Runtime", value: json.Runtime, inline: true},
              );

              if (json.Runtime) {
                const runtime = json.Runtime.split(' ')[0];
                var tight90 = "🙅‍♂️";
                if (runtime > 80 && runtime < 100) {
                  tight90 = "👌";
                }
                embed.addFields({name: "TIGHT 90", value: tight90, inline: true});

              }

            const valid = /^(ftp|http|https):\/\/[^ "]+$/.test(json.Poster);

            if (valid) {
              try {
                embed.setThumbnail(json.Poster);
              } catch (e) {
                // reject("Error occurred setting url for poster image.");

                // Let's just log that we failed here, but go ahead and continue with the post.
                console.log("Error occurred setting url for poster image.", e);
              }
            }

            ratings &&
              ratings.forEach((r) => {
                let source = r.Source;
                let score = r.Value;
                ratingsString += `___${source}___: ${score} \n`;
                embed.addFields({name:`${source} `, value: score, inline: true});
              });

            const youtubeQueryString = `${json.Title} trailer ${json.Year}`;
            try {
              youtube
                .search(youtubeQueryString)
                .then((playbackURL) => {
                  // embed.addField("Trailer", playbackURL);
                  message.channel.send(playbackURL);
                  resolve(embed);
                })

                .catch((e) => {
                  // Let's log that we couldn't find it at least.
                  console.log(
                    "Error getting Youtube trailer for",
                    youtubeQueryString,
                    e
                  );

                  // Just return the embed without the youtube movie trailer, it's fine.
                  resolve(embed);
                });
            } catch (e) {
              // Let's log that we couldn't find it at least.
              console.log(
                "Error getting Youtube trailer for",
                youtubeQueryString,
                e
              );

              // Just return the embed without the youtube movie trailer, it's fine.
              resolve(embed);
            }
          } else {
            reject(
              MSG.movie.NO_MOVIE_RESULTS,
              { ...ctx, movie: queryString },
              true
            );
          }
        })

        // OMDB query failure
        .catch((err) => {
          reject(
            MSG.movie.UNABLE_TO_CONNECT_TO_OMDB,
            { ...ctx, movie: queryString, error: err },
            true
          );

          // Kinda superfluous, but w/e.
          console.error(err);
        });
    } else {
      reject(MSG.movie.NO_MOVIE_PROVIDED, ctx, true);
    }
  });
};
