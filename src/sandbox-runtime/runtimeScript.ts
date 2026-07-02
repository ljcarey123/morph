// This is the ONLY JavaScript ever executed inside the artifact sandbox iframe.
// It is hand-authored and trusted — the LLM never generates or edits this file.
// It only acts on declarative attributes/data-* markers the LLM places on the
// fixed `morph-*` tags documented in registry.ts; it never evaluates anything
// the LLM writes as code.
export const SANDBOX_RUNTIME_SCRIPT = `
(function () {
  "use strict";

  var bridge = {
    requestState: function (key, callback) {
      var requestId = Math.random().toString(36).slice(2);
      function handleResponse(event) {
        var data = event.data;
        if (
          event.source !== window.parent ||
          !data ||
          data.type !== "morph:state-response" ||
          data.requestId !== requestId
        ) {
          return;
        }
        window.removeEventListener("message", handleResponse);
        callback(data.value);
      }
      window.addEventListener("message", handleResponse);
      window.parent.postMessage({ type: "morph:request-state", key: key, requestId: requestId }, "*");
    },
    reportState: function (key, value) {
      window.parent.postMessage({ type: "morph:report-state", key: key, value: value }, "*");
    },
  };

  function define(tag, Component) {
    if (!customElements.get(tag)) customElements.define(tag, Component);
  }

  define(
    "morph-tabs",
    class extends HTMLElement {
      connectedCallback() {
        var self = this;
        var triggers = Array.from(this.querySelectorAll("[data-tab-trigger]"));
        // Panels should be inside morph-tabs, but the LLM sometimes places them as
        // siblings. Fall back to searching the nearest parent so both cases work.
        var panels = Array.from(this.querySelectorAll("[data-tab-panel]"));
        if (panels.length === 0) {
          panels = Array.from((self.parentElement || document.body).querySelectorAll("[data-tab-panel]"));
        }
        console.debug("[morph-tabs] connected", {
          id: self.id,
          triggerNames: triggers.map(function (t) { return t.getAttribute("data-tab-trigger"); }),
          panelNames: panels.map(function (p) { return p.getAttribute("data-tab-panel"); }),
        });
        function activate(name) {
          triggers.forEach(function (trigger) {
            var isActive = trigger.getAttribute("data-tab-trigger") === name;
            trigger.toggleAttribute("data-active", isActive);
            // Provide visual feedback regardless of whether the LLM or renderer
            // hard-coded the initial active-tab appearance in inline styles.
            trigger.style.opacity = isActive ? "1" : "0.5";
            trigger.style.fontWeight = isActive ? "600" : "400";
          });
          panels.forEach(function (panel) {
            panel.hidden = panel.getAttribute("data-tab-panel") !== name;
          });
        }
        triggers.forEach(function (trigger) {
          trigger.addEventListener("click", function () {
            var name = trigger.getAttribute("data-tab-trigger");
            console.debug("[morph-tabs] trigger clicked", { id: self.id, name: name });
            activate(name);
          });
        });
        var initial =
          this.getAttribute("default-tab") || (triggers[0] && triggers[0].getAttribute("data-tab-trigger"));
        if (initial) activate(initial);
      }
    },
  );

  define(
    "morph-accordion",
    class extends HTMLElement {
      connectedCallback() {
        var allowMultiple = this.hasAttribute("allow-multiple");
        var items = Array.from(this.querySelectorAll("[data-accordion-item]"));
        console.debug("[morph-accordion] connected", { id: this.id, itemCount: items.length });
        items.forEach(function (item) {
          var trigger = item.querySelector("[data-accordion-trigger]");
          var panel = item.querySelector("[data-accordion-panel]");
          if (!trigger || !panel) return;
          panel.hidden = !item.hasAttribute("open");
          trigger.addEventListener("click", function () {
            var willOpen = panel.hidden;
            if (!allowMultiple) {
              items.forEach(function (other) {
                var otherPanel = other.querySelector("[data-accordion-panel]");
                if (otherPanel) otherPanel.hidden = true;
                other.removeAttribute("open");
              });
            }
            panel.hidden = !willOpen;
            item.toggleAttribute("open", willOpen);
          });
        });
      }
    },
  );

  define(
    "morph-toggle",
    class extends HTMLElement {
      connectedCallback() {
        var self = this;
        var key = self.getAttribute("data-state-key");
        console.debug("[morph-toggle] connected", { id: self.id, key: key });
        self.setAttribute("role", "switch");
        if (!self.hasAttribute("tabindex")) self.tabIndex = 0;

        function applyChecked(checked) {
          self.toggleAttribute("checked", !!checked);
          self.setAttribute("aria-checked", String(!!checked));
        }
        applyChecked(self.hasAttribute("checked"));
        if (key) {
          bridge.requestState(key, function (value) {
            if (typeof value === "boolean") applyChecked(value);
          });
        }

        function flip() {
          var next = !self.hasAttribute("checked");
          applyChecked(next);
          if (key) bridge.reportState(key, next);
          self.dispatchEvent(new CustomEvent("morph-change", { detail: { checked: next } }));
        }
        self.addEventListener("click", flip);
        self.addEventListener("keydown", function (event) {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            flip();
          }
        });
      }
    },
  );

  define(
    "morph-counter",
    class extends HTMLElement {
      connectedCallback() {
        var self = this;
        var key = self.getAttribute("data-state-key");
        var min = self.hasAttribute("min") ? Number(self.getAttribute("min")) : -Infinity;
        var max = self.hasAttribute("max") ? Number(self.getAttribute("max")) : Infinity;
        var step = self.hasAttribute("step") ? Number(self.getAttribute("step")) : 1;
        var value = self.hasAttribute("value") ? Number(self.getAttribute("value")) : 0;
        var valueEl = self.querySelector("[data-counter-value]");
        console.debug("[morph-counter] connected", { id: self.id, key: key, min: min, max: max, step: step, value: value });

        function render() {
          if (valueEl) valueEl.textContent = String(value);
        }
        function setValue(next) {
          value = Math.min(max, Math.max(min, next));
          render();
          if (key) bridge.reportState(key, value);
          self.dispatchEvent(new CustomEvent("morph-change", { detail: { value: value } }));
        }
        render();
        if (key) {
          bridge.requestState(key, function (stored) {
            if (typeof stored === "number") setValue(stored);
          });
        }

        self.querySelectorAll("[data-counter-increment]").forEach(function (button) {
          button.addEventListener("click", function () {
            setValue(value + step);
          });
        });
        self.querySelectorAll("[data-counter-decrement]").forEach(function (button) {
          button.addEventListener("click", function () {
            setValue(value - step);
          });
        });
      }
    },
  );

  define(
    "morph-carousel",
    class extends HTMLElement {
      connectedCallback() {
        var slides = Array.from(this.querySelectorAll("[data-carousel-slide]"));
        var dots = Array.from(this.querySelectorAll("[data-carousel-dot]"));
        var index = 0;
        console.debug("[morph-carousel] connected", { id: this.id, slideCount: slides.length, dotCount: dots.length });

        function show(next) {
          if (slides.length === 0) return;
          index = ((next % slides.length) + slides.length) % slides.length;
          slides.forEach(function (slide, position) {
            slide.hidden = position !== index;
          });
          dots.forEach(function (dot, position) {
            dot.toggleAttribute("data-active", position === index);
          });
        }
        this.querySelectorAll("[data-carousel-prev]").forEach(function (button) {
          button.addEventListener("click", function () {
            show(index - 1);
          });
        });
        this.querySelectorAll("[data-carousel-next]").forEach(function (button) {
          button.addEventListener("click", function () {
            show(index + 1);
          });
        });
        dots.forEach(function (dot, position) {
          dot.addEventListener("click", function () {
            show(position);
          });
        });
        show(0);
      }
    },
  );

  define(
    "morph-tooltip",
    class extends HTMLElement {
      connectedCallback() {
        var trigger = this.querySelector("[data-tooltip-trigger]");
        var content = this.querySelector("[data-tooltip-content]");
        if (!trigger || !content) {
          console.debug("[morph-tooltip] connected without trigger/content", {
            id: this.id,
            hasTrigger: !!trigger,
            hasContent: !!content,
          });
          return;
        }
        var mode = this.getAttribute("trigger") === "click" ? "click" : "hover";
        console.debug("[morph-tooltip] connected", { id: this.id, mode: mode });
        var self = this;
        content.hidden = true;
        if (mode === "hover") {
          trigger.addEventListener("mouseenter", function () {
            content.hidden = false;
          });
          trigger.addEventListener("mouseleave", function () {
            content.hidden = true;
          });
        } else {
          trigger.addEventListener("click", function (event) {
            event.stopPropagation();
            content.hidden = !content.hidden;
          });
          document.addEventListener("click", function (event) {
            if (!self.contains(event.target)) content.hidden = true;
          });
        }
      }
    },
  );
})();
`
