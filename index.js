'use strict';

var $ = require('jquery');

$(function(){
  var mustache = require('mustache');
  var preprocessor = new Worker('./lib/preprocessor.js');
  var files = [];

  preprocessor.onmessage = function(event) {
    var m = event.data;
    if (m.type == 'log') {
      console.log(m.data);
    } else if (m.type == 'image') {
      console.log(m);
      $('.file[data-name="' + m.file.name + '"] img').attr('src', m.url);
    } else if (m.type == 'error') {
      console.error(m.data);
    }
  };

  function requestQuota(size, callback) {
    if (typeof navigator.webkitPersistentStorage !== 'undefined') {
      navigator.webkitPersistentStorage.requestQuota(size, function(grantedBytes) {
        if (grantedBytes < size) {
          callback('not enough space');
        } else {
          callback(null, grantedBytes);
        }
      }, function(err) {
        callback(err);
      });
    // TODO support navigator.requestQuota
    } else {
      callback('Quota management api is not supported');
    }
  }

  $('#add').change(function() {
    // TODO validation (name uniqueness)

    for (var i = 0; i < $(this)[0].files.length; i++) {
      var file = $(this)[0].files[i];
      $('#files').append(mustache.render($('#file').html(), { file: file }));
      files.push(file);
    }
    
    // NOTE 2.5 because mp4 + dash + thumbnail
    // TODO use TEMPORARY for mp4
    // TODO size = [5GB, size of files].max
    var size = Math.ceil(files.reduce(function(sum, file) { return sum + file.size }, 0) * 2.5);

    var _this = $(this)[0];
    requestQuota(size, function(err, grantedBytes) {
      if (err) {
        console.error(err);
      } else {
        for (var i = 0; i < _this.files.length; i++) {
          preprocessor.postMessage({ file: _this.files[i], grantedBytes: grantedBytes });
        }
      }
    });
  });
});