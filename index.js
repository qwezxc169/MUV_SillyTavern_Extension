/**
 * 地城邂逅：世界卡 MUV 綜合解析器 (SillyTavern 擴充腳本)
 * 功能：
 * 1. 攔截 <muv_data> 更新側邊欄
 * 2. 攔截 <cg> 彈出官方原版視覺小說插畫
 */

(function () {
    console.log("[MUV] DanMachi UI Engine Initializing...");

    // ==========================================
    // 1. 初始化 DOM (側邊欄與 CG 遮罩)
    // ==========================================
    function initUI() {
        // 側邊欄
        if (!document.getElementById('muv-status-panel')) {
            const panel = document.createElement('div');
            panel.id = 'muv-status-panel';
            panel.innerHTML = `
                <div class="muv-header">✦ STATUS ✦</div>
                <div class="muv-stat-row"><span class="muv-stat-label">Level</span><span class="muv-stat-value" id="muv-val-level">1</span></div>
                <div class="muv-stat-row"><span class="muv-stat-label">HP</span><span class="muv-stat-value" id="muv-val-hp">100/100</span></div>
                <div class="muv-bar-container"><div class="muv-hp-bar" id="muv-bar-hp" style="width: 100%;"></div></div>
                <div class="muv-stat-row" style="margin-top: 10px;"><span class="muv-stat-label">Valis</span><span class="muv-stat-value" id="muv-val-valis">0</span></div>
                <div class="muv-stat-row"><span class="muv-stat-label">Weight</span><span class="muv-stat-value" id="muv-val-weight">0/50 kg</span></div>
                <div class="muv-inventory"><div class="muv-inventory-title">INVENTORY</div><div class="muv-inventory-grid" id="muv-val-inventory"></div></div>
            `;
            document.body.appendChild(panel);
        }

        // CG Lightbox
        if (!document.getElementById('cg-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'cg-overlay';
            overlay.className = 'cg-lightbox-overlay';
            overlay.innerHTML = `
                <img class="cg-lightbox-img" src="" alt="CG">
                <div class="cg-close-text">點擊任意處關閉</div>
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', () => {
                overlay.classList.remove('active');
            });
        }
    }

    // ==========================================
    // 2. CG 觸發與 XML 解析輔助函數
    // ==========================================
    function triggerCG(filename) {
        const overlay = document.getElementById('cg-overlay');
        if (!overlay) return;
        const img = overlay.querySelector('.cg-lightbox-img');
        
        // 針對 TauriTavern：圖片已放置於 content/backgrounds/CGs
        img.src = `/backgrounds/CGs/${filename}`;
        overlay.classList.add('active');
    }

    function getXmlValue(xmlString, tag) {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'is');
        const match = xmlString.match(regex);
        return match ? match[1].trim() : null;
    }

    // ==========================================
    // 3. 解析器核心邏輯
    // ==========================================
    function processMessageNode(mesNode) {
        const textNode = mesNode.querySelector('.mes_text');
        if (!textNode) return;

        let html = textNode.innerHTML;
        let modified = false;

        // A. 處理視覺小說 CG 標籤
        const cgRegex = /<cg>(.*?)<\/cg>/g;
        let cgMatch;
        while ((cgMatch = cgRegex.exec(html)) !== null) {
            const filename = cgMatch[1].trim();
            // 只有最新產生的訊息才觸發彈出，避免滾動歷史記錄時一直彈
            if (!mesNode.hasAttribute('data-cg-shown')) {
                mesNode.setAttribute('data-cg-shown', 'true');
                setTimeout(() => triggerCG(filename), 800);
            }
            modified = true;
        }
        if (modified) {
            html = html.replace(cgRegex, ''); // 徹底隱藏 CG 標籤
        }

        // B. 處理 MUV 狀態列更新
        const muvRegex = /<muv_data>([\s\S]*?)<\/muv_data>/g;
        let muvMatch;
        let lastEvent = null;

        while ((muvMatch = muvRegex.exec(html)) !== null) {
            const rawData = muvMatch[1];
            
            // 更新狀態列
            const level = getXmlValue(rawData, 'level');
            const hp = getXmlValue(rawData, 'hp');
            const valis = getXmlValue(rawData, 'valis');
            const weight = getXmlValue(rawData, 'weight');
            const inventoryStr = getXmlValue(rawData, 'inventory');
            lastEvent = getXmlValue(rawData, 'event');

            if (level) document.getElementById('muv-val-level').innerText = level;
            if (valis) document.getElementById('muv-val-valis').innerText = valis;
            if (weight) document.getElementById('muv-val-weight').innerText = weight;
            if (hp) {
                document.getElementById('muv-val-hp').innerText = hp;
                try {
                    const parts = hp.split('/');
                    if (parts.length === 2) {
                        const percent = (parseInt(parts[0]) / parseInt(parts[1])) * 100;
                        document.getElementById('muv-bar-hp').style.width = percent + '%';
                    }
                } catch (e) {}
            }
            if (inventoryStr) {
                const invContainer = document.getElementById('muv-val-inventory');
                const items = inventoryStr.split(',').map(i => i.trim()).filter(i => i);
                invContainer.innerHTML = items.length > 0 
                    ? items.map(item => `<div class="muv-item"><span>${item}</span></div>`).join('')
                    : `<div class="muv-item"><span style="color:#888;">Empty</span></div>`;
            }
            modified = true;
        }

        // 隱藏原始 MUV 數據
        if (html.includes('<muv_data>')) {
            html = html.replace(muvRegex, '<div class="muv-hidden-data" style="display:none;">$&</div>');
            modified = true;
        }

        // 若有升級事件，加上特效
        if (lastEvent === 'LevelUp') {
            mesNode.classList.add('level-up-event');
        }

        // 寫回 DOM
        if (modified) {
            textNode.innerHTML = html;
        }
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
                    }
                });
            });
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
        
        // 處理已存在的歷史訊息
        document.querySelectorAll('.mes').forEach(processMessageNode);
    }

    // 啟動
    initUI();
    startObserver();

})();
