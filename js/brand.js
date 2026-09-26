// Gymlo brand drawing for canvases (generated with the icons; keep in sync with
// icons/wordmark.svg). Wordmark: "GYMLO" in Kanit ExtraBold Italic (SIL OFL),
// as outlines, 100 units tall.

export const WORDMARK_WIDTH = 499; // at a height of 100
const WORDMARK = new Path2D("M45.5 100L45.5 100Q24.5 100 12.3 90.6Q-0.0 81.2-0.0 63.0L-0.0 63.0Q-0.0 57.2 1.4 50.5L1.4 50.5Q6.6 25.9 23.6 13.0Q40.5 0 69.1 0L69.1 0Q86.6 0 98.8 4.4L98.8 4.4L92.9 31.9Q87.3 29.5 80.5 28.5Q73.6 27.4 65.5 27.4L65.5 27.4Q52.7 27.4 44.8 32.7Q36.9 38.0 34.3 50.5L34.3 50.5Q33.7 53.3 33.4 55.7Q33.1 58.1 33.1 60.2L33.1 60.2Q33.1 67.2 37.3 69.9Q41.6 72.6 51.2 72.6L51.2 72.6Q57.8 72.6 63.0 71.1L63.0 71.1L65.1 61.1L47.4 61.1L51.7 41.4L96.2 41.4L85.7 90.8Q79.1 94.7 69.0 97.4Q58.9 100 45.5 100ZM150.8 98.5L118.4 98.5L125.8 63.1L103.9 1.5L136.7 1.5L147.1 35.2L171.7 1.5L206.3 1.5L158.1 63.1L150.8 98.5ZM224.2 98.5L191.9 98.5L212.3 1.5L242.3 1.5L254.8 46.2L286.0 1.5L318.1 1.5L297.6 98.5L265.2 98.5L273.9 57.2L256.6 81.9L239.8 81.9L233.0 57.2L224.2 98.5ZM383.7 98.5L309.8 98.5L330.3 1.5L362.7 1.5L347.3 73.8L388.9 73.8L383.7 98.5ZM435.5 100L435.5 100Q423.0 100 413.6 96.3Q404.2 92.6 399.0 84.9Q393.8 77.1 393.8 64.9L393.8 64.9Q393.8 61.4 394.2 57.8Q394.6 54.2 395.5 50.2L395.5 50.2Q399.4 31.9 407.2 20.9Q414.9 9.9 427.2 5.0Q439.5 0 456.9 0L456.9 0Q476.2 0 487.4 8.6Q498.6 17.2 498.6 35.4L498.6 35.4Q498.6 38.7 498.3 42.4Q497.9 46.1 497.0 50.2L497.0 50.2Q493.2 68.1 485.5 79.1Q477.7 90.1 465.4 95.0Q453.2 100 435.5 100ZM441.4 72.6L441.4 72.6Q450.8 72.6 456.0 67.3Q461.3 62.0 463.9 50.2L463.9 50.2Q465.2 43.8 465.2 39.6L465.2 39.6Q465.2 33.0 461.9 30.3Q458.6 27.6 451.1 27.6L451.1 27.6Q441.6 27.6 436.3 32.6Q431.0 37.7 428.5 50.2L428.5 50.2Q427.1 56.2 427.1 60.4L427.1 60.4Q427.1 66.9 430.5 69.7Q433.9 72.6 441.4 72.6Z");

// Dumbbell mark, drawn in a 100x100 box: [x, y, width, height, radius] around the center.
const MARK_RECTS = [[-60,-20,14,40,5],[-44,-38,18,76,6],[-28,-8,56,16,4],[26,-38,18,76,6],[46,-20,14,40,5]];

export function drawMark(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(size / 100, size / 100);
  ctx.rotate((-40 * Math.PI) / 180);
  ctx.scale(0.72, 0.72); // the rotated dumbbell then fits its 100x100 box
  ctx.fillStyle = color;
  for (const [rx, ry, w, h, r] of MARK_RECTS) {
    ctx.beginPath();
    ctx.roundRect(rx, ry, w, h, r);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWordmark(ctx, x, y, height, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(height / 100, height / 100);
  ctx.fillStyle = color;
  ctx.fill(WORDMARK);
  ctx.restore();
}
