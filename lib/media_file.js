'use strict';

function MediaFile(opts) {
  this.file = opts.file;
  this.name = opts.name || opts.file.name;
  this.size = opts.size || opts.file.size;
  this.type = opts.type || opts.file.type.split('/')[0];
  if (this.type !== 'video' && this.type !== 'audio' && this.type !== 'image') {
    throw('Unsupported type ' + this.type);
  }
  this.thumbnail = opts.thumbnail;
  this.duration = opts.duration;
  this.fragmented = !!opts.fragmented;
  this.videoInitFragment = opts.videoInitFragment;
  this.videoFragments = opts.videoFragments;
  this.videoCodec = opts.videoCodec;
  this.audioInitFragment = opts.audioInitFragment;
  this.audioFragments = opts.audioFragments;
  this.audioCodec = opts.audioCodec;
}

MediaFile.prototype.workerMessage = function() {
  return {
    file: this.file,
    name: this.name,
    type: this.type
  };
};

module.exports = MediaFile;