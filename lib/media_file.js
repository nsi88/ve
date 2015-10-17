'use strict';

function MediaFile(file) {
  this.file = file;
  this.name = file.name;
  this.size = file.size;
  this.type = file.type.split('/')[0];
  if (this.type !== 'video' && this.type !== 'audio' && this.type !== 'image') {
    throw('Unsupported type ' + this.type);
  }
  this.thumbnail = null;
  this.duration = null;
  // Fragmented interface
  this.fragmented = false;
  this.videoInitFragment = null;
  this.videoFragments = null;
  this.videoCodec = null;
  this.audioInitFragment = null;
  this.audioFragments = null;
  this.audioCodec = null;
}

MediaFile.prototype.workerMessage = function() {
  var res = {};
  for (var p in this) {
    if (typeof(this[p]) !== 'function') {
      res[p] = this[p];
    }
  }
  return res;
};

module.exports = MediaFile;