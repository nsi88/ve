'use strict';

var $ = require('jquery');

webkitRequestFileSystem(TEMPORARY, 1, function(fs) {
  var mustache = require('mustache');
  var preprocessor = new Worker('./lib/preprocessor.js?' + Math.random());
  var processor = new Worker('./lib/processor.js?' + Math.random());
  var files = {};
  var Player = require('./lib/player.js');
  var player = new Player({ fs: fs, videoId: 'player', timelineId: 'timeline', controlsId: 'controls' });
  var MediaFile = require('./lib/media_file.js');

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
    var mf = files[m.name];
    mf[m.attr] = m.value;
    if (m.attr == 'thumbnail') {
      fs.root.getFile(mf.thumbnail, {}, function(thumbnail) {
        console.debug('thumbnail', thumbnail);
        $('.file[data-name="' + mf.name + '"] img').attr('src', thumbnail.toURL());
      }, function(err) {
        console.error(err);
      });
    } else if (m.attr == 'fragmented' && m.value) {
      console.debug('files', files);
      //   if (f.type === 'video') {
      //     for (var sliceId in videoSlices) {
      //       var slice = videoSlices[sliceId];
      //       if (slice.file) {
      //         console.debug(slice);
      //         if (slice.file.name === file.name) {
      //           processor.postMessage({ slice: slice.dump() });
      //         }
      //       }
      //     }
      //   }
      // }
    }
  };

  $('#add').change(function() {
    for (var i = 0; i < $(this)[0].files.length; i++) {
      var mf = new MediaFile({ file: $(this)[0].files[i] });
      files[mf.name] = mf;
      $('#files').append(mustache.render($('#file').html(), { file: mf }));
      preprocessor.postMessage(mf.workerMessage());
    }
  });

  // function addSlice(slice) {
  //   if (slice.file.type.indexOf('video') === 0) {
  //     $('#video').append(mustache.render($('#slice').html(), { slice: slice }));
  //     videoSlices[slice.id] = slice;
  //     if (slice.file.state == 'ready') {
  //       processor.postMessage({ slice: slice.dump() });
  //     } else {
  //       console.debug('enqueue', slice);
  //     }
  //   }
  // }

  // player.onslice = function(src, start, finish) {
  //   src = files[src.name];
  //   console.debug('slice src', src);
  //   var slice = new Slice(src, start, finish);
  //   console.debug('slice', slice);
  //   if (slice.image) {
  //     fs.root.getFile(slice.image, {}, function(image) {
  //       slice.image = image.toURL();
  //       addSlice(slice);
  //     }, function(err) {
  //       console.error(err);
  //     });
  //   } else {
  //     addSlice(slice);
  //   }
  // };

  $('#files').on('click', '.file', function() {
    var f = files[$(this).data('name')];
    console.debug('play', f);
    player.load(f);
    player.play();
  });
}, function(err) {
  console.error(err);
});