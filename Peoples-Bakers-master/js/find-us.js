/**
 * Find Us — interactive map, filters, and outlet list.
 */
(function () {
  var root = document.querySelector("[data-find-us]");
  if (!root) return;

  var listEl = root.querySelector("[data-find-us-list]");
  var mapEl = root.querySelector("[data-find-us-leaflet]");
  var mapLoading = root.querySelector("[data-find-us-map-loading]");
  var mapHead = root.querySelector("[data-find-us-map-head]");
  var mapTitle = root.querySelector("[data-find-us-map-title]");
  var mapSub = root.querySelector("[data-find-us-map-sub]");
  var actionDirections = root.querySelector("[data-find-us-action-directions]");
  var actionCall = root.querySelector("[data-find-us-action-call]");
  var actionCopy = root.querySelector("[data-find-us-action-copy]");
  var googleLink = root.querySelector("[data-find-us-google-link]");
  var searchInput = root.querySelector("[data-find-us-search]");
  var suggestEl = root.querySelector("[data-find-us-suggest]");
  var nearBtn = root.querySelector("[data-find-us-near]");
  var googleAllLink = root.querySelector("[data-find-us-google-all]");
  var statusEl = root.querySelector("[data-find-us-status]");
  var typeFilters = root.querySelector("[data-find-us-type-filters]");
  var regionFilters = root.querySelector("[data-find-us-region-filters]");

  var outlets = [];
  var apiMeta = null;
  var selectedId = null;
  var searchTimer = null;
  var typeFilter = "all";
  var regionFilter = "all";
  var userCoords = null;
  var map = null;
  var markers = {};
  var markerLayer = null;
  var userMarker = null;
  var leafletReady = null;

  var typeIcons = {
    "Head Office": "fa-building",
    "Main Branch": "fa-star",
    "Cover Shop": "fa-store",
    Outlet: "fa-store",
    "Google listing": "fa-map-pin",
  };

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.hidden = !msg;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function iconForType(type) {
    return typeIcons[type] || "fa-store";
  }

  function tagClass(type) {
    if (type === "Head Office") return "find-us-tag find-us-tag--hq";
    if (type === "Main Branch") return "find-us-tag find-us-tag--main";
    return "find-us-tag";
  }

  function phoneHref(phone) {
    return "tel:" + String(phone).replace(/[^\d+]/g, "");
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletReady) return leafletReady;

    leafletReady = new Promise(function (resolve, reject) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);

      var script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = function () {
        resolve(window.L);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return leafletReady;
  }

  function makeMarkerIcon(isActive) {
    return window.L.divIcon({
      className: "find-us-leaflet-pin" + (isActive ? " is-active" : ""),
      html:
        '<span class="find-us-leaflet-pin-dot"><i class="fa-solid fa-store"></i></span>',
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -28],
    });
  }

  function initMap() {
    if (!mapEl || map || !window.L) return;
    map = window.L.map(mapEl, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([7.15, 80.2], 8);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markerLayer = window.L.layerGroup().addTo(map);
    if (mapLoading) mapLoading.hidden = true;
    setTimeout(function () {
      map.invalidateSize();
    }, 120);
  }

  function syncMarkers(items) {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    markers = {};

    items.forEach(function (o) {
      if (o.lat == null || o.lng == null) return;
      var marker = window.L.marker([o.lat, o.lng], {
        icon: makeMarkerIcon(o.id === selectedId),
        title: o.area || o.name,
      });
      marker.bindPopup(
        "<strong>" +
          escapeHtml(o.area || o.name) +
          "</strong><br>" +
          escapeHtml(o.address) +
          (o.phone ? "<br>" + escapeHtml(o.phone) : "")
      );
      marker.on("click", function () {
        selectOutlet(o.id, { fromMap: true });
      });
      marker.addTo(markerLayer);
      markers[o.id] = marker;
    });

    if (items.length === 1 && items[0].lat != null) {
      map.setView([items[0].lat, items[0].lng], 14, { animate: true });
    } else if (items.length > 1) {
      var bounds = window.L.latLngBounds(
        items
          .filter(function (o) {
            return o.lat != null && o.lng != null;
          })
          .map(function (o) {
            return [o.lat, o.lng];
          })
      );
      map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: 12 });
    }
  }

  function showUserMarker() {
    if (!map || !userCoords || !window.L) return;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = window.L.circleMarker([userCoords.lat, userCoords.lng], {
      radius: 8,
      color: "#1a73e8",
      fillColor: "#4285f4",
      fillOpacity: 0.85,
      weight: 2,
    })
      .bindPopup("You are here")
      .addTo(map);
  }

  function updateMapHeader(outlet) {
    if (!outlet || !mapHead) return;
    mapHead.hidden = false;
    if (mapTitle) mapTitle.textContent = outlet.area || outlet.name;
    if (mapSub) mapSub.textContent = outlet.address;

    if (actionDirections) {
      actionDirections.href = outlet.directionsUrl;
    }
    if (googleLink) {
      googleLink.href = outlet.directionsUrl;
    }
    if (actionCall) {
      if (outlet.phone) {
        actionCall.href = phoneHref(outlet.phone);
        actionCall.hidden = false;
      } else {
        actionCall.hidden = true;
      }
    }
  }

  function focusMap(outlet) {
    if (!map || !outlet || outlet.lat == null) return;
    map.setView([outlet.lat, outlet.lng], 15, { animate: true });
    if (markers[outlet.id]) {
      markers[outlet.id].openPopup();
    }
  }

  function renderList(items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML =
        '<li class="find-us-empty">' +
        '<i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>' +
        "<p>No outlets matched your filters.</p>" +
        '<a href="https://www.google.com/maps/search/Peoples+Bakers+Sri+Lanka" target="_blank" rel="noopener noreferrer">Search on Google Maps</a>' +
        "</li>";
      return;
    }

    listEl.innerHTML = items
      .map(function (o) {
        var active = o.id === selectedId ? " is-active" : "";
        var icon = iconForType(o.type);
        var distance =
          o.distanceKm != null
            ? '<span class="find-us-distance"><i class="fa-solid fa-route" aria-hidden="true"></i> ' +
              o.distanceKm +
              " km</span>"
            : "";

        return (
          '<li class="find-us-item' +
          active +
          '" data-outlet-item="' +
          escapeHtml(o.id) +
          '">' +
          '<button type="button" class="find-us-item-btn" data-outlet-id="' +
          escapeHtml(o.id) +
          '">' +
          '<span class="find-us-pin" aria-hidden="true"><i class="fa-solid ' +
          icon +
          '"></i></span>' +
          '<span class="find-us-item-body">' +
          '<span class="find-us-item-top">' +
          "<strong>" +
          escapeHtml(o.area || o.name) +
          "</strong>" +
          '<span class="' +
          tagClass(o.type) +
          '">' +
          escapeHtml(o.type || "Outlet") +
          "</span>" +
          distance +
          "</span>" +
          '<span class="find-us-name">' +
          escapeHtml(o.name) +
          "</span>" +
          '<span class="find-us-address"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' +
          escapeHtml(o.address) +
          "</span>" +
          '<span class="find-us-meta-row">' +
          (o.region
            ? '<span class="find-us-region"><i class="fa-solid fa-map" aria-hidden="true"></i> ' +
              escapeHtml(o.region) +
              "</span>"
            : "") +
          (o.hours
            ? '<span class="find-us-hours"><i class="fa-regular fa-clock" aria-hidden="true"></i> ' +
              escapeHtml(o.hours) +
              "</span>"
            : "") +
          (o.phone
            ? '<span class="find-us-phone"><i class="fa-solid fa-phone" aria-hidden="true"></i> ' +
              escapeHtml(o.phone) +
              "</span>"
            : "") +
          "</span>" +
          "</span>" +
          "</button>" +
          '<a class="find-us-directions" href="' +
          escapeHtml(o.directionsUrl) +
          '" target="_blank" rel="noopener noreferrer">' +
          '<i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Directions' +
          "</a>" +
          "</li>"
        );
      })
      .join("");
  }

  function scrollToSelected() {
    if (!listEl || !selectedId) return;
    var item = listEl.querySelector('[data-outlet-item="' + selectedId + '"]');
    if (item) {
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function selectOutlet(id, opts) {
    opts = opts || {};
    var outlet = outlets.find(function (o) {
      return o.id === id;
    });
    if (!outlet) return;
    selectedId = id;
    updateMapHeader(outlet);
    renderList(outlets);
    syncMarkers(outlets);
    focusMap(outlet);
    if (!opts.fromMap) scrollToSelected();
  }

  function buildStatus(data) {
    var parts = [];
    if (data.total != null) {
      parts.push(data.total + " location" + (data.total === 1 ? "" : "s"));
    }
    if (data.nearest && data.nearest.distanceKm != null) {
      parts.push(
        "Nearest: " + data.nearest.area + " (" + data.nearest.distanceKm + " km)"
      );
    } else if (data.filters && data.filters.sort === "distance") {
      parts.push("sorted by distance");
    }
    if (data.googleEnabled) parts.push("Google Places");
    return parts.join(" · ");
  }

  function applyFilters() {
    var params = new URLSearchParams();
    var q = searchInput ? searchInput.value.trim() : "";
    if (q) params.set("q", q);
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
    if (regionFilter && regionFilter !== "all") params.set("region", regionFilter);
    if (userCoords) {
      params.set("lat", String(userCoords.lat));
      params.set("lng", String(userCoords.lng));
      params.set("sort", "distance");
    }
    params.set("limit", "50");

    setStatus("Loading locations…");
    return fetch("/api/outlets?" + params.toString())
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.error && !data.outlets) throw new Error(data.error);
        outlets = data.outlets || [];
        apiMeta = data;

        if (!outlets.some(function (o) { return o.id === selectedId; })) {
          selectedId = outlets[0] ? outlets[0].id : null;
        }

        renderList(outlets);
        if (map) {
          syncMarkers(outlets);
          showUserMarker();
        }

        var active = outlets.find(function (o) {
          return o.id === selectedId;
        });
        if (active) {
          updateMapHeader(active);
          focusMap(active);
        }

        setStatus(buildStatus(data));
      })
      .catch(function () {
        setStatus("Could not load outlets. Please refresh the page.");
      });
  }

  function setChipActive(container, attr, value) {
    if (!container) return;
    container.querySelectorAll(".find-us-chip").forEach(function (chip) {
      chip.classList.toggle("is-active", chip.getAttribute(attr) === value);
    });
  }

  function loadOutlets() {
    setStatus("Loading locations…");
    return Promise.all([
      fetch("/api/outlets/meta").then(function (res) { return res.json(); }),
      loadLeaflet(),
    ])
      .then(function (results) {
        apiMeta = results[0];
        initMap();
        return applyFilters();
      })
      .catch(function () {
        setStatus("Could not load outlets. Please refresh the page.");
        if (mapLoading) mapLoading.textContent = "Map unavailable";
      });
  }

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-outlet-id]");
    if (!btn) return;
    selectOutlet(btn.getAttribute("data-outlet-id"));
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      var q = searchInput.value.trim();
      searchTimer = setTimeout(function () {
        loadSuggestions(q);
        applyFilters();
      }, 220);
    });

    searchInput.addEventListener("focus", function () {
      loadSuggestions(searchInput.value.trim());
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && suggestEl) {
        suggestEl.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (suggestEl) {
    suggestEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-suggest-id]");
      if (!btn || !searchInput) return;
      searchInput.value = btn.getAttribute("data-suggest-area") || btn.textContent;
      suggestEl.hidden = true;
      searchInput.setAttribute("aria-expanded", "false");
      applyFilters();
    });
  }

  document.addEventListener("click", function (e) {
    if (!suggestEl || !searchInput) return;
    if (e.target.closest(".find-us-search-panel")) return;
    suggestEl.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
  });

  function loadSuggestions(q) {
    if (!suggestEl || q.length < 2) {
      if (suggestEl) suggestEl.hidden = true;
      if (searchInput) searchInput.setAttribute("aria-expanded", "false");
      return;
    }

    fetch("/api/outlets/suggest?q=" + encodeURIComponent(q))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var items = data.suggestions || [];
        if (!items.length) {
          suggestEl.hidden = true;
          searchInput.setAttribute("aria-expanded", "false");
          return;
        }
        suggestEl.innerHTML = items
          .map(function (item) {
            return (
              '<li role="option">' +
              '<button type="button" data-suggest-id="' +
              escapeHtml(item.id) +
              '" data-suggest-area="' +
              escapeHtml(item.area) +
              '">' +
              "<strong>" +
              escapeHtml(item.area) +
              "</strong>" +
              "<span>" +
              escapeHtml(item.region || "") +
              " · " +
              escapeHtml(item.type || "Outlet") +
              "</span>" +
              "</button></li>"
            );
          })
          .join("");
        suggestEl.hidden = false;
        searchInput.setAttribute("aria-expanded", "true");
      })
      .catch(function () {
        suggestEl.hidden = true;
      });
  }

  if (typeFilters) {
    typeFilters.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-filter-type]");
      if (!chip) return;
      typeFilter = chip.getAttribute("data-filter-type") || "all";
      setChipActive(typeFilters, "data-filter-type", typeFilter);
      applyFilters();
    });
  }

  if (regionFilters) {
    regionFilters.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-filter-region]");
      if (!chip) return;
      regionFilter = chip.getAttribute("data-filter-region") || "all";
      setChipActive(regionFilters, "data-filter-region", regionFilter);
      applyFilters();
    });
  }

  if (nearBtn) {
    nearBtn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        setStatus("Location is not supported in this browser.");
        return;
      }
      setStatus("Finding outlets near you…");
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          userCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          applyFilters();
        },
        function () {
          setStatus("Location permission denied. Search by area instead.");
        },
        { enableHighAccuracy: false, timeout: 12000 }
      );
    });
  }

  if (actionCopy) {
    actionCopy.addEventListener("click", function () {
      var outlet = outlets.find(function (o) {
        return o.id === selectedId;
      });
      if (!outlet) return;
      var text = outlet.address;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          setStatus("Address copied to clipboard.");
        });
      } else {
        setStatus(outlet.address);
      }
    });
  }

  if (googleAllLink) {
    googleAllLink.href =
      "https://www.google.com/maps/search/Peoples+Bakers+Sri+Lanka";
  }

  loadOutlets();
})();
