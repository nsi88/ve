'use strict';

function Player(opts) {
  this.video = document.getElementById(opts.videoId);
  this.fs = opts.fs;
  
  this.impls = [];
  var FragmentedImpl = require('./player/impl/fragmented.js');
  this.impls[this.impls.length] = new FragmentedImpl(opts.videoId, this);
  var VideoImpl = require('./player/impl/video.js');
  this.impls[this.impls.length] = new VideoImpl(opts.videoId, this);
  this.impl = null;
  
  var Timeline = require('./player/timeline.js');
  this.timeline = new Timeline(opts.timelineId, this);
  var Controls = require('./player/controls.js');
  this.controls = new Controls(opts.controlsId, this);

  var _this = this;
  ['loadedmetadata', 'play', 'timeupdate'].forEach(function (type) {
    _this.video.addEventListener(type, _this['_on' + type].bind(_this), false);
  });
}

Player.prototype.load = function(src) {
  this.impl = this._getImpl(src);
  if (!this.impl) {
    throw 'Not supported';
  }
  this.impl.load(src);
};

Player.prototype.play = function() {
  this.video.play();
  this.controls.play()
};

Player.prototype.pause = function() {
  this.video.pause();
  this.controls.pause();
};

Player.prototype.seek = function(pos) {
  this.video.currentTime = pos;
};

Player.prototype._seekRel = function(pos) {
  this.seek(this.video.currentTime + pos);
};

Player.prototype._toggleLeftBorder = function() {
  this.timeline.toggleLeftBorder();
};

Player.prototype._toggleRightBorder = function() {
  this.timeline.toggleRightBorder();
};

// TODO implement EventTarget interface
Player.prototype._slice = function() {
  var event = new CustomEvent('slice', { detail: {
    src: this.impl.src,
    start: this.timeline.leftBorderValue,
    duration: this.timeline.rightBorderValue - this.timeline.leftBorderValue
  }});
  this.video.dispatchEvent(event);
};

Player.prototype._getImpl = function(src) {
  for (var i = 0; i < this.impls.length; i++) {
    if (this.impls[i].canPlay(src)) {
      return this.impls[i];
    }
  }
};

Player.prototype._onloadedmetadata = function () {
  this.timeline.setDuration(this.video.duration);
  this.controls.show();
};

Player.prototype._onplay = function () {
  this.controls.play();
};

Player.prototype._ontimeupdate = function () {
  this.timeline.seek(this.video.currentTime);
};

module.exports = Player;