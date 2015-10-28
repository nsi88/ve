'use strict';

function Fragmented(videoId, playerObj) {
  this.video = document.getElementById(videoId);
  this.player = playerObj;
  this.src = null;
  this.mediaSource = null;
  this.videoFragmentIndex = null;
  this.audioFragmentIndex = null;
  
  // this.video.addEventListener('seeking', this.onSeeking);
  this.video.addEventListener('progress', this.onProgress.bind(this));
}

Fragmented.prototype.canPlay = function(src) {
  return src.fragmented;
};

Fragmented.prototype.load = function(src) {
  this.src = src;
  this.mediaSource = new MediaSource();
  this.videoFragmentIndex = 0;
  this.audioFragmentIndex = 0;
  this.mediaSource.addEventListener('sourceopen', this.onSourceOpen.bind(this));
  this.video.src = window.URL.createObjectURL(this.mediaSource);
};

Fragmented.prototype.onSourceOpen = function(e) {
  if (this.mediaSource.sourceBuffers.length > 0) {
    return;
  }

  var _this = this;
  ['video', 'audio'].forEach(function(track) {
    if (_this.src[track + 'InitFragment']) {
      _this.mediaSource.addSourceBuffer('video/mp4; codecs="' + _this.src[track + 'Codec'] + '"').track = track;
    }
  });
  
  var firstAppendHandler = function(e) {
    var sourceBuffer = e.target;
    sourceBuffer.removeEventListener('updateend', firstAppendHandler);
    _this.appendNextMediaFragment(sourceBuffer);
  };

  var firstAppend = function(sourceBuffer) {
    _this.readFileByPath(_this.src[sourceBuffer.track + 'InitFragment'], function(err, res) {
      if (err) {
        throw err;
      } else {
        sourceBuffer.addEventListener('updateend', firstAppendHandler);
        sourceBuffer.appendBuffer(res);
      }
    });
  };

  for (var i = 0; i < this.mediaSource.sourceBuffers.length; i++) {
    firstAppend(this.mediaSource.sourceBuffers[i]);
  }
};

Fragmented.prototype.readFileByPath = function(path, callback) {
  this.player.fs.root.getFile(path, null, function(entry) {
    var reader = new FileReader();
    reader.onload = function() {
      callback(null, reader.result);
    };
    reader.onerror = function(err) {
      callback(err);
    };
    entry.file(function(file) {
      reader.readAsArrayBuffer(file.slice());
    }, function(err) {
      callback(err);
    });
  }, function(err) {
    callback(err);
  });
};

Fragmented.prototype.getNextMediaFragment = function(track) {
  return this.src[track + 'Fragments'][this[track + 'FragmentIndex']++];
};

Fragmented.prototype.appendNextMediaFragment = function(sourceBuffer) {
  if (this.mediaSource.readyState == 'closed') {
    return;
  }

  // Make sure the previous append is not still pending.
  if (sourceBuffer.updating) {
    return;
  }

  var mediaFragment = this.getNextMediaFragment(sourceBuffer.track);

  if (mediaFragment) {
    this.readFileByPath(mediaFragment.path, function(err, res) {
      if (err) {
        throw err;
      } else {
        sourceBuffer.appendBuffer(res);
      }
    });
  }
};

Fragmented.prototype.onProgress = function() {
  for (var i = 0; i < this.mediaSource.sourceBuffers.length; i++) {
    this.appendNextMediaFragment(this.mediaSource.sourceBuffers[i]);
  }
};

module.exports = Fragmented;