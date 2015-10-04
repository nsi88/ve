'use strict';

function Player(opts) {
  var VideoImpl = require('./player/impl/video.js');
  this.videoImpl = new VideoImpl(opts.videoId, this);
  var Timeline = require('./player/timeline.js');
  this.timeline = new Timeline(opts.timelineId, this);
  var Controls = require('./player/controls.js');
  this.controls = new Controls(opts.controlsId, this);
  this.impl = null;
}

Player.prototype.onslice = function() {
  // NOTE should be defined after initialization
  throw 'Not implemented';
};

Player.prototype.load = function(src) {
  this.impl = this._getImpl(src);
  this.impl.load(src);
};

Player.prototype.pause = function() {
  this.impl.pause();
};

Player.prototype.play = function() {
  this.impl.play();
};

Player.prototype.seek = function(pos) {
  this.impl.seek(pos);
};

Player.prototype._getImpl = function(src) {
  return this.videoImpl;
};

module.exports = Player;