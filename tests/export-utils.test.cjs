const assert = require('node:assert/strict');
const test = require('node:test');

const { buildExportRenderPlan, buildFramePlan } = require('../export-utils.js');

test('iOS video export keeps MP4 format while downscaling encoded frames', () => {
    const plan = buildExportRenderPlan({
        dims: { width: 1080, height: 1440 },
        format: 'mp4',
        fps: 24,
        isIOS: true
    });

    assert.deepEqual(plan.layoutDims, { width: 1080, height: 1440 });
    assert.deepEqual(plan.outputDims, { width: 360, height: 480 });
    assert.equal(plan.outputFormat, 'mp4');
    assert.equal(plan.fps, 10);
    assert.equal(plan.maxFrames, 60);
});

test('iOS GIF export remains GIF while downscaling encoded frames', () => {
    const plan = buildExportRenderPlan({
        dims: { width: 1080, height: 1440 },
        format: 'gif',
        fps: 15,
        isIOS: true
    });

    assert.deepEqual(plan.layoutDims, { width: 1080, height: 1440 });
    assert.deepEqual(plan.outputDims, { width: 360, height: 480 });
    assert.equal(plan.outputFormat, 'gif');
    assert.equal(plan.fps, 10);
    assert.equal(plan.maxFrames, 50);
});

test('frame plan preserves duration when capped to fewer mobile frames', () => {
    const plan = buildFramePlan({ durationMs: 8340, fps: 10, maxFrames: 50 });

    assert.equal(plan.totalFrames, 50);
    assert.equal(plan.frameDelayMs, 167);
    assert.equal(plan.frameDurationMs, 166.8);
    assert.equal(plan.progressAt(0), 0);
    assert.equal(plan.progressAt(49), 1);
    assert.equal(Math.round(plan.frameDurationMs * plan.totalFrames), 8340);
});
