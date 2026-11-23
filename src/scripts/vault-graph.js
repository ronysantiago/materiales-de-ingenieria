const shell = document.querySelector('#vault-graph-shell');
const canvas = document.querySelector('#vault-graph-canvas');
const dataElement = document.querySelector('#vault-graph-data');

if (shell && canvas && dataElement && !shell.dataset.initialized) {
  shell.dataset.initialized = 'true';
  const graph = JSON.parse(dataElement.textContent || '{"nodes":[],"edges":[]}');
  const context = canvas.getContext('2d');
  const search = document.querySelector('#vault-graph-search');
  const category = document.querySelector('#vault-graph-category');
  const resetButton = document.querySelector('#vault-graph-reset');
  const status = document.querySelector('#vault-graph-status');
  const detailTitle = document.querySelector('#vault-node-title');
  const detailMeta = document.querySelector('#vault-node-meta');
  const detailOpen = document.querySelector('#vault-node-open');

  if (context) {
    const nodes = graph.nodes.map((node) => ({ ...node, radius: Math.min(10, 4.5 + Math.sqrt(node.degree || 0) * 1.15) }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const categoryNames = [...new Set(nodes.map((node) => node.category))].sort((a, b) => a.localeCompare(b, 'es'));
    const categoryPalette = ['#5c8ea8', '#b17d56', '#538778', '#8974a8', '#7a8c58', '#9a7080', '#6a83ad', '#a38b4d'];
    let width = 1000;
    let height = 680;
    let dpr = 1;
    let visibleNodes = nodes;
    let visibleIds = new Set(nodes.map((node) => node.id));
    let selected = null;
    let hovered = null;
    let dragNode = null;
    let pointerStart = null;
    let moved = false;
    let view = { scale: 0.62, x: 0, y: 0 };

    function bounds() {
      if (!nodes.length) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
      return {
        minX: Math.min(...nodes.map((node) => node.x)),
        maxX: Math.max(...nodes.map((node) => node.x)),
        minY: Math.min(...nodes.map((node) => node.y)),
        maxY: Math.max(...nodes.map((node) => node.y)),
      };
    }

    function fitGraph() {
      const b = bounds();
      const spanX = Math.max(320, b.maxX - b.minX + 260);
      const spanY = Math.max(240, b.maxY - b.minY + 220);
      view.scale = Math.min(width / spanX, height / spanY, 1.15);
      view.x = (width - (b.minX + b.maxX) * view.scale) / 2;
      view.y = (height - (b.minY + b.maxY) * view.scale) / 2;
      draw();
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(460, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      fitGraph();
    }

    function colorFor(categoryName, linked) {
      const index = categoryNames.indexOf(categoryName);
      const color = categoryPalette[(index < 0 ? 0 : index) % categoryPalette.length];
      return linked ? color : '#aab7c1';
    }

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#f5f8fa';
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(view.x, view.y);
      context.scale(view.scale, view.scale);

      context.lineWidth = 1.1 / view.scale;
      context.strokeStyle = 'rgba(83, 111, 132, .23)';
      context.beginPath();
      for (const edge of graph.edges) {
        if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) continue;
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
      }
      context.stroke();

      for (const node of visibleNodes) {
        const radius = Math.max(node.radius, 3.8 / view.scale) + (selected?.id === node.id ? 2.2 / view.scale : hovered?.id === node.id ? 1.4 / view.scale : 0);
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fillStyle = colorFor(node.category, node.degree > 0);
        context.globalAlpha = selected && selected.id !== node.id ? .48 : 1;
        context.fill();
        if (selected?.id === node.id || hovered?.id === node.id) {
          context.lineWidth = 2 / view.scale;
          context.strokeStyle = '#173d59';
          context.stroke();
        }
        context.globalAlpha = 1;

        const showLabel = view.scale > .42 && (visibleNodes.length < 150 || node.degree >= 2 || selected?.id === node.id || hovered?.id === node.id);
        if (showLabel) {
          context.font = `${selected?.id === node.id ? '700' : '500'} ${Math.max(9, 11 / view.scale)}px Inter, system-ui, sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'top';
          context.fillStyle = selected?.id === node.id ? '#142f43' : '#556879';
          const label = node.title.length > 31 ? `${node.title.slice(0, 28)}…` : node.title;
          context.fillText(label, node.x, node.y + radius + 5 / view.scale);
        }
      }
      context.restore();
    }

    function applyFilters() {
      const query = (search?.value || '').trim().toLocaleLowerCase('es');
      const folder = category?.value || '';
      visibleNodes = nodes.filter((node) => (!folder || node.category === folder) && (!query || `${node.title} ${node.sourcePath} ${node.category} ${(node.tags || []).join(' ')}`.toLocaleLowerCase('es').includes(query)));
      visibleIds = new Set(visibleNodes.map((node) => node.id));
      if (status) status.textContent = `${visibleNodes.length} de ${nodes.length} notas visibles · ${graph.edgeCount} conexiones totales.`;
      draw();
    }

    function screenToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return { x: (clientX - rect.left - view.x) / view.scale, y: (clientY - rect.top - view.y) / view.scale };
    }

    function findNode(point) {
      let closest = null;
      let minDistance = Infinity;
      for (const node of visibleNodes) {
        const distance = Math.hypot(node.x - point.x, node.y - point.y);
        const threshold = Math.max(15, node.radius + 8 / view.scale);
        if (distance < threshold && distance < minDistance) { closest = node; minDistance = distance; }
      }
      return closest;
    }

    function selectNode(node) {
      selected = node;
      if (node) {
        const connections = graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
        if (detailTitle) detailTitle.textContent = node.title;
        if (detailMeta) detailMeta.textContent = `${node.category} · ${connections} conexiones · ${node.sourcePath}`;
        if (detailOpen) {
          detailOpen.href = node.href;
          detailOpen.setAttribute('aria-disabled', 'false');
        }
      }
      draw();
    }

    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      const point = screenToWorld(event.clientX, event.clientY);
      const hit = findNode(point);
      pointerStart = { x: event.clientX, y: event.clientY };
      moved = false;
      dragNode = hit;
      if (hit) selectNode(hit);
    });

    canvas.addEventListener('pointermove', (event) => {
      const point = screenToWorld(event.clientX, event.clientY);
      hovered = findNode(point);
      if (pointerStart && (Math.abs(event.clientX - pointerStart.x) + Math.abs(event.clientY - pointerStart.y) > 4)) moved = true;
      if (pointerStart && moved) {
        if (dragNode) {
          const world = screenToWorld(event.clientX, event.clientY);
          dragNode.x = world.x;
          dragNode.y = world.y;
        } else {
          view.x += event.movementX;
          view.y += event.movementY;
        }
      }
      canvas.style.cursor = dragNode || hovered ? 'pointer' : pointerStart ? 'grabbing' : 'grab';
      draw();
    });

    canvas.addEventListener('pointerup', (event) => {
      if (!moved && dragNode && selected?.id === dragNode.id && event.detail === 2) window.location.href = dragNode.href;
      pointerStart = null;
      dragNode = null;
      canvas.style.cursor = hovered ? 'pointer' : 'grab';
    });
    canvas.addEventListener('pointercancel', () => { pointerStart = null; dragNode = null; });

    canvas.addEventListener('dblclick', (event) => {
      const node = findNode(screenToWorld(event.clientX, event.clientY));
      if (node) window.location.href = node.href;
    });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.12 : .89;
      const nextScale = Math.max(.12, Math.min(3.5, view.scale * factor));
      const worldX = (px - view.x) / view.scale;
      const worldY = (py - view.y) / view.scale;
      view.scale = nextScale;
      view.x = px - worldX * nextScale;
      view.y = py - worldY * nextScale;
      draw();
    }, { passive: false });

    search?.addEventListener('input', applyFilters);
    category?.addEventListener('change', applyFilters);
    resetButton?.addEventListener('click', fitGraph);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    if (nodes.length) resize();
  }
}
