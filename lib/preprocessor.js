'use strict';

importScripts('ffmpeg.js?' + Math.random());
importScripts('mp4fragment.js?' + Math.random());
importScripts('mp4split.js?' + Math.random());
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
    return r(TEMPORARY, size);
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
  var outputDirectory = file.name.replace(/\./g, '_');

	var image = ffmpegRun({
		arguments: ['-ss', 1, '-i', file.name, '-an', '-f', 'image2', '-vframes', 1, '-vf', 'scale=-1:100', file.name + '.jpg'],
		files: [file],
    fs: fs,
    outputDirectory: outputDirectory
	})[0];
  var url = image.toURL();
  resolveURL(url);
  postMessage({ type: 'image', file: file, image: image.file(), url: url });

  // repack to mp4
  if (file.name.split('.').pop() != 'mp4') {
    try {
      // NOTE not all codecs are supported by mp4 container. I don't know which ones )
      var repack = ffmpegRun({
        arguments: ['-i', file.name, '-c', 'copy', file.name + '.mp4'],
        files: [file],
        fs: fs,
        outputDirectory: outputDirectory
      })[0];
    } catch(e) {
      // TODO use server for audio transcoding
      var repack = ffmpegRun({
        arguments: ['-i', file.name, '-c:v', 'copy', '-strict', -2, file.name + '.mp4'],
        files: [file],
        fs: fs,
        outputDirectory: outputDirectory
      })[0];
    }
    file = repack.file();
    console.log('repack', repack, 'file', file);
  }

  // fragment
  var frag = mp4fragment({
    arguments: ['--verbosity', 3, '--debug', file.name, 'frag_' + file.name],
    files: [file],
    fs: fs,
    outputDirectory: outputDirectory
  })[0];
  file = frag.file();
  console.log('frag', frag);

  if (repack) {
    repack.remove();
  }

  // split to dash chunks. audio and video are separate
  ['video', 'audio'].forEach(function(track) {
    var chunks = mp4split({
      arguments: ['--init-segment', outputDirectory + '/' + track + '.mp4', '--media-segment', outputDirectory + '/' + track + '-%04llu.m4f', '--pattern-parameters', 'N', '--' + track, file.name],
      files: [file],
      fs: fs,
      outputDirectory: outputDirectory
    });
    console.log(chunks);
  });

  frag.remove();

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