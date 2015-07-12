'use strict';

importScripts('ffmpeg.js?' + Math.random());
var fileReader = new FileReaderSync();

onmessage = function(event) {
	var file = event.data;
	if (file.type.indexOf('video') === 0) {
		processVideo(file);
	} else if (file.type.indexOf('audio') === 0) {
		processAudio(file);
	} else {
		postMessage({ type: 'error', data: 'Invalid file type ' + file.type });
	}
};

function processVideo(file) {
	// read
	// var fileData;
	// try {
	// 	fileData = new Uint8Array(fileReader.readAsArrayBuffer(file));
	// } catch(e) {
	// 	postMessage({
	// 		type: 'error',
	// 		data: e.message
	// 	});
	// 	return;
	// }
 //  postMessage({ type: 'log', data: fileData });

	// metadata
  var TOTAL_MEMORY = 268435456;
	var metadata = {
		keyFrames: [],
		duration: null,
		videoStreams: [],
		audioStreams: [],
    output: false
	};
	ffmpegRun({
		arguments: ['-i', file.name, '-an', '-vf', 'select=key,showinfo', '-copyts', '-f', 'null', '-'],
		files: [file],
		print: parseFfmpegLog.bind(this, metadata),
		printErr: parseFfmpegLog.bind(this, metadata),
		TOTAL_MEMORY: TOTAL_MEMORY
	});
  // XXX
  delete(metadata.output);
	postMessage({ type: 'log', data: metadata });

	// // thumbnail
	// var image = ffmpegRun({
	// 	arguments: ['-ss', metadata.keyFrames[Math.ceil(metadata.keyFrames.length/2)], '-i', file.name, '-an', '-f', 'image2', '-vframes', 1, '-vf', 'scale=-1:100', 'output.jpg'],
	// 	files: [{
	// 		name: file.name,
	// 		data: fileData,
 //    }],
 //    TOTAL_MEMORY: TOTAL_MEMORY
	// });
	// postMessage({ type: 'image', data: image });

 //  // repack
 //  if (file.name.split('.').pop() != 'mp4') {
 //    try {
 //      fileData = ffmpegRun({
 //        arguments: ['-i', file.name, '-c', 'copy', 'output.mp4'],
 //        files: [{
 //          name: file.name,
 //          data: fileData
 //        }],
 //        TOTAL_MEMORY: TOTAL_MEMORY
 //      });
 //    } catch(e) {
 //      fileData = ffmpegRun({
 //        arguments: ['-i', file.name, '-c:v', 'copy', '-strict', -2, 'output.mp4'],
 //        files: [{
 //          name: file.name,
 //          data: fileData
 //        }],
 //        TOTAL_MEMORY: TOTAL_MEMORY
 //      });
 //    }
 //    console.log(fileData);
 //  }
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

function processAudio(file) {

}