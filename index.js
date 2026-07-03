/**
 * 地城邂逅：世界卡 MUV 綜合解析器 (SillyTavern 擴充腳本)
 * 功能：
 * 1. 攔截 <muv_data> 更新側邊欄
 * 2. 攔截 <cg> 彈出官方原版視覺小說插畫
 */

(function () {
    console.log("[MUV] DanMachi UI Engine Initializing...");

    const STATE_TAGS = ["muv_data", "think", "analysis", "reasoning", "hidden", "scratchpad"];

    function escapeHTML(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function safeText(value, fallback = '—') {
        return value && String(value).trim() ? String(value).trim() : fallback;
    }

    function parseInventory(raw) {
        return (raw || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    function parseHp(hp) {
        const match = String(hp || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return { label: safeText(hp, '0/0'), percent: 0 };
        const current = Number(match[1]);
        const max = Number(match[2]) || 1;
        return { label: `${current}/${max}`, percent: Math.max(0, Math.min(100, (current / max) * 100)) };
    }

    function renderStatCard({ level, hp, valis, weight, inventory, event }) {
        const hpState = parseHp(hp);
        const inventoryHtml = inventory.length
            ? inventory.map(item => `<span class="muv-pill">${escapeHTML(item)}</span>`).join('')
            : '<span class="muv-empty">Empty</span>';

        return `
            <section class="muv-rendered-panel ${event === 'LevelUp' ? 'muv-levelup-anim' : ''}">
                <header class="muv-panel-header">
                    <div class="muv-panel-kicker">Orario Guild Interface</div>
                    <div class="muv-panel-title">Adventurer Status</div>
                </header>
                <div class="muv-panel-grid">
                    <div class="muv-stat-card">
                        <span class="muv-stat-label">Level</span>
                        <strong class="muv-stat-value">${escapeHTML(safeText(level, '1'))}</strong>
                    </div>
                    <div class="muv-stat-card muv-stat-card-wide">
                        <div class="muv-stat-row">
                            <span class="muv-stat-label">HP</span>
                            <span class="muv-stat-value muv-hp-text">${escapeHTML(hpState.label)}</span>
                        </div>
                        <div class="muv-bar-container"><div class="muv-hp-bar" style="width:${hpState.percent}%"></div></div>
                    </div>
                    <div class="muv-stat-card">
                        <span class="muv-stat-label">Valis</span>
                        <strong class="muv-stat-value">${escapeHTML(safeText(valis, '0'))}</strong>
                    </div>
                    <div class="muv-stat-card">
                        <span class="muv-stat-label">Weight</span>
                        <strong class="muv-stat-value">${escapeHTML(safeText(weight, '0/50 kg'))}</strong>
                    </div>
                </div>
                <section class="muv-inventory-box">
                    <div class="muv-inv-title">Inventory</div>
                    <div class="muv-inv-content">${inventoryHtml}</div>
                </section>
            </section>
        `;
    }

    function initUI() {
        if (!document.getElementById('cg-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'cg-overlay';
            overlay.className = 'cg-lightbox-overlay';
            overlay.innerHTML = `
                <figure class="cg-lightbox-frame">
                    <img class="cg-lightbox-img" src="" alt="CG">
                    <figcaption class="cg-close-text">點擊任意處關閉</figcaption>
                </figure>
            `;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => overlay.classList.remove('active'));
        }
    }

    // ==========================================
    // 2. CG 觸發與 XML 解析輔助函數
    // ==========================================
    function triggerCG(filename) {
        const overlay = document.getElementById('cg-overlay');
        if (!overlay) return;
        const img = overlay.querySelector('.cg-lightbox-img');
        if (!img || !filename) return;

        img.src = `/backgrounds/CGs/${filename}`;
        overlay.classList.add('active');
    }

    function getXmlValue(xmlString, tag) {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'is');
        const match = xmlString.match(regex);
        return match ? match[1].trim() : null;
    }

    function extractPayload(html) {
        const match = html.match(/<muv_data>([\s\S]*?)<\/muv_data>/i);
        if (!match) return null;
        const rawData = match[1];
        return {
            level: getXmlValue(rawData, 'level'),
            hp: getXmlValue(rawData, 'hp'),
            valis: getXmlValue(rawData, 'valis'),
            weight: getXmlValue(rawData, 'weight'),
            inventory: parseInventory(getXmlValue(rawData, 'inventory')),
            event: getXmlValue(rawData, 'event'),
            cg: getXmlValue(rawData, 'cg')
        };
    }

    function processMessageNode(mesNode) {
        const textNode = mesNode.querySelector('.mes_text');
        if (!textNode) return;

        let html = textNode.innerHTML;
        const payload = extractPayload(html);
        if (!payload) return;

        if (payload.cg && !mesNode.hasAttribute('data-cg-shown')) {
            mesNode.setAttribute('data-cg-shown', 'true');
            setTimeout(() => triggerCG(payload.cg), 500);
        }

        const rendered = renderStatCard(payload);
        html = html.replace(/<muv_data>[\s\S]*?<\/muv_data>/i, `<div class="muv-hidden-data">${rendered}</div>`);
        html = html.replace(/<cg>[\s\S]*?<\/cg>/gi, '');

        if (payload.event === 'LevelUp') {
            mesNode.classList.add('level-up-event');
        }

        textNode.innerHTML = html;
    }

    // ==========================================
    // 4. MutationObserver 啟動監聽
    // ==========================================
    function startObserver() {
        const chatContainer = document.getElementById('chat');
        if (!chatContainer) {
            setTimeout(startObserver, 1000);
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('mes')) {
                        processMessageNode(node);
                    } else if (node.nodeType === 1 && node.querySelectorAll) {
                        node.querySelectorAll('.mes').forEach(processMessageNode);
                    }
                });
            });
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
        document.querySelectorAll('.mes').forEach(processMessageNode);
    }

    initUI();
    startObserver();

})();
