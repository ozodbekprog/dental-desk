/* Dental Desk SaaS adapter: exposes the artifact-style `claude.use()` API
   on top of the clinic REST backend. The app itself stays untouched. */
(function () {
  "use strict";

  var COLLECTIONS = [
    "doctors",
    "patients",
    "appointments",
    "visits",
    "slots",
    "requests",
    "reqstate",
    "links",
    "history",
    "prices",
  ];

  var store = {};
  var version = null;
  var loadedOnce = false;
  var inFlight = false;
  var dirty = false;
  var pollTimer = null;
  var listSubs = {};
  var docSubs = [];

  function request(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin" }, opts || {}));
  }

  function dispatch() {
    COLLECTIONS.forEach(function (name) {
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

  function refresh(force) {
    if (inFlight) {
      dirty = true;
      return;
    }
    inFlight = true;

    var precheck = force || !loadedOnce
      ? Promise.resolve(true)
      : request("/api/db/version").then(
          function (res) {
            if (res.status === 401) {
              location.href = "/login";
              return false;
            }
            if (!res.ok) return true;
            return res.json().then(function (v) {
              return v.version !== version;
            });
          },
          function () {
            return true;
          }
        );

    precheck
      .then(function (needed) {
        if (!needed) return null;
        return request("/api/db/snapshot").then(function (res) {
          if (res.status === 401) {
            location.href = "/login";
            return null;
          }
          if (!res.ok) throw new Error("snapshot " + res.status);
          return res.json();
        });
      })
      .then(function (snap) {
        if (!snap) return;
        store = snap.collections || {};
        version = snap.version;
        loadedOnce = true;
        dispatch();
      })
      .catch(function () {})
      .then(function () {
        inFlight = false;
        if (dirty) {
          dirty = false;
          setTimeout(function () {
            refresh(true);
          }, 60);
        }
      });
  }

  function refreshSoon() {
    setTimeout(function () {
      refresh(true);
    }, 60);
  }

  function ensurePolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (document.visibilityState === "hidden") return;
      refresh(false);
    }, 5000);
    refresh(true);
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

    return request(url, opts).then(function (res) {
      if (!res.ok) {
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
