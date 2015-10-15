'use strict';

function Video(videoId, playerObj) {
  this.video = document.getElementById(videoId);
}

Video.prototype.canPlay = function(src) {
  return !src.fragmented && src.type == 'video' && src.file;
};

Video.prototype.load = function(src) {
  this.video.src = URL.createObjectURL(src.file);
};

module.exports = Video;