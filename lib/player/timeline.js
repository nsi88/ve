'use strict';

function Timeline(timelineId, playerObj) {
  this.el = document.getElementById(timelineId);
  this.player = playerObj;
  this.range = this.el.getElementsByClassName('range')[0];
  this.range.addEventListener('input', this.oninput.bind(this), false);
  this.leftborder = this.el.getElementsByClassName('left-border')[0];
  this.rightborder = this.el.getElementsByClassName('right-border')[0];
  this.leftborderValue = null;
  this.rightborderValue = null;
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
  this.leftborderValue = 0;
  this.rightborderValue = duration;
  this.el.style.display = '';
};

Timeline.prototype.toggleLeftBorder = function() {
  var newPosition = Math.round(parseInt(this.el.style.width) * this.progress()) + 'px';
  if (this.leftborder.style.left != newPosition || this.leftborder.style.display == 'none') {
    this.leftborderValue = this.range.value;
    this.leftborder.style.left = newPosition;
    this.leftborder.style.display = '';
  } else {
    this.leftborderValue = 0;
    this.leftborder.style.left = 0;
    this.leftborder.style.display = 'none';
  }
};

Timeline.prototype.toggleRightBorder = function() {
  var newPosition = Math.round(parseInt(this.el.style.width) * this.progress()) + 'px';
  if (this.rightborder.style.left != newPosition || this.rightborder.style.display == 'none') {
    this.rightborderValue = this.range.value;
    this.rightborder.style.left = newPosition;
    this.rightborder.style.display = '';
  } else {
    this.rightborderValue = 0;
    this.rightborder.style.left = 0;
    this.rightborder.style.display = 'none';
  }
};

module.exports = Timeline;