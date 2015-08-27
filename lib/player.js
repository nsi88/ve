'use strict';

function Player(videoId, timelineId) {
  this.video = document.getElementById(videoId);
  var Timeline = require('./player/timeline.js');
  this.timeline = new Timeline(timelineId, this);
  this.video.addEventListener('loadedmetadata', this.onloadedmetadata.bind(this), false);
  this.video.addEventListener('timeupdate', this.ontimeupdate.bind(this), false);
}

Player.prototype.onloadedmetadata = function() {
  this.timeline.setDuration(this.video.duration);
};

Player.prototype.ontimeupdate = function() {
  this.timeline.seek(this.video.currentTime);
};

Player.prototype.pause = function() {
  this.video.pause();
};

Player.prototype.play = function(file) {
  this.video.src = URL.createObjectURL(file);
  this.video.play();
};

Player.prototype.seek = function(position) {
  this.video.currentTime = position;
};

module.exports = Player;