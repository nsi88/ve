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
  var Slice = require('./lib/slice.js');
  var slicesQueue = {};
  var slices = {};

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
      if (slicesQueue[mf.name]) {
        slicesQueue[mf.name].forEach(function(slice) {
          processor.postMessage(slice.workerMessage());
        });
        delete(slicesQueue[mf.name]);
      }
    }
  };

  $('#add').change(function() {
    for (var i = 0; i < $(this)[0].files.length; i++) {
      var mf = new MediaFile($(this)[0].files[i]);
      files[mf.name] = mf;
      $('#files').append(mustache.render($('#file').html(), { file: mf }));
      preprocessor.postMessage(mf.workerMessage());
    }
  });

  processor.onmessage = function(event) {
    var s = event.data;
    console.debug('processor', s);
    var slice = slices[s.name];
    slice[s.attr] = s.value;
    if (s.attr == 'thumbnail') {
      fs.root.getFile(slice.thumbnail, {}, function(thumbnail) {
        console.debug('thumbnail', thumbnail);
        $('.slice[data-name="' + s.name + '"] img').attr('src', thumbnail.toURL());
      }, function(err) {
        console.error(err);
      });
    } else if (s.attr == 'fragmented' && s.value) {
      console.debug('slices', slices);
    }
  };
  
  function renderSlice(slice) {
    var container = $('#' + slice.type);
    slice.finish = slice.finish();
    var html = mustache.render($('#slice').html(), { slice: slice });
    if (!container.find('.slice[data-name="' + slice.name + '"]').replaceWith(html).length) {
      container.append(html);
    }
  }

  player.video.addEventListener('slice', function(e) {
    console.debug('slice', e.detail);
    var slice = new Slice(e.detail.src, e.detail.start, e.detail.duration);
    slices[slice.name] = slice;
    renderSlice(slice);
    if (slice.mediaFile.fragmented) {
      processor.postMessage(slice.workerMessage());
    } else {
      console.debug('enqueue', slice, 'to', slicesQueue);
      slicesQueue[slice.mediaFile.name] = slicesQueue[slice.mediaFile.name] || [];
      slicesQueue[slice.mediaFile.name].push(slice);
    }
  });

  $('#files').on('click', '.file', function() {
    var f = files[$(this).data('name')];
    console.debug('play', f);
    player.load(f);
    player.play();
  });

  $('#video').on('click', '.slice', function() {
    var s = slices[$(this).data('name')];
    console.debug('play', s);
    player.load(s);
    player.play();
  });
}, function(err) {
  console.error(err);
});