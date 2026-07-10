import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function source(filePath) {
  return readFile(path.join(repositoryRoot, filePath), "utf8");
}

test("the author menu returns to its closed mobile state after a breakpoint round trip", async () => {
  const handlers = { button: {}, window: {} };
  const state = {
    desktop: false,
    buttonOpen: false,
    linksInlineDisplay: "",
  };
  const buttonElement = {};
  const linksElement = {};
  const bodyElement = {};
  const footerElement = {};
  const windowObject = { setInterval() {} };

  function display(element) {
    if (element === buttonElement) {
      return state.desktop ? "none" : "inline-block";
    }
    if (element === linksElement) {
      return state.linksInlineDisplay || (state.desktop ? "block" : "none");
    }
    return "block";
  }

  function collection(element) {
    return {
      css(property, value) {
        if (value === undefined) {
          return property === "display" ? display(element) : "";
        }
        if (element === linksElement && property === "display") {
          state.linksInlineDisplay = value;
        }
        return this;
      },
      fadeToggle() {
        state.linksInlineDisplay = display(linksElement) === "none" ? "block" : "none";
        return this;
      },
      on(event, handler) {
        if (element === buttonElement) {
          handlers.button[event] = handler;
        } else if (element === windowObject) {
          handlers.window[event] = handler;
        }
        return this;
      },
      outerHeight() {
        return 100;
      },
      removeAttr(attribute) {
        if (element === linksElement && attribute === "style") {
          state.linksInlineDisplay = "";
        }
        return this;
      },
      removeClass(className) {
        if (element === buttonElement && className === "open") {
          state.buttonOpen = false;
        }
        return this;
      },
      stop() {
        return this;
      },
      toggleClass(className) {
        if (element === buttonElement && className === "open") {
          state.buttonOpen = !state.buttonOpen;
        }
        return this;
      },
    };
  }

  function $(target) {
    if (typeof target === "function") {
      target();
      return undefined;
    }
    if (target === windowObject) return collection(windowObject);
    if (target === buttonElement || target === ".author__urls-wrapper button") {
      return collection(buttonElement);
    }
    if (target === ".author__urls" || target === ".author__urls.social-icons") {
      return collection(linksElement);
    }
    if (target === "body") return collection(bodyElement);
    if (target === ".page__footer") return collection(footerElement);
    throw new Error(`Unexpected selector: ${String(target)}`);
  }

  vm.runInNewContext(await source("assets/js/_main.js"), {
    $,
    window: windowObject,
  });

  handlers.button.click.call(buttonElement);
  assert.equal(display(linksElement), "block");
  assert.equal(state.buttonOpen, true);

  state.desktop = true;
  handlers.window.resize();
  assert.equal(display(linksElement), "block");

  state.desktop = false;
  handlers.window.resize();
  assert.equal(display(linksElement), "none");
  assert.equal(state.linksInlineDisplay, "");
  assert.equal(state.buttonOpen, false);
});

test("greedy navigation reserves button space and restores the final hidden item", async () => {
  const handlers = { window: {} };
  const nav = { width: 1200 };
  const button = { attrs: {}, classes: new Set(["hidden"]), width: 46 };
  const visible = {
    items: [
      { persist: true, width: 180 },
      ...Array.from({ length: 9 }, () => ({ persist: false, width: 100 })),
    ],
  };
  const hidden = { items: [], classes: new Set(["hidden"]) };
  const persistTail = { items: [] };
  const windowObject = {};
  const screen = { orientation: { addEventListener() {} } };

  function itemCollection(item, source) {
    return {
      appendTo(target) {
        source.items.splice(source.items.indexOf(item), 1);
        target.items.push(item);
        return this;
      },
      insertBefore() {
        source.items.splice(source.items.indexOf(item), 1);
        visible.items.push(item);
        return this;
      },
      prependTo(target) {
        source.items.splice(source.items.indexOf(item), 1);
        target.items.unshift(item);
        return this;
      },
    };
  }

  function childrenCollection(source, filter = () => true) {
    return {
      get length() {
        return source.items.filter(filter).length;
      },
      first() {
        return itemCollection(source.items.filter(filter)[0], source);
      },
      last() {
        const items = source.items.filter(filter);
        return itemCollection(items[items.length - 1], source);
      },
    };
  }

  const navApi = { width: () => nav.width };
  const buttonApi = {
    addClass(className) {
      button.classes.add(className);
      return this;
    },
    attr(name, value) {
      button.attrs[name] = value;
      return this;
    },
    hasClass(className) {
      return button.classes.has(className);
    },
    on() {
      return this;
    },
    removeClass(className) {
      button.classes.delete(className);
      return this;
    },
    toggleClass(className) {
      button.classes.has(className)
        ? button.classes.delete(className)
        : button.classes.add(className);
      return this;
    },
    width: () => button.width,
  };
  const visibleApi = {
    children(selector) {
      if (selector === ".persist.tail") return childrenCollection(persistTail);
      if (selector === ":not(.persist)") {
        return childrenCollection(visible, (item) => !item.persist);
      }
      return childrenCollection(visible);
    },
    items: visible.items,
    width: () => visible.items.reduce((sum, item) => sum + item.width, 0),
  };
  const hiddenApi = {
    addClass(className) {
      hidden.classes.add(className);
      return this;
    },
    children: () => childrenCollection(hidden),
    toggleClass(className) {
      hidden.classes.has(className)
        ? hidden.classes.delete(className)
        : hidden.classes.add(className);
      return this;
    },
    items: hidden.items,
  };
  const windowApi = {
    on(event, handler) {
      handlers.window[event] = handler;
      return this;
    },
  };

  function $(target) {
    if (target === windowObject) return windowApi;
    if (target === button) return buttonApi;
    if (target === "#site-nav") return navApi;
    if (target === "#site-nav button") return buttonApi;
    if (target === "#site-nav .visible-links") return visibleApi;
    if (target === "#site-nav .hidden-links") return hiddenApi;
    throw new Error(`Unexpected selector: ${String(target)}`);
  }

  vm.runInNewContext(
    await source("assets/js/plugins/jquery.greedy-navigation.js"),
    { $, screen, window: windowObject },
  );

  nav.width = 1045;
  handlers.window.resize();

  const reservedSpace = nav.width - button.width - 30;
  assert.equal(button.classes.has("hidden"), false);
  assert.ok(
    visibleApi.width() <= reservedSpace,
    `visible links use ${visibleApi.width()}px but only ${reservedSpace}px remain`,
  );
  assert.equal(hidden.items.length, 2);

  nav.width = 1060;
  handlers.window.resize();
  assert.equal(hidden.items.length, 1);
  assert.equal(button.classes.has("hidden"), false);

  nav.width = 1090;
  handlers.window.resize();
  assert.equal(hidden.items.length, 0);
  assert.equal(button.classes.has("hidden"), true);
  assert.ok(visibleApi.width() <= nav.width);
});
