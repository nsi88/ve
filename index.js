'use strict';

var $ = require('jquery');

webkitRequestFileSystem(TEMPORARY, 1, function(fs) {
  var mustache = require('mustache');
  var preprocessor = new Worker('./lib/preprocessor.js');
  var files = {};
  var Player = require('./lib/player.js');
  var player = new Player('player', 'timeline', 'controls');

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
    console.debug(m);
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
    }
    console.debug(files);
  };

  $('#add').change(function() {
    for (var i = 0; i < $(this)[0].files.length; i++) {
      var file = $(this)[0].files[i];
      $('#files').append(mustache.render($('#file').html(), { file: file }));
      files[file.name] = file;
      // preprocessor.postMessage({ file: file });
    }
  });

  $('#files').on('click', '.file', function() {
    var file = files[$(this).data('name')];
    console.debug('play', file);
    player.play(file);
  });
}, function(err) {
  console.error(err);
});