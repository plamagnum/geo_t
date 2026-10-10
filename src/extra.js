(() => {
  "use strict";
  const { boot, byId, listen, context, clamp, fmt, pointOnCanvas } = window.Topo;

  boot("математична основа", () => {
    const longitude = byId("longitude-zone");
    const result = byId("zone-result");
    const zoneView = context("zones-canvas");
    const drawZones = () => {
      if (!longitude || !result || !zoneView) return;
      const lon = Number(longitude.value);
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        result.textContent = "Уведи довготу від −180° до 180°.";
        return;
      }
      const zone = clamp(Math.floor((lon + 180) / 6) + 1, 1, 60);
      const meridian = 6 * zone - 183;
      const difference = Math.abs(lon - meridian) * Math.PI / 180;
      const distortion = 0.9996 * (1 + 0.5 * difference * difference);
      result.textContent = `Зона ${zone}; осьовий меридіан ${fmt(meridian, 0)}°; наближене спотворення довжини k ≈ ${fmt(distortion, 6)}.`;
      const { canvas, ctx } = zoneView;
      const margin = 20;
      const gap = 2;
      const cellWidth = (canvas.width - 2 * margin - 59 * gap) / 60;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f7faf7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 1; i <= 60; i += 1) {
        const x = margin + (i - 1) * (cellWidth + gap);
        ctx.fillStyle = i === zone ? "#b7dfc2" : (i % 2 ? "#e3eee6" : "#f0f5f1");
        ctx.fillRect(x, 38, cellWidth, 92);
        ctx.strokeStyle = "#bed0c2";
        ctx.strokeRect(x, 38, cellWidth, 92);
        if (i % 5 === 1 || i === 60) {
          ctx.fillStyle = "#53645a";
          ctx.font = "10px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(String(i), x + cellWidth / 2, 148);
        }
      }
      const axisX = margin + (zone - 0.5) * (cellWidth + gap);
      ctx.beginPath();
      ctx.moveTo(axisX, 20);
      ctx.lineTo(axisX, 137);
      ctx.strokeStyle = "#d4483e";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#b43c34";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`Зона ${zone} · осьовий меридіан`, axisX, 24);
      ctx.textAlign = "left";
      ctx.fillStyle = "#5d6e62";
      ctx.font = "12px system-ui";
      ctx.fillText("60 шестиградусних зон", margin, 164);
    };
    if (longitude) longitude.addEventListener("input", drawZones);
    drawZones();

    const sheetLat = byId("sheet-lat");
    const sheetLon = byId("sheet-lon");
    const sheetScale = byId("sheet-scale");
    const steps = byId("sheet-steps");
    if (sheetLat && sheetLon && sheetScale && steps) {
      const roman = (number) => {
        const values = [[30, "XXX"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
        let remainder = number;
        let output = "";
        values.forEach(([value, symbol]) => {
          while (remainder >= value) {
            output += symbol;
            remainder -= value;
          }
        });
        return output;
      };
      const renderNomenclature = () => {
        const lat = Number(sheetLat.value);
        const lon = Number(sheetLon.value);
        const scale = Number(sheetScale.value);
        steps.replaceChildren();
        if (!Number.isFinite(lat) || lat < -4 || lat > 88 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
          const item = document.createElement("li");
          item.textContent = "Введи широту від 4° пд. ш. до 88° пн. ш. і довготу від −180° до 180°.";
          steps.append(item);
          return;
        }
        const bandNumber = clamp(Math.floor((88 - lat) / 4), 0, 21);
        const band = String.fromCharCode(65 + bandNumber);
        const column = clamp(Math.floor((lon + 180) / 6) + 1, 1, 60);
        const name = `${band}-${column}`;
        const addStep = (label, value) => {
          const li = document.createElement("li");
          const strong = document.createElement("strong");
          strong.textContent = label;
          li.append(strong, document.createTextNode(` ${value}`));
          steps.append(li);
        };
        addStep("1:1 000 000:", `${name} — пояс ${band} (4°), колона ${column} (6°).`);
        if (scale === 1000000) return;
        const latitudeInSheet = ((88 - bandNumber * 4) - lat) / 4;
        const longitudeInSheet = (lon - (-180 + (column - 1) * 6)) / 6;
        let current = name;
        let r;
        let c;
        if (scale === 500000) {
          r = Math.min(1, Math.floor(latitudeInSheet * 2));
          c = Math.min(1, Math.floor(longitudeInSheet * 2));
          const suffix = ["А", "Б", "В", "Г"][r * 2 + c];
          current += `-${suffix}`;
          addStep("1:500 000:", `${current} — чверть ${suffix} (2° × 3°).`);
        } else {
          r = Math.min(2, Math.floor(latitudeInSheet * 3));
          c = Math.min(11, Math.floor(longitudeInSheet * 12));
          const index = r * 12 + c + 1;
          current += `-${roman(index)}`;
          addStep("1:200 000:", `${current} — аркуш ${roman(index)} із 36.`);
        }
        if (scale === 500000 || scale === 200000) return;
        r = Math.min(11, Math.floor(latitudeInSheet * 12));
        c = Math.min(11, Math.floor(longitudeInSheet * 12));
        const hundredIndex = r * 12 + c + 1;
        current = `${name}-${hundredIndex}`;
        addStep("1:100 000:", `${current} — один із 144 аркушів.`);
        if (scale === 100000) return;
        const rowInHundred = Math.min(1, Math.floor(((latitudeInSheet * 12) % 1) * 2));
        const colInHundred = Math.min(1, Math.floor(((longitudeInSheet * 12) % 1) * 2));
        const upper = ["А", "Б", "В", "Г"][rowInHundred * 2 + colInHundred];
        current += `-${upper}`;
        addStep("1:50 000:", `${current} — частина ${upper}.`);
        if (scale === 50000) return;
        const rowAt50 = Math.min(1, Math.floor(((latitudeInSheet * 24) % 1) * 2));
        const colAt50 = Math.min(1, Math.floor(((longitudeInSheet * 24) % 1) * 2));
        const lower = ["а", "б", "в", "г"][rowAt50 * 2 + colAt50];
        current += `-${lower}`;
        addStep("1:25 000:", `${current} — частина ${lower}.`);
        if (scale === 25000) return;
        const rowAt25 = Math.min(1, Math.floor(((latitudeInSheet * 48) % 1) * 2));
        const colAt25 = Math.min(1, Math.floor(((longitudeInSheet * 48) % 1) * 2));
        const number = rowAt25 * 2 + colAt25 + 1;
        current += `-${number}`;
        addStep("1:10 000:", `${current} — частина ${number}.`);
      };
      [sheetLat, sheetLon, sheetScale].forEach((element) => element.addEventListener("input", renderNomenclature));
      renderNomenclature();
    }

    const heightA = byId("height-a");
    const heightB = byId("height-b");
    const heightDifference = byId("height-difference");
    const heightView = context("height-canvas");
    if (heightA && heightB && heightDifference && heightView) {
      const drawHeights = () => {
        const a = Number(heightA.value) || 0;
        const b = Number(heightB.value) || 0;
        const { canvas, ctx } = heightView;
        const baseline = canvas.height - 36;
        const range = Math.max(20, Math.abs(a), Math.abs(b));
        const factor = (canvas.height - 76) / (range * 2.1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fbfdfb";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const zeroY = baseline - (0 + range) * factor;
        ctx.strokeStyle = "#d64c44";
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(34, zeroY);
        ctx.lineTo(canvas.width - 18, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ad3931";
        ctx.font = "12px system-ui";
        ctx.fillText("0 м — нуль Кронштадтського футштока", 38, zeroY - 7);
        [a, b].forEach((value, index) => {
          const x = 165 + index * 270;
          const y = baseline - (value + range) * factor;
          ctx.fillStyle = index === 0 ? "#4c9163" : "#79a2b9";
          ctx.fillRect(x - 30, y, 60, baseline - y);
          ctx.fillStyle = "#34463a";
          ctx.textAlign = "center";
          ctx.fillText(`${fmt(value, 1)} м`, x, y - 8);
          ctx.fillText(`Точка ${index === 0 ? "A" : "B"}`, x, baseline + 18);
        });
        heightDifference.textContent = `Перевищення: ${fmt(Math.abs(a - b), 1)} м; точка ${a >= b ? "A" : "B"} вище за точку ${a >= b ? "B" : "A"}.`;
      };
      [heightA, heightB].forEach((input) => input.addEventListener("input", drawHeights));
      drawHeights();
    }
  });

  boot("форми рельєфу", () => {
    const view = context("landform-canvas");
    const profile = context("landform-profile");
    const select = byId("landform-select");
    if (!view || !profile || !select) return;
    const { canvas, ctx } = view;
    const models = {
      mountain: {
        title: "Гора",
        description: "Підвищення з вершиною, від якої поверхня знижується в усі боки.",
        clue: "Ознака розпізнавання: замкнені горизонталі; бергштрихи спрямовані від центру назовні.",
        height: (x, y) => 1.05 * Math.exp(-((x * x) / 0.19 + (y * y) / 0.26))
      },
      depression: {
        title: "Западина",
        description: "Замкнене зниження, у якому поверхня нижча від навколишньої місцевості.",
        clue: "Ознака розпізнавання: бергштрихи спрямовані до центра замкнених горизонталей.",
        height: (x, y) => -1.05 * Math.exp(-((x * x) / 0.19 + (y * y) / 0.26))
      },
      ridge: {
        title: "Хребет",
        description: "Витягнуте підвищення; від його осі схили спадають у протилежні боки.",
        clue: "Ознака розпізнавання: видовжені горизонталі утворюють виступ у бік нижчих висот.",
        height: (x, y) => 0.9 * Math.exp(-(y * y) / 0.11) * Math.exp(-(x * x) / 1.1) + 0.12 * Math.cos(x * 2)
      },
      valley: {
        title: "Долина",
        description: "Витягнуте зниження між підвищеннями, зазвичай із водотоком на дні.",
        clue: "Ознака розпізнавання: згини горизонталей спрямовані вгору за течією, до вищих ділянок.",
        height: (x, y) => -0.82 * Math.exp(-(y * y) / 0.1) * Math.exp(-(x * x) / 1.2) + 0.25 * Math.sin(x * 1.4)
      },
      gully: {
        title: "Яр",
        description: "Вузька глибока ерозійна форма з крутими схилами та дном.",
        clue: "Ознака розпізнавання: вузьке витягнуте зниження з крутими схилами й гострими згинами горизонталей.",
        height: (x, y) => -0.9 * Math.exp(-((y - 0.08 * Math.sin(x * 4)) ** 2) / 0.018) * Math.exp(-(x * x) / 0.9) + 0.18 * Math.cos(y * 4)
      },
      saddle: {
        title: "Сідловина",
        description: "Зниження між двома вершинами, найнижче місце вододілу між ними.",
        clue: "Ознака розпізнавання: між двома замкненими підвищеннями є найнижчий прохід.",
        height: (x, y) => 0.62 * Math.exp(-(((x - 0.55) ** 2 + y * y) / 0.18)) + 0.62 * Math.exp(-(((x + 0.55) ** 2 + y * y) / 0.18)) - 0.22 * Math.exp(-((x * x + y * y) / 0.12))
      }
    };
    const hachures = byId("hachures-toggle");
    const elevationLabels = byId("elevation-toggle");
    const description = byId("landform-description");
    const clue = byId("landform-clue");
    const title = byId("landform-title");
    const normalized = (x, y) => models[select.value].height((x / canvas.width - 0.5) * 2.8, (y / canvas.height - 0.5) * 2.4);
    const draw = () => {
      const model = models[select.value];
      const image = ctx.createImageData(canvas.width, canvas.height);
      const levels = 18;
      const range = 1.15;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const value = normalized(x, y);
          const ratio = clamp((value + range) / (2 * range), 0, 0.999);
          const palette = ratio < 0.25 ? [81, 136, 99] : ratio < 0.5 ? [148, 168, 106] : ratio < 0.75 ? [197, 180, 131] : [221, 212, 176];
          let [r, g, b] = palette;
          const contourPosition = (value + range) / (2 * range) * levels;
          const contourDistance = Math.abs(contourPosition - Math.round(contourPosition));
          if (contourDistance < 0.026) [r, g, b] = [92, 80, 60];
          const offset = (y * canvas.width + x) * 4;
          image.data[offset] = r;
          image.data[offset + 1] = g;
          image.data[offset + 2] = b;
          image.data[offset + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      if (hachures.checked) {
        ctx.strokeStyle = "#684941";
        ctx.lineWidth = 1.4;
        for (let y = 18; y < canvas.height - 18; y += 35) {
          for (let x = 18; x < canvas.width - 18; x += 35) {
            const value = normalized(x, y);
            const contourPosition = (value + range) / (2 * range) * levels;
            if (Math.abs(contourPosition - Math.round(contourPosition)) > 0.075) continue;
            const dx = normalized(x + 2, y) - normalized(x - 2, y);
            const dy = normalized(x, y + 2) - normalized(x, y - 2);
            const magnitude = Math.hypot(dx, dy);
            if (magnitude < 0.0005) continue;
            const ux = -dx / magnitude;
            const uy = -dy / magnitude;
            const length = 10;
            ctx.beginPath();
            ctx.moveTo(x - ux * length / 2, y - uy * length / 2);
            ctx.lineTo(x + ux * length / 2, y + uy * length / 2);
            ctx.moveTo(x + ux * length / 2, y + uy * length / 2);
            ctx.lineTo(x + ux * length / 2 - ux * 4 - uy * 3, y + uy * length / 2 - uy * 4 + ux * 3);
            ctx.moveTo(x + ux * length / 2, y + uy * length / 2);
            ctx.lineTo(x + ux * length / 2 - ux * 4 + uy * 3, y + uy * length / 2 - uy * 4 - ux * 3);
            ctx.stroke();
          }
        }
      }
      if (elevationLabels.checked) {
        ctx.fillStyle = "#554d3c";
        ctx.font = "12px system-ui";
        ctx.fillText(select.value === "depression" ? "↓" : "↑", canvas.width / 2 - 4, canvas.height / 2 + 4);
      }
      title.textContent = model.title;
      description.textContent = model.description;
      clue.textContent = model.clue;
      drawFormProfile();
    };
    const drawFormProfile = () => {
      const { canvas: pc, ctx: pctx } = profile;
      const margin = 28;
      pctx.clearRect(0, 0, pc.width, pc.height);
      pctx.fillStyle = "#fbfdfb";
      pctx.fillRect(0, 0, pc.width, pc.height);
      pctx.strokeStyle = "#bdc9bf";
      pctx.beginPath();
      pctx.moveTo(margin, 14);
      pctx.lineTo(margin, pc.height - margin);
      pctx.lineTo(pc.width - 10, pc.height - margin);
      pctx.stroke();
      const values = Array.from({ length: 180 }, (_, i) => models[select.value].height(((i / 179) - 0.5) * 2.8, 0));
      const low = Math.min(...values);
      const high = Math.max(...values);
      pctx.beginPath();
      values.forEach((value, i) => {
        const x = margin + i * (pc.width - margin - 14) / (values.length - 1);
        const y = pc.height - margin - 12 - (value - low) / Math.max(.01, high - low) * (pc.height - margin - 46);
        if (i === 0) pctx.moveTo(x, y);
        else pctx.lineTo(x, y);
      });
      pctx.strokeStyle = "#2e7d4f";
      pctx.lineWidth = 2;
      pctx.stroke();
      pctx.fillStyle = "#607067";
      pctx.font = "11px system-ui";
      pctx.fillText("Профіль по центральній лінії", margin, 12);
    };
    [select, hachures, elevationLabels].forEach((element) => element.addEventListener("change", draw));
    draw();

    const slopeHeight = byId("slope-height");
    const slopeDistance = byId("slope-distance");
    const slopeScale = byId("slope-scale");
    const slopeResult = byId("slope-result");
    const slopeView = context("slope-canvas");
    if (slopeHeight && slopeDistance && slopeScale && slopeView) {
      const updateSlope = () => {
        const height = Math.max(0, Number(slopeHeight.value) || 0);
        const mapMm = Math.max(0.1, Number(slopeDistance.value) || 0.1);
        const ground = mapMm * Number(slopeScale.value) / 1000;
        const angle = Math.atan(height / ground) * 180 / Math.PI;
        const percent = height / ground * 100;
        slopeResult.textContent = `Закладення на місцевості: ${fmt(ground)} м; кут схилу: ${fmt(angle)}°; ухил: ${fmt(percent)}%.`;
        const { canvas: c, ctx: sctx } = slopeView;
        sctx.clearRect(0, 0, c.width, c.height);
        sctx.fillStyle = "#fbfdfb";
        sctx.fillRect(0, 0, c.width, c.height);
        const baseY = c.height - 35;
        sctx.beginPath();
        sctx.moveTo(45, baseY);
        sctx.lineTo(c.width - 36, baseY);
        sctx.lineTo(c.width - 36, 35);
        sctx.closePath();
        sctx.fillStyle = "#e8f3ec";
        sctx.fill();
        sctx.strokeStyle = "#2e7d4f";
        sctx.lineWidth = 3;
        sctx.stroke();
        sctx.fillStyle = "#405248";
        sctx.font = "13px system-ui";
        sctx.fillText(`${fmt(height)} м`, c.width - 105, c.height / 2);
        sctx.fillText(`${fmt(ground)} м`, c.width / 2 - 22, c.height - 12);
        sctx.fillText(`${fmt(angle)}°`, c.width - 92, baseY - 8);
      };
      [slopeHeight, slopeDistance, slopeScale].forEach((element) => element.addEventListener("input", updateSlope));
      updateSlope();
    }

    const question = byId("landform-question");
    const options = byId("landform-options");
    const feedback = byId("landform-feedback");
    const names = Object.keys(models);
    let correctForm = null;
    let score = 0;
    const nextFormQuestion = () => {
      correctForm = names[Math.floor(Math.random() * names.length)];
      question.textContent = `Яка форма рельєфу має таку ознаку? ${models[correctForm].clue}`;
      feedback.textContent = "";
      options.replaceChildren();
      names.slice().sort(() => Math.random() - 0.5).slice(0, 4).forEach((key) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-button";
        button.textContent = models[key].title;
        button.addEventListener("click", () => {
          if (!correctForm) return;
          if (key === correctForm) {
            button.classList.add("correct");
            feedback.textContent = "Правильно! Чудове спостереження.";
            score += 1;
            byId("landform-score").textContent = String(score);
            correctForm = null;
          } else {
            button.classList.add("incorrect");
            feedback.textContent = "Не зовсім. Зверни увагу на ознаку та спробуй ще.";
          }
        });
        options.append(button);
      });
    };
    listen("new-landform-question", "click", nextFormQuestion);
    nextFormQuestion();
  });

  boot("координати", () => {
    const gridView = context("grid-canvas");
    const polarView = context("polar-canvas");
    const directionView = context("direction-canvas");
    if (!gridView || !polarView || !directionView) return;
    const { canvas: grid, ctx: gctx } = gridView;
    const margin = 42;
    const side = grid.width - margin * 2;
    let taskPoint = null;
    let taskActive = false;
    const drawGrid = () => {
      gctx.clearRect(0, 0, grid.width, grid.height);
      gctx.fillStyle = "#fbfdfb";
      gctx.fillRect(0, 0, grid.width, grid.height);
      gctx.fillStyle = "#f7faf7";
      gctx.fillRect(margin, margin, side, side);
      gctx.strokeStyle = "#8ca69a";
      gctx.lineWidth = 1;
      for (let i = 0; i <= 10; i += 1) {
        const p = margin + side * i / 10;
        gctx.beginPath();
        gctx.moveTo(p, margin);
        gctx.lineTo(p, grid.height - margin);
        gctx.moveTo(margin, p);
        gctx.lineTo(grid.width - margin, p);
        gctx.stroke();
      }
      gctx.strokeStyle = "#405d4a";
      gctx.lineWidth = 2;
      gctx.strokeRect(margin, margin, side, side);
      gctx.fillStyle = "#43574a";
      gctx.font = "12px system-ui";
      gctx.textAlign = "left";
      gctx.fillText("φ 50°27′", 5, 20);
      gctx.textAlign = "right";
      gctx.fillText("λ 30°31′", grid.width - 5, 20);
      gctx.textAlign = "left";
      gctx.fillText("λ 30°37′", 5, grid.height - 10);
      gctx.textAlign = "right";
      gctx.fillText("φ 50°21′", grid.width - 5, grid.height - 10);
      gctx.save();
      gctx.translate(18, grid.height / 2);
      gctx.rotate(-Math.PI / 2);
      gctx.textAlign = "center";
      gctx.fillText("Північ ↑", 0, 0);
      gctx.restore();
      gctx.fillStyle = "#52645a";
      gctx.textAlign = "center";
      gctx.fillText("1 км між лініями", grid.width / 2, grid.height - 15);
      if (taskPoint && taskActive) {
        gctx.beginPath();
        gctx.arc(margin + taskPoint.x * side, margin + taskPoint.y * side, 7, 0, Math.PI * 2);
        gctx.fillStyle = "#da4a40";
        gctx.fill();
      }
    };
    const coordinateText = (x, y) => {
      const northing = 5540 + (1 - y) * 10;
      const easting = 500 + (x - 0.5) * 10;
      return `X = ${fmt(northing, 2)} км; Y = 36 ${fmt(easting, 2)} км.`;
    };
    const result = byId("grid-result");
    grid.addEventListener("click", (event) => {
      const point = pointOnCanvas(grid, event);
      const x = clamp((point.x - margin) / side, 0, 1);
      const y = clamp((point.y - margin) / side, 0, 1);
      const coordinates = coordinateText(x, y);
      if (taskActive && taskPoint) {
        const distance = Math.hypot(x - taskPoint.x, y - taskPoint.y) * 10;
        result.textContent = `${coordinates} ${distance <= 1 ? "Правильно — точка в межах 1 км!" : `До загаданої точки приблизно ${fmt(distance)} км. Спробуй ще.`}`;
        if (distance <= 1) taskActive = false;
      } else result.textContent = coordinates;
    });
    listen("coordinate-task", "click", () => {
      taskPoint = { x: 0.12 + Math.random() * 0.76, y: 0.12 + Math.random() * 0.76 };
      taskActive = true;
      result.textContent = "Знайди загадану точку на сітці. Допуск — 1 км.";
      drawGrid();
    });
    drawGrid();

    const polar = polarView.canvas;
    const pctx = polarView.ctx;
    const mode = byId("polar-mode");
    let object = { x: 285, y: 105 };
    const a = { x: 92, y: 200 };
    const b = { x: 310, y: 200 };
    const polarResult = byId("polar-result");
    const drawPolar = () => {
      pctx.clearRect(0, 0, polar.width, polar.height);
      pctx.fillStyle = "#fbfdfb";
      pctx.fillRect(0, 0, polar.width, polar.height);
      const isBipolar = mode.value === "two";
      const points = isBipolar ? [a, b] : [a];
      points.forEach((point, index) => {
        pctx.beginPath();
        pctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        pctx.fillStyle = "#2e7d4f";
        pctx.fill();
        pctx.fillStyle = "#36493b";
        pctx.font = "13px system-ui";
        pctx.fillText(isBipolar ? `Точка ${index + 1}` : "Опорний пункт", point.x - 32, point.y + 20);
        if (isBipolar) {
          pctx.beginPath();
          pctx.arc(point.x, point.y, Math.hypot(object.x - point.x, object.y - point.y), 0, Math.PI * 2);
          pctx.setLineDash([4, 4]);
          pctx.strokeStyle = "#a3b9a8";
          pctx.stroke();
          pctx.setLineDash([]);
        }
      });
      points.forEach((point) => {
        pctx.beginPath();
        pctx.moveTo(point.x, point.y);
        pctx.lineTo(object.x, object.y);
        pctx.strokeStyle = "#789781";
        pctx.lineWidth = 2;
        pctx.stroke();
      });
      pctx.beginPath();
      pctx.arc(object.x, object.y, 7, 0, Math.PI * 2);
      pctx.fillStyle = "#d64c44";
      pctx.fill();
      const north = Math.atan2(a.x - object.x, object.y - a.y);
      const eastBearing = (Math.atan2(object.x - a.x, a.y - object.y) * 180 / Math.PI + 360) % 360;
      const distance = Math.hypot(object.x - a.x, object.y - a.y) * 5;
      byId("polar-help").textContent = isBipolar
        ? "Біполярний спосіб: положення визначають засічкою від двох опорних пунктів."
        : "Полярний спосіб: кут від напрямку на північ та відстань від опорного пункту.";
      polarResult.textContent = isBipolar
        ? `Відстані до пунктів: ${fmt(Math.hypot(object.x - a.x, object.y - a.y) * 5)} м і ${fmt(Math.hypot(object.x - b.x, object.y - b.y) * 5)} м.`
        : `Полярні координати: кут ${fmt((north * 180 / Math.PI + 360) % 360)}° від Пн; відстань ${fmt(distance)} м (напрямок ${fmt(eastBearing)}°).`;
    };
    polar.addEventListener("click", (event) => {
      const point = pointOnCanvas(polar, event);
      object = { x: clamp(point.x, 12, polar.width - 12), y: clamp(point.y, 12, polar.height - 12) };
      drawPolar();
    });
    mode.addEventListener("change", drawPolar);
    drawPolar();

    const azimuth = byId("true-azimuth");
    const declination = byId("declination");
    const convergence = byId("convergence");
    const directionText = byId("direction-results");
    const { canvas: dc, ctx: dctx } = directionView;
    const updateDirections = () => {
      const aTrue = ((Number(azimuth.value) || 0) % 360 + 360) % 360;
      const delta = Number(declination.value) || 0;
      const gamma = Number(convergence.value) || 0;
      const magnetic = ((aTrue - delta) % 360 + 360) % 360;
      const gridAngle = ((aTrue - gamma) % 360 + 360) % 360;
      const back = (aTrue + 180) % 360;
      const quadrant = Math.floor(aTrue / 90);
      const within = aTrue % 90;
      const rumba = quadrant === 0 ? `Пн ${fmt(within)}° Сх`
        : quadrant === 1 ? `Пд ${fmt(90 - within)}° Сх`
          : quadrant === 2 ? `Пд ${fmt(within)}° Зх`
            : `Пн ${fmt(90 - within)}° Зх`;
      directionText.textContent = `Aм = A − δ = ${fmt(magnetic)}°; α = A − γ = ${fmt(gridAngle)}°; зворотний азимут = ${fmt(back)}°; румб: ${rumba}.`;
      dctx.clearRect(0, 0, dc.width, dc.height);
      dctx.fillStyle = "#fbfdfb";
      dctx.fillRect(0, 0, dc.width, dc.height);
      const cx = dc.width / 2;
      const cy = dc.height / 2 + 24;
      const radius = Math.min(dc.width, dc.height) * 0.34;
      dctx.beginPath();
      dctx.arc(cx, cy, radius, 0, Math.PI * 2);
      dctx.strokeStyle = "#cbd8ce";
      dctx.stroke();
      const drawRay = (bearing, color, label, length = radius) => {
        const angle = bearing * Math.PI / 180;
        dctx.beginPath();
        dctx.moveTo(cx, cy);
        dctx.lineTo(cx + Math.sin(angle) * length, cy - Math.cos(angle) * length);
        dctx.strokeStyle = color;
        dctx.lineWidth = 2;
        dctx.stroke();
        dctx.fillStyle = color;
        dctx.font = "12px system-ui";
        dctx.fillText(label, cx + Math.sin(angle) * (length + 12) - 7, cy - Math.cos(angle) * (length + 12));
      };
      drawRay(0, "#2e7d4f", "Пн іст.");
      drawRay(delta, "#4286b4", "Пн маг.");
      drawRay(gamma, "#a26caa", "Пн сіт.");
      drawRay(aTrue, "#d64c44", "A");
      const drawArc = (start, end, radiusArc, color) => {
        const startRad = (start - 90) * Math.PI / 180;
        let endRad = (end - 90) * Math.PI / 180;
        if (end < start) endRad += Math.PI * 2;
        dctx.beginPath();
        dctx.arc(cx, cy, radiusArc, startRad, endRad);
        dctx.strokeStyle = color;
        dctx.lineWidth = 2;
        dctx.stroke();
      };
      drawArc(0, aTrue, radius * 0.48, "#d64c44");
      dctx.fillStyle = "#43574a";
      dctx.font = "12px system-ui";
      dctx.fillText(`A ${fmt(aTrue)}°`, cx + 7, cy - 9);
    };
    [azimuth, declination, convergence].forEach((element) => element.addEventListener("input", updateDirections));
    updateDirections();
  });
})();
