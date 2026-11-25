/* STATIC//BLOOM 2027 — interactions
   Countdown, lineup + timetable rendered from one data set, "My plan"
   saved in localStorage with clash warnings, ticket picker with a demo
   checkout dialog, interactive site map. No dependencies. */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------- data */

  const DAYS = {
    fri: "Friday 16 July",
    sat: "Saturday 17 July",
    sun: "Sunday 18 July",
  };

  const STAGES = {
    drydock: { name: "Drydock", note: "Main stage" },
    crane: { name: "Crane 9", note: "Second stage" },
    hold: { name: "The Hold", note: "Warehouse" },
  };

  // [start, end, artist, tier] — tier 1 is a headliner, 3 is an early or small set.
  const SETS = {
    fri: {
      drydock: [
        ["16:00", "17:00", "Ropewalk Choir", 3],
        ["17:45", "19:00", "Tide Engine", 2],
        ["19:45", "21:00", "Cobalt Ferry", 2],
        ["21:45", "23:00", "Mira Salt", 1],
        ["23:45", "01:30", "Gantry Ghosts", 1],
      ],
      crane: [
        ["17:00", "18:15", "Lighthouse Keeper", 3],
        ["19:00", "20:30", "Rivet Sisters", 2],
        ["21:00", "22:30", "Sodium Dreams", 3],
        ["23:00", "00:30", "Halyard", 3],
      ],
      hold: [
        ["20:00", "22:00", "Kelp Paradise", 3],
        ["22:00", "00:00", "Neon Bosun", 3],
        ["00:00", "03:00", "DJ Ballast", 2],
      ],
    },
    sat: {
      drydock: [
        ["15:00", "16:00", "Port Side Pirates", 3],
        ["16:45", "18:00", "Velvet Crane", 2],
        ["18:45", "20:15", "Slipway Saints", 2],
        ["21:00", "22:30", "The Drydock Orchestra", 1],
        ["23:15", "01:00", "Halogen Hearts", 1],
      ],
      crane: [
        ["16:00", "17:15", "Mackerel Sky", 3],
        ["17:45", "19:00", "Ferrous Kid", 3],
        ["19:30", "21:00", "Static Mae", 3],
        ["21:30", "23:00", "Brine & Bass", 2],
      ],
      hold: [
        ["19:00", "21:00", "Barnacle", 3],
        ["21:00", "23:00", "Ozone Twins", 3],
        ["23:00", "03:00", "Hullabaloo Soundsystem", 2],
      ],
    },
    sun: {
      drydock: [
        ["14:00", "15:00", "Sea Shanty Breakbeat Club", 3],
        ["15:45", "17:00", "Shipwright", 2],
        ["17:45", "19:00", "Gutter Orchid", 2],
        ["19:45", "21:15", "Anchor/Anchor", 1],
        ["22:00", "23:45", "Lumen Twins", 1],
      ],
      crane: [
        ["14:30", "15:30", "Low Tide Lullabies", 3],
        ["16:00", "17:15", "Saltmarsh", 3],
        ["17:45", "19:00", "Mx. Propeller", 3],
        ["19:30", "21:00", "Fogbank", 2],
      ],
      hold: [
        ["17:00", "19:00", "Rustbelt Ravers", 3],
        ["19:00", "21:00", "Dockside Disco Club", 2],
        ["21:00", "00:00", "Night Ferry", 3],
      ],
    },
  };

  // Festival days run past midnight: times before noon belong to the night before.
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h < 12 ? h + 24 : h) * 60 + m;
  };

  const allSets = [];
  Object.entries(SETS).forEach(([day, stages]) => {
    Object.entries(stages).forEach(([stage, sets]) => {
      sets.forEach(([start, end, artist, tier]) => {
        allSets.push({
          id: `${day}-${stage}-${start.replace(":", "")}`,
          day,
          stage,
          start,
          end,
          artist,
          tier,
          from: toMinutes(start),
          to: toMinutes(end),
        });
      });
    });
  });
  const setById = new Map(allSets.map((set) => [set.id, set]));

  /* ------------------------------------------------------------ nav */

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  const setNav = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
    document.body.classList.toggle("nav-open", open);
  };
  toggle.addEventListener("click", () => setNav(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setNav(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
      setNav(false);
      toggle.focus();
    }
  });

  /* ---------------------------------------------------------- countdown */

  const countdown = document.querySelector("[data-countdown]");
  const target = new Date(countdown.dataset.countdown).getTime();
  const parts = {
    days: countdown.querySelector('[data-cd="days"]'),
    hours: countdown.querySelector('[data-cd="hours"]'),
    minutes: countdown.querySelector('[data-cd="minutes"]'),
    seconds: countdown.querySelector('[data-cd="seconds"]'),
  };

  function renderCountdown() {
    const diff = Math.max(0, target - Date.now());
    const seconds = Math.floor(diff / 1000);
    parts.days.textContent = String(Math.floor(seconds / 86400)).padStart(3, "0");
    parts.hours.textContent = String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0");
    parts.minutes.textContent = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    parts.seconds.textContent = String(seconds % 60).padStart(2, "0");
    if (diff === 0) {
      countdown.querySelector(".countdown-label").textContent = "Gates are open. Get down here.";
      return false;
    }
    return true;
  }

  if (renderCountdown()) {
    const timer = window.setInterval(() => {
      if (!renderCountdown()) window.clearInterval(timer);
    }, 1000);
  }

  /* ------------------------------------------------------------ lineup */

  const lineupPanels = document.querySelectorAll("[data-lineup-panels] [data-day]");
  lineupPanels.forEach((panel) => {
    const daySets = allSets.filter((set) => set.day === panel.dataset.day);
    [1, 2, 3].forEach((tier) => {
      const acts = daySets
        .filter((set) => set.tier === tier)
        .sort((a, b) => (tier === 1 ? b.from - a.from : a.from - b.from));
      const list = document.createElement("ul");
      list.className = `tier tier-${tier}`;
      acts.forEach((set) => {
        const item = document.createElement("li");
        item.className = "act";
        item.textContent = set.artist;
        list.append(item);
      });
      panel.append(list);
    });
  });

  /* ---------------------------------------------------------- timetable */

  const PLAN_KEY = "staticbloom-plan-v1";
  const storage = {
    read() {
      try {
        const raw = window.localStorage.getItem(PLAN_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(ids) ? ids.filter((id) => setById.has(id)) : []);
      } catch {
        return new Set();
      }
    },
    write(plan) {
      try {
        window.localStorage.setItem(PLAN_KEY, JSON.stringify([...plan]));
      } catch {
        /* storage blocked: the plan still works for this visit */
      }
    },
  };
  const plan = storage.read();

  const ttPanels = document.querySelectorAll("[data-tt-panels] [data-day]");
  ttPanels.forEach((panel) => {
    const grid = document.createElement("div");
    grid.className = "tt-grid";
    Object.entries(STAGES).forEach(([stageKey, stage]) => {
      const column = document.createElement("section");
      column.className = `tt-stage stage-${stageKey}`;
      column.setAttribute("aria-label", `${stage.name}, ${DAYS[panel.dataset.day]}`);

      const head = document.createElement("h3");
      head.className = "tt-stage-head";
      head.innerHTML = `<span></span><small></small>`;
      head.querySelector("span").textContent = stage.name;
      head.querySelector("small").textContent = stage.note;

      const list = document.createElement("ul");
      list.className = "tt-sets";
      allSets
        .filter((set) => set.day === panel.dataset.day && set.stage === stageKey)
        .forEach((set) => {
          const item = document.createElement("li");
          const button = document.createElement("button");
          button.type = "button";
          button.className = `set${set.tier === 1 ? " is-headliner" : ""}`;
          button.dataset.id = set.id;
          button.setAttribute("aria-pressed", String(plan.has(set.id)));
          button.innerHTML = `<span class="set-time"></span><span class="set-name"></span><span class="set-mark" aria-hidden="true"></span>`;
          button.querySelector(".set-time").textContent = `${set.start}–${set.end}`;
          button.querySelector(".set-name").textContent = set.artist;
          button.querySelector(".set-mark").textContent = plan.has(set.id) ? "✓" : "+";
          item.append(button);
          list.append(item);
        });

      column.append(head, list);
      grid.append(column);
    });
    panel.append(grid);
  });

  const planCount = document.querySelector("[data-plan-count]");
  const planList = document.querySelector("[data-plan-list]");

  function findClashes(sets) {
    const clashes = new Map();
    sets.forEach((a) => {
      sets.forEach((b) => {
        if (a === b || a.day !== b.day) return;
        if (a.from < b.to && b.from < a.to) {
          if (!clashes.has(a.id)) clashes.set(a.id, []);
          clashes.get(a.id).push(b.artist);
        }
      });
    });
    return clashes;
  }

  function renderPlan() {
    planCount.textContent = String(plan.size);
    planList.innerHTML = "";

    if (plan.size === 0) {
      const empty = document.createElement("p");
      empty.className = "plan-empty";
      empty.textContent = "Nothing yet. Pick a few sets above and they’ll show up here, with a warning if two clash.";
      planList.append(empty);
      return;
    }

    const chosen = [...plan].map((id) => setById.get(id));
    const clashes = findClashes(chosen);

    Object.entries(DAYS).forEach(([day, label]) => {
      const sets = chosen.filter((set) => set.day === day).sort((a, b) => a.from - b.from);
      if (!sets.length) return;

      const group = document.createElement("div");
      group.className = "plan-day";
      const title = document.createElement("p");
      title.className = "plan-day-title";
      title.textContent = label;
      const items = document.createElement("ul");
      items.className = "plan-items";

      sets.forEach((set) => {
        const item = document.createElement("li");
        item.className = "plan-item";
        item.innerHTML = `
          <span class="plan-item-time"></span>
          <span class="plan-item-name"></span>
          <span class="plan-item-stage"></span>
          <button type="button" class="plan-remove"><span aria-hidden="true">×</span></button>`;
        item.querySelector(".plan-item-time").textContent = `${set.start}–${set.end}`;
        item.querySelector(".plan-item-name").textContent = set.artist;
        item.querySelector(".plan-item-stage").textContent = STAGES[set.stage].name;
        const remove = item.querySelector(".plan-remove");
        remove.dataset.id = set.id;
        remove.setAttribute("aria-label", `Remove ${set.artist} from my plan`);

        if (clashes.has(set.id)) {
          item.classList.add("has-clash");
          const badge = document.createElement("span");
          badge.className = "clash";
          badge.textContent = `Clashes with ${clashes.get(set.id).join(", ")}`;
          item.querySelector(".plan-item-name").append(badge);
        }
        items.append(item);
      });

      group.append(title, items);
      planList.append(group);
    });
  }

  function setInPlan(id, add) {
    if (add) plan.add(id);
    else plan.delete(id);
    storage.write(plan);

    const button = document.querySelector(`.set[data-id="${id}"]`);
    if (button) {
      button.setAttribute("aria-pressed", String(add));
      button.querySelector(".set-mark").textContent = add ? "✓" : "+";
    }
    if (!reduceMotion) {
      planCount.classList.remove("bump");
      void planCount.offsetWidth;
      planCount.classList.add("bump");
    }
    renderPlan();
  }

  document.querySelector("[data-tt-panels]").addEventListener("click", (event) => {
    const button = event.target.closest(".set");
    if (button) setInPlan(button.dataset.id, button.getAttribute("aria-pressed") !== "true");
  });

  planList.addEventListener("click", (event) => {
    const remove = event.target.closest(".plan-remove");
    if (remove) setInPlan(remove.dataset.id, false);
  });

  document.querySelector("[data-plan-clear]").addEventListener("click", () => {
    [...plan].forEach((id) => setInPlan(id, false));
  });

  renderPlan();

  /* --------------------------------------------------------------- tabs */

  document.querySelectorAll("[data-tabs]").forEach((tablist) => {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

    function select(index, focus) {
      tabs.forEach((tab, i) => {
        const selected = i === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[i].hidden = !selected;
      });
      const panel = panels[index];
      if (!reduceMotion && panel.classList.contains("lineup-panel")) {
        panel.classList.remove("is-entering");
        void panel.offsetWidth;
        panel.classList.add("is-entering");
      }
      if (focus) tabs[index].focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(index, false));
      tab.addEventListener("keydown", (event) => {
        const last = tabs.length - 1;
        const moves = {
          ArrowRight: index === last ? 0 : index + 1,
          ArrowLeft: index === 0 ? last : index - 1,
          Home: 0,
          End: last,
        };
        if (event.key in moves) {
          event.preventDefault();
          select(moves[event.key], true);
        }
      });
    });
  });

  /* ------------------------------------------------------------ tickets */

  const ticketForm = document.querySelector("[data-tickets]");
  const tickets = [...ticketForm.querySelectorAll("[data-ticket]")];
  const totalEl = ticketForm.querySelector("[data-total]");
  const checkout = ticketForm.querySelector("[data-checkout]");
  const MAX_TICKETS = 8;
  const counts = Object.fromEntries(tickets.map((ticket) => [ticket.dataset.ticket, 0]));

  const gbp = (value) => `£${value.toLocaleString("en-GB")}`;

  function renderTickets() {
    const totalQty = Object.values(counts).reduce((sum, n) => sum + n, 0);
    let totalPrice = 0;
    tickets.forEach((ticket) => {
      const qty = counts[ticket.dataset.ticket];
      totalPrice += qty * Number(ticket.dataset.price);
      ticket.querySelector(".step-value").textContent = String(qty);
      ticket.querySelector('[data-step="-1"]').disabled = qty === 0;
      ticket.querySelector('[data-step="1"]').disabled = totalQty >= MAX_TICKETS;
    });
    totalEl.textContent = gbp(totalPrice);
    checkout.disabled = totalQty === 0;
    return totalPrice;
  }

  ticketForm.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const key = button.closest("[data-ticket]").dataset.ticket;
    counts[key] = Math.max(0, counts[key] + Number(button.dataset.step));
    renderTickets();
  });

  const modal = document.querySelector("[data-modal]");
  const modalLines = modal.querySelector("[data-modal-lines]");
  const modalTotal = modal.querySelector("[data-modal-total]");

  ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const total = renderTickets();
    if (total === 0) return;

    modalLines.innerHTML = "";
    tickets.forEach((ticket) => {
      const qty = counts[ticket.dataset.ticket];
      if (!qty) return;
      const line = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = `${qty} × ${ticket.querySelector("h3").textContent}`;
      const price = document.createElement("span");
      price.textContent = gbp(qty * Number(ticket.dataset.price));
      line.append(name, price);
      modalLines.append(line);
    });
    modalTotal.textContent = `Total ${gbp(total)}, charged: £0`;

    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      window.alert(`STATIC//BLOOM isn’t real (yet). Nothing was charged. Total would have been ${gbp(total)}.`);
    }
  });

  renderTickets();

  /* ---------------------------------------------------------------- map */

  const map = document.querySelector(".site-map");
  const zones = [...map.querySelectorAll(".zone")];
  const legendButtons = [...document.querySelectorAll(".legend [data-zone]")];
  let pinned = null;

  function highlight(zone) {
    map.classList.toggle("has-active", Boolean(zone));
    zones.forEach((el) => el.classList.toggle("is-active", el.dataset.zone === zone));
    legendButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.zone === zone));
  }

  legendButtons.forEach((button) => {
    const zone = button.dataset.zone;
    button.addEventListener("mouseenter", () => highlight(zone));
    button.addEventListener("focus", () => highlight(zone));
    button.addEventListener("mouseleave", () => highlight(pinned));
    button.addEventListener("blur", () => highlight(pinned));
    button.addEventListener("click", () => {
      pinned = pinned === zone ? null : zone;
      button.setAttribute("aria-pressed", String(pinned === zone));
      legendButtons.forEach((other) => other !== button && other.setAttribute("aria-pressed", "false"));
      highlight(pinned);
    });
    button.setAttribute("aria-pressed", "false");
  });

  zones.forEach((el) => {
    el.addEventListener("mouseenter", () => highlight(el.dataset.zone));
    el.addEventListener("mouseleave", () => highlight(pinned));
    el.addEventListener("click", () => {
      pinned = pinned === el.dataset.zone ? null : el.dataset.zone;
      legendButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.zone === pinned)));
      highlight(pinned);
    });
  });

  /* --------------------------------------------------------- newsletter */

  const news = document.querySelector("[data-news]");
  const newsMsg = document.getElementById("news-msg");
  news.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = news.elements.email;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    input.setAttribute("aria-invalid", String(!valid));
    newsMsg.classList.toggle("is-error", !valid);
    newsMsg.classList.toggle("is-success", valid);
    if (!valid) {
      newsMsg.textContent = "That email doesn’t look right. Try again?";
      input.focus();
      return;
    }
    newsMsg.textContent = "You’re on the list! (Concept site, so nothing was actually sent.)";
    news.reset();
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
