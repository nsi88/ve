'use strict';

function Slice(mediaFile, start, duration) {
  this.mediaFile = mediaFile;
  this.name = Date.now() + '_' + mediaFile.name;
  this.size = null;
  this.type = mediaFile.type;
  this.start = start;
  if (duration <= 0) {
    throw 'Invalid duration ' + duration;
  }
  this.duration = duration;
  this.thumbnail = null;
  // Fragmented interface
  this.fragmented = false;
  this.videoInitFragment = null;
  this.videoFragments = null;
  this.videoCodec = null;
  this.audioInitFragment = null;
  this.audioFragments = null;
  this.audioCodec = null;
}

Slice.prototype.workerMessage = function() {
  return {
    mediaFile: this.mediaFile.workerMessage(),
    name: this.name,
    start: this.start,
    duration: this.duration
  };
};

module.exports = Slice;