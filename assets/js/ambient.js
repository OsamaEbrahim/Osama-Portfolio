(() => {
  'use strict';

  const canvas = document.querySelector('[data-ambient-canvas]');

  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
  });

  if (!context) {
    return;
  }

  const finePointer = window.matchMedia('(pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rootStyles = window.getComputedStyle(document.documentElement);
  const maximumCanvasPixels = 6500000;
  const routeGrid = 8;

  const parseHex = (value, fallback) => {
    const normalized = value.trim().replace('#', '');
    const expanded =
      normalized.length === 3
        ? normalized
            .split('')
            .map((character) => `${character}${character}`)
            .join('')
        : normalized;

    if (!/^[\da-f]{6}$/i.test(expanded)) {
      return fallback;
    }

    return [
      Number.parseInt(expanded.slice(0, 2), 16),
      Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16),
    ];
  };

  const palette = {
    cyan: parseHex(rootStyles.getPropertyValue('--color-cyan'), [90, 188, 235]),
    focus: parseHex(rootStyles.getPropertyValue('--color-focus'), [125, 211, 252]),
    gold: parseHex(rootStyles.getPropertyValue('--color-gold'), [201, 168, 106]),
  };

  const rgba = ([red, green, blue], alpha) =>
    `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(alpha, 1))})`;

  const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));

  const snap = (value) => Math.round(value / routeGrid) * routeGrid;

  const makeRandom = (initialSeed) => {
    let seed = initialSeed >>> 0;

    return () => {
      seed += 0x6d2b79f5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };

  const state = {
    width: 0,
    height: 0,
    pixelRatio: 1,
    profile: null,
    frame: 0,
    resizeTimer: 0,
    lastFrameTime: 0,
    lastPointerInput: 0,
    lastScrollInput: 0,
    lastScrollY: window.scrollY || 0,
    pointerEnergy: 0,
    scrollEnergy: 0,
    scrollDirection: 1,
    pointer: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      velocityX: 0,
      velocityY: 0,
      activeNode: -1,
    },
    nodes: [],
    routes: [],
    packets: [],
    waves: [],
    tapCandidate: null,
    interactionsEnabled: false,
  };

  const getProfile = () => {
    if (state.width < 640) {
      return {
        columns: 4,
        rows: 4,
        maxRoutes: 20,
        packetCount: 5,
        maximumWaveHops: 3,
        dprCap: 1,
      };
    }

    if (state.width < 1024) {
      return {
        columns: 6,
        rows: 5,
        maxRoutes: 40,
        packetCount: 8,
        maximumWaveHops: 4,
        dprCap: 1.25,
      };
    }

    return {
      columns: 7,
      rows: 6,
      maxRoutes: 64,
      packetCount: 12,
      maximumWaveHops: 5,
      dprCap: 1.5,
    };
  };

  const scannerRadius = () => clamp(state.width * 0.18, 180, 270);

  const getRoutePoints = (route, dynamic = true) => {
    const from = state.nodes[route.from];
    const to = state.nodes[route.to];
    const fromX = from.x + (dynamic ? from.offsetX : 0);
    const fromY = from.y + (dynamic ? from.offsetY : 0);
    const toX = to.x + (dynamic ? to.offsetX : 0);
    const toY = to.y + (dynamic ? to.offsetY : 0);

    if (route.horizontalFirst) {
      return [
        [fromX, fromY],
        [route.lane, fromY],
        [route.lane, toY],
        [toX, toY],
      ];
    }

    return [
      [fromX, fromY],
      [fromX, route.lane],
      [toX, route.lane],
      [toX, toY],
    ];
  };

  const routeMetrics = (points) => {
    const segments = [];
    let totalLength = 0;

    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);

      if (length < 0.5) {
        continue;
      }

      segments.push({ from, to, length, start: totalLength });
      totalLength += length;
    }

    return { segments, totalLength };
  };

  const pointAlongRoute = (route, progress, reverse = false, dynamic = true) => {
    const metrics = dynamic
      ? routeMetrics(getRoutePoints(route, true))
      : route.metrics;
    const normalized = reverse ? 1 - progress : progress;
    const targetDistance = clamp(normalized, 0, 1) * metrics.totalLength;
    const segment =
      metrics.segments.find(
        (candidate) => targetDistance <= candidate.start + candidate.length,
      ) || metrics.segments[metrics.segments.length - 1];

    if (!segment) {
      const node = state.nodes[route.from];
      return { x: node.x, y: node.y, angle: 0 };
    }

    const segmentProgress = clamp(
      (targetDistance - segment.start) / segment.length,
      0,
      1,
    );

    return {
      x: segment.from[0] + (segment.to[0] - segment.from[0]) * segmentProgress,
      y: segment.from[1] + (segment.to[1] - segment.from[1]) * segmentProgress,
      angle: Math.atan2(
        segment.to[1] - segment.from[1],
        segment.to[0] - segment.from[0],
      ),
    };
  };

  const traceRoute = (route, dynamic = true) => {
    const points = getRoutePoints(route, dynamic);
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);

    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index][0], points[index][1]);
    }

    context.stroke();
  };

  const addRoute = (from, to, horizontalFirst, random) => {
    if (state.routes.length >= state.profile.maxRoutes) {
      return;
    }

    const duplicate = state.routes.some(
      (route) =>
        (route.from === from && route.to === to) ||
        (route.from === to && route.to === from),
    );

    if (duplicate) {
      return;
    }

    const fromNode = state.nodes[from];
    const toNode = state.nodes[to];
    const lane = horizontalFirst
      ? snap(fromNode.x + (toNode.x - fromNode.x) * (0.4 + random() * 0.2))
      : snap(fromNode.y + (toNode.y - fromNode.y) * (0.4 + random() * 0.2));
    const route = {
      id: state.routes.length,
      from,
      to,
      horizontalFirst,
      lane,
      gold: random() < 0.125,
      metrics: null,
    };

    route.metrics = routeMetrics(getRoutePoints(route, false));
    state.routes.push(route);
    fromNode.routes.push(route.id);
    toNode.routes.push(route.id);
  };

  const buildTopology = () => {
    const { columns, rows } = state.profile;
    const random = makeRandom(0x4f454800 + columns * 97 + rows * 131);
    const horizontalMargin = state.width * 0.035;
    const verticalMargin = state.height * 0.055;
    const usableWidth = state.width - horizontalMargin * 2;
    const usableHeight = state.height - verticalMargin * 2;
    const columnGap = usableWidth / Math.max(1, columns - 1);
    const rowGap = usableHeight / Math.max(1, rows - 1);

    state.nodes = [];
    state.routes = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const id = row * columns + column;
        const edgeBiasX = column === 0 ? -0.45 : column === columns - 1 ? 0.45 : 0;
        const edgeBiasY = row === 0 ? -0.32 : row === rows - 1 ? 0.32 : 0;
        const jitterX = (random() - 0.5 + edgeBiasX) * columnGap * 0.3;
        const jitterY = (random() - 0.5 + edgeBiasY) * rowGap * 0.3;

        state.nodes.push({
          id,
          row,
          column,
          x: horizontalMargin + column * columnGap + jitterX,
          y: verticalMargin + row * rowGap + jitterY,
          offsetX: 0,
          offsetY: 0,
          routes: [],
          hub: id % 7 === 0,
          gold: id % 11 === 0,
        });
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const from = row * columns + column;
        addRoute(from, from + 1, true, random);
      }
    }

    const verticalCandidates = [];

    for (let row = 0; row < rows - 1; row += 1) {
      const requiredColumn = (row * 2 + 1) % columns;
      const from = row * columns + requiredColumn;
      addRoute(from, from + columns, false, random);

      for (let column = 0; column < columns; column += 1) {
        if (column !== requiredColumn) {
          verticalCandidates.push({
            from: row * columns + column,
            score: random(),
          });
        }
      }
    }

    verticalCandidates
      .sort((first, second) => first.score - second.score)
      .forEach(({ from }) => addRoute(from, from + columns, false, random));

    state.nodes.forEach((node) => {
      if (node.routes.length >= 3) {
        node.hub = true;
      }
    });

    const packetCount = reducedMotion.matches ? 0 : state.profile.packetCount;
    state.packets = Array.from({ length: packetCount }, (_, index) => ({
      routeId: (index * 7 + 3) % state.routes.length,
      progress: (0.083 + index * 0.157) % 1,
      speed: 0.035 + (index % 4) * 0.008,
      direction: index % 3 === 0 ? -1 : 1,
      gold: index % 5 === 0,
    }));
  };

  const nearestNode = (x, y) => {
    let closest = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    state.nodes.forEach((node) => {
      const distance = Math.hypot(node.x - x, node.y - y);

      if (distance < closestDistance) {
        closest = node.id;
        closestDistance = distance;
      }
    });

    return { id: closest, distance: closestDistance };
  };

  const updateNodeOffsets = () => {
    const radius = scannerRadius();
    const pointerSpeed = Math.hypot(
      state.pointer.velocityX,
      state.pointer.velocityY,
    );

    state.nodes.forEach((node) => {
      node.offsetX = 0;
      node.offsetY = 0;

      if (state.pointerEnergy <= 0.01) {
        return;
      }

      const deltaX = node.x - state.pointer.x;
      const deltaY = node.y - state.pointer.y;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance >= radius) {
        return;
      }

      const influence = (1 - distance / radius) ** 2 * state.pointerEnergy;
      const safeDistance = Math.max(distance, 1);
      const unitX = deltaX / safeDistance;
      const unitY = deltaY / safeDistance;
      const radialShift = 12 * influence;
      const tangentShift = Math.min(7, pointerSpeed * 0.16) * influence;

      node.offsetX = unitX * radialShift - unitY * tangentShift;
      node.offsetY = unitY * radialShift + unitX * tangentShift;
    });
  };

  const distanceToRoute = (route, x, y) => {
    const points = getRoutePoints(route, true);
    let closest = Number.POSITIVE_INFINITY;

    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const segmentX = end[0] - start[0];
      const segmentY = end[1] - start[1];
      const lengthSquared = segmentX * segmentX + segmentY * segmentY;
      const progress = lengthSquared
        ? clamp(
            ((x - start[0]) * segmentX + (y - start[1]) * segmentY) /
              lengthSquared,
            0,
            1,
          )
        : 0;
      const pointX = start[0] + segmentX * progress;
      const pointY = start[1] + segmentY * progress;
      closest = Math.min(closest, Math.hypot(x - pointX, y - pointY));
    }

    return closest;
  };

  const drawBaseNetwork = () => {
    context.save();
    context.lineWidth = 1;
    context.lineJoin = 'round';

    state.routes.forEach((route) => {
      context.strokeStyle = route.gold
        ? rgba(palette.gold, 0.075)
        : rgba(palette.cyan, 0.06);
      traceRoute(route, true);
    });

    context.restore();
  };

  const drawScannerNetwork = () => {
    if (state.pointerEnergy <= 0.015 || state.pointer.activeNode < 0) {
      return;
    }

    const radius = scannerRadius();

    context.save();
    context.lineJoin = 'round';

    state.routes.forEach((route) => {
      const distance = distanceToRoute(
        route,
        state.pointer.x,
        state.pointer.y,
      );

      if (distance >= radius) {
        return;
      }

      const influence = (1 - distance / radius) ** 2 * state.pointerEnergy;
      context.lineWidth = 1 + influence * 0.6;
      context.strokeStyle = route.gold
        ? rgba(palette.gold, state.pointerEnergy * 0.05 + influence * 0.43)
        : rgba(palette.focus, state.pointerEnergy * 0.04 + influence * 0.46);
      traceRoute(route, true);
    });

    context.restore();
  };

  const drawAmbientPackets = () => {
    const motionEnergy = Math.max(state.pointerEnergy, state.scrollEnergy);

    state.packets.forEach((packet) => {
      const route = state.routes[packet.routeId];
      const point = pointAlongRoute(route, packet.progress, false, true);
      const color = packet.gold ? palette.gold : palette.focus;
      const alpha = 0.2 + motionEnergy * 0.58;

      context.save();
      context.translate(point.x, point.y);
      context.rotate(point.angle);
      context.fillStyle = rgba(color, alpha * 0.14);
      context.fillRect(-6, -4, 12, 8);
      context.fillStyle = rgba(color, alpha);
      context.fillRect(-2.8, -1.4, 5.6, 2.8);
      context.restore();
    });
  };

  const drawCornerBrackets = (x, y, size, color, alpha) => {
    const arm = Math.max(4, size * 0.34);

    context.save();
    context.strokeStyle = rgba(color, alpha);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x - size, y - size + arm);
    context.lineTo(x - size, y - size);
    context.lineTo(x - size + arm, y - size);
    context.moveTo(x + size - arm, y - size);
    context.lineTo(x + size, y - size);
    context.lineTo(x + size, y - size + arm);
    context.moveTo(x + size, y + size - arm);
    context.lineTo(x + size, y + size);
    context.lineTo(x + size - arm, y + size);
    context.moveTo(x - size + arm, y + size);
    context.lineTo(x - size, y + size);
    context.lineTo(x - size, y + size - arm);
    context.stroke();
    context.restore();
  };

  const drawPointerScanner = () => {
    if (state.pointerEnergy <= 0.025 || state.pointer.activeNode < 0) {
      return;
    }

    const node = state.nodes[state.pointer.activeNode];
    const nodeX = node.x + node.offsetX;
    const nodeY = node.y + node.offsetY;
    const laneX = snap(state.pointer.x + (nodeX - state.pointer.x) * 0.5);
    const alpha = state.pointerEnergy;

    context.save();
    context.setLineDash([4, 7]);
    context.lineWidth = 1;
    context.strokeStyle = rgba(palette.gold, 0.3 * alpha);
    context.beginPath();
    context.moveTo(state.pointer.x, state.pointer.y);
    context.lineTo(laneX, state.pointer.y);
    context.lineTo(laneX, nodeY);
    context.lineTo(nodeX, nodeY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = rgba(palette.focus, 0.78 * alpha);
    context.fillRect(state.pointer.x - 1.5, state.pointer.y - 1.5, 3, 3);
    context.restore();

    drawCornerBrackets(
      state.pointer.x,
      state.pointer.y,
      23,
      palette.gold,
      0.52 * alpha,
    );
  };

  const drawNodes = () => {
    const radius = scannerRadius();

    state.nodes.forEach((node) => {
      const x = node.x + node.offsetX;
      const y = node.y + node.offsetY;
      const pointerDistance = Math.hypot(x - state.pointer.x, y - state.pointer.y);
      const influence =
        state.pointerEnergy > 0 && pointerDistance < radius
          ? (1 - pointerDistance / radius) ** 2 * state.pointerEnergy
          : 0;
      const color = node.gold ? palette.gold : palette.focus;

      context.save();

      if (node.hub) {
        context.strokeStyle = rgba(color, 0.2 + influence * 0.55);
        context.lineWidth = 1;
        context.strokeRect(x - 4.5, y - 4.5, 9, 9);
        context.strokeStyle = rgba(color, 0.08 + influence * 0.25);
        context.strokeRect(x - 8, y - 8, 16, 16);
      } else {
        context.fillStyle = rgba(color, 0.24 + influence * 0.64);
        context.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
      }

      context.restore();
    });
  };

  const createActivationWave = (originId, startedAt) => {
    const nodeCount = state.nodes.length;
    const distances = Array(nodeCount).fill(Number.POSITIVE_INFINITY);
    const hops = Array(nodeCount).fill(Number.POSITIVE_INFINITY);
    const previousNode = Array(nodeCount).fill(-1);
    const previousRoute = Array(nodeCount).fill(-1);
    const visited = Array(nodeCount).fill(false);
    distances[originId] = 0;
    hops[originId] = 0;

    for (let iteration = 0; iteration < nodeCount; iteration += 1) {
      let current = -1;
      let shortest = Number.POSITIVE_INFINITY;

      for (let index = 0; index < nodeCount; index += 1) {
        if (!visited[index] && distances[index] < shortest) {
          current = index;
          shortest = distances[index];
        }
      }

      if (current < 0 || hops[current] >= state.profile.maximumWaveHops) {
        if (current >= 0) {
          visited[current] = true;
          continue;
        }

        break;
      }

      visited[current] = true;

      state.nodes[current].routes.forEach((routeId) => {
        const route = state.routes[routeId];
        const neighbor = route.from === current ? route.to : route.from;
        const nextHops = hops[current] + 1;
        const nextDistance = distances[current] + route.metrics.totalLength;

        if (
          nextHops <= state.profile.maximumWaveHops &&
          nextDistance < distances[neighbor]
        ) {
          distances[neighbor] = nextDistance;
          hops[neighbor] = nextHops;
          previousNode[neighbor] = current;
          previousRoute[neighbor] = routeId;
        }
      });
    }

    const signalSpeed = state.width < 640 ? 620 : 820;
    const legs = [];
    let expiresAt = startedAt + 420;

    for (let nodeId = 0; nodeId < nodeCount; nodeId += 1) {
      const routeId = previousRoute[nodeId];

      if (routeId < 0) {
        continue;
      }

      const route = state.routes[routeId];
      const fromNode = previousNode[nodeId];
      const startsAt =
        startedAt +
        ((distances[nodeId] - route.metrics.totalLength) / signalSpeed) * 1000;
      const endsAt = startedAt + (distances[nodeId] / signalSpeed) * 1000;
      expiresAt = Math.max(expiresAt, endsAt + 300);
      legs.push({
        routeId,
        fromNode,
        toNode: nodeId,
        startsAt,
        endsAt,
        reverse: route.from !== fromNode,
      });
    }

    state.waves.push({
      originId,
      startedAt,
      expiresAt,
      legs,
    });
    state.waves = state.waves.slice(-2);
  };

  const drawActivationWaves = (time) => {
    state.waves.forEach((wave) => {
      const origin = state.nodes[wave.originId];
      const originAge = time - wave.startedAt;

      if (originAge >= 0 && originAge < 420) {
        const progress = originAge / 420;
        drawCornerBrackets(
          origin.x,
          origin.y,
          8 + progress * 24,
          palette.gold,
          (1 - progress) * 0.72,
        );
      }

      wave.legs.forEach((leg) => {
        const route = state.routes[leg.routeId];

        if (time >= leg.startsAt && time <= leg.endsAt) {
          const progress =
            (time - leg.startsAt) / Math.max(1, leg.endsAt - leg.startsAt);
          const point = pointAlongRoute(route, progress, leg.reverse, true);

          context.save();
          context.lineWidth = 1.35;
          context.strokeStyle = route.gold
            ? rgba(palette.gold, 0.42)
            : rgba(palette.focus, 0.36);
          traceRoute(route, true);
          context.translate(point.x, point.y);
          context.rotate(point.angle + (leg.reverse ? Math.PI : 0));
          context.fillStyle = rgba(route.gold ? palette.gold : palette.focus, 0.18);
          context.fillRect(-7, -4, 14, 8);
          context.fillStyle = rgba(route.gold ? palette.gold : palette.focus, 0.94);
          context.fillRect(-3, -1.5, 6, 3);
          context.restore();
        }

        const arrivalAge = time - leg.endsAt;

        if (arrivalAge >= 0 && arrivalAge < 300) {
          const node = state.nodes[leg.toNode];
          const progress = arrivalAge / 300;
          const size = 4 + progress * 11;

          context.save();
          context.strokeStyle = rgba(
            route.gold ? palette.gold : palette.focus,
            (1 - progress) * 0.74,
          );
          context.lineWidth = 1;
          context.strokeRect(node.x - size, node.y - size, size * 2, size * 2);
          context.restore();
        }
      });
    });
  };

  const draw = (time) => {
    context.clearRect(0, 0, state.width, state.height);
    updateNodeOffsets();
    drawBaseNetwork();
    drawScannerNetwork();
    drawActivationWaves(time);
    drawAmbientPackets();
    drawNodes();
    drawPointerScanner();
  };

  const requestRender = () => {
    if (!state.frame) {
      state.frame = window.requestAnimationFrame(render);
    }
  };

  const render = (time) => {
    const elapsed = state.lastFrameTime
      ? Math.min(48, time - state.lastFrameTime)
      : 16.67;
    const frameScale = elapsed / 16.67;
    state.lastFrameTime = time;

    const easing = Math.min(1, 0.18 * frameScale);
    state.pointer.x += (state.pointer.targetX - state.pointer.x) * easing;
    state.pointer.y += (state.pointer.targetY - state.pointer.y) * easing;
    state.pointer.velocityX *= 0.82 ** frameScale;
    state.pointer.velocityY *= 0.82 ** frameScale;

    const packetDirection =
      state.scrollEnergy > state.pointerEnergy
        ? state.scrollDirection
        : 0;

    state.packets.forEach((packet) => {
      const direction = packetDirection || packet.direction;
      packet.progress =
        (packet.progress + direction * packet.speed * (elapsed / 1000) + 1) % 1;
    });

    if (time - state.lastPointerInput > 110) {
      state.pointerEnergy *= 0.925 ** frameScale;
    }

    if (time - state.lastScrollInput > 70) {
      state.scrollEnergy *= 0.86 ** frameScale;
    }

    state.waves = state.waves.filter((wave) => time < wave.expiresAt);
    draw(time);

    const pointerDistance = Math.hypot(
      state.pointer.targetX - state.pointer.x,
      state.pointer.targetY - state.pointer.y,
    );
    const shouldContinue =
      state.pointerEnergy > 0.012 ||
      state.scrollEnergy > 0.012 ||
      state.waves.length > 0 ||
      pointerDistance > 0.35;

    if (shouldContinue && !document.hidden && !reducedMotion.matches) {
      state.frame = window.requestAnimationFrame(render);
    } else {
      state.pointerEnergy = 0;
      state.scrollEnergy = 0;
      state.frame = 0;
      state.lastFrameTime = 0;
      draw(time);
    }
  };

  const sizeCanvas = () => {
    state.width = Math.max(
      1,
      document.documentElement.clientWidth || window.innerWidth,
    );
    state.height = Math.max(
      1,
      document.documentElement.clientHeight || window.innerHeight,
    );
    state.profile = getProfile();

    const requestedRatio = Math.min(
      window.devicePixelRatio || 1,
      state.profile.dprCap,
    );
    const budgetRatio = Math.sqrt(
      maximumCanvasPixels / Math.max(1, state.width * state.height),
    );
    state.pixelRatio = Math.min(requestedRatio, budgetRatio);

    canvas.width = Math.floor(state.width * state.pixelRatio);
    canvas.height = Math.floor(state.height * state.pixelRatio);
    context.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);

    buildTopology();

    state.pointer.x = state.width * 0.74;
    state.pointer.y = state.height * 0.18;
    state.pointer.targetX = state.pointer.x;
    state.pointer.targetY = state.pointer.y;
    state.pointer.activeNode = -1;
    state.pointerEnergy = 0;
    state.scrollEnergy = 0;
    state.waves = [];
    draw(window.performance.now());
  };

  const handlePointerMove = (event) => {
    if (!event.isPrimary) {
      return;
    }

    if (state.tapCandidate && state.tapCandidate.pointerId === event.pointerId) {
      const travel = Math.hypot(
        event.clientX - state.tapCandidate.x,
        event.clientY - state.tapCandidate.y,
      );

      if (travel > 12) {
        state.tapCandidate = null;
      }
    }

    const hoverPointer = event.pointerType === 'mouse' || event.pointerType === 'pen';

    if (!finePointer.matches || !hoverPointer) {
      return;
    }

    const previousX = state.pointer.targetX;
    const previousY = state.pointer.targetY;
    state.pointer.targetX = event.clientX;
    state.pointer.targetY = event.clientY;
    state.pointer.velocityX = clamp(event.clientX - previousX, -42, 42);
    state.pointer.velocityY = clamp(event.clientY - previousY, -42, 42);
    state.pointer.activeNode = nearestNode(event.clientX, event.clientY).id;
    state.lastPointerInput = window.performance.now();
    state.pointerEnergy = 1;
    requestRender();
  };

  const handlePointerDown = (event) => {
    const primaryMouseButton = event.pointerType !== 'mouse' || event.button === 0;

    if (!event.isPrimary || !primaryMouseButton) {
      return;
    }

    state.tapCandidate = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: window.performance.now(),
    };
  };

  const handlePointerUp = (event) => {
    const candidate = state.tapCandidate;
    state.tapCandidate = null;

    if (!candidate || candidate.pointerId !== event.pointerId || !event.isPrimary) {
      return;
    }

    const duration = window.performance.now() - candidate.startedAt;
    const travel = Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y);

    if (duration > 550 || travel > 12) {
      return;
    }

    const now = window.performance.now();
    const origin = nearestNode(event.clientX, event.clientY);

    if (origin.id < 0) {
      return;
    }

    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.targetX = event.clientX;
    state.pointer.targetY = event.clientY;
    state.pointer.activeNode = origin.id;
    state.lastPointerInput = now;
    state.pointerEnergy = event.pointerType === 'touch' ? 0 : 1;
    createActivationWave(origin.id, now);
    requestRender();
  };

  const handlePointerCancel = () => {
    state.tapCandidate = null;
  };

  const handlePointerLeave = () => {
    state.lastPointerInput = window.performance.now() - 500;
    requestRender();
  };

  const handleScroll = () => {
    const currentScrollY = window.scrollY || 0;
    const delta = currentScrollY - state.lastScrollY;
    state.lastScrollY = currentScrollY;

    if (Math.abs(delta) < 0.5) {
      return;
    }

    state.scrollDirection = delta > 0 ? 1 : -1;
    state.lastScrollInput = window.performance.now();
    state.scrollEnergy = 0.34;
    requestRender();
  };

  const enableInteractions = () => {
    if (state.interactionsEnabled) {
      return;
    }

    state.interactionsEnabled = true;
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
  };

  const disableInteractions = () => {
    if (!state.interactionsEnabled) {
      return;
    }

    state.interactionsEnabled = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
    document.removeEventListener('mouseleave', handlePointerLeave);
    window.removeEventListener('scroll', handleScroll);
    state.tapCandidate = null;
  };

  const syncPreferences = () => {
    if (reducedMotion.matches) {
      disableInteractions();

      if (state.frame) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
      }

      state.lastFrameTime = 0;
      state.pointerEnergy = 0;
      state.scrollEnergy = 0;
      state.waves = [];
      buildTopology();
      draw(window.performance.now());
      return;
    }

    enableInteractions();
    buildTopology();
    draw(window.performance.now());
  };

  const handleResize = () => {
    if (state.resizeTimer) {
      window.clearTimeout(state.resizeTimer);
    }

    state.resizeTimer = window.setTimeout(() => {
      state.resizeTimer = 0;
      sizeCanvas();
    }, 120);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (state.frame) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
      }

      state.lastFrameTime = 0;
      return;
    }

    state.waves = state.waves.filter(
      (wave) => window.performance.now() < wave.expiresAt,
    );
    draw(window.performance.now());

    if (state.pointerEnergy > 0.012 || state.scrollEnergy > 0.012 || state.waves.length) {
      requestRender();
    }
  };

  finePointer.addEventListener('change', syncPreferences);
  reducedMotion.addEventListener('change', syncPreferences);
  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);

  sizeCanvas();
  syncPreferences();
})();
