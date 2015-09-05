'use strict';

importScripts('ffmpeg.js?' + Math.random());
var fs = webkitRequestFileSystemSync(TEMPORARY, 1);

onmessage = function(event) {
  console.debug(event.data);
};