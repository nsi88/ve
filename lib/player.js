'use strict';

function Player(videoId, timelineId, controlsId) {
  this.video = document.getElementById(videoId);
  this.src = null;
  
  var Timeline = require('./player/timeline.js');
  this.timeline = new Timeline(timelineId, this);
  var Controls = require('./player/controls.js');
  this.controls = new Controls(controlsId, this);

  var _this = this;
  ['loadedmetadata', 'play', 'timeupdate'].forEach(function(type) {
    _this.video.addEventListener(type, _this['on' + type].bind(_this), false);
  });
}

Player.prototype.onslice = function(src, start, finish) {
  // NOTE should be defined after initialization
  throw 'Not implemented';
};

Player.prototype.onloadedmetadata = function() {
  this.timeline.setDuration(this.video.duration);
  this.controls.show();
};

Player.prototype.onplay = function() {
  this.controls.play();
};

Player.prototype.ontimeupdate = function() {
  this.timeline.seek(this.video.currentTime);
};

Player.prototype.load = function(src) {
  this.src = src;
  this.video.src = URL.createObjectURL(src);
};

Player.prototype.pause = function() {
  this.video.pause();
};

Player.prototype.play = function() {
  this.video.play();
};

Player.prototype.seek = function(position) {
  this.video.currentTime = position;
};

module.exports = Player;