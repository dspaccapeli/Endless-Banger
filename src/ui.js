const defaultColors = {
    bg: "#222266",
    note: "#88aacc",
    accent: "#AA88CC",
    glide: "#CCAA88",
    text: "#CCCCFF",
    highlight: "rgba(255,255,255,0.2)",
    grid: "rgba(255,255,255,0.2)",
    dial: "#AA88CC"
}

// UI Component Functions
function GridParticleVisualizer(analyser, colors = defaultColors) {
    const canvas = document.createElement("canvas");
    canvas.classList.add("background-visualizer");
    Object.assign(canvas.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: '-1'
    });

    const GRID_SIZE = 40; // Size of each grid cell
    const GRID_LINE_WIDTH = 0.5; // Reduced line width for subtlety
    const points = [];
    let cols, rows;
    let offsetX = 0, offsetY = 0;
    let audioContext = analyser.context;

    function initializeGrid() {
        points.length = 0;

        // Calculate grid dimensions to extend beyond canvas edges
        cols = Math.ceil(canvas.width / GRID_SIZE) + 2; // Add 2 extra columns
        rows = Math.ceil(canvas.height / GRID_SIZE) + 2; // Add 2 extra rows
        
        // Calculate offsets to start grid outside viewport
        offsetX = -GRID_SIZE;
        offsetY = -GRID_SIZE;
        
        // Create grid points
        for (let i = 0; i <= cols; i++) {
            for (let j = 0; j <= rows; j++) {
                points.push({
                    x: offsetX + i * GRID_SIZE,
                    y: offsetY + j * GRID_SIZE,
                    baseX: offsetX + i * GRID_SIZE,
                    baseY: offsetY + j * GRID_SIZE
                });
            }
        }
    }

    // Initialize audio analysis buffers
    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    
    function update() {
        const w = canvas.width = canvas.clientWidth;
        const h = canvas.height = canvas.clientHeight;
        
        // Reinitialize grid if canvas size changes
        if (!points.length || w !== canvas.width || h !== canvas.height) {
            initializeGrid();
        }

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = '#1a1a33';  // Dark purple background
        ctx.fillRect(0, 0, w, h);

        // Get audio data
        analyser.getByteFrequencyData(freqData);

        // Check if audio is actually playing
        const isAudioActive = audioContext.state === "running";

        // Calculate energy in different frequency bands only if audio is active
        const bassEnergy = isAudioActive ? freqData.slice(0, 10).reduce((a, b) => a + b, 0) / 2550 : 0;
        const midEnergy = isAudioActive ? freqData.slice(10, 100).reduce((a, b) => a + b, 0) / 22950 : 0;
        const highEnergy = isAudioActive ? freqData.slice(100, 200).reduce((a, b) => a + b, 0) / 25500 : 0;

        // Update grid points based on audio
        points.forEach((p, idx) => {
            if (isAudioActive) {
                const col = Math.floor(idx / (rows + 1));
                const row = idx % (rows + 1);
                
                // Bass affects vertical displacement
                const bassDisplacement = Math.sin(row / 2) * bassEnergy * GRID_SIZE * 2;
                
                // Mid frequencies affect horizontal waves
                const midDisplacement = Math.sin(col / 3 + row / 4) * midEnergy * GRID_SIZE * 1.5;
                
                // High frequencies add some chaos
                const highDisplacement = (Math.random() - 0.5) * highEnergy * GRID_SIZE * 0.5;
                
                p.x = p.baseX + midDisplacement + highDisplacement;
                p.y = p.baseY + bassDisplacement + (highDisplacement * 0.5);
            } else {
                // Smooth transition back to perfect grid
                const transitionSpeed = 0.1; // Adjust this value to control transition speed (0.1 = 10% per frame)
                p.x = p.x + (p.baseX - p.x) * transitionSpeed;
                p.y = p.y + (p.baseY - p.y) * transitionSpeed;
            }
        });

        // Draw grid lines
        ctx.beginPath();
        ctx.strokeStyle = isAudioActive ? 
            `rgba(${140 + bassEnergy * 100}, ${100 + midEnergy * 100}, ${255}, ${0.15 + midEnergy * 0.2})` : 
            'rgba(140, 100, 255, 0.15)';
        ctx.lineWidth = GRID_LINE_WIDTH;

        // Draw vertical lines
        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            const startPoint = points[i * (rows + 1)];
            ctx.moveTo(startPoint.x, startPoint.y);
            
            for (let j = 1; j <= rows; j++) {
                const point = points[i * (rows + 1) + j];
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let j = 0; j <= rows; j++) {
            ctx.beginPath();
            const startPoint = points[j];
            ctx.moveTo(startPoint.x, startPoint.y);
            
            for (let i = 1; i <= cols; i++) {
                const point = points[i * (rows + 1) + j];
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        // Add subtle glow effect
        if (isAudioActive) {
            ctx.shadowBlur = 10 * (bassEnergy + midEnergy);
            ctx.shadowColor = `rgba(${140 + bassEnergy * 100}, ${100 + midEnergy * 100}, 255, 0.5)`;
        } else {
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(140, 100, 255, 0.3)';
        }

        requestAnimationFrame(update);
    }

    document.body.appendChild(canvas);
    update();

    return canvas;
}

function EmptyGridVisualizer(options = {}) {
    const {
        gridSize = 40,
        lineWidth = 0.5,
        gridColor = 'rgba(140, 100, 255, 0.15)',
        backgroundColor = '#1a1a33'
    } = options;

    const canvas = document.createElement("canvas");
    canvas.classList.add("background-visualizer");
    Object.assign(canvas.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: '-1'
    });

    const points = [];
    let cols, rows;
    let offsetX = 0, offsetY = 0;

    function initializeGrid() {
        points.length = 0;

        // Calculate grid dimensions to extend beyond canvas edges
        cols = Math.ceil(canvas.width / gridSize) + 2;
        rows = Math.ceil(canvas.height / gridSize) + 2;
        
        // Calculate offsets to start grid outside viewport
        offsetX = -gridSize;
        offsetY = -gridSize;
        
        // Create grid points
        for (let i = 0; i <= cols; i++) {
            for (let j = 0; j <= rows; j++) {
                points.push({
                    x: offsetX + i * gridSize,
                    y: offsetY + j * gridSize
                });
            }
        }
    }

    function update() {
        const w = canvas.width = canvas.clientWidth;
        const h = canvas.height = canvas.clientHeight;
        
        if (!points.length || w !== canvas.width || h !== canvas.height) {
            initializeGrid();
        }

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, w, h);

        // Draw grid lines
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = lineWidth;

        // Draw vertical lines
        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            const startPoint = points[i * (rows + 1)];
            ctx.moveTo(startPoint.x, startPoint.y);
            
            for (let j = 1; j <= rows; j++) {
                const point = points[i * (rows + 1) + j];
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let j = 0; j <= rows; j++) {
            ctx.beginPath();
            const startPoint = points[j];
            ctx.moveTo(startPoint.x, startPoint.y);
            
            for (let i = 1; i <= cols; i++) {
                const point = points[i * (rows + 1) + j];
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        requestAnimationFrame(update);
    }

    document.body.appendChild(canvas);
    update();

    return canvas;
}

function UI(analyser) {
    const ui = document.createElement("div");
    ui.id = "ui";
    
    const visualizer = GridParticleVisualizer(analyser, defaultColors);
    
    ui.append(visualizer);

    return ui;
}

export { UI, EmptyGridVisualizer };
