'use strict';

var $ = require('jquery');

webkitRequestFileSystem(TEMPORARY, 1, function(fs) {
  var mustache = require('mustache');
  var preprocessor = new Worker('./lib/preprocessor.js?' + Math.random());
  var processor = new Worker('./lib/processor.js?' + Math.random());
  var files = {};
  var videoSlices = [];
  var Player = require('./lib/player.js');
  var player = new Player('player', 'timeline', 'controls');
  var Slice = require('./lib/slice.js');

  // clear previous files
  var reader = fs.root.createReader();
  function read(reader) {
    reader.readEntries(function(entries) {
      if (entries.length) {
        for (var i = 0; i < entries.length; i++) {
          if (confirm('Удалить ' + entries[i].name + '?')) {
            if (entries[i].isDirectory) {
              entries[i].removeRecursively(function() {}, function(err) { console.error(err); });
            } else if (entries[i].isFile) {
              entries[i].remove(function() {}, function(err) { console.error(err); });
            }
          }
        }
        read(reader);
      }
    }, function(err) {
      console.error(err);
    });
  }
  read(reader);

  window.onbeforeunload = function() { 
    return 'Выйти?';
  };

  preprocessor.onmessage = function(event) {
    var m = event.data;
    console.debug('preprocessor', m);
    var file = files[m.file];
    file[m.attr] = m.value;
    if (m.attr == 'images') {
      // NOTE главной устанавливаем либо 2-ю либо 0-ю картинку
      fs.root.getFile(file.outputDirectory + '/' + (m.value[2] || m.value[0]), {}, function(image) {
        console.debug('image', image);
        $('.file[data-name="' + file.name + '"] img').attr('src', image.toURL());
      }, function(err) {
        console.error(err);
      });
    } else if (m.attr == 'state') {
      if (m.value === 'ready') {
        console.debug('files', files);
        if (file.type.indexOf('video') === 0) {
          for (var sliceId in videoSlices) {
            var slice = videoSlices[sliceId];
            if (slice.file) {
              console.debug(slice);
              if (slice.file.name === file.name) {
                processor.postMessage({ slice: slice.dump() });
              }
            }
          }
        }
      }
    }
  };

  $('#add').change(function() {
    for (var i = 0; i < $(this)[0].files.length; i++) {
      var file = $(this)[0].files[i];
      $('#files').append(mustache.render($('#file').html(), { file: file }));
      files[file.name] = file;
      preprocessor.postMessage({ file: file });
    }
  });

  function addSlice(slice) {
    if (slice.file.type.indexOf('video') === 0) {
      $('#video').append(mustache.render($('#slice').html(), { slice: slice }));
      videoSlices[slice.id] = slice;
      if (slice.file.state == 'ready') {
        processor.postMessage({ slice: slice.dump() });
      } else {
        console.debug('enqueue', slice);
      }
    }
  }

  player.onslice = function(src, start, finish) {
    src = files[src.name];
    console.debug('slice src', src);
    var slice = new Slice(src, start, finish);
    console.debug('slice', slice);
    if (slice.image) {
      fs.root.getFile(slice.image, {}, function(image) {
        slice.image = image.toURL();
        addSlice(slice);
      }, function(err) {
        console.error(err);
      });
    } else {
      addSlice(slice);
    }
  };

  $('#files').on('click', '.file', function() {
    var file = files[$(this).data('name')];
    console.debug('play', file);
    player.load(file);
    // TODO call play in callback
    player.play();
  });
}, function(err) {
  console.error(err);
});