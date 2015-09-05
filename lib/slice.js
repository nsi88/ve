'use strict';

function Slice(file, start, finish) {
  this.id = (file.name + start + finish).split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0);
  this.file = file;
  this.start = start;
  this.finish = finish;
  this.state = 'new';
  if (file.keyFrames) {
    var startIndex;
    var finishIndex;
    for (var i = 0; i < file.keyFrames.length; i++) {
      if (!startIndex && file.keyFrames[i+1] > start) {
        startIndex = i;
      }
      if (!finishIndex && (file.keyFrames[i+1] > finish || !file.keyFrames[i+1])) {
        // NOTE start включительно, finish нет
        finishIndex = i+1;
        break;
      }
    }
    this.keyFrames = file.keyFrames.slice(startIndex, finishIndex);
    
    if (file.images) {
      this.images = file.images.slice(startIndex, finishIndex);
      if (file.outputDirectory) {
        this.image = file.outputDirectory + '/' + (this.images[1] || this.images[0]);
      }
    }

    if (file.state == 'ready') {
      this.videoChunks = [file.videoChunks[0]].concat(file.videoChunks.slice(startIndex, finishIndex));
      if (file.audioChunks) {
        this.audioChunks = [file.audioChunks[0]].concat(file.audioChunks.slice(startIndex, finishIndex));
      }
    }
  }
}

Slice.prototype.dump = function() {
  return {
    id: this.id,
    file: this.file,
    start: this.start,
    finish: this.finish,
    keyFrames: this.keyFrames,
    videoChunks: this.videoChunks,
    audioChunks: this.audioChunks
  };
};

module.exports = Slice;