class FingerprintTextApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = {
            text: '',
            colorPalette: ['#5B9BD5', '#E06666', '#93C47D', '#F6B26B', '#8E7CC3', '#76A5AF', '#D5A6BD'],
            colorMode: 'sequential',
            textLayout: 'perRidge',
            fingerprintStyle: 'whorl',
            animPattern: 'random',
            fontSize: 14,
            letterSpacing: 2,
            spiralTurns: 5,
            fingerprintSize: 350,
            ridgeDensity: 12,
            rotation: 0,
            bgType: 'white',
            bgColor: '#FFFFFF',
            bgImage: null,
            animProgress: 1,
            animSpeed: 5,
            loopAnim: true,
            isPlaying: false,
            pixelSize: 8,
            rgbOffset: 5,
            floatDensity: 30,
            gifFps: 15,
            effects: {
                crt: false, pixel: false, rgb: false, glitch: false,
                noise: false, scanline: false, vignette: false, blur: false,
                floatHearts: false, floatBokeh: false, floatSnow: false,
                floatRain: false, floatDust: false, floatParticles: false,
                stickerText: false, stickerGeo: false, stickerPaper: false,
                stickerTape: false, textureScratch: false, textureDust: false,
                textureInk: false, borderTorn: false,
                geoSlice: false, geoSplit: false, geoHole: false,
                geoShift: false, geoMosaic: false, geoBarcode: false
            }
        };

        this.animFrame = null;
        this.animStartTime = 0;
        this.floatElements = [];
        this.particles = [];
        this.stickerSeed = this.makeSeed();
        this.fingerSeed = this.makeSeed();
        this.shuffleSeed = this.makeSeed();
        this.ridgeAppearOrder = [];
        this.ridgeColorMap = [];
        this.exporting = false;
        this.exportCancel = false;
        this.cachedRidges = null;
        this.cachedRidgeParams = null;

        this.init();
    }

    makeSeed() {
        return Math.random() * 10000;
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 43758.5453123;
        return x - Math.floor(x);
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.buildPaletteUI();
        this.generateFloatElements();
        this.render();
        this.updateExportPreview();
    }

    setupCanvas() {
        const isMobile = window.innerWidth <= 768;
        const canvasAspect = 3 / 4;
        let maxW, maxH;
        if (isMobile) {
            const area = document.querySelector('.canvas-area');
            maxW = area ? area.clientWidth - 16 : window.innerWidth - 16;
            maxH = area ? area.clientHeight - 40 : window.innerHeight * 0.4;
        } else {
            maxW = Math.min(window.innerWidth - 340, 720);
            maxH = Math.min(window.innerHeight - 40, 960);
        }
        let w = Math.max(200, Math.min(maxW, maxH * canvasAspect));
        let h = Math.max(267, Math.min(maxH, maxW / canvasAspect));
        w = Math.round(w);
        h = Math.round(h);
        this.canvas.width = w;
        this.canvas.height = h;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        document.getElementById('canvasSize').textContent = `${w} x ${h}`;
    }

    bindEvents() {
        document.getElementById('textInput').addEventListener('input', (e) => {
            this.state.text = e.target.value;
            this.cachedRidges = null;
            this.render();
        });

        document.getElementById('colorMode').addEventListener('change', (e) => {
            this.state.colorMode = e.target.value;
            this.assignRidgeColors();
            this.render();
        });

        document.getElementById('textLayout').addEventListener('change', (e) => {
            this.state.textLayout = e.target.value;
            this.cachedRidges = null;
            this.render();
        });

        document.getElementById('fingerprintStyle').addEventListener('change', (e) => {
            this.state.fingerprintStyle = e.target.value;
            this.cachedRidges = null;
            this.render();
        });

        document.getElementById('animPattern').addEventListener('change', (e) => {
            this.state.animPattern = e.target.value;
            this.shuffleRidgeOrder();
            this.render();
        });

        document.getElementById('addColor').addEventListener('click', () => {
            const hue = Math.floor(Math.random() * 360);
            this.state.colorPalette.push(this.hslToHex(hue, 70, 60));
            this.buildPaletteUI();
            this.assignRidgeColors();
            this.render();
        });

        document.getElementById('randomAllColors').addEventListener('click', () => {
            this.state.colorPalette = this.state.colorPalette.map(() => {
                return this.hslToHex(Math.random() * 360, 60 + Math.random() * 30, 45 + Math.random() * 25);
            });
            this.buildPaletteUI();
            this.assignRidgeColors();
            this.render();
        });

        this.bindSlider('fontSize', 'fontSizeVal', (v) => { this.state.fontSize = v; this.cachedRidges = null; this.render(); });
        this.bindSlider('letterSpacing', 'letterSpacingVal', (v) => { this.state.letterSpacing = v; this.render(); });
        this.bindSlider('spiralTurns', 'spiralTurnsVal', (v) => { this.state.spiralTurns = v; this.cachedRidges = null; this.render(); });
        this.bindSlider('fingerprintSize', 'fingerprintSizeVal', (v) => { this.state.fingerprintSize = v; this.cachedRidges = null; this.render(); });
        this.bindSlider('rotation', 'rotationVal', (v) => { this.state.rotation = v; this.cachedRidges = null; this.render(); }, '°');
        this.bindSlider('animSpeed', null, (v) => { this.state.animSpeed = v; });
        this.bindSlider('pixelSize', null, (v) => { this.state.pixelSize = v; this.render(); });
        this.bindSlider('rgbOffset', null, (v) => { this.state.rgbOffset = v; this.render(); });
        this.bindSlider('floatDensity', null, (v) => { this.state.floatDensity = v; this.generateFloatElements(); this.render(); });
        this.bindSlider('gifFps', 'gifFpsVal', (v) => { this.state.gifFps = v; });

        document.querySelectorAll('.bg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.bgType = btn.dataset.bg;
                this.render();
            });
        });
        document.getElementById('bgColor').addEventListener('input', (e) => {
            this.state.bgColor = e.target.value;
            this.state.bgType = 'custom';
            document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
            this.render();
        });
        document.getElementById('bgImage').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        this.state.bgImage = img;
                        this.state.bgType = 'image';
                        this.render();
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('playAnim').addEventListener('click', () => this.toggleAnimation());
        document.getElementById('resetAnim').addEventListener('click', () => {
            this.state.animProgress = 0;
            this.render();
        });
        document.getElementById('loopAnim').addEventListener('change', (e) => {
            this.state.loopAnim = e.target.checked;
        });
        document.getElementById('regenFingerprint').addEventListener('click', () => {
            this.fingerSeed = this.makeSeed();
            this.cachedRidges = null;
            this.render();
        });
        document.getElementById('regenAnimOrder').addEventListener('click', () => {
            this.shuffleSeed = this.makeSeed();
            this.cachedRidges = null;
            this.render();
        });

        const fxMap = {
            'fxCRT': 'crt', 'fxPixel': 'pixel', 'fxRGB': 'rgb', 'fxGlitch': 'glitch',
            'fxNoise': 'noise', 'fxScanline': 'scanline', 'fxVignette': 'vignette', 'fxBlur': 'blur',
            'floatHearts': 'floatHearts', 'floatBokeh': 'floatBokeh', 'floatSnow': 'floatSnow',
            'floatRain': 'floatRain', 'floatDust': 'floatDust', 'floatParticles': 'floatParticles',
            'stickerText': 'stickerText', 'stickerGeo': 'stickerGeo', 'stickerPaper': 'stickerPaper',
            'stickerTape': 'stickerTape', 'textureScratch': 'textureScratch', 'textureDust': 'textureDust',
            'textureInk': 'textureInk', 'borderTorn': 'borderTorn',
            'geoSlice': 'geoSlice', 'geoSplit': 'geoSplit', 'geoHole': 'geoHole',
            'geoShift': 'geoShift', 'geoMosaic': 'geoMosaic', 'geoBarcode': 'geoBarcode'
        };

        Object.entries(fxMap).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    this.state.effects[key] = e.target.checked;
                    if (key === 'pixel') {
                        document.getElementById('pixelSizeRow').style.display = e.target.checked ? 'flex' : 'none';
                    }
                    if (key === 'rgb') {
                        document.getElementById('rgbOffsetRow').style.display = e.target.checked ? 'flex' : 'none';
                    }
                    this.render();
                });
            }
        });

        document.getElementById('exportPNG').addEventListener('click', () => this.exportPNG());
        document.getElementById('exportGIF').addEventListener('click', () => this.exportGIF());
        document.getElementById('exportMP4').addEventListener('click', () => this.exportMP4());
        document.getElementById('cancelExport').addEventListener('click', () => {
            this.exportCancel = true;
        });
        document.getElementById('exportAspect').addEventListener('change', (e) => {
            const val = e.target.value;
            if (val !== 'custom') {
                const res = parseInt(document.getElementById('exportResolution').value) || 1080;
                const [w, h] = val.split(':').map(Number);
                let newW, newH;
                if (w >= h) {
                    newH = res;
                    newW = Math.round(res * w / h);
                } else {
                    newW = res;
                    newH = Math.round(res * h / w);
                }
                document.getElementById('exportWidth').value = newW;
                document.getElementById('exportHeight').value = newH;
            }
            this.updateExportPreview();
        });

        document.getElementById('exportResolution').addEventListener('change', (e) => {
            const res = parseInt(e.target.value) || 1080;
            const aspect = document.getElementById('exportAspect').value;
            if (aspect !== 'custom') {
                const [w, h] = aspect.split(':').map(Number);
                let newW, newH;
                if (w >= h) {
                    newH = res;
                    newW = Math.round(res * w / h);
                } else {
                    newW = res;
                    newH = Math.round(res * h / w);
                }
                document.getElementById('exportWidth').value = newW;
                document.getElementById('exportHeight').value = newH;
            }
            this.updateExportPreview();
        });

        document.getElementById('exportWidth').addEventListener('input', () => {
            document.getElementById('exportAspect').value = 'custom';
            this.updateExportPreview();
        });

        document.getElementById('exportHeight').addEventListener('input', () => {
            document.getElementById('exportAspect').value = 'custom';
            this.updateExportPreview();
        });

        window.addEventListener('resize', () => {
            if (!this.exporting) {
                this.setupCanvas();
                this.cachedRidges = null;
                this.render();
                this.updateExportPreview();
            }
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (!this.exporting) {
                    this.setupCanvas();
                    this.cachedRidges = null;
                    this.render();
                    this.updateExportPreview();
                }
            }, 300);
        });
    }

    bindSlider(id, valId, callback, suffix = '') {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            const v = parseFloat(el.value);
            if (valId) document.getElementById(valId).textContent = v + suffix;
            callback(v);
        });
    }

    hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    buildPaletteUI() {
        const container = document.getElementById('colorPalette');
        if (!container) return;
        container.innerHTML = '';

        this.state.colorPalette.forEach((color, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'palette-color';
            wrapper.style.backgroundColor = color;
            wrapper.title = `颜色 ${idx + 1}`;

            const input = document.createElement('input');
            input.type = 'color';
            input.value = color;
            input.addEventListener('input', (e) => {
                this.state.colorPalette[idx] = e.target.value;
                wrapper.style.backgroundColor = e.target.value;
                this.assignRidgeColors();
                this.render();
            });

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-color';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state.colorPalette.length <= 1) return;
                this.state.colorPalette.splice(idx, 1);
                this.buildPaletteUI();
                this.assignRidgeColors();
                this.render();
            });

            wrapper.appendChild(input);
            wrapper.appendChild(removeBtn);
            container.appendChild(wrapper);
        });
    }

    // ========== 指纹脊线生成（弧线片段组成闭合指纹，有机扭曲） ==========
    generateFingerprintRidges(cx, cy, maxRadius, numRidges, rotation) {
        const ridges = [];
        const rotRad = (rotation * Math.PI) / 180;
        let seed = this.fingerSeed;

        const rng = () => {
            seed++;
            return this.seededRandom(seed);
        };

        const aspectY = 1.3;
        const aspectX = 0.85;
        const minAspect = Math.min(aspectX, aspectY);
        const maxDeviationRatio = 0.2;
        const minGap = this.state.fontSize / (minAspect * (1 - 2 * maxDeviationRatio));
        const maxPossibleRidges = Math.max(3, Math.floor(maxRadius / minGap));
        const effectiveRidges = Math.min(numRidges, maxPossibleRidges);
        const ridgeGap = maxRadius / (effectiveRidges + 1);
        const maxDeviation = ridgeGap * maxDeviationRatio;
        const spiralInfluence = (this.state.spiralTurns - 1) / 9;

        for (let r = 1; r <= effectiveRidges; r++) {
            const normalizedR = r / effectiveRidges;
            const baseRadius = r * ridgeGap;
            const rMin = baseRadius - maxDeviation;
            const rMax = baseRadius + maxDeviation;

            const segmentsThisRing = 2 + Math.floor(rng() * 2);
            const gapAngle = 0.08 + rng() * 0.12;
            const totalSweep = Math.PI * 2 - gapAngle * segmentsThisRing;
            const segSweep = totalSweep / segmentsThisRing;

            const spiralAngleOffset = normalizedR * spiralInfluence * Math.PI * 2;

            for (let s = 0; s < segmentsThisRing; s++) {
                const startAngle = s * (segSweep + gapAngle) + spiralAngleOffset;
                const sweepAngle = segSweep + (rng() - 0.5) * 0.15;

                const segCurvature = (rng() - 0.5) * 0.3 + spiralInfluence * 0.2;
                const segTwist = (rng() - 0.5) * 0.1 + spiralInfluence * 0.1;

                const wobbleAmp = (0.3 + rng() * 0.7) * maxDeviation;
                const wobbleFreq = 3 + Math.floor(rng() * 4);
                const wobblePhase = rng() * 6.28;
                const distortAmp = (0.2 + rng() * 0.5) * maxDeviation;
                const distortFreq = 5 + Math.floor(rng() * 3);
                const distortPhase = rng() * 6.28;

                const arcLen = baseRadius * sweepAngle;
                const numPoints = Math.max(60, Math.floor(arcLen * 1.8));
                const ridge = [];

                for (let i = 0; i <= numPoints; i++) {
                    const t = i / numPoints;
                    const angle = startAngle + t * sweepAngle;

                    const curve = segCurvature * Math.sin(t * Math.PI);
                    const twist = segTwist * t;
                    const effectiveAngle = angle + curve + twist;

                    const wobble = Math.sin(effectiveAngle * wobbleFreq + wobblePhase) * wobbleAmp;
                    const distort = Math.cos(effectiveAngle * distortFreq + distortPhase) * distortAmp;

                    let radius = baseRadius + wobble + distort;
                    radius = Math.max(rMin, Math.min(rMax, radius));

                    const rawX = Math.cos(effectiveAngle) * radius * aspectX;
                    const rawY = Math.sin(effectiveAngle) * radius * aspectY;

                    const x = cx + rawX * Math.cos(rotRad) - rawY * Math.sin(rotRad);
                    const y = cy + rawX * Math.sin(rotRad) + rawY * Math.cos(rotRad);

                    ridge.push({ x, y });
                }

                ridges.push(ridge);
            }
        }

        return ridges;
    }

    // ========== 常规指纹（涡旋/斗型指纹，同心圆螺旋排布） ==========
    generateWhorlRidges(cx, cy, maxRadius, numRidges, rotation) {
        const ridges = [];
        const rotRad = (rotation * Math.PI) / 180;
        let seed = this.fingerSeed;

        const rng = () => {
            seed++;
            return this.seededRandom(seed);
        };

        const aspectY = 1.3;
        const aspectX = 0.85;
        const minAspect = Math.min(aspectX, aspectY);
        const maxDeviationRatio = 0.2;

        const minGap = this.state.fontSize / (minAspect * (1 - 2 * maxDeviationRatio));
        const maxPossibleRidges = Math.max(3, Math.floor(maxRadius / minGap));
        const effectiveRidges = Math.min(numRidges, maxPossibleRidges);
        const ridgeGap = maxRadius / (effectiveRidges + 1);
        const maxDeviation = ridgeGap * maxDeviationRatio;

        const spiralInfluence = (this.state.spiralTurns - 1) / 9;

        for (let r = 0; r < effectiveRidges; r++) {
            const normalizedR = (r + 1) / effectiveRidges;
            const baseRadius = normalizedR * maxRadius;
            const rMin = Math.max(0, baseRadius - maxDeviation);
            const rMax = baseRadius + maxDeviation;

            const wobbleAmp = (0.2 + rng() * 0.5) * maxDeviation;
            const wobbleFreq = 4 + Math.floor(rng() * 5);
            const wobblePhase = rng() * 6.28;
            const distortAmp = (0.15 + rng() * 0.4) * maxDeviation;
            const distortFreq = 6 + Math.floor(rng() * 4);
            const distortPhase = rng() * 6.28;

            const hasFork = rng() > 0.7;
            const forkAngle = rng() * Math.PI * 2;
            const forkLen = 0.3 + rng() * 0.4;

            const spiralOffset = (1 - normalizedR) * spiralInfluence * Math.PI * 2;
            const startAngle = spiralOffset + rng() * 0.15;
            const sweepAngle = Math.PI * 2;

            const numPoints = Math.max(80, Math.floor(baseRadius * 2.5));
            const ridge = [];

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const angle = startAngle + t * sweepAngle;

                let forkFactor = 1;
                if (hasFork && t > forkAngle / (Math.PI * 2) && t < (forkAngle / (Math.PI * 2) + forkLen)) {
                    forkFactor = 1 + Math.sin((t - forkAngle / (Math.PI * 2)) / forkLen * Math.PI) * 0.3;
                }

                const wobble = Math.sin(angle * wobbleFreq + wobblePhase) * wobbleAmp;
                const distort = Math.cos(angle * distortFreq + distortPhase) * distortAmp;

                let radius = baseRadius + (wobble + distort) * forkFactor;
                radius = Math.max(rMin, Math.min(rMax, radius));

                const rawX = Math.cos(angle) * radius * aspectX;
                const rawY = Math.sin(angle) * radius * aspectY;

                const x = cx + rawX * Math.cos(rotRad) - rawY * Math.sin(rotRad);
                const y = cy + rawX * Math.sin(rotRad) + rawY * Math.cos(rotRad);

                ridge.push({ x, y });
            }

            ridges.push(ridge);
        }

        return ridges;
    }

    getRidges() {
        const params = `${this.canvas.width},${this.canvas.height},${this.state.fingerprintSize},${this.state.rotation},${this.state.spiralTurns},${this.state.fingerprintStyle},${this.fingerSeed},${this.state.text}`;
        if (this.cachedRidges && this.cachedRidgeParams === params) {
            return this.cachedRidges;
        }

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const maxRadius = Math.min(w, h) * 0.45;

        const lines = this.state.text.split('\n').filter(l => l.trim());
        let neededRidges = this.state.ridgeDensity;
        if (this.state.textLayout === 'perRidge') {
            neededRidges = Math.max(neededRidges, lines.length);
        } else {
            const fullText = lines.join('');
            const charSpacing = this.state.fontSize + this.state.letterSpacing;
            const avgCircumference = maxRadius * 0.6 * Math.PI * 2 * 0.85;
            const charsPerRidge = Math.max(1, Math.floor(avgCircumference / charSpacing));
            neededRidges = Math.max(neededRidges, Math.ceil(fullText.length / charsPerRidge));
        }

        if (this.state.fingerprintStyle === 'whorl') {
            this.cachedRidges = this.generateWhorlRidges(cx, cy, maxRadius, neededRidges, this.state.rotation);
        } else {
            this.cachedRidges = this.generateFingerprintRidges(cx, cy, maxRadius, neededRidges, this.state.rotation);
        }
        this.cachedRidgeParams = params;

        this.shuffleRidgeOrder();
        this.assignRidgeColors();

        return this.cachedRidges;
    }

    shuffleRidgeOrder() {
        const n = this.cachedRidges ? this.cachedRidges.length : this.state.ridgeDensity;
        this.ridgeAppearOrder = [];

        if (this.state.animPattern === 'dialogue') {
            this.buildDialogueOrder(n);
        } else if (this.state.animPattern === 'insideOut') {
            for (let i = 0; i < n; i++) {
                this.ridgeAppearOrder.push(i);
            }
        } else if (this.state.animPattern === 'outsideIn') {
            for (let i = n - 1; i >= 0; i--) {
                this.ridgeAppearOrder.push(i);
            }
        } else {
            for (let i = 0; i < n; i++) {
                this.ridgeAppearOrder.push(i);
            }
            for (let i = this.ridgeAppearOrder.length - 1; i > 0; i--) {
                const j = Math.floor(this.seededRandom(this.shuffleSeed + i * 7.3) * (i + 1));
                [this.ridgeAppearOrder[i], this.ridgeAppearOrder[j]] = [this.ridgeAppearOrder[j], this.ridgeAppearOrder[i]];
            }
        }
    }

    buildDialogueOrder(n) {
        if (!this.cachedRidges || this.cachedRidges.length === 0) {
            for (let i = 0; i < n; i++) this.ridgeAppearOrder.push(i);
            return;
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        const quadrants = [[], [], [], []];

        this.cachedRidges.forEach((ridge, idx) => {
            if (!ridge || ridge.length === 0) {
                quadrants[0].push(idx);
                return;
            }
            let sumX = 0, sumY = 0;
            const step = Math.max(1, Math.floor(ridge.length / 20));
            let count = 0;
            for (let i = 0; i < ridge.length; i += step) {
                sumX += ridge[i].x;
                sumY += ridge[i].y;
                count++;
            }
            const avgX = sumX / count;
            const avgY = sumY / count;

            const dx = avgX - cx;
            const dy = avgY - cy;

            let q;
            if (Math.abs(dx) > Math.abs(dy)) {
                q = dx < 0 ? 0 : 1;
            } else {
                q = dy < 0 ? 2 : 3;
            }
            quadrants[q].push(idx);
        });

        quadrants.forEach(q => {
            for (let i = q.length - 1; i > 0; i--) {
                const j = Math.floor(this.seededRandom(this.shuffleSeed + i * 3.7) * (i + 1));
                [q[i], q[j]] = [q[j], q[i]];
            }
        });

        const order = [0, 1, 2, 3];
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom(this.shuffleSeed + i * 11.3) * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }

        let ptr = 0;
        while (quadrants.some(q => q.length > 0)) {
            const qi = order[ptr % 4];
            if (quadrants[qi].length > 0) {
                this.ridgeAppearOrder.push(quadrants[qi].shift());
            }
            ptr++;
        }
    }

    assignRidgeColors() {
        const palette = this.state.colorPalette;
        const n = this.cachedRidges ? this.cachedRidges.length : this.state.ridgeDensity;
        this.ridgeColorMap = [];

        if (this.state.colorMode === 'sequential') {
            for (let i = 0; i < n; i++) {
                this.ridgeColorMap.push(palette[i % palette.length]);
            }
        } else if (this.state.colorMode === 'random') {
            for (let i = 0; i < n; i++) {
                this.ridgeColorMap.push(palette[Math.floor(this.seededRandom(this.shuffleSeed + i * 13.7) * palette.length)]);
            }
        } else if (this.state.colorMode === 'gradient') {
            for (let i = 0; i < n; i++) {
                const t = n > 1 ? i / (n - 1) : 0;
                const idx = t * (palette.length - 1);
                const lo = Math.floor(idx);
                const hi = Math.min(lo + 1, palette.length - 1);
                const frac = idx - lo;
                this.ridgeColorMap.push(this.lerpColor(palette[lo], palette[hi], frac));
            }
        }
    }

    lerpColor(c1, c2, t) {
        const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    }

    // ========== 文字沿路径排列（累积距离法） ==========
    renderTextAlongPath(ctx, text, path, color, ridgeProgress) {
        return this.renderTextAlongPathFrom(ctx, text, 0, path, color, ridgeProgress);
    }

    renderTextAlongPathFrom(ctx, text, startCharIdx, path, color, ridgeProgress) {
        if (!path || path.length < 2 || !text || text.length === 0) return 0;

        const totalPathLen = this.calcPathLength(path);
        if (totalPathLen < 1) return 0;

        const charSpacing = this.state.fontSize + this.state.letterSpacing;
        const maxChars = Math.floor(totalPathLen / charSpacing);
        if (maxChars === 0) return 0;

        const charsToShow = Math.floor(maxChars * Math.min(1, ridgeProgress));
        if (charsToShow === 0) return 0;

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${this.state.fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let accDist = 0;
        let placed = 0;
        let prevPt = path[0];

        for (let i = 1; i < path.length && placed < charsToShow; i++) {
            const pt = path[i];
            const dx = pt.x - prevPt.x;
            const dy = pt.y - prevPt.y;
            const segLen = Math.sqrt(dx * dx + dy * dy);
            accDist += segLen;

            while (accDist >= charSpacing && placed < charsToShow) {
                accDist -= charSpacing;
                const ratio = 1 - accDist / segLen;
                const px = prevPt.x + dx * ratio;
                const py = prevPt.y + dy * ratio;
                const angle = Math.atan2(dy, dx);

                const globalIdx = startCharIdx + placed;
                const ch = text[globalIdx % text.length];

                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle);
                ctx.fillText(ch, 0, 0);
                ctx.restore();

                placed++;
            }

            prevPt = pt;
        }

        ctx.restore();
        return placed;
    }

    calcPathLength(path) {
        let len = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            len += Math.sqrt(dx * dx + dy * dy);
        }
        return len;
    }

    // ========== 缓动函数 ==========
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    // ========== 浮动元素 ==========
    generateFloatElements() {
        this.floatElements = [];
        const count = this.state.floatDensity;
        const w = this.canvas.width || 720;
        const h = this.canvas.height || 720;

        for (let i = 0; i < count; i++) {
            this.floatElements.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 15 + 5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5 - 0.3,
                opacity: Math.random() * 0.4 + 0.1,
                type: Math.random() > 0.5 ? 'heart' : 'dot',
                phase: Math.random() * Math.PI * 2
            });
        }

        this.particles = [];
        for (let i = 0; i < count * 2; i++) {
            this.particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: Math.random(),
                size: Math.random() * 3 + 1,
                color: this.randomParticleColor()
            });
        }
    }

    randomParticleColor() {
        const colors = ['#ff6b9d', '#c44569', '#f8b500', '#4ecdc4', '#44a08d', '#96e6a1'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    drawFloatElements(ctx, time) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.state.effects.floatHearts) {
            this.floatElements.forEach(el => {
                const x = el.x + Math.sin(time * 0.001 + el.phase) * 20;
                const y = el.y + Math.cos(time * 0.0008 + el.phase) * 10;
                const floatY = ((y + time * 0.02) % h + h) % h;

                ctx.save();
                ctx.globalAlpha = el.opacity * 0.6;
                ctx.fillStyle = '#ff6b9d';
                this.drawHeart(ctx, x, floatY, el.size);
                ctx.restore();
            });
        }

        if (this.state.effects.floatBokeh) {
            this.floatElements.forEach(el => {
                const x = el.x + Math.sin(time * 0.0005 + el.phase) * 30;
                const y = el.y + Math.cos(time * 0.0007 + el.phase) * 20;

                ctx.save();
                ctx.globalAlpha = el.opacity * 0.3;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, el.size * 2);
                gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, el.size * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        if (this.state.effects.floatSnow) {
            this.particles.forEach(p => {
                p.y += p.vy + 0.5;
                p.x += p.vx + Math.sin(time * 0.001 + p.life) * 0.5;
                if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
                if (p.x > w) p.x = 0;
                if (p.x < 0) p.x = w;

                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        if (this.state.effects.floatRain) {
            for (let i = 0; i < this.state.floatDensity; i++) {
                const x = (i * 37 + time * 0.1) % w;
                const y = (time * 2 + i * 50) % (h + 100) - 50;
                const len = 15 + (i % 7) * 3;

                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = '#aaddff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - 2, y + len);
                ctx.stroke();
                ctx.restore();
            }
        }

        if (this.state.effects.floatDust) {
            this.particles.forEach(p => {
                p.x += p.vx * 0.3;
                p.y += p.vy * 0.3;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#d4c4a8';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        if (this.state.effects.floatParticles) {
            this.particles.forEach(p => {
                p.life -= 0.005;
                if (p.life <= 0) {
                    p.life = 1;
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                }
                p.x += p.vx;
                p.y += p.vy;

                ctx.save();
                ctx.globalAlpha = p.life * 0.6;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    }

    drawHeart(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.3);
        ctx.bezierCurveTo(x - size * 0.5, y + size * 0.7, x, y + size, x, y + size);
        ctx.bezierCurveTo(x, y + size, x + size * 0.5, y + size * 0.7, x + size * 0.5, y + size * 0.3);
        ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
        ctx.fill();
    }

    // ========== 视觉特效 ==========
    applyEffects(ctx, w, h) {
        if (this.state.effects.noise) {
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const n = (Math.random() - 0.5) * 30;
                data[i] = Math.min(255, Math.max(0, data[i] + n));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
            }
            ctx.putImageData(imageData, 0, 0);
        }

        if (this.state.effects.pixel) {
            this.applyPixelate(ctx, w, h);
        }

        if (this.state.effects.rgb) {
            this.applyRGBSplit(ctx, w, h);
        }

        if (this.state.effects.glitch) {
            this.applyGlitch(ctx, w, h);
        }

        if (this.state.effects.scanline) {
            this.applyScanlines(ctx, w, h);
        }

        if (this.state.effects.crt) {
            this.applyCRT(ctx, w, h);
        }

        if (this.state.effects.vignette) {
            this.applyVignette(ctx, w, h);
        }
    }

    applyPixelate(ctx, w, h) {
        const size = this.state.pixelSize;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);

        ctx.imageSmoothingEnabled = false;
        const smallW = Math.ceil(w / size);
        const smallH = Math.ceil(h / size);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
    }

    applyRGBSplit(ctx, w, h) {
        const offset = this.state.rgbOffset;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tempCanvas, offset, 0);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tempCanvas, -offset, 0);
        ctx.restore();
    }

    applyGlitch(ctx, w, h) {
        const numSlices = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < numSlices; i++) {
            const y = Math.floor(Math.random() * h);
            const sliceH = Math.floor(Math.random() * 20) + 5;
            const safeH = Math.min(sliceH, h - y);
            if (safeH <= 0) continue;
            const offset = Math.floor((Math.random() - 0.5) * 30);
            try {
                const imageData = ctx.getImageData(0, y, w, safeH);
                ctx.putImageData(imageData, offset, y);
            } catch (e) {}
        }
    }

    applyScanlines(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#000';
        for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
        }
        ctx.restore();
    }

    applyCRT(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000';
        for (let y = 0; y < h; y += 2) {
            ctx.fillRect(0, y, w, 1);
        }
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, 'rgba(255,255,255,0.02)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.04)');
        gradient.addColorStop(1, 'rgba(255,255,255,0.02)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    applyVignette(ctx, w, h) {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    // ========== 贴纸与肌理（使用确定性种子） ==========
    drawStickersAndTextures(ctx, w, h) {
        let seed = this.stickerSeed;

        const nextRand = () => {
            seed++;
            return this.seededRandom(seed);
        };

        if (this.state.effects.stickerText) {
            const fragments = ['LOVE', '心', '恋', '想', '等', '永', '远', 'KISS', 'DREAM'];
            ctx.save();
            for (let i = 0; i < 8; i++) {
                const x = nextRand() * w;
                const y = nextRand() * h;
                const rot = (nextRand() - 0.5) * 1;
                ctx.globalAlpha = 0.15;
                const palIdx = Math.floor(nextRand() * this.state.colorPalette.length);
                ctx.fillStyle = this.state.colorPalette[palIdx];
                ctx.font = `bold ${Math.floor(nextRand() * 20 + 10)}px sans-serif`;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.fillText(fragments[Math.floor(nextRand() * fragments.length)], 0, 0);
                ctx.restore();
            }
            ctx.restore();
        }

        if (this.state.effects.stickerGeo) {
            ctx.save();
            for (let i = 0; i < 6; i++) {
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = nextRand() > 0.5 ? '#ff6b9d' : '#4ecdc4';
                ctx.beginPath();
                const x = nextRand() * w;
                const y = nextRand() * h;
                const size = nextRand() * 30 + 10;
                if (nextRand() > 0.5) {
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                } else {
                    ctx.moveTo(x, y - size);
                    ctx.lineTo(x + size, y + size);
                    ctx.lineTo(x - size, y + size);
                }
                ctx.fill();
            }
            ctx.restore();
        }

        if (this.state.effects.stickerPaper) {
            ctx.save();
            for (let i = 0; i < 4; i++) {
                const x = nextRand() * w;
                const y = nextRand() * h;
                const pw = nextRand() * 60 + 40;
                const ph = nextRand() * 40 + 30;
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#f5f0e8';
                ctx.fillRect(x, y, pw, ph);
                ctx.strokeStyle = '#d0c8b8';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, pw, ph);
            }
            ctx.restore();
        }

        if (this.state.effects.stickerTape) {
            ctx.save();
            for (let i = 0; i < 3; i++) {
                const x = nextRand() * w;
                const y = nextRand() * h;
                const tw = nextRand() * 80 + 40;
                ctx.globalAlpha = 0.25;
                ctx.fillStyle = '#e8d5a3';
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate((nextRand() - 0.5) * 0.5);
                ctx.fillRect(-tw / 2, -8, tw, 16);
                ctx.restore();
            }
            ctx.restore();
        }

        if (this.state.effects.textureScratch) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.moveTo(nextRand() * w, nextRand() * h);
                ctx.lineTo(nextRand() * w, nextRand() * h);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (this.state.effects.textureDust) {
            ctx.save();
            for (let i = 0; i < 100; i++) {
                ctx.globalAlpha = nextRand() * 0.3;
                ctx.fillStyle = nextRand() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(nextRand() * w, nextRand() * h, nextRand() * 2 + 1, nextRand() * 2 + 1);
            }
            ctx.restore();
        }

        if (this.state.effects.textureInk) {
            ctx.save();
            for (let i = 0; i < 5; i++) {
                const x = nextRand() * w;
                const y = nextRand() * h;
                const r = nextRand() * 40 + 20;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
                gradient.addColorStop(0, `rgba(0,0,0,${nextRand() * 0.1 + 0.05})`);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (this.state.effects.borderTorn) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5, 3, 5]);
            ctx.strokeRect(10, 10, w - 20, h - 20);
            ctx.restore();
        }
    }

    // ========== 几何变换 ==========
    applyGeometricEffects(ctx, w, h) {
        if (this.state.effects.geoSlice) {
            const sliceY = Math.floor(h * 0.5);
            const offset = 20;
            try {
                const imageData = ctx.getImageData(0, sliceY, w, h - sliceY);
                ctx.putImageData(imageData, offset, sliceY);
            } catch (e) {}
        }

        if (this.state.effects.geoSplit) {
            const midX = Math.floor(w / 2);
            const offset = 15;
            try {
                const leftData = ctx.getImageData(0, 0, midX, h);
                const rightData = ctx.getImageData(midX, 0, w - midX, h);
                ctx.putImageData(leftData, -offset, 0);
                ctx.putImageData(rightData, midX + offset, 0);
            } catch (e) {}
        }

        if (this.state.effects.geoHole) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            let seed = this.stickerSeed + 100;
            for (let i = 0; i < 5; i++) {
                seed++;
                const x = this.seededRandom(seed) * w;
                const y = this.seededRandom(seed + 1) * h;
                const r = this.seededRandom(seed + 2) * 30 + 10;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (this.state.effects.geoShift) {
            try {
                const imageData = ctx.getImageData(0, 0, w, h);
                ctx.putImageData(imageData, 10, 5);
                ctx.globalAlpha = 0.5;
                ctx.putImageData(imageData, 0, 0);
                ctx.globalAlpha = 1;
            } catch (e) {}
        }

        if (this.state.effects.geoMosaic) {
            const blockSize = 20;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0);

            ctx.clearRect(0, 0, w, h);
            for (let y = 0; y < h; y += blockSize) {
                for (let x = 0; x < w; x += blockSize) {
                    const sx = Math.min(x + Math.floor(this.seededRandom(x * y) * blockSize * 0.5), w - blockSize);
                    const sy = Math.min(y + Math.floor(this.seededRandom(x + y) * blockSize * 0.5), h - blockSize);
                    ctx.drawImage(tempCanvas, sx, sy, blockSize, blockSize, x, y, blockSize, blockSize);
                }
            }
        }

        if (this.state.effects.geoBarcode) {
            ctx.save();
            let seed = this.stickerSeed + 200;
            for (let i = 0; i < 10; i++) {
                seed++;
                const y = this.seededRandom(seed) * h;
                const bh = this.seededRandom(seed + 1) * 5 + 2;
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = this.seededRandom(seed + 2) > 0.5 ? '#000' : '#fff';
                ctx.fillRect(0, y, w, bh);
            }
            ctx.restore();
        }
    }

    // ========== 背景绘制 ==========
    drawBackground(ctx, w, h) {
        switch (this.state.bgType) {
            case 'white':
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, w, h);
                break;
            case 'cream':
                ctx.fillStyle = '#F5F0E8';
                ctx.fillRect(0, 0, w, h);
                break;
            case 'dark':
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, w, h);
                break;
            case 'gradient':
                const gradient = ctx.createLinearGradient(0, 0, w, h);
                gradient.addColorStop(0, '#f5f7fa');
                gradient.addColorStop(1, '#c3cfe2');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);
                break;
            case 'custom':
                ctx.fillStyle = this.state.bgColor;
                ctx.fillRect(0, 0, w, h);
                break;
            case 'image':
                if (this.state.bgImage) {
                    ctx.drawImage(this.state.bgImage, 0, 0, w, h);
                } else {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, w, h);
                }
                break;
        }
    }

    // ========== 主渲染（随机纹路出现 + 指纹识别扫描效果） ==========
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.drawBackground(ctx, w, h);

        const ridges = this.getRidges();
        if (!this._cachedLines || this._cachedText !== this.state.text) {
            this._cachedLines = this.state.text.split('\n').filter(l => l.trim());
            this._cachedText = this.state.text;
        }
        const lines = this._cachedLines;
        if (lines.length === 0 || ridges.length === 0) {
            document.getElementById('frameInfo').textContent = `进度: ${Math.floor(this.state.animProgress * 100)}%`;
            return;
        }

        const progress = this.state.animProgress;
        const totalRidges = ridges.length;
        const appearOrder = this.ridgeAppearOrder;
        const ridgesVisible = Math.ceil(progress * totalRidges);

        if (this.state.textLayout === 'continuous') {
            this.renderContinuousMode(ctx, ridges, lines, appearOrder, ridgesVisible, progress, totalRidges);
        } else {
            this.renderPerRidgeMode(ctx, ridges, lines, appearOrder, ridgesVisible, progress, totalRidges);
        }

        this.drawFloatElements(ctx, performance.now());
        this.drawStickersAndTextures(ctx, w, h);
        this.applyGeometricEffects(ctx, w, h);
        this.applyEffects(ctx, w, h);

        document.getElementById('frameInfo').textContent = `进度: ${Math.floor(this.state.animProgress * 100)}%`;
    }

    renderPerRidgeMode(ctx, ridges, lines, appearOrder, ridgesVisible, progress, totalRidges) {
        for (let orderIdx = 0; orderIdx < ridgesVisible; orderIdx++) {
            const ridgeIdx = appearOrder[orderIdx];
            const ridge = ridges[ridgeIdx];
            if (!ridge) continue;

            let ridgeAlpha = 1;
            if (orderIdx === ridgesVisible - 1) {
                const prevCount = Math.floor(progress * totalRidges);
                const frac = progress * totalRidges - prevCount;
                ridgeAlpha = frac;
            }

            const lineIdx = ridgeIdx % lines.length;
            const line = lines[lineIdx];
            const color = this.ridgeColorMap[ridgeIdx] || this.state.colorPalette[0];

            ctx.save();
            ctx.globalAlpha = ridgeAlpha;
            this.renderTextAlongPath(ctx, line, ridge, color, 1);
            ctx.restore();
        }
    }

    renderContinuousMode(ctx, ridges, lines, appearOrder, ridgesVisible, progress, totalRidges) {
        const fullText = lines.join('');
        if (!fullText) return;

        const sortedVisible = [];
        for (let orderIdx = 0; orderIdx < ridgesVisible; orderIdx++) {
            sortedVisible.push(appearOrder[orderIdx]);
        }
        sortedVisible.sort((a, b) => a - b);

        let charOffset = 0;

        for (let i = 0; i < sortedVisible.length; i++) {
            const ridgeIdx = sortedVisible[i];
            const ridge = ridges[ridgeIdx];
            if (!ridge) continue;

            const isLatestRidge = (appearOrder[ridgesVisible - 1] === ridgeIdx);
            let ridgeAlpha = 1;
            if (isLatestRidge) {
                const prevCount = Math.floor(progress * totalRidges);
                const frac = progress * totalRidges - prevCount;
                ridgeAlpha = Math.max(0.1, frac);
            }

            const color = this.ridgeColorMap[ridgeIdx] || this.state.colorPalette[0];

            ctx.save();
            ctx.globalAlpha = ridgeAlpha;
            const placed = this.renderTextAlongPathFrom(ctx, fullText, charOffset, ridge, color, 1);
            ctx.restore();

            charOffset += placed;
        }
    }

    // ========== 渲染到指定canvas（独立渲染，不影响主画布） ==========
    renderToCanvas(targetCanvas, targetCtx, progress) {
        const savedCanvas = this.canvas;
        const savedCtx = this.ctx;
        const savedProgress = this.state.animProgress;
        const savedRidges = this.cachedRidges;
        const savedRidgeParams = this.cachedRidgeParams;

        this.canvas = targetCanvas;
        this.ctx = targetCtx;
        this.state.animProgress = progress;
        this.cachedRidges = null;
        this.cachedRidgeParams = null;

        try {
            this.render();
        } finally {
            this.canvas = savedCanvas;
            this.ctx = savedCtx;
            this.state.animProgress = savedProgress;
            this.cachedRidges = savedRidges;
            this.cachedRidgeParams = savedRidgeParams;
        }
    }

    getExportDimensions() {
        const w = Math.max(100, Math.min(4096, parseInt(document.getElementById('exportWidth').value) || 720));
        const h = Math.max(100, Math.min(4096, parseInt(document.getElementById('exportHeight').value) || 960));
        return { width: w, height: h };
    }

    updateExportPreview() {
        const dims = this.getExportDimensions();
        const infoEl = document.getElementById('exportPreviewInfo');
        const dimInfoEl = document.getElementById('exportDimInfo');
        if (infoEl) infoEl.textContent = `${dims.width} × ${dims.height}`;
        if (dimInfoEl) dimInfoEl.textContent = `导出: ${dims.width} × ${dims.height}`;

        const overlay = document.getElementById('exportFrameOverlay');
        if (overlay) {
            const canvas = this.canvas;
            const canvasAspect = canvas.width / canvas.height;
            const exportAspect = dims.width / dims.height;

            let overlayW, overlayH;
            if (exportAspect > canvasAspect) {
                overlayW = canvas.clientWidth;
                overlayH = canvas.clientWidth / exportAspect;
            } else {
                overlayH = canvas.clientHeight;
                overlayW = canvas.clientHeight * exportAspect;
            }

            overlay.style.width = overlayW + 'px';
            overlay.style.height = overlayH + 'px';
            overlay.style.left = ((canvas.clientWidth - overlayW) / 2) + 'px';
            overlay.style.top = ((canvas.clientHeight - overlayH) / 2) + 'px';
        }
    }

    // ========== 动画系统 ==========
    toggleAnimation() {
        if (this.state.isPlaying) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }

    startAnimation() {
        this.state.isPlaying = true;
        document.getElementById('playAnim').textContent = '暂停动画';
        this.state.animProgress = 0;
        this.animStartTime = performance.now();
        this.animate();
    }

    stopAnimation() {
        this.state.isPlaying = false;
        document.getElementById('playAnim').textContent = '播放动画';
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }
    }

    animate() {
        if (!this.state.isPlaying) return;

        const elapsed = performance.now() - this.animStartTime;
        const duration = (11 - this.state.animSpeed) * 1000;
        this.state.animProgress = Math.min(1, elapsed / duration);

        this.render();

        if (this.state.animProgress >= 1) {
            if (this.state.loopAnim) {
                this.state.animProgress = 0;
                this.animStartTime = performance.now();
            } else {
                this.stopAnimation();
                return;
            }
        }

        this.animFrame = requestAnimationFrame(() => this.animate());
    }

    // ========== 导出功能 ==========
    showModal(show) {
        document.getElementById('exportModal').classList.toggle('active', show);
    }

    showPreviewArea(show) {
        document.getElementById('exportPreviewArea').style.display = show ? 'flex' : 'none';
    }

    showProgressArea(show) {
        document.getElementById('exportProgressArea').style.display = show ? 'flex' : 'none';
    }

    updateProgress(percent, status) {
        document.getElementById('progressFill').style.width = percent + '%';
        if (status) document.getElementById('exportStatus').textContent = status;
    }

    async exportPNG() {
        const dims = this.getExportDimensions();
        const offCanvas = document.createElement('canvas');
        offCanvas.width = dims.width;
        offCanvas.height = dims.height;
        const offCtx = offCanvas.getContext('2d');

        this.renderToCanvas(offCanvas, offCtx, 1);

        const previewCanvas = document.getElementById('previewCanvas');
        const maxPreviewW = 400;
        const scale = Math.min(maxPreviewW / dims.width, maxPreviewW / dims.height, 1);
        previewCanvas.width = Math.round(dims.width * scale);
        previewCanvas.height = Math.round(dims.height * scale);
        previewCanvas.style.width = previewCanvas.width + 'px';
        previewCanvas.style.height = previewCanvas.height + 'px';
        const previewCtx = previewCanvas.getContext('2d');
        previewCtx.drawImage(offCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

        document.getElementById('previewSizeInfo').textContent = `${dims.width} × ${dims.height} px`;

        this.showPreviewArea(true);
        this.showProgressArea(false);
        this.showModal(true);

        this._pendingExportBlob = null;
        this._pendingExportExt = 'png';

        offCanvas.toBlob((blob) => {
            this._pendingExportBlob = blob;
        }, 'image/png');

        const confirmHandler = () => {
            if (this._pendingExportBlob) {
                this.downloadBlob(this._pendingExportBlob, 'png');
            }
            this.showModal(false);
            document.getElementById('confirmExport').removeEventListener('click', confirmHandler);
            document.getElementById('cancelPreview').removeEventListener('click', cancelHandler);
        };

        const cancelHandler = () => {
            this.showModal(false);
            document.getElementById('confirmExport').removeEventListener('click', confirmHandler);
            document.getElementById('cancelPreview').removeEventListener('click', cancelHandler);
        };

        document.getElementById('confirmExport').addEventListener('click', confirmHandler);
        document.getElementById('cancelPreview').addEventListener('click', cancelHandler);
    }

    async exportGIF() {
        this.exporting = true;
        this.exportCancel = false;
        this.showPreviewArea(false);
        this.showProgressArea(true);
        this.showModal(true);
        this.updateProgress(0, '准备GIF导出...');

        const dims = this.getExportDimensions();
        const fps = this.state.gifFps;
        const duration = (11 - this.state.animSpeed) * 1000;
        const totalFrames = Math.ceil(duration / 1000 * fps);

        const offCanvas = document.createElement('canvas');
        offCanvas.width = dims.width;
        offCanvas.height = dims.height;
        const offCtx = offCanvas.getContext('2d');

        try {
            const frames = [];

            for (let i = 0; i < totalFrames; i++) {
                if (this.exportCancel) {
                    this.showModal(false);
                    this.exporting = false;
                    this.render();
                    return;
                }

                const progress = totalFrames > 1 ? i / (totalFrames - 1) : 1;
                this.renderToCanvas(offCanvas, offCtx, progress);

                const imageData = offCtx.getImageData(0, 0, dims.width, dims.height);
                frames.push({
                    data: imageData.data,
                    width: dims.width,
                    height: dims.height,
                    delay: Math.round(1000 / fps)
                });

                this.updateProgress(Math.floor((i / totalFrames) * 70), `渲染帧 ${i + 1}/${totalFrames}`);
                await new Promise(r => setTimeout(r, 10));
            }

            this.updateProgress(70, '编码GIF...');
            await new Promise(r => setTimeout(r, 50));

            const blob = await this.encodeGIF(frames, (p) => {
                this.updateProgress(70 + Math.floor(p * 30), `编码中... ${Math.floor(p * 100)}%`);
            });

            const previewCanvas = document.getElementById('previewCanvas');
            const maxPreviewW = 400;
            const scale = Math.min(maxPreviewW / dims.width, maxPreviewW / dims.height, 1);
            previewCanvas.width = Math.round(dims.width * scale);
            previewCanvas.height = Math.round(dims.height * scale);
            previewCanvas.style.width = previewCanvas.width + 'px';
            previewCanvas.style.height = previewCanvas.height + 'px';
            const previewCtx = previewCanvas.getContext('2d');

            this.renderToCanvas(offCanvas, offCtx, 1);
            previewCtx.drawImage(offCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

            document.getElementById('previewSizeInfo').textContent =
                `${dims.width} × ${dims.height} px · ${totalFrames}帧 · ${fps}fps`;

            this._pendingExportBlob = blob;
            this._pendingExportExt = 'gif';

            this.showPreviewArea(true);
            this.showProgressArea(false);

            const confirmHandler = () => {
                this.downloadBlob(this._pendingExportBlob, 'gif');
                this.showModal(false);
                cleanup();
            };

            const cancelHandler = () => {
                this.showModal(false);
                cleanup();
            };

            const cleanup = () => {
                document.getElementById('confirmExport').removeEventListener('click', confirmHandler);
                document.getElementById('cancelPreview').removeEventListener('click', cancelHandler);
                this.exporting = false;
                this.render();
            };

            document.getElementById('confirmExport').addEventListener('click', confirmHandler);
            document.getElementById('cancelPreview').addEventListener('click', cancelHandler);

        } catch (e) {
            console.error('GIF export error:', e);
            this.showModal(false);
            this.exporting = false;
            this.render();
            alert('GIF导出失败: ' + e.message);
        }
    }

    async encodeGIF(frames, onProgress) {
        const w = frames[0].width;
        const h = frames[0].height;

        const palette = this.buildPalette(frames);
        const colorTable = palette.colors;
        const paletteSize = 256;

        const buf = [];
        const write = (bytes) => { for (let i = 0; i < bytes.length; i++) buf.push(bytes[i]); };
        const writeByte = (b) => buf.push(b & 0xff);
        const writeShort = (s) => { writeByte(s); writeByte(s >> 8); };
        const writeString = (s) => { for (let i = 0; i < s.length; i++) writeByte(s.charCodeAt(i)); };

        writeString('GIF89a');
        writeShort(w);
        writeShort(h);
        writeByte(0xf7);
        writeByte(0);
        writeByte(0);

        for (let i = 0; i < paletteSize; i++) {
            if (i < colorTable.length) {
                writeByte(colorTable[i][0]);
                writeByte(colorTable[i][1]);
                writeByte(colorTable[i][2]);
            } else {
                writeByte(0); writeByte(0); writeByte(0);
            }
        }

        writeByte(0x21);
        writeByte(0xff);
        writeByte(11);
        writeString('NETSCAPE2.0');
        writeByte(3);
        writeByte(1);
        writeShort(0);
        writeByte(0);

        for (let f = 0; f < frames.length; f++) {
            if (onProgress) onProgress(f / frames.length);
            await new Promise(r => setTimeout(r, 0));

            const frame = frames[f];
            const indexed = this.quantizeFrame(frame, palette);

            writeByte(0x21);
            writeByte(0xf9);
            writeByte(4);
            writeByte(0x00);
            writeShort(frame.delay / 10);
            writeByte(0);
            writeByte(0);

            writeByte(0x2c);
            writeShort(0);
            writeShort(0);
            writeShort(w);
            writeShort(h);
            writeByte(0);

            const minCodeSize = 8;
            writeByte(minCodeSize);

            const lzwData = this.lzwEncode(indexed, minCodeSize);
            let offset = 0;
            while (offset < lzwData.length) {
                const chunkSize = Math.min(255, lzwData.length - offset);
                writeByte(chunkSize);
                for (let i = 0; i < chunkSize; i++) {
                    writeByte(lzwData[offset + i]);
                }
                offset += chunkSize;
            }
            writeByte(0);
        }

        writeByte(0x3b);

        return new Blob([new Uint8Array(buf)], { type: 'image/gif' });
    }

    buildPalette(frames) {
        const colorMap = new Map();
        const step = Math.max(1, Math.floor(frames.length / 5));

        for (let f = 0; f < frames.length; f += step) {
            const data = frames[f].data;
            const pixelStep = Math.max(1, Math.floor(data.length / 4 / 5000));
            for (let i = 0; i < data.length; i += 4 * pixelStep) {
                const r = data[i] >> 4;
                const g = data[i + 1] >> 4;
                const b = data[i + 2] >> 4;
                const key = (r << 8) | (g << 4) | b;
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
        }

        const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]);
        const colors = [];
        const indexMap = new Map();

        for (let i = 0; i < Math.min(255, sorted.length); i++) {
            const key = sorted[i][0];
            const r = (key >> 8) & 0xf;
            const g = (key >> 4) & 0xf;
            const b = key & 0xf;
            const fullR = r << 4 | r;
            const fullG = g << 4 | g;
            const fullB = b << 4 | b;
            colors.push([fullR, fullG, fullB]);
            indexMap.set(key, i);
        }

        while (colors.length < 256) {
            colors.push([0, 0, 0]);
        }

        return { colors, indexMap };
    }

    quantizeFrame(frame, palette) {
        const { indexMap } = palette;
        const data = frame.data;
        const w = frame.width;
        const h = frame.height;
        const indexed = new Uint8Array(w * h);

        for (let i = 0; i < w * h; i++) {
            const r = data[i * 4] >> 4;
            const g = data[i * 4 + 1] >> 4;
            const b = data[i * 4 + 2] >> 4;
            const key = (r << 8) | (g << 4) | b;

            if (indexMap.has(key)) {
                indexed[i] = indexMap.get(key);
            } else {
                let bestDist = Infinity;
                let bestIdx = 0;
                const fullR = data[i * 4];
                const fullG = data[i * 4 + 1];
                const fullB = data[i * 4 + 2];

                for (let c = 0; c < Math.min(255, palette.colors.length); c++) {
                    const dr = fullR - palette.colors[c][0];
                    const dg = fullG - palette.colors[c][1];
                    const db = fullB - palette.colors[c][2];
                    const dist = dr * dr + dg * dg + db * db;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = c;
                    }
                }
                indexed[i] = bestIdx;
            }
        }

        return indexed;
    }

    lzwEncode(indexed, minCodeSize) {
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;
        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;

        const codeTable = new Map();
        for (let i = 0; i < clearCode; i++) {
            codeTable.set(String(i), i);
        }

        const output = [];
        let bitBuf = 0;
        let bitCount = 0;

        const writeBits = (code, size) => {
            bitBuf |= (code << bitCount);
            bitCount += size;
            while (bitCount >= 8) {
                output.push(bitBuf & 0xff);
                bitBuf >>= 8;
                bitCount -= 8;
            }
        };

        writeBits(clearCode, codeSize);

        let current = String(indexed[0]);

        for (let i = 1; i < indexed.length; i++) {
            const next = String(indexed[i]);
            const combined = current + ',' + next;

            if (codeTable.has(combined)) {
                current = combined;
            } else {
                writeBits(codeTable.get(current), codeSize);

                if (nextCode < 4096) {
                    codeTable.set(combined, nextCode);
                    if (nextCode >= (1 << codeSize)) {
                        codeSize++;
                    }
                    nextCode++;
                } else {
                    writeBits(clearCode, codeSize);
                    codeTable.clear();
                    for (let j = 0; j < clearCode; j++) {
                        codeTable.set(String(j), j);
                    }
                    codeSize = minCodeSize + 1;
                    nextCode = eoiCode + 1;
                }

                current = next;
            }
        }

        writeBits(codeTable.get(current), codeSize);
        writeBits(eoiCode, codeSize);

        if (bitCount > 0) {
            output.push(bitBuf & 0xff);
        }

        return output;
    }

    async exportMP4() {
        this.exporting = true;
        this.exportCancel = false;
        this.showPreviewArea(false);
        this.showProgressArea(true);
        this.showModal(true);
        this.updateProgress(0, '准备视频导出...');

        const dims = this.getExportDimensions();
        const fps = 24;
        const duration = (11 - this.state.animSpeed) * 1000;
        const totalFrames = Math.ceil(duration / 1000 * fps);

        const offCanvas = document.createElement('canvas');
        offCanvas.width = dims.width;
        offCanvas.height = dims.height;
        const offCtx = offCanvas.getContext('2d');

        try {
            const frames = [];

            for (let i = 0; i < totalFrames; i++) {
                if (this.exportCancel) {
                    this.showModal(false);
                    this.exporting = false;
                    this.render();
                    return;
                }

                const progress = totalFrames > 1 ? i / (totalFrames - 1) : 1;
                this.renderToCanvas(offCanvas, offCtx, progress);

                const dataUrl = offCanvas.toDataURL('image/jpeg', 0.85);
                const base64 = dataUrl.split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let j = 0; j < binary.length; j++) {
                    bytes[j] = binary.charCodeAt(j);
                }
                frames.push(bytes);

                this.updateProgress(Math.floor((i / totalFrames) * 70), `渲染帧 ${i + 1}/${totalFrames}`);
                await new Promise(r => setTimeout(r, 10));
            }

            this.updateProgress(70, '编码视频...');
            await new Promise(r => setTimeout(r, 50));

            const blob = this.encodeAVI(frames, dims.width, dims.height, fps, (p) => {
                this.updateProgress(70 + Math.floor(p * 25), `封装中... ${Math.floor(p * 100)}%`);
            });

            const previewCanvas = document.getElementById('previewCanvas');
            const maxPreviewW = 400;
            const scale = Math.min(maxPreviewW / dims.width, maxPreviewW / dims.height, 1);
            previewCanvas.width = Math.round(dims.width * scale);
            previewCanvas.height = Math.round(dims.height * scale);
            previewCanvas.style.width = previewCanvas.width + 'px';
            previewCanvas.style.height = previewCanvas.height + 'px';
            const previewCtx = previewCanvas.getContext('2d');
            previewCtx.drawImage(offCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

            document.getElementById('previewSizeInfo').textContent =
                `${dims.width} × ${dims.height} px · ${totalFrames}帧 · ${fps}fps · AVI`;

            this._pendingExportBlob = blob;
            this._pendingExportExt = 'avi';

            this.showPreviewArea(true);
            this.showProgressArea(false);

            const confirmHandler = () => {
                this.downloadBlob(this._pendingExportBlob, this._pendingExportExt);
                this.showModal(false);
                cleanup();
            };

            const cancelHandler = () => {
                this.showModal(false);
                cleanup();
            };

            const cleanup = () => {
                document.getElementById('confirmExport').removeEventListener('click', confirmHandler);
                document.getElementById('cancelPreview').removeEventListener('click', cancelHandler);
                this.exporting = false;
                this.render();
            };

            document.getElementById('confirmExport').addEventListener('click', confirmHandler);
            document.getElementById('cancelPreview').addEventListener('click', cancelHandler);

        } catch (e) {
            console.error('Video export error:', e);
            this.showModal(false);
            this.exporting = false;
            this.render();
            alert('视频导出失败: ' + e.message);
        }
    }

    encodeAVI(frames, width, height, fps, onProgress) {
        const usPerFrame = Math.round(1000000 / fps);
        const numFrames = frames.length;

        const uint32LE = (v) => {
            const b = new Uint8Array(4);
            b[0] = v & 0xff; b[1] = (v >> 8) & 0xff; b[2] = (v >> 16) & 0xff; b[3] = (v >> 24) & 0xff;
            return b;
        };
        const uint16LE = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
        const str4 = (s) => {
            const b = new Uint8Array(4);
            for (let i = 0; i < 4; i++) b[i] = s.charCodeAt(i);
            return b;
        };

        let moviDataLen = 0;
        for (let i = 0; i < numFrames; i++) {
            moviDataLen += 8 + frames[i].length;
            if (frames[i].length % 2 !== 0) moviDataLen += 1;
        }

        const strhData = new Uint8Array(56);
        strhData.set(str4('vids'), 0);
        strhData.set(str4('MJPG'), 4);
        strhData.set(uint32LE(1), 20);
        strhData.set(uint32LE(fps), 24);
        strhData.set(uint32LE(numFrames), 32);
        strhData.set(uint32LE(0xFFFFFFFF), 44);
        strhData.set(uint16LE(0), 48);
        strhData.set(uint16LE(0), 50);
        strhData.set(uint16LE(width), 52);
        strhData.set(uint16LE(height), 54);

        const strfData = new Uint8Array(40);
        strfData.set(uint32LE(40), 0);
        strfData.set(uint32LE(width), 4);
        strfData.set(uint32LE(height), 8);
        strfData.set(uint16LE(1), 12);
        strfData.set(uint16LE(24), 14);
        strfData.set(str4('MJPG'), 16);
        strfData.set(uint32LE(width * height * 3), 20);

        const avihData = new Uint8Array(56);
        avihData.set(uint32LE(usPerFrame), 0);
        avihData.set(uint32LE(0x10), 12);
        avihData.set(uint32LE(numFrames), 16);
        avihData.set(uint32LE(1), 24);
        avihData.set(uint32LE(width), 32);
        avihData.set(uint32LE(height), 36);

        const strlDataLen = 4 + 8 + strhData.length + 8 + strfData.length;
        const hdrlDataLen = 4 + 8 + avihData.length + 8 + strlDataLen;
        const moviListDataLen = 4 + moviDataLen;

        const fileSize = 4 + (8 + hdrlDataLen) + (8 + moviListDataLen);

        const result = new Uint8Array(12 + 8 + hdrlDataLen + 8 + moviListDataLen);
        let off = 0;

        const writeChunk = (id, data) => {
            result.set(str4(id), off); off += 4;
            result.set(uint32LE(data.length), off); off += 4;
            result.set(data, off); off += data.length;
        };

        const writeList = (id, dataLen) => {
            result.set(str4('LIST'), off); off += 4;
            result.set(uint32LE(dataLen), off); off += 4;
            result.set(str4(id), off); off += 4;
        };

        result.set(str4('RIFF'), off); off += 4;
        result.set(uint32LE(fileSize), off); off += 4;
        result.set(str4('AVI '), off); off += 4;

        writeList('hdrl', hdrlDataLen);
        writeChunk('avih', avihData);

        writeList('strl', strlDataLen);
        writeChunk('strh', strhData);
        writeChunk('strf', strfData);

        writeList('movi', moviListDataLen);
        for (let i = 0; i < numFrames; i++) {
            if (onProgress) onProgress(i / numFrames);

            result.set(str4('00dc'), off); off += 4;
            const frameLen = frames[i].length;
            result.set(uint32LE(frameLen), off); off += 4;
            result.set(frames[i], off); off += frameLen;
            if (frameLen % 2 !== 0) {
                off += 1;
            }
        }

        return new Blob([result], { type: 'video/avi' });
    }

    downloadBlob(blob, ext) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `fingerprint-text-${Date.now()}.${ext}`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new FingerprintTextApp();
    app.state.text = document.getElementById('textInput').value;
    app.render();
});
