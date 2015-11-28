'use strict';

function Timeline(timelineId, playerObj) {
  this.el = document.getElementById(timelineId);
  this.player = playerObj;
  this.range = this.el.getElementsByClassName('range')[0];
  this.range.addEventListener('input', this.oninput.bind(this), false);
  this.leftBorder = this.el.getElementsByClassName('left-border')[0];
  this.rightBorder = this.el.getElementsByClassName('right-border')[0];
  this.leftBorderValue = null;
  this.rightBorderValue = null;
}

Timeline.prototype.oninput = function(e) {
  this.player.seek(this.range.value);
};

Timeline.prototype.progress = function() {
  return this.range.value / (this.range.max - this.range.min);
};

Timeline.prototype.seek = function(position) {
  this.range.value = position;
};

Timeline.prototype.setDuration = function(duration) {
  this.range.max = duration;
  this.range.value = 0;
  this.leftBorderValue = 0;
  this.leftBorder.style.left = this.leftBorderValue;
  this.leftBorder.style.display = 'none';
  this.rightBorderValue = duration;
  this.rightBorder.style.left = this.rightBorderValue;
  this.rightBorder.style.display = 'none';
  this.el.style.display = '';
};

Timeline.prototype.toggleLeftBorder = function() {
  var newPosition = Math.round(parseInt(this.el.style.width) * this.progress()) + 'px';
  if (this.leftBorder.style.left != newPosition || this.leftBorder.style.display == 'none') {
    this.leftBorderValue = parseFloat(this.range.value);
    this.leftBorder.style.left = newPosition;
    this.leftBorder.style.display = '';
  } else {
    this.leftBorderValue = 0;
    this.leftBorder.style.left = 0;
    this.leftBorder.style.display = 'none';
  }
};

Timeline.prototype.toggleRightBorder = function() {
  var newPosition = Math.round(parseInt(this.el.style.width) * this.progress()) + 'px';
  if (this.rightBorder.style.left != newPosition || this.rightBorder.style.display == 'none') {
    this.rightBorderValue = parseFloat(this.range.value);
    this.rightBorder.style.left = newPosition;
    this.rightBorder.style.display = '';
  } else {
    this.rightBorderValue = this.range.max;
    this.rightBorder.style.left = this.range.max;
    this.rightBorder.style.display = 'none';
  }
};

module.exports = Timeline;