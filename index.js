(() => {
  const ROOT_ID = 'dm-js-slash-root';

  const TEXT = {
    title: '地城邂逅・歐拉麗冒險者系統',
    scene: '開局引導',
    status: '冒險者狀態',
    equipment: '穿戴裝備',
    inventory: '背包物品',
    party: '隊伍',
    location: '目前位置',
    fate: '命運歧路',
    unknown: '未知',
  };

  const DEFAULT_STATE = {
    name: 'SiSioN',
    level: '1',
    hp: '100/100',
    mp: '10/10',
    hunger: '90/100',
    valis: '5',
    weight: '1/50 kg',
    party: '單人',
    favor: '未獲得恩惠',
    skill: '未知',
    magic: '未知',
    equipment: '頭部=None / 身體=旅行者服裝 / 武器=基礎短劍 / 左手=None / 飾品=None',
    location: '歐拉麗・公會本部',
    stats: 'STR0 / AGI0 / INT0 / WIS0 / DEX0 / CHA0',
    inventory: '小型治療藥水 x2、空瓶 x1',
    scene: '清晨的歐拉麗被白牆與金色日光包圍，遠方的巴別塔直插雲層。你站在公會本部外，手裡握著自己的冒險者文件，這裡是故事真正開始的地方。',
    choices: [
      { icon: '⚔', title: '正面前進', desc: '踏入公會，確認自己的冒險者身份。' },
      { icon: '🗣', title: '禮貌請教', desc: '向接待員詢問加入眷族與開局流程。' },
      { icon: '🤪', title: '作死試探', desc: '用誇張方式測試自己是不是已經被盯上。' },
      { icon: '😈', title: '貪婪算計', desc: '先想辦法搞清楚最值錢的情報與資源。' },
      { icon: '💋', title: '柔和搭話', desc: '用最不冒犯的方式建立初步好感。' },
      { icon: '🏃', title: '先觀望', desc: '退一步看局勢，暫時不做決定。' },
    ],
  };

  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    return root;
  }

  function parseBlock(tag, html) {
    const match = html.match(new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, 'i'));
    return match ? match[1].trim() : '';
  }

  function parseChoices(html) {
    const action = parseBlock('action', html);
    if (!action) return [];
    const out = [];
    const lines = action.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^\[Opt\d+:\s*(.*?)\]\s*(.*)$/);
      if (m) out.push({ icon: m[1].trim(), title: m[2].trim(), desc: '' });
    }
    return out;
  }

  function parseState(html) {
    const scene = parseBlock('now_plot', html) || DEFAULT_STATE.scene;
    const opening = parseBlock('opening_guidance', html);
    const level = parseBlock('level', html) || DEFAULT_STATE.level;
    const hp = parseBlock('hp', html) || DEFAULT_STATE.hp;
    const mp = parseBlock('mp', html) || DEFAULT_STATE.mp;
    const hunger = parseBlock('hunger', html) || DEFAULT_STATE.hunger;
    const valis = parseBlock('valis', html) || DEFAULT_STATE.valis;
    const weight = parseBlock('weight', html) || DEFAULT_STATE.weight;
    const party = parseBlock('team', html) || parseBlock('party', html) || DEFAULT_STATE.party;
    const favor = parseBlock('fan', html) || parseBlock('favor', html) || DEFAULT_STATE.favor;
    const skill = parseBlock('skill', html) || DEFAULT_STATE.skill;
    const magic = parseBlock('magic', html) || DEFAULT_STATE.magic;
    const equipment = parseBlock('equipment', html) || DEFAULT_STATE.equipment;
    const location = parseBlock('location', html) || DEFAULT_STATE.location;
    const stats = parseBlock('stats', html) || DEFAULT_STATE.stats;
    const inventory = parseBlock('inventory', html) || DEFAULT_STATE.inventory;
    const event = parseBlock('event', html);
    const cg = parseBlock('cg', html);
    const choices = parseChoices(html);
    return { scene, opening, level, hp, mp, hunger, valis, weight, party, favor, skill, magic, equipment, location, stats, inventory, event, cg, choices };
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function render(state) {
    const root = ensureRoot();
    const cards = state.choices.length ? state.choices : DEFAULT_STATE.choices;
    root.innerHTML = `
      <section class="dm-shell">
        <header class="dm-topbar">
          <div>
            <div class="dm-kicker">${TEXT.title}</div>
            <div class="dm-name">${escapeHtml(DEFAULT_STATE.name)}</div>
          </div>
          <div class="dm-online">系統就緒</div>
        </header>

        <div class="dm-scroll">
          <div class="dm-scroll-head">${TEXT.scene}</div>
          <div class="dm-scroll-body">${escapeHtml(state.scene)}</div>
        </div>

        <div class="dm-hud">
          <div class="dm-hud-title">${TEXT.status}</div>
          <div class="dm-grid">
            <div class="dm-card"><span>等級</span><strong>${escapeHtml(state.level)}</strong></div>
            <div class="dm-card"><span>生命值</span><strong>${escapeHtml(state.hp)}</strong></div>
            <div class="dm-card"><span>魔力值</span><strong>${escapeHtml(state.mp)}</strong></div>
            <div class="dm-card"><span>飢餓度</span><strong>${escapeHtml(state.hunger)}</strong></div>
            <div class="dm-card"><span>法利</span><strong>${escapeHtml(state.valis)}</strong></div>
            <div class="dm-card"><span>負重</span><strong>${escapeHtml(state.weight)}</strong></div>
            <div class="dm-card wide"><span>隊伍</span><strong>${escapeHtml(state.party)}</strong></div>
            <div class="dm-card wide"><span>恩惠</span><strong>${escapeHtml(state.favor)}</strong></div>
            <div class="dm-card wide"><span>技能</span><strong>${escapeHtml(state.skill)}</strong></div>
            <div class="dm-card wide"><span>魔法</span><strong>${escapeHtml(state.magic)}</strong></div>
            <div class="dm-card wide"><span>穿戴裝備</span><strong>${escapeHtml(state.equipment)}</strong></div>
            <div class="dm-card wide"><span>目前位置</span><strong>${escapeHtml(state.location)}</strong></div>
            <div class="dm-card wide"><span>能力值</span><strong>${escapeHtml(state.stats)}</strong></div>
            <div class="dm-card wide"><span>背包物品</span><strong>${escapeHtml(state.inventory)}</strong></div>
          </div>
        </div>

        <div class="dm-fate">
          <div class="dm-fate-head">${TEXT.fate}</div>
          <div class="dm-choices">${cards.map(c => `
            <button class="dm-choice" data-choice="${escapeHtml(c.title)}">
              <span class="dm-choice-icon">${escapeHtml(c.icon)}</span>
              <span class="dm-choice-text">
                <span class="dm-choice-title">${escapeHtml(c.title)}</span>
                <span class="dm-choice-desc">${escapeHtml(c.desc || '')}</span>
              </span>
            </button>
          `).join('')}</div>
        </div>
      </section>
    `;

    root.querySelectorAll('.dm-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice || '';
        root.setAttribute('data-last-choice', choice);
      });
    });
  }

  function boot() {
    const initial = document.body.innerHTML || '';
    const state = parseState(initial);
    render(state);
  }

  boot();
})();
