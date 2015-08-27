'use strict';

function Player(videoId) {
  this.player = $('#' + videoId);
}

Player.prototype.play = function(file) {
  player.src = URL.createObjectURL(file);
  player.play();
};

module.exports = Player;