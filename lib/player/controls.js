'use strict';

function Controls(controlsId, playerObj) {
  this.el = document.getElementById(controlsId);
  this.player = playerObj;

  var _this = this;
  ['fast-backward', 'backward', 'left-border', 'play-pause', 'right-border', 'forward', 'fast-forward', 'slice'].forEach(function(control) {
    _this.el.getElementsByClassName(control)[0].addEventListener('click', _this['on' + control.replace('-', '')].bind(_this), false);
  });
}

Controls.prototype.onfastbackward = function() {
  this.player._seekRel(-5);
};

Controls.prototype.onbackward = function() {
  this.player._seekRel(-0.1);
};

Controls.prototype.onleftborder = function() {
  this.player._toggleLeftBorder();
};

Controls.prototype.onplaypause = function() {
  var button = this.el.getElementsByClassName('play-pause')[0].getElementsByClassName('glyphicon')[0];
  if (button.className.indexOf('glyphicon-play') != -1) {
    this.player.play();
  } else {
    this.player.pause();
  }
};

Controls.prototype.onrightborder = function() {
  this.player._toggleRightBorder();
};

Controls.prototype.onforward = function() {
  this.player._seekRel(0.1);

};

Controls.prototype.onfastforward = function() {
  this.player._seekRel(5);
};

Controls.prototype.onslice = function() {
  this.player._slice();
};

Controls.prototype.play = function() {
  var playButton = this.el.getElementsByClassName('glyphicon-play')[0];
  if (playButton) {
    playButton.className = playButton.className.replace('glyphicon-play', 'glyphicon-pause');
  }
};

Controls.prototype.pause = function() {
  var pauseButton = this.el.getElementsByClassName('glyphicon-pause')[0];
  if (pauseButton) {
    pauseButton.className = pauseButton.className.replace('glyphicon-pause', 'glyphicon-play');
  }
};

Controls.prototype.show = function() {
  this.el.style.display = '';
};

module.exports = Controls;