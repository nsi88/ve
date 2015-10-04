'use strict';

function Video(videoId, playerObj) {
  this.el = document.getElementById(videoId);
  this.player = playerObj;
  this.src = null;

  var _this = this;
  ['loadedmetadata', 'play', 'timeupdate'].forEach(function (type) {
    _this.el.addEventListener(type, _this['on' + type].bind(_this), false);
  });
}

Video.prototype.onloadedmetadata = function () {
  this.player.timeline.setDuration(this.el.duration);
  this.player.controls.show();
};

Video.prototype.onplay = function () {
  this.player.controls.play();
};

Video.prototype.ontimeupdate = function () {
  this.player.timeline.seek(this.el.currentTime);
};

Video.prototype.load = function(src) {
  this.src = src.file;
  this.el.src = URL.createObjectURL(this.src);
};

Video.prototype.play = function() {
  this.el.play();
};

Video.prototype.pause = function() {
  this.el.pause();
};

Video.prototype.seek = function(pos) {
  this.el.currentTime = pos;
};

module.exports = Video;