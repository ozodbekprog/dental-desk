/* Dental Desk v2 adapter: exposes the artifact-style `claude.use()` API on top of
   the clinic REST backend. Initial load is a snapshot, then only changed docs are
   pulled through the delta feed /api/db/changes?since=<ms>. */
(function () {
  "use strict";

  var COLLECTIONS = [
    "doctors", "patients", "appointments", "visits", "slots", "requests", "reqstate", "links", "history", "prices",
    /* v2 modules */
    "chairs", "branches", "waitlist", "toothHistory", "diagnoses", "plans", "labOrders", "labs",
    "templates", "documents", "campaigns", "messages", "msgTemplates", "outbox", "inventory",
    "materialUse", "suppliers", "purchases", "payments", "payroll", "shifts", "audit", "files", "fileData",
  ];

  var store = {};
  var since = 0;
  var count = 0;
  var dirtyExact = false;
  var loadedOnce = false;
  var inFlight = false;
  var dirty = false;
  var pollTimer = null;
  var lastPull = 0;
  var listSubs = {};
  var docSubs = [];

  function request(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin" }, opts || {}));
  }

  /* Offline cache: a cold start on a flaky network still shows the last data. */
  var CACHE_KEY = "dd_v2_cache";
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      var c = JSON.parse(cached);
      if (c && c.store && c.since) { store = c.store; since = c.since; count = c.count || 0; }
    }
  } catch (e) {}
  var cacheTimer = 0;
  function persist() {
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(function () {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ store: store, since: since, count: count }));
      } catch (e) {
        try { localStorage.removeItem(CACHE_KEY); } catch (x) {}
      }
    }, 400);
  }

  function names() {
    var out = {};
    Object.keys(store).forEach(function (k) { out[k] = true; });
    COLLECTIONS.forEach(function (k) { out[k] = true; });
    return Object.keys(out);
  }

  function dispatch() {
    names().forEach(function (name) {
      var subs = listSubs[name] || [];
      if (!subs.length) return;
      var rows = store[name] || {};
      var docs = Object.keys(rows).map(function (id) {
        return {
          id: id,
          data: function () {
            return rows[id];
          },
        };
      });
      subs.forEach(function (s) {
        try {
          s.cb({ docs: docs });
        } catch (e) {}
      });
    });
    docSubs.forEach(function (s) {
      var d = store[s.collection] ? store[s.collection][s.id] : null;
      try {
        s.cb({
          exists: !!d,
          data: function () {
            return d || null;
          },
        });
      } catch (e) {}
    });
  }

  function unauthorized(res) {
    if (res.status === 401) { location.href = "/login"; return true; }
    return false;
  }

  function pullSnapshot() {
    return request("/api/db/snapshot").then(function (res) {
      if (unauthorized(res)) return null;
      if (!res.ok) throw new Error("snapshot " + res.status);
      return res.json().then(function (snap) {
        store = snap.collections || {};
        since = snap.cursor || 0;
        count = 0;
        Object.keys(store).forEach(function (k) { count += Object.keys(store[k]).length; });
        dirtyExact = false;
        loadedOnce = true;
        persist();
        dispatch();
      });
    });
  }

  /* Delta pull. Rev 0 marks a doc removed since `since`; a drop in the row count
     also means deletions, so fall back to a full snapshot in that case. */
  function pullChanges() {
    if (!since || dirtyExact) return pullSnapshot();
    return request("/api/db/changes?since=" + encodeURIComponent(since)).then(function (res) {
      if (unauthorized(res)) return null;
      if (!res.ok) throw new Error("changes " + res.status);
      return res.json().then(function (feed) {
        var cols = feed.collections || {}, revs = feed.revs || {};
        Object.keys(cols).forEach(function (name) {
          var bucket = (store[name] = store[name] || {});
          Object.keys(cols[name]).forEach(function (id) { bucket[id] = cols[name][id]; });
        });
        Object.keys(revs).forEach(function (key) {
          if (revs[key] !== 0) return;
          var i = key.indexOf("/");
          var bucket = store[key.slice(0, i)];
          if (bucket) delete bucket[key.slice(i + 1)];
        });
        if (typeof feed.count === "number") {
          if (count && feed.count < count) { dirtyExact = true; return pullSnapshot(); }
          count = feed.count;
        }
        if (feed.cursor) since = feed.cursor;
        else if (feed.maxUpdatedAt) since = feed.maxUpdatedAt;
        persist();
        dispatch();
        return null;
      });
    });
  }

  function refresh(force) {
    if (inFlight) { dirty = true; return; }
    inFlight = true;
    var p = !loadedOnce || force ? pullSnapshot() : pullChanges();
    p.then(function () { lastPull = Date.now(); })
      .catch(function () {})
      .then(function () {
        inFlight = false;
        if (dirty) {
          dirty = false;
          setTimeout(function () { refresh(false); }, 80);
        }
      });
  }

  function refreshSoon() {
    setTimeout(function () { refresh(false); }, 80);
  }

  function ensurePolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (document.visibilityState === "hidden" && Date.now() - lastPull < 60000) return;
      refresh(false);
    }, 5000);
    refresh(false);
    window.addEventListener("focus", function () {
      refresh(false);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") refresh(false);
    });
  }

  function write(method, collection, id, data) {
    var url = "/api/db/" + encodeURIComponent(collection) + "/" + encodeURIComponent(id);
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if (method !== "DELETE") opts.body = JSON.stringify({ data: data });

    /* Optimistic: show the new value right away and roll back if the server rejects it. */
    var bucket = (store[collection] = store[collection] || {});
    var had = Object.prototype.hasOwnProperty.call(bucket, id);
    var before = bucket[id];
    if (method === "DELETE") delete bucket[id];
    else if (method === "PUT") bucket[id] = data;
    else bucket[id] = Object.assign({}, had ? before : {}, data);
    dispatch();
    function rollback() {
      if (had) bucket[id] = before; else delete bucket[id];
      dispatch();
    }

    return request(url, opts).then(function (res) {
      if (!res.ok) {
        rollback();
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (j) {
            var code = (j && j.error) || "write_failed";
            if (res.status === 401) location.href = "/login";
            var err = new Error(code);
            err.code = code;
            throw err;
          });
      }
      refreshSoon();
      return true;
    }, function () {
      rollback();
      var err = new Error("network");
      err.code = "network";
      throw err;
    });
  }

  var db = {
    collection: function (name) {
      return {
        doc: function (id) {
          return {
            set: function (data) {
              return write("PUT", name, id, data);
            },
            update: function (data) {
              return write("PATCH", name, id, data);
            },
            delete: function () {
              return write("DELETE", name, id);
            },
          };
        },
        onSnapshot: function (cb, err) {
          (listSubs[name] = listSubs[name] || []).push({ cb: cb, err: err });
          ensurePolling();
          if (loadedOnce) setTimeout(dispatch, 0);
          return function () {
            var i = (listSubs[name] || []).indexOf(cb);
            if (i >= 0) listSubs[name].splice(i, 1);
          };
        },
      };
    },
    doc: function (path) {
      var s = String(path);
      var i = s.indexOf("/");
      var collection = i >= 0 ? s.slice(0, i) : s;
      var id = i >= 0 ? s.slice(i + 1) : "";
      return {
        onSnapshot: function (cb, err) {
          docSubs.push({ collection: collection, id: id, cb: cb, err: err });
          ensurePolling();
          if (loadedOnce) setTimeout(dispatch, 0);
          return function () {};
        },
      };
    },
  };

  var mePromise = null;
  function loadMe() {
    if (!mePromise) {
      mePromise = request("/api/me").then(function (res) {
        if (res.status === 401) {
          location.href = "/login";
          throw new Error("unauthorized");
        }
        if (!res.ok) throw new Error("me " + res.status);
        return res.json();
      });
    }
    return mePromise;
  }

  /* Let the in-app assistant trigger an immediate refresh after writes. */
  window.__ddRefresh = function () {
    refresh(true);
  };

  window.claude = {
    use: function (kind) {
      if (kind === "db") return Promise.resolve(db);
      if (kind === "user") {
        return loadMe().then(function (me) {
          return {
            id: function () {
              return me.id;
            },
            name: function () {
              return me.name;
            },
            role: function () {
              return me.role || "";
            },
            clinicName: function () {
              return me.clinicName || "";
            },
            clinicSlug: function () {
              return me.clinicSlug || "";
            },
            plan: function () { return me.plan || ""; },
            modules: function () { return me.modules || []; },
            canEdit: function () {
              return !!me.canEdit;
            },
            can: function (perm) {
              if (perm === "data.write") return !!me.canWrite;
              return true;
            },
          };
        });
      }
      return Promise.resolve(null);
    },
  };
})();
