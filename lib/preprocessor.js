'use strict';

importScripts('ffmpeg.js?' + Math.random());
importScripts('mp4fragment.js?' + Math.random());
importScripts('mp4split.js?' + Math.random());
var fs = webkitRequestFileSystemSync(TEMPORARY, 1);

onmessage = function(event) {
  console.debug(event.data);
  var file = event.data.file;

  if (file.type.indexOf('video') === 0) {
    processVideo(file, fs);
  } else if (file.type.indexOf('audio') === 0) {
    processAudio(file, fs);
  } else {
    throw('Invalid file type for ' + file.name);
  }
};

function parseFfmpegLog(metadata, line) {
  console.debug(line);
  var m;
  if (m = line.match(/pts_time:(\d+(\.\d+)?).+type:I/)) {
    metadata.keyFrames.push(m[1]*1);
  } else if (m = line.match(/Duration:\s+(\d+):(\d+):([\d.]+)/)) {
    metadata.duration = m[1]*3600 + m[2]*60 + m[3]*1;
  } else if (!metadata.output && (m = line.match(/Stream.+?Audio:.+?$/))) {
    metadata.audioStreams.push(m[0]);
  } else if (!metadata.output && (m = line.match(/Stream.+?Video:.+?$/))) {
    metadata.videoStreams.push(m[0]);
  } else if (line.indexOf('Output ') === 0) {
    metadata.output = true;
  }
}

function processVideo(file) {
  var outputDirectory = Date.now().toString();
  postMessage({ file: file.name, attr: 'outputDirectory', value: outputDirectory });

  var metadata = {
    type: 'video',
    name: file.name,
    size: file.size,
    duration: null,
    videoStreams: [],
    audioStreams: [],
    keyFrames: [],
    images: [],
    videoChunks: [],
    audioChunks: [],
    // XXX флаг указывающий, что начались метаданные результатов и их сохранять не надо
    output: false
  };
  
  // make images and parse showinfo output
	var images = ffmpeg({
		arguments: ['-i', file.name, '-vf', 'select=\'eq(pict_type,PICT_TYPE_I)\',showinfo,scale=-1:50', '-copyts', '-vsync', 'vfr', outputDirectory + '/image-%05d.jpg'],
		files: [file],
    fs: fs,
    print: parseFfmpegLog.bind(this, metadata),
    printErr: parseFfmpegLog.bind(this, metadata),    
	});
  console.debug(metadata);
  delete(metadata.output);
  postMessage({ file: file.name, attr: 'duration', value: metadata.duration });
  metadata.images = images.map(function(image) { return image.name; });
  postMessage({ file: file.name, attr: 'images', value: metadata.images });

  // repack to mp4
  if (file.name.split('.').pop() != 'mp4') {
    try {
      // NOTE not all codecs are supported by mp4 container. I don't know which ones )
      var repack = ffmpeg({
        arguments: ['-i', file.name, '-c', 'copy', outputDirectory + '/repack.mp4'],
        files: [file],
        fs: fs
      })[0];
    } catch(e) {
      // TODO use server for audio transcoding
      var repack = ffmpeg({
        arguments: ['-i', file.name, '-c:v', 'copy', '-strict', -2, outputDirectory + '/repack.mp4'],
        files: [file],
        fs: fs
      })[0];
    }
    file = repack.file();
    console.debug('repack', repack, 'file', file);
  }

  // fragment
  var frag = mp4fragment({
    arguments: ['--verbosity', 3, '--debug', file.name, outputDirectory + '/frag.mp4'],
    files: [file],
    fs: fs
  })[0];
  file = frag.file();
  console.debug('frag', frag);

  if (repack) {
    repack.remove();
  }

  // make chunks
  function makeChunks(track) {
    return mp4split({
      arguments: ['--init-segment', outputDirectory + '/' + track + '.mp4', '--media-segment', outputDirectory + '/' + track + '-%05llu.m4f', '--pattern-parameters', 'N', '--' + track, file.name],
      files: [file],
      fs: fs,
      outputDirectory: outputDirectory
    });
  }

  var chunks = makeChunks('video');
  console.debug(chunks);
  metadata.videoChunks = chunks.map(function(chunk) { return chunk.name });
  postMessage({ file: metadata.name, attr: 'videoChunks', value: metadata.videoChunks });

  if (metadata.audioStreams.length) {
    var chunks = makeChunks('audio');
    console.debug(chunks);
    metadata.audioChunks = chunks.map(function(chunk) { return chunk.name });
    postMessage({ file: metadata.name, attr: 'audioChunks', value: metadata.audioChunks });
  }

  frag.remove();
}

function processAudio(file, fs) {

}