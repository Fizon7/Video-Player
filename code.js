// /c:/Users/bossm/New folder/youtube embeder/code.js
// GitHub Copilot
// Enhances a minimal HTML page by injecting a small YouTube embed UI with preview, lazy iframe,
// responsive wrapper, copy-to-clipboard, and basic options (autoplay, controls, start time, privacy).
// Drop this file into a page and include it with a <script src="code.js"></script>.

(() => {
    const CSS = `
    :root{
        --bg:#0f1724; --card:#0b1220; --muted:#94a3b8; --accent:#06b6d4; --glass: rgba(255,255,255,0.03);
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
        margin:0; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;
        background:linear-gradient(180deg,#071029 0%, #071822 100%); color:#e6eef6; -webkit-font-smoothing:antialiased;
        display:flex; align-items:center; justify-content:center; padding:28px;
    }
    .yt-app{
        width:100%; max-width:900px; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        border-radius:12px; padding:18px; box-shadow: 0 6px 30px rgba(2,6,23,0.7); border:1px solid rgba(255,255,255,0.03);
    }
    .yt-grid{ display:grid; grid-template-columns:1fr 360px; gap:16px; align-items:start; }
    @media (max-width:880px){ .yt-grid{ grid-template-columns:1fr; } }
    h1{font-size:18px; margin:4px 0 10px; color:#e8f8fb}
    p.lead{margin:0 0 12px; color:var(--muted); font-size:13px}
    .card{ background:var(--card); padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.02) }
    label{display:block; font-size:12px; color:var(--muted); margin-bottom:6px}
    input[type="text"], input[type="number"], select {
        width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);
        background:var(--glass); color:inherit; font-size:14px;
    }
    .row{display:flex; gap:8px}
    .btn{
        display:inline-flex; align-items:center; justify-content:center; gap:8px;
        padding:8px 12px; border-radius:8px; cursor:pointer; border:0; font-weight:600;
        background:linear-gradient(90deg,var(--accent),#7c3aed); color:#032027;
    }
    .btn.secondary{ background:transparent; border:1px solid rgba(255,255,255,0.04); color:var(--muted); font-weight:600}
    .opts{ display:flex; gap:8px; flex-wrap:wrap; align-items:center}
    .preview-area{ min-height:200px; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg, rgba(255,255,255,0.01), transparent); border-radius:8px; overflow:hidden; position:relative}
    .thumb{ width:100%; height:100%; object-fit:cover; display:block }
    .play-overlay{
        position:absolute; inset:0; display:flex; align-items:center; justify-content:center; cursor:pointer;
        background:linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.2));
    }
    .play-btn{ width:72px; height:72px; border-radius:999px; background:linear-gradient(90deg,#ff6b6b,#ffb86b); display:grid; place-items:center; box-shadow:0 8px 30px rgba(0,0,0,0.6); }
    .play-btn:after{ content:""; margin-left:6px; border-style:solid; border-width:12px 0 12px 20px; border-color:transparent transparent transparent #041014; display:inline-block; }
    .video-wrap{ width:100%; aspect-ratio:16/9; background:#000 }
    .meta{ font-size:13px; color:var(--muted); margin-top:8px }
    .small{ font-size:12px }
    .tools{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap }
    .toast{ position:fixed; right:20px; bottom:20px; background:#0b1220; padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.03); color:var(--muted) }
    `;

    function injectStyle() {
        const s = document.createElement('style');
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function parseYouTubeId(input) {
        if (!input) return null;
        input = input.trim();

        // Direct ID
        if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

        // URL patterns
        const patterns = [
            /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
            /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
            /youtu\.be\/([A-Za-z0-9_-]{11})/,
            /youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
        ];
        for (const rx of patterns) {
            const m = input.match(rx);
            if (m) return m[1];
        }
        // attempt to find 11-char id anywhere
        const m = input.match(/([A-Za-z0-9_-]{11})/);
        return m ? m[1] : null;
    }

    function parseStartTime(value) {
        if (!value) return 0;
        value = value.trim();
        // mm:ss or hh:mm:ss
        if (/^\d+:\d{2}(:\d{2})?$/.test(value)) {
            const parts = value.split(':').map(Number).reverse();
            let sec = 0, mult = 1;
            for (let p of parts) { sec += p * mult; mult *= 60; }
            return sec;
        }
        // pure seconds
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }

    function makeIframeSrc(id, opts) {
        const params = new URLSearchParams();
        params.set('autoplay', opts.autoplay ? '1' : '0');
        params.set('controls', opts.controls ? '1' : '0');
        params.set('rel', opts.rel ? '1' : '0');
        params.set('modestbranding', opts.modestbranding ? '1' : '0');
        if (opts.loop) {
            params.set('loop', '1');
            params.set('playlist', id);
        }
        if (opts.start) params.set('start', String(opts.start));
        params.set('enablejsapi', opts.enablejsapi ? '1' : '0');
        const base = opts.privacy ? 'https://www.youtube-nocookie.com/embed/' : 'https://www.youtube.com/embed/';
        return base + id + '?' + params.toString();
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        // fallback
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                resolve();
            } catch (e) {
                reject(e);
            } finally { ta.remove(); }
        });
    }

    function showToast(msg, timeout = 2600) {
        const t = document.createElement('div');
        t.className = 'toast card';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.style.opacity = '0.01', timeout - 300);
        setTimeout(() => t.remove(), timeout);
    }

    function createApp() {
        injectStyle();

        const app = document.createElement('div');
        app.className = 'yt-app card';
        app.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div>
                    <h1>YouTube Embedder</h1>
                    <p class="lead">Paste a YouTube URL or ID, preview, configure options and copy responsive embed code.</p>
                </div>
                <div style="text-align:right; font-size:12px; color:var(--muted)">Responsive • Lazy-loaded • Privacy mode</div>
            </div>
            <div class="yt-grid">
                <div>
                    <div class="card" style="margin-bottom:12px">
                        <label for="yt-input">YouTube URL or ID</label>
                        <input id="yt-input" type="text" placeholder="https://youtu.be/dQw4w9WgXcQ or ID">
                        <div style="height:8px"></div>
                        <div class="opts">
                            <label style="display:flex;align-items:center;gap:6px"><input id="opt-autoplay" type="checkbox"> Autoplay</label>
                            <label style="display:flex;align-items:center;gap:6px"><input id="opt-controls" type="checkbox" checked> Show controls</label>
                            <label style="display:flex;align-items:center;gap:6px"><input id="opt-privacy" type="checkbox"> Privacy mode</label>
                            <label style="display:flex;align-items:center;gap:6px"><input id="opt-loop" type="checkbox"> Loop</label>
                            <label style="display:flex;align-items:center;gap:6px"><input id="opt-modest" type="checkbox"> Modest branding</label>
                        </div>
                        <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
                            <div style="flex:1">
                                <label class="small">Start time (s or mm:ss)</label>
                                <input id="opt-start" type="text" placeholder="e.g. 90 or 1:30">
                            </div>
                            <div style="width:140px">
                                <label class="small">Extra</label>
                                <select id="opt-rel" style="height:40px">
                                    <option value="0">rel=0 (no related)</option>
                                    <option value="1">rel=1 (related)</option>
                                </select>
                            </div>
                        </div>
                        <div class="tools">
                            <button class="btn" id="btn-preview">Preview</button>
                            <button class="btn secondary" id="btn-clear">Clear</button>
                            <button class="btn secondary" id="btn-copy">Copy embed</button>
                        </div>
                        <div class="meta small" id="meta-msg" style="margin-top:8px"></div>
                    </div>
                    <div class="card">
                        <label>Embed HTML (preview)</label>
                        <pre id="embed-html" style="white-space:pre-wrap;background:transparent;padding:8px;border-radius:6px;color:var(--muted);font-size:13px;max-height:180px;overflow:auto">No embed yet. Click Preview or Copy embed.</pre>
                    </div>
                </div>
                <div>
                    <div class="card preview-area" id="preview-card" aria-live="polite">
                        <div style="text-align:center;color:var(--muted)">
                            Enter a YouTube link and click Preview to see thumbnail or play.
                        </div>
                    </div>
                    <div class="meta" style="margin-top:10px">
                        Tip: press Enter in the input to preview. Thumbnails are fetched from img.youtube.com and iframe is loaded lazily.
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(app);

        const input = document.getElementById('yt-input');
        const btnPreview = document.getElementById('btn-preview');
        const btnClear = document.getElementById('btn-clear');
        const btnCopy = document.getElementById('btn-copy');
        const previewCard = document.getElementById('preview-card');
        const embedHtml = document.getElementById('embed-html');
        const metaMsg = document.getElementById('meta-msg');

        function buildOpts() {
            return {
                autoplay: document.getElementById('opt-autoplay').checked,
                controls: document.getElementById('opt-controls').checked,
                privacy: document.getElementById('opt-privacy').checked,
                loop: document.getElementById('opt-loop').checked,
                modestbranding: document.getElementById('opt-modest').checked,
                rel: document.getElementById('opt-rel').value === '1',
                start: parseStartTime(document.getElementById('opt-start').value),
                enablejsapi: false
            };
        }

        function renderPreview(id, opts) {
            previewCard.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.className = 'video-wrap';
            const thumbUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
            const img = document.createElement('img');
            img.className = 'thumb';
            img.alt = 'Video thumbnail';
            img.src = thumbUrl;
            wrap.appendChild(img);

            const overlay = document.createElement('div');
            overlay.className = 'play-overlay';
            overlay.setAttribute('role','button');
            overlay.setAttribute('aria-label','Play video preview');
            overlay.innerHTML = `<div class="play-btn" title="Play"></div>`;
            wrap.appendChild(overlay);

            overlay.addEventListener('click', () => {
                const src = makeIframeSrc(id, opts);
                const iframe = document.createElement('iframe');
                iframe.src = src;
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                wrap.innerHTML = '';
                wrap.appendChild(iframe);
            });

            previewCard.appendChild(wrap);
            metaMsg.textContent = `ID: ${id} • Autoplay: ${opts.autoplay ? 'yes' : 'no'} • Start: ${opts.start || 0}s`;
        }

        function buildEmbedString(id, opts) {
            const src = makeIframeSrc(id, opts);
            const html = `<div class="video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px">
    <iframe src="${src}" style="position:absolute;left:0;top:0;width:100%;height:100%;border:0;" loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`;
            return html;
        }

        async function doPreview() {
            const id = parseYouTubeId(input.value);
            if (!id) {
                metaMsg.textContent = 'Could not parse a YouTube video ID. Ensure you pasted a URL or 11-char ID.';
                previewCard.innerHTML = '<div style="color:var(--muted)">Invalid video ID — try a different link.</div>';
                embedHtml.textContent = 'No embed available.';
                return;
            }
            const opts = buildOpts();
            renderPreview(id, opts);
            const html = buildEmbedString(id, opts);
            embedHtml.textContent = html;
        }

        btnPreview.addEventListener('click', doPreview);
        btnClear.addEventListener('click', () => {
            input.value = '';
            previewCard.innerHTML = '<div style="text-align:center;color:var(--muted)">Enter a YouTube link and click Preview to see thumbnail or play.</div>';
            embedHtml.textContent = 'No embed yet. Click Preview or Copy embed.';
            metaMsg.textContent = '';
        });

        btnCopy.addEventListener('click', async () => {
            const id = parseYouTubeId(input.value);
            if (!id) {
                showToast('No valid ID to copy.');
                return;
            }
            const opts = buildOpts();
            const html = buildEmbedString(id, opts);
            try {
                await copyToClipboard(html);
                showToast('Embed HTML copied to clipboard');
            } catch (e) {
                showToast('Copy failed. Select the text and copy manually.');
            }
            embedHtml.textContent = html;
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                doPreview();
            }
        });

        // small helper: try to detect pasted share link and auto-preview
        input.addEventListener('paste', (e) => {
            setTimeout(() => {
                const v = input.value || '';
                if (v.includes('youtu')) {
                    // auto-preview (debounced)
                    doPreview();
                }
            }, 50);
        });

        // populate sample content if empty (nice UX)
        if (!input.value) {
            input.value = 'https://youtu.be/dQw4w9WgXcQ';
        }
    }

    document.addEventListener('DOMContentLoaded', createApp);
})();
// safety bootstrap: ensure the app is created once and styles are present
(function ensureConnected() {
    function initOnce() {
        if (!document.querySelector('.yt-app') && typeof createApp === 'function') {
            try { createApp(); } catch (e) { console.error('Failed to initialize YouTube Embedder', e); }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnce);
    } else {
        initOnce();
    }

    // verify CSS injection and inject if missing
    setTimeout(() => {
        let found = false;
        try {
            for (const ss of Array.from(document.styleSheets)) {
                if (ss.ownerNode && ss.ownerNode.textContent && ss.ownerNode.textContent.includes('.yt-app')) {
                    found = true;
                    break;
                }
            }
        } catch (e) {
            // cross-origin stylesheet may throw; ignore
        }
        if (!found && typeof injectStyle === 'function') {
            try { injectStyle(); } catch (e) { /* ignore */ }
        }
        console.info('YouTube Embedder: JS connected, ensured CSS');
    }, 300);
})();