'use strict';

importScripts('ffmpeg.js?' + Math.random());
var fs;

onmessage = function(event) {
  console.log(event.data);
	var file = event.data.file;
  var grantedBytes = event.data.grantedBytes;
  try {
    fs = requestFS(grantedBytes);
  } catch(err) {
    return postMessage({ type: 'error', data: err.message });
  }
  
  if (file.type.indexOf('video') === 0) {
    processVideo(file, fs);
  } else if (file.type.indexOf('audio') === 0) {
    processAudio(file, fs);
  } else {
    postMessage({ type: 'error', data: 'Invalid file type for ' + file.name });
  }
};

function requestFS(size) {
  var r = webkitRequestFileSystemSync || requestFileSystemSync;
  if (r) {
    return r(PERSISTENT, size);
  } else {
    throw('File System API is not supported');
  }
}

function resolveURL(url) {
  var r = webkitResolveLocalFileSystemSyncURL || resolveLocalFileSystemSyncURL;
  if (r) {
    return r(url);
  } else {
    throw('File System API is not supported'); 
  }
}

function processVideo(file, fs) {
	// thumbnail
  // TODO wrap to try catch all ffmpegRun
  // TODO md5 output names
	var image = ffmpegRun({
		arguments: ['-ss', 1, '-i', file.name, '-an', '-f', 'image2', '-vframes', 1, '-vf', 'scale=-1:100', file.name + '.jpg'],
		files: [file],
    fs: fs
	})[0];
  var url = image.toURL();
  resolveURL(url);
  postMessage({ type: 'image', file: file, image: image.file(), url: url });

  // repack to mp4 and fragment
  try {
    // NOTE not all codecs are supported by mp4 container. I don't know which ones )
    var mp4 = ffmpegRun({
      arguments: ['-i', file.name, '-c', 'copy', '-movflags', 'frag_keyframe+empty_moov+separate_moof', file.name + '.mp4'],
      files: [file],
      fs: fs
    })[0];
  } catch(e) {
    // TODO use server for audio transcoding
    var mp4 = ffmpegRun({
      arguments: ['-i', file.name, '-c:v', 'copy', '-strict', -2, '-movflags', 'frag_keyframe+empty_moov+separate_moof', file.name + '.mp4'],
      files: [file],
      fs: fs
    })[0];
  }
  console.log('mp4', mp4);

  // metadata
  // var TOTAL_MEMORY = 268435456;
  // var metadata = {
  //   keyFrames: [],
  //   duration: null,
  //   videoStreams: [],
  //   audioStreams: [],
  //   output: false
  // };
  // ffmpegRun({
  //   arguments: ['-i', file.name, '-an', '-vf', 'select=key,showinfo', '-copyts', '-f', 'null', '-'],
  //   files: [file],
  //   print: parseFfmpegLog.bind(this, metadata),
  //   printErr: parseFfmpegLog.bind(this, metadata),
  //   TOTAL_MEMORY: TOTAL_MEMORY
  // });
  // // XXX
  // delete(metadata.output);
  // postMessage({ type: 'log', data: metadata });
}

function parseFfmpegLog(metadata, line) {
	var m;
	if (m = line.match(/pts_time:(\d+(\.\d+)?).+type:I/)) {
		metadata.keyFrames.push(m[1]*1);
	} else if (m = line.match(/Duration:\s+(\d+):(\d+):([\d.]+)/)) {
    metadata.duration = m[1]*3600 + m[2]*60 + m[3]*1;
  } else if (!metadata.output && (m = line.match(/Stream.+?Audio:\s*(\w+)/))) {
    metadata.audioStreams.push({ codec: m[1] });
  } else if (!metadata.output && (m = line.match(/Stream.+?Video:\s(\w+).+?,\s(\d+)x(\d+)/))) {
    metadata.videoStreams.push({ codec: m[1], width: m[2]*1, height: m[3]*1 });
  } else if (line.indexOf('Output ') === 0) {
    metadata.output = true;
  }
}

function processAudio(file, fs) {

}