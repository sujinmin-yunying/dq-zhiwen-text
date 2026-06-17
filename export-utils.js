(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.ExportUtils = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function normalizeDims(dims) {
        return {
            width: Math.max(1, Math.round(Number(dims.width) || 1)),
            height: Math.max(1, Math.round(Number(dims.height) || 1))
        };
    }

    function scaleToMax(dims, maxDim) {
        const normalized = normalizeDims(dims);
        if (!Number.isFinite(maxDim) || maxDim <= 0) {
            return normalized;
        }
        if (normalized.width <= maxDim && normalized.height <= maxDim) {
            return normalized;
        }
        const scale = Math.min(maxDim / normalized.width, maxDim / normalized.height);
        return {
            width: Math.max(1, Math.round(normalized.width * scale)),
            height: Math.max(1, Math.round(normalized.height * scale))
        };
    }

    function buildExportRenderPlan(options) {
        const dims = normalizeDims(options.dims || {});
        const format = options.format === 'mp4' ? 'mp4' : 'gif';
        const isIOS = Boolean(options.isIOS);
        const requestedFps = Math.max(1, Math.round(Number(options.fps) || (format === 'mp4' ? 24 : 15)));
        const fps = isIOS ? Math.min(requestedFps, 10) : requestedFps;
        const outputFormat = isIOS && format === 'mp4' ? 'gif' : format;
        const outputDims = isIOS ? scaleToMax(dims, 480) : dims;

        return {
            fps,
            layoutDims: dims,
            maxFrames: isIOS ? (format === 'mp4' ? 60 : 50) : (format === 'gif' ? 100 : Infinity),
            outputDims,
            outputFormat,
            usesScaledOutput: outputDims.width !== dims.width || outputDims.height !== dims.height
        };
    }

    function buildFramePlan(options) {
        const durationMs = Math.max(1, Number(options.durationMs) || 1);
        const fps = Math.max(1, Number(options.fps) || 1);
        const maxFrames = Number.isFinite(options.maxFrames)
            ? Math.max(1, Math.floor(options.maxFrames))
            : Infinity;
        const naturalFrames = Math.max(1, Math.ceil(durationMs / 1000 * fps));
        const totalFrames = Math.min(naturalFrames, maxFrames);
        const frameDurationMs = durationMs / totalFrames;
        const frameDelayMs = Math.max(20, Math.round(frameDurationMs));

        return {
            durationMs,
            fps,
            frameDelayMs,
            frameDurationMs,
            totalFrames,
            progressAt(index) {
                if (totalFrames <= 1) return 1;
                return Math.max(0, Math.min(1, index / (totalFrames - 1)));
            }
        };
    }

    return {
        buildExportRenderPlan,
        buildFramePlan,
        scaleToMax
    };
}));
