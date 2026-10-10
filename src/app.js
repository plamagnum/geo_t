(() => {
  "use strict";

  const boot = (name, fn) => {
    try {
      fn();
    } catch (error) {
      console.warn(`Не вдалося запустити модуль «${name}»:`, error);
    }
  };
  const byId = (id) => document.getElementById(id);
  const listen = (id, event, handler) => {
    const element = byId(id);
    if (element) element.addEventListener(event, handler);
    return element;
  };
  const context = (id) => {
    const canvas = byId(id);
    return canvas ? { canvas, ctx: canvas.getContext("2d") } : null;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fmt = (value, digits = 1) => Number(value).toLocaleString("uk-UA", { maximumFractionDigits: digits });
  const pointOnCanvas = (canvas, event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  };

  window.Topo = { boot, byId, listen, context, clamp, fmt, pointOnCanvas };

  boot("вкладки", () => {
    const tabs = [...document.querySelectorAll("#tabs .tab[data-tab]")];
    const panels = [...document.querySelectorAll("main .panel")];
    if (!tabs.length || !panels.length) return;
    tabs.forEach((tab) => tab.addEventListener("click", () => {
      const panelId = `panel-${tab.dataset.tab}`;
      tabs.forEach((button) => button.classList.toggle("active", button === tab));
      panels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
    }));
  });

  boot("масштаб", () => {
    const scale = byId("scale-select");
    const mapDistance = byId("map-distance");
    const groundDistance = byId("ground-distance");
    if (!scale || !mapDistance || !groundDistance) return;
    const update = () => {
      const denominator = Number(scale.value);
      const mapCm = Math.max(0, Number(mapDistance.value) || 0);
      const groundM = Math.max(0, Number(groundDistance.value) || 0);
      const perCmM = denominator / 100;
      byId("named-scale").textContent = perCmM >= 1000
        ? `В 1 см — ${fmt(perCmM / 1000)} км`
        : `В 1 см — ${fmt(perCmM)} м`;
      const ground = mapCm * perCmM;
      byId("ground-result").textContent = ground >= 1000
        ? `${fmt(ground / 1000)} км (${fmt(ground)} м)`
        : `${fmt(ground)} м`;
      byId("map-result").textContent = `${fmt(groundM / perCmM)} см`;
    };
    [scale, mapDistance, groundDistance].forEach((element) => element.addEventListener("input", update));
    update();
  });

  boot("азимут", () => {
    const view = context("compass-canvas");
    if (!view) return;
    const { canvas, ctx } = view;
    const center = canvas.width / 2;
    const radius = 132;
    let selected = null;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fbf8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#63836c";
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let degree = 0; degree < 360; degree += 15) {
        const angle = degree * Math.PI / 180;
        const inner = radius - (degree % 45 === 0 ? 13 : 7);
        ctx.beginPath();
        ctx.moveTo(center + Math.sin(angle) * inner, center - Math.cos(angle) * inner);
        ctx.lineTo(center + Math.sin(angle) * radius, center - Math.cos(angle) * radius);
        ctx.strokeStyle = "#91a598";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const labels = [["Пн", 0], ["ПнСх", 45], ["Сх", 90], ["ПдСх", 135], ["Пд", 180], ["ПдЗх", 225], ["Зх", 270], ["ПнЗх", 315]];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "600 13px system-ui";
      labels.forEach(([label, degree]) => {
        const angle = degree * Math.PI / 180;
        ctx.fillStyle = degree === 0 ? "#2e7d4f" : "#35483b";
        ctx.fillText(label, center + Math.sin(angle) * (radius - 27), center - Math.cos(angle) * (radius - 27));
      });
      if (selected !== null) {
        const angle = selected * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(center + Math.sin(angle) * (radius - 34), center - Math.cos(angle) * (radius - 34));
        ctx.strokeStyle = "#d64c44";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(center, center, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#d64c44";
        ctx.fill();
      }
    };
    const value = byId("compass-value");
    canvas.addEventListener("click", (event) => {
      const point = pointOnCanvas(canvas, event);
      selected = (Math.atan2(point.x - center, center - point.y) * 180 / Math.PI + 360) % 360;
      value.textContent = `Азимут: ${fmt(selected, 0)}°`;
      draw();
    });
    draw();

    const task = byId("azimuth-task");
    const answer = byId("azimuth-answer");
    const feedback = byId("azimuth-feedback");
    let target = null;
    let score = 0;
    const startTask = () => {
      const directions = ["Пн", "Пн-ПнСх", "ПнСх", "Сх-ПнСх", "Сх", "Сх-ПдСх", "ПдСх", "Пд-ПдСх", "Пд", "Пд-ПдЗх", "ПдЗх", "Зх-ПдЗх", "Зх", "Зх-ПнЗх", "ПнЗх", "Пн-ПнЗх"];
      const index = Math.floor(Math.random() * directions.length);
      target = index * 22.5;
      task.textContent = `Визнач азимут напрямку «${directions[index]}» (допуск ±10°).`;
      answer.value = "";
      feedback.textContent = "";
    };
    listen("new-azimuth", "click", startTask);
    listen("check-azimuth", "click", () => {
      if (target === null || answer.value === "") {
        feedback.textContent = "Спочатку отримай завдання та введи відповідь.";
        return;
      }
      const difference = Math.abs(((Number(answer.value) - target + 540) % 360) - 180);
      if (difference <= 10) {
        score += 1;
        byId("azimuth-score").textContent = String(score);
        feedback.textContent = "Правильно! Різниця не перевищує 10°.";
        target = null;
      } else feedback.textContent = "Поки що ні. Перевір напрямок від півночі за годинниковою стрілкою.";
    });
    startTask();
  });

  boot("горизонталі", () => {
    const terrainView = context("terrain-canvas");
    const profileView = context("profile-canvas");
    if (!terrainView || !profileView) return;
    const { canvas, ctx } = terrainView;
    const width = canvas.width;
    const height = canvas.height;
    let terrain = [];
    let range = { min: 0, max: 1 };
    let profileY = null;
    let raf = 0;
    let seed = Math.random() * 100;
    const makeTerrain = () => {
      const peaks = [];
      for (let i = 0; i < 8; i += 1) {
        peaks.push({
          x: Math.random() * width,
          y: Math.random() * height,
          sx: 35 + Math.random() * 100,
          sy: 35 + Math.random() * 85,
          h: (Math.random() < 0.3 ? -1 : 1) * (45 + Math.random() * 120)
        });
      }
      terrain = new Float32Array(width * height);
      let min = Infinity;
      let max = -Infinity;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          let value = 110 + 12 * Math.sin(x / 67 + seed) + 9 * Math.cos(y / 52 - seed);
          peaks.forEach((peak) => {
            const dx = (x - peak.x) / peak.sx;
            const dy = (y - peak.y) / peak.sy;
            value += peak.h * Math.exp(-0.5 * (dx * dx + dy * dy));
          });
          const index = y * width + x;
          terrain[index] = value;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
      range = { min: Math.floor(min / 10) * 10, max: Math.ceil(max / 10) * 10 };
      drawTerrain();
      drawProfile();
    };
    const drawTerrain = () => {
      const image = ctx.createImageData(width, height);
      const step = Number(byId("contour-step").value) || 20;
      const colors = [[45, 115, 83], [113, 157, 93], [184, 183, 116], [206, 164, 114], [170, 130, 105], [242, 241, 224]];
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = y * width + x;
          const value = terrain[i];
          const fraction = clamp((value - range.min) / Math.max(1, range.max - range.min), 0, 0.999);
          const band = Math.floor(fraction * colors.length);
          const color = colors[band];
          let r = color[0];
          let g = color[1];
          let b = color[2];
          const gradient = Math.abs(terrain[y * width + Math.min(width - 1, x + 1)] - value) + Math.abs(terrain[Math.min(height - 1, y + 1) * width + x] - value);
          const contour = Math.abs(value / step - Math.round(value / step));
          if (contour < Math.min(0.04 + gradient / step * 0.1, 0.11)) {
            const indexContour = Math.round(value / step);
            const dark = indexContour % 5 === 0;
            r = dark ? 86 : 111;
            g = dark ? 75 : 105;
            b = dark ? 57 : 70;
          }
          const p = i * 4;
          image.data[p] = r;
          image.data[p + 1] = g;
          image.data[p + 2] = b;
          image.data[p + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      if (profileY !== null) {
        ctx.save();
        ctx.setLineDash([7, 5]);
        ctx.strokeStyle = "#c83f35";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, profileY);
        ctx.lineTo(width, profileY);
        ctx.stroke();
        ctx.restore();
      }
    };
    const valueAt = (x, y) => terrain[clamp(Math.round(y), 0, height - 1) * width + clamp(Math.round(x), 0, width - 1)];
    const drawProfile = () => {
      const pctx = profileView.ctx;
      const pc = profileView.canvas;
      const margin = 28;
      pctx.clearRect(0, 0, pc.width, pc.height);
      pctx.fillStyle = "#fbfdfb";
      pctx.fillRect(0, 0, pc.width, pc.height);
      pctx.strokeStyle = "#bac8bd";
      pctx.lineWidth = 1;
      pctx.beginPath();
      pctx.moveTo(margin, 12);
      pctx.lineTo(margin, pc.height - margin);
      pctx.lineTo(pc.width - 10, pc.height - margin);
      pctx.stroke();
      if (profileY === null) {
        pctx.fillStyle = "#68776e";
        pctx.font = "13px system-ui";
        pctx.fillText("Клацни на карті", margin + 12, pc.height / 2);
        return;
      }
      const values = Array.from({ length: pc.width - margin - 14 }, (_, i) => valueAt(i * width / (pc.width - margin - 14), profileY));
      const low = Math.min(...values);
      const high = Math.max(...values);
      pctx.beginPath();
      values.forEach((value, i) => {
        const x = margin + i;
        const y = pc.height - margin - 12 - (value - low) / Math.max(1, high - low) * (pc.height - margin - 44);
        if (i === 0) pctx.moveTo(x, y);
        else pctx.lineTo(x, y);
      });
      pctx.lineTo(pc.width - 14, pc.height - margin);
      pctx.lineTo(margin, pc.height - margin);
      pctx.closePath();
      pctx.fillStyle = "#dcecdf";
      pctx.fill();
      pctx.beginPath();
      values.forEach((value, i) => {
        const x = margin + i;
        const y = pc.height - margin - 12 - (value - low) / Math.max(1, high - low) * (pc.height - margin - 44);
        if (i === 0) pctx.moveTo(x, y);
        else pctx.lineTo(x, y);
      });
      pctx.strokeStyle = "#2e7d4f";
      pctx.lineWidth = 2;
      pctx.stroke();
      pctx.fillStyle = "#46584b";
      pctx.font = "11px system-ui";
      pctx.fillText(`${fmt(high, 0)} м`, 3, 18);
      pctx.fillText(`${fmt(low, 0)} м`, 3, pc.height - margin);
    };
    canvas.addEventListener("mousemove", (event) => {
      const point = pointOnCanvas(canvas, event);
      byId("terrain-height").textContent = `Висота: ${fmt(valueAt(point.x, point.y), 0)} м`;
    });
    canvas.addEventListener("click", (event) => {
      const point = pointOnCanvas(canvas, event);
      profileY = clamp(point.y, 0, height - 1);
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        drawTerrain();
        drawProfile();
        raf = 0;
      });
    });
    listen("contour-step", "change", drawTerrain);
    listen("regenerate-terrain", "click", () => {
      seed = Math.random() * 100;
      makeTerrain();
    });
    makeTerrain();
  });

  boot("умовні знаки", () => {
    const symbols = [
      { icon: "🌲", name: "Хвойний ліс" }, { icon: "🌳", name: "Листяний ліс" },
      { icon: "⛺", name: "Туристичний табір" }, { icon: "⚓", name: "Причал" },
      { icon: "🚉", name: "Залізнична станція" }, { icon: "⛪", name: "Церква" },
      { icon: "🌉", name: "Міст" }, { icon: "💧", name: "Джерело" },
      { icon: "🌾", name: "Рілля" }, { icon: "🏠", name: "Населений пункт" },
      { icon: "〰️", name: "Річка" }, { icon: "▲", name: "Вершина" }
    ];
    const guide = byId("symbol-guide");
    if (!guide) return;
    symbols.forEach((item) => {
      const card = document.createElement("div");
      card.className = "symbol-item";
      const icon = document.createElement("span");
      icon.textContent = item.icon;
      const name = document.createElement("span");
      name.textContent = item.name;
      card.append(icon, name);
      guide.append(card);
    });
    const question = byId("symbol-question");
    const options = byId("symbol-options");
    const feedback = byId("symbol-feedback");
    let correct = null;
    const nextQuestion = () => {
      correct = symbols[Math.floor(Math.random() * symbols.length)];
      question.textContent = correct.icon;
      feedback.textContent = "";
      options.replaceChildren();
      const choices = [correct];
      while (choices.length < 4) {
        const candidate = symbols[Math.floor(Math.random() * symbols.length)];
        if (!choices.includes(candidate)) choices.push(candidate);
      }
      choices.sort(() => Math.random() - 0.5).forEach((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option-button";
        button.textContent = choice.name;
        button.addEventListener("click", () => {
          if (!correct) return;
          if (choice === correct) {
            button.classList.add("correct");
            feedback.textContent = "Так, правильно!";
            correct = null;
          } else {
            button.classList.add("incorrect");
            feedback.textContent = "Спробуй ще раз.";
          }
        });
        options.append(button);
      });
    };
    listen("new-symbol", "click", nextQuestion);
    nextQuestion();
  });

  boot("підсумковий тест", () => {
    const form = byId("final-quiz");
    const questionsNode = byId("quiz-questions");
    if (!form || !questionsNode) return;
    const questions = [
      { text: "Що означає масштаб 1:50 000?", answers: ["1 см на карті — 500 м на місцевості", "1 см — 50 м", "1 см — 5 км"], correct: 0 },
      { text: "Від якого напрямку відлічують азимут?", answers: ["Від півночі за годинниковою стрілкою", "Від півдня проти годинникової стрілки", "Від сходу до заходу"], correct: 0 },
      { text: "Що показують горизонталі?", answers: ["Лінії однакової абсолютної висоти", "Межі природних зон", "Напрямок течії річки"], correct: 0 },
      { text: "Куди спрямовані бергштрихи на горі?", answers: ["Назовні, вниз по схилу", "До вершини", "Паралельно горизонталям"], correct: 0 },
      { text: "Чому дорівнює висота перерізу рельєфу?", answers: ["Різниця висот сусідніх горизонталей", "Висота найвищої вершини", "Відстань між горизонталями на папері"], correct: 0 },
      { text: "Яка координата X у прямокутній системі?", answers: ["Відстань на північ від екватора", "Відстань на схід від Гринвіча", "Номер аркуша карти"], correct: 0 }
    ];
    questions.forEach((question, index) => {
      const shuffled = question.answers.map((answer, answerIndex) => ({ answer, answerIndex })).sort(() => Math.random() - 0.5);
      const fieldset = document.createElement("fieldset");
      fieldset.className = "quiz-question";
      const legend = document.createElement("legend");
      legend.textContent = `${index + 1}. ${question.text}`;
      fieldset.append(legend);
      shuffled.forEach(({ answer, answerIndex }) => {
        const label = document.createElement("label");
        label.className = "quiz-option";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `question-${index}`;
        radio.value = String(answerIndex);
        label.append(radio, document.createTextNode(answer));
        fieldset.append(label);
      });
      questionsNode.append(fieldset);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      let correct = 0;
      let answered = 0;
      questions.forEach((question, index) => {
        const selected = form.querySelector(`input[name="question-${index}"]:checked`);
        if (selected) {
          answered += 1;
          if (Number(selected.value) === question.correct) correct += 1;
        }
      });
      const comments = correct === 6 ? "Чудово! Ти впевнено читаєш топографічні карти."
        : correct >= 4 ? "Гарна робота! Повтори складніші поняття."
          : "Повтори матеріал і спробуй ще раз.";
      byId("quiz-result").textContent = `Результат: ${correct} із 6. Відповіді надано: ${answered} із 6. ${comments}`;
    });
  });
})();
