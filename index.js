'use strict';

var $ = require('jquery');

$(function(){
  var mustache = require('mustache');
  var files = [];
  var preprocessor = new Worker('./lib/preprocessor.js');

  preprocessor.onmessage = function(event) {
    var m = event.data;
    if (m.type == 'log') {
      console.log(m.data);
    } else if (m.type == 'image') {
      console.log(m.data);
    }
  };

  $('#add').change(function() {
    for (var i = 0; i < $(this)[0].files.length; i++) {
      var file = $(this)[0].files[i];
      $('#files').append(mustache.render($('#file').html(), { file: file }));
      files.push(file);
      preprocessor.postMessage(file);
    }
  });
});