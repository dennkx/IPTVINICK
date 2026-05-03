(function () {
  "use strict";

  var STORAGE_KEY = "inick-iptv-state-v1";
  var FIRST_RENDER_LIMIT = 180;
  var RENDER_STEP = 180;
  var OVERLAY_HIDE_MS = 4200;

  var dom = {};
  var overlayTimer = null;
  var toastTimer = null;
  var clockTimer = null;

  var state = {
    channels: [],
    groups: [],
    activeGroup: "all",
    query: "",
    favorites: {},
    recent: [],
    source: null,
    currentId: null,
    renderLimit: FIRST_RENDER_LIMIT,
    modalMode: "m3u",
    view: "home",
    module: "live",
    isPlayerOpen: false,
    isPaused: false
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheDom();
    registerTvKeys();
    bindEvents();
    restore();
    rebuildModuleBuckets();
    updateClock();
    clockTimer = setInterval(updateClock, 30000);

    if (state.channels.length > 0) {
      renderShell();
      requestAnimationFrame(function () {
        showLive();
      });
    } else if (hasRemotePlaylistSource()) {
      renderShell();
      importFromUrl(getRemotePlaylistUrl(), state.source, {
        loaderText: "A carregar a sua lista...",
        skipSuccessToast: true
      });
    } else {
      showHome();
    }
  }

  function hasRemotePlaylistSource() {
    return (
      state.source &&
      (state.source.type === "m3u-url" || state.source.type === "xtream")
    );
  }

  function getRemotePlaylistUrl() {
    if (!state.source) {
      return "";
    }
    if (state.source.type === "m3u-url") {
      return state.source.url || "";
    }
    if (state.source.type === "xtream") {
      return buildXtreamM3uUrl(
        state.source.server,
        state.source.username,
        state.source.password
      );
    }
    return "";
  }

  function showAppLoader(message) {
    if (!dom.appLoader) {
      return;
    }
    if (dom.appLoaderStatus && message) {
      dom.appLoaderStatus.textContent = message;
    }
    dom.appLoader.hidden = false;
  }

  function hideAppLoader() {
    if (dom.appLoader) {
      dom.appLoader.hidden = true;
    }
  }

  function cacheDom() {
    dom.app = document.getElementById("app");
    dom.homeScreen = document.getElementById("homeScreen");
    dom.liveScreen = document.getElementById("liveScreen");
    dom.liveTile = document.getElementById("liveTile");
    dom.liveCount = document.getElementById("liveCount");
    dom.movieCount = document.getElementById("movieCount");
    dom.seriesCount = document.getElementById("seriesCount");
    dom.homeBackButton = document.getElementById("homeBackButton");
    dom.clockText = document.getElementById("clockText");
    dom.playlistLabel = document.getElementById("playlistLabel");
    dom.openPlaylistButton = document.getElementById("openPlaylistButton");
    dom.refreshButton = document.getElementById("refreshButton");
    dom.focusSearchButton = document.getElementById("focusSearchButton");
    dom.nowTitle = document.getElementById("nowTitle");
    dom.nowGroup = document.getElementById("nowGroup");
    dom.screenTitle = document.getElementById("screenTitle");
    dom.searchInput = document.getElementById("searchInput");
    dom.groupList = document.getElementById("groupList");
    dom.channelGrid = document.getElementById("channelGrid");
    dom.channelCount = document.getElementById("channelCount");
    dom.channelScope = document.getElementById("channelScope");
    dom.clearSearchButton = document.getElementById("clearSearchButton");
    dom.emptyState = document.getElementById("emptyState");
    dom.emptyStateTitle = document.getElementById("emptyStateTitle");
    dom.emptyImportButton = document.getElementById("emptyImportButton");

    dom.playerScreen = document.getElementById("playerScreen");
    dom.playerOverlay = document.getElementById("playerOverlay");
    dom.htmlPlayer = document.getElementById("htmlPlayer");
    dom.playerTitle = document.getElementById("playerTitle");
    dom.playerGroup = document.getElementById("playerGroup");
    dom.playerStatus = document.getElementById("playerStatus");
    dom.closePlayerButton = document.getElementById("closePlayerButton");
    dom.prevChannelButton = document.getElementById("prevChannelButton");
    dom.nextChannelButton = document.getElementById("nextChannelButton");
    dom.playPauseButton = document.getElementById("playPauseButton");
    dom.favoriteButton = document.getElementById("favoriteButton");

    dom.playlistModal = document.getElementById("playlistModal");
    dom.closeModalButton = document.getElementById("closeModalButton");
    dom.m3uModeButton = document.getElementById("m3uModeButton");
    dom.xtreamModeButton = document.getElementById("xtreamModeButton");
    dom.m3uForm = document.getElementById("m3uForm");
    dom.xtreamForm = document.getElementById("xtreamForm");
    dom.m3uUrlInput = document.getElementById("m3uUrlInput");
    dom.xtreamServerInput = document.getElementById("xtreamServerInput");
    dom.xtreamUserInput = document.getElementById("xtreamUserInput");
    dom.xtreamPasswordInput = document.getElementById("xtreamPasswordInput");
    dom.playlistFileInput = document.getElementById("playlistFileInput");
    dom.modalMessage = document.getElementById("modalMessage");
    dom.toast = document.getElementById("toast");
    dom.appLoader = document.getElementById("appLoader");
    dom.appLoaderStatus = document.getElementById("appLoaderStatus");
  }

  function bindEvents() {
    var actionButtons = document.querySelectorAll("[data-view-action]");
    var i;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    for (i = 0; i < actionButtons.length; i += 1) {
      actionButtons[i].addEventListener("click", handleHomeAction);
    }

    dom.emptyImportButton.addEventListener("click", openPlaylistModal);
    dom.closeModalButton.addEventListener("click", closePlaylistModal);
    dom.refreshButton.addEventListener("click", refreshPlaylist);
    dom.homeBackButton.addEventListener("click", showHome);
    dom.focusSearchButton.addEventListener("click", function () {
      if (state.view !== "live") {
        showLive();
      }
      dom.searchInput.focus();
    });
    dom.clearSearchButton.addEventListener("click", function () {
      dom.searchInput.value = "";
      state.query = "";
      state.renderLimit = FIRST_RENDER_LIMIT;
      renderChannels();
      dom.searchInput.focus();
    });

    dom.searchInput.addEventListener("input", function () {
      state.query = normalizeText(dom.searchInput.value);
      state.renderLimit = FIRST_RENDER_LIMIT;
      renderChannels();
    });

    dom.m3uModeButton.addEventListener("click", function () {
      setModalMode("m3u");
    });
    dom.xtreamModeButton.addEventListener("click", function () {
      setModalMode("xtream");
    });

    dom.m3uForm.addEventListener("submit", function (event) {
      event.preventDefault();
      loadM3uUrl(dom.m3uUrlInput.value);
    });

    dom.xtreamForm.addEventListener("submit", function (event) {
      event.preventDefault();
      loadXtream();
    });

    dom.playlistFileInput.addEventListener("change", loadPlaylistFile);

    dom.closePlayerButton.addEventListener("click", closePlayer);
    dom.prevChannelButton.addEventListener("click", function () {
      playAdjacent(-1);
    });
    dom.nextChannelButton.addEventListener("click", function () {
      playAdjacent(1);
    });
    dom.playPauseButton.addEventListener("click", togglePause);
    dom.favoriteButton.addEventListener("click", function () {
      toggleFavorite(state.currentId);
    });

    dom.playerOverlay.addEventListener("mousemove", showPlayerOverlay);
    window.addEventListener("resize", resizeAvPlay);
  }

  function registerTvKeys() {
    var keys = [
      "MediaPlay",
      "MediaPause",
      "MediaPlayPause",
      "MediaStop",
      "ChannelUp",
      "ChannelDown",
      "ColorF0Red",
      "ColorF1Green",
      "ColorF2Yellow",
      "ColorF3Blue"
    ];

    try {
      if (window.tizen && tizen.tvinputdevice) {
        for (var i = 0; i < keys.length; i += 1) {
          tizen.tvinputdevice.registerKey(keys[i]);
        }
      }
    } catch (error) {
      log("Nao foi possivel registrar teclas da TV", error);
    }
  }

  function restore() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      raw = null;
    }

    if (!raw) {
      return;
    }

    try {
      var data = JSON.parse(raw);
      state.channels = Array.isArray(data.channels) ? data.channels : [];
      state.activeGroup = data.activeGroup || "all";
      state.favorites = arrayToMap(data.favorites || []);
      state.recent = Array.isArray(data.recent) ? data.recent : [];
      state.source = data.source || null;
      state.currentId = data.currentId || null;

      if (data.source && data.source.type === "m3u-url") {
        dom.m3uUrlInput.value = data.source.url || "";
      }

      if (data.source && data.source.type === "xtream") {
        dom.xtreamServerInput.value = data.source.server || "";
        dom.xtreamUserInput.value = data.source.username || "";
        dom.xtreamPasswordInput.value = data.source.password || "";
      }
    } catch (error) {
      log("Estado salvo invalido", error);
    }
  }

  function persist() {
    var payload = {
      channels: state.channels,
      activeGroup: state.activeGroup,
      favorites: mapToArray(state.favorites),
      recent: state.recent,
      source: state.source,
      currentId: state.currentId
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      log("Nao foi possivel gravar lista completa (quota ou limite)", error);
      try {
        localStorage.setItem(
          STORAGE_KEY + ":meta",
          JSON.stringify({
            activeGroup: state.activeGroup,
            favorites: payload.favorites,
            recent: state.recent,
            source: state.source,
            currentId: state.currentId
          })
        );
      } catch (secondError) {
        log("Nao foi possivel gravar meta da lista", secondError);
      }
    }
  }

  function renderAll() {
    renderShell();
    renderGroups();
    renderChannels();
    renderNowPlaying();
  }

  function renderShell() {
    var hasRemoteSource =
      state.source &&
      (state.source.type === "m3u-url" || state.source.type === "xtream");
    var counts = moduleCounts();
    var moduleList = currentModuleChannels();
    var noPlaylist = state.channels.length === 0;
    var noInModule = !noPlaylist && moduleList.length === 0;
    var emptyTitle;

    dom.refreshButton.disabled = !hasRemoteSource;
    dom.focusSearchButton.disabled = state.view !== "live";
    dom.homeBackButton.disabled = state.view !== "live";
    dom.playlistLabel.textContent = describeSource();
    dom.liveCount.textContent = pluralize(counts.live, "canal", "canais");
    if (dom.movieCount) {
      dom.movieCount.textContent = pluralize(counts.movies, "filme", "filmes");
    }
    if (dom.seriesCount) {
      dom.seriesCount.textContent = pluralize(counts.series, "série", "séries");
    }

    if (state.view === "home") {
      dom.screenTitle.textContent = "INICIO";
    } else if (state.module === "movies") {
      dom.screenTitle.textContent = "MOVIES";
    } else if (state.module === "series") {
      dom.screenTitle.textContent = "SERIES";
    } else {
      dom.screenTitle.textContent = "LIVE TV";
    }

    if (noPlaylist) {
      emptyTitle = "Nenhuma lista carregada";
    } else if (noInModule) {
      if (state.module === "movies") {
        emptyTitle = "Nenhum filme nesta lista";
      } else if (state.module === "series") {
        emptyTitle = "Nenhuma série nesta lista";
      } else {
        emptyTitle = "Nenhum canal ao vivo nesta lista";
      }
    } else {
      emptyTitle = "";
    }

    if (dom.emptyStateTitle) {
      dom.emptyStateTitle.textContent = emptyTitle || "Nenhuma lista carregada";
    }

    if (state.view !== "home") {
      dom.emptyState.hidden = !noPlaylist && !noInModule;
      dom.channelGrid.hidden = noPlaylist || noInModule;
    }
  }

  function handleHomeAction(event) {
    var action = event.currentTarget.getAttribute("data-view-action");

    if (action === "live") {
      showLive();
      return;
    }

    if (action === "playlists") {
      openPlaylistModal();
      return;
    }

    if (action === "settings") {
      openPlaylistModal();
      return;
    }

    if (action === "movies") {
      showMovies();
      return;
    }

    if (action === "series") {
      showSeries();
      return;
    }

    showToast("Modulo em breve");
  }

  function showHome() {
    state.view = "home";
    state.module = "live";
    dom.homeScreen.hidden = false;
    dom.liveScreen.hidden = true;
    dom.app.className = "app-shell is-home";
    renderShell();
    setTimeout(function () {
      persist();
    }, 0);

    setTimeout(function () {
      if (dom.liveTile) {
        dom.liveTile.focus();
      } else {
        focusFirstAvailable();
      }
    }, 0);
  }

  function showLive() {
    state.view = "live";
    state.module = "live";
    if (state.activeGroup === "movies:collections") {
      state.activeGroup = "all";
    }
    dom.homeScreen.hidden = true;
    dom.liveScreen.hidden = false;
    dom.app.className = "app-shell is-live";
    renderAll();

    setTimeout(function () {
      focusLiveList();
    }, 0);
  }

  function showMovies() {
    state.view = "live";
    state.module = "movies";
    state.activeGroup = "all";
    state.renderLimit = FIRST_RENDER_LIMIT;
    state.query = "";
    dom.searchInput.value = "";
    dom.homeScreen.hidden = true;
    dom.liveScreen.hidden = false;
    dom.app.className = "app-shell is-live";
    persist();
    renderAll();

    setTimeout(function () {
      focusLiveList();
    }, 0);
  }

  function showSeries() {
    state.view = "live";
    state.module = "series";
    state.activeGroup = "all";
    state.renderLimit = FIRST_RENDER_LIMIT;
    state.query = "";
    dom.searchInput.value = "";
    dom.homeScreen.hidden = true;
    dom.liveScreen.hidden = false;
    dom.app.className = "app-shell is-live";
    persist();
    renderAll();

    setTimeout(function () {
      focusLiveList();
    }, 0);
  }

  function inferModuleFromGroup(group) {
    var g = normalizeText(group || "");
    if (!g) {
      return "live";
    }
    if (
      g.indexOf("serie") !== -1 ||
      g.indexOf("series") !== -1 ||
      g.indexOf("novela") !== -1 ||
      g.indexOf("anime") !== -1 ||
      g.indexOf("dorama") !== -1
    ) {
      return "series";
    }
    if (
      g.indexOf("filme") !== -1 ||
      g.indexOf("movie") !== -1 ||
      g.indexOf("cinema") !== -1 ||
      g.indexOf("vod") !== -1 ||
      g.indexOf("reels") !== -1 ||
      g.indexOf("shorts") !== -1
    ) {
      return "movies";
    }
    return "live";
  }

  function rebuildModuleBuckets() {
    var a = state.channels;
    var live = [];
    var movies = [];
    var series = [];
    var i;
    var ch;
    var mod;

    for (i = 0; i < a.length; i += 1) {
      ch = a[i];
      if (ch.qName == null) {
        ch.qName = normalizeText(ch.name || "");
      }
      if (ch.qGroup == null) {
        ch.qGroup = normalizeText(ch.group || "");
      }
      mod = ch.module;
      if (mod !== "live" && mod !== "movies" && mod !== "series") {
        mod = inferModuleFromGroup(ch.group);
        ch.module = mod;
      }
      if (mod === "movies") {
        movies.push(ch);
      } else if (mod === "series") {
        series.push(ch);
      } else {
        live.push(ch);
      }
    }

    state._byModule = { live: live, movies: movies, series: series };
  }

  function channelModule(channel) {
    var m = channel.module;
    if (m === "live" || m === "movies" || m === "series") {
      return m;
    }
    m = inferModuleFromGroup(channel.group);
    channel.module = m;
    return m;
  }

  function channelsInModule(channels, module) {
    return channels.filter(function (ch) {
      return channelModule(ch) === module;
    });
  }

  function currentModuleChannels() {
    var b = state._byModule;
    if (b) {
      if (state.module === "live") {
        return b.live;
      }
      if (state.module === "movies") {
        return b.movies;
      }
      if (state.module === "series") {
        return b.series;
      }
    }
    return channelsInModule(state.channels, state.module);
  }

  function moduleCounts() {
    var b = state._byModule;
    if (b) {
      return {
        live: b.live.length,
        movies: b.movies.length,
        series: b.series.length
      };
    }
    var out = { live: 0, movies: 0, series: 0 };
    var i;
    for (i = 0; i < state.channels.length; i += 1) {
      out[channelModule(state.channels[i])] += 1;
    }
    return out;
  }

  function formatCategoryTitle(rawGroup, module) {
    var r = trim(rawGroup || "");
    if (!r) {
      r = "Sem grupo";
    }
    var n = normalizeText(r);
    if (n === "sem grupo") {
      return r;
    }
    if (module === "movies") {
      if (n.indexOf("filmes|") === 0 || n.indexOf("filmes |") === 0) {
        return r;
      }
      if (r.indexOf("|") !== -1) {
        return r;
      }
      return "Filmes | " + r;
    }
    if (module === "series") {
      if (n.indexOf("series|") === 0 || n.indexOf("series |") === 0) {
        return r;
      }
      if (n.indexOf("serie|") === 0 || n.indexOf("serie |") === 0) {
        return r;
      }
      if (r.indexOf("|") !== -1) {
        return r;
      }
      return "Séries | " + r;
    }
    return r;
  }

  function countFavoritesInModule() {
    var list = currentModuleChannels();
    var c = 0;
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (state.favorites[list[i].id]) {
        c += 1;
      }
    }
    return c;
  }

  function updateClock() {
    var now = new Date();
    var text =
      pad2(now.getHours()) +
      ":" +
      pad2(now.getMinutes()) +
      " " +
      pad2(now.getDate()) +
      "/" +
      pad2(now.getMonth() + 1) +
      "/" +
      now.getFullYear();

    if (dom.clockText) {
      dom.clockText.textContent = text;
    }
  }

  function categoryThumbSource(item) {
    var i;
    var ch;
    var recentList;
    var gname;
    var list = currentModuleChannels();

    if (item.id === "all") {
      for (i = 0; i < list.length; i += 1) {
        ch = list[i];
        if (trim(ch.logo)) {
          return { logo: ch.logo, label: item.name };
        }
      }
      return { logo: "", label: item.name };
    }

    if (item.id === "favorites") {
      for (i = 0; i < list.length; i += 1) {
        ch = list[i];
        if (state.favorites[ch.id] && trim(ch.logo)) {
          return { logo: ch.logo, label: item.name };
        }
      }
      return { logo: "", label: item.name };
    }

    if (item.id === "recent") {
      recentList = recentChannels();
      for (i = 0; i < recentList.length; i += 1) {
        ch = recentList[i];
        if (trim(ch.logo)) {
          return { logo: ch.logo, label: item.name };
        }
      }
      return { logo: "", label: item.name };
    }

    if (item.id === "movies:collections") {
      for (i = 0; i < list.length; i += 1) {
        ch = list[i];
        if (isCollectionLikeGroup(ch.group) && trim(ch.logo)) {
          return { logo: ch.logo, label: item.name };
        }
      }
      return { logo: "", label: item.name };
    }

    if (item.id.indexOf("group:") === 0) {
      gname = item.id.substring(6);
      for (i = 0; i < list.length; i += 1) {
        ch = list[i];
        if (ch.group === gname && trim(ch.logo)) {
          return { logo: ch.logo, label: item.name };
        }
      }
      for (i = 0; i < list.length; i += 1) {
        ch = list[i];
        if (normalizeText(ch.group) === normalizeText(gname) && trim(ch.logo)) {
          return { logo: ch.logo, label: item.name };
        }
      }
      return { logo: "", label: item.name };
    }

    return { logo: "", label: item.name };
  }

  function createLogoThumb(logoUrl, labelName) {
    var logo = document.createElement("div");
    logo.className = "channel-logo";

    if (trim(logoUrl)) {
      logo.className += " has-logo";
      var image = document.createElement("img");
      image.alt = "";
      image.src = logoUrl;
      image.onerror = function () {
        this.style.display = "none";
        if (this.parentNode) {
          this.parentNode.className = "channel-logo";
        }
      };
      logo.appendChild(image);
    }

    var initials = document.createElement("span");
    initials.className = "initials";
    initials.textContent = initialsFor(labelName);
    logo.appendChild(initials);

    return logo;
  }

  function renderGroups() {
    var groupList = dom.groupList;
    var moduleList = currentModuleChannels();
    var counts = countByGroup(moduleList);
    var moduleGroups = sortGroupNamesAdultLast(buildGroups(moduleList));
    var entries = [
      { id: "all", name: "ALL", count: moduleList.length },
      {
        id: "favorites",
        name: "FAVOURITE",
        count: countFavoritesInModule()
      },
      { id: "recent", name: "RECENTES", count: recentChannels().length }
    ];
    var thumb;
    var i;
    var colCount;

    if (state.module === "movies") {
      colCount = countCollectionChannels(moduleList);
      if (colCount > 0) {
        entries.push({
          id: "movies:collections",
          name: "Coleções",
          count: colCount
        });
      }
    }

    for (i = 0; i < moduleGroups.length; i += 1) {
      entries.push({
        id: "group:" + moduleGroups[i],
        name: formatCategoryTitle(moduleGroups[i], state.module),
        count: counts[moduleGroups[i]] || 0
      });
    }

    groupList.innerHTML = "";

    for (var j = 0; j < entries.length; j += 1) {
      var item = entries[j];
      var button = document.createElement("button");
      button.className = "group-button";
      if (item.id === state.activeGroup) {
        button.className += " is-active";
      }
      button.setAttribute("data-focusable", "true");
      button.setAttribute("data-group", item.id);

      thumb = categoryThumbSource(item);
      button.appendChild(createLogoThumb(thumb.logo, thumb.label));

      var title = document.createElement("strong");
      title.textContent = item.name;
      var count = document.createElement("span");
      count.textContent = String(item.count);

      button.appendChild(title);
      button.appendChild(count);
      button.addEventListener("click", selectGroup);
      groupList.appendChild(button);
    }
  }

  function renderChannels() {
    var channels = filteredChannels();
    var total = channels.length;
    var limited = channels.slice(0, state.renderLimit);
    var groupName = groupLabel(state.activeGroup);

    dom.channelCount.textContent = pluralize(total, "canal", "canais");
    dom.channelScope.textContent = groupName;
    dom.clearSearchButton.disabled = state.query.length === 0;

    dom.channelGrid.innerHTML = "";

    for (var i = 0; i < limited.length; i += 1) {
      dom.channelGrid.appendChild(createChannelCard(limited[i]));
    }

    if (total > limited.length) {
      var more = document.createElement("button");
      more.className = "load-more";
      more.setAttribute("data-focusable", "true");
      more.textContent = "Mostrar mais " + Math.min(RENDER_STEP, total - limited.length);
      more.addEventListener("click", function () {
        state.renderLimit += RENDER_STEP;
        renderChannels();
        setTimeout(function () {
          more.focus();
        }, 0);
      });
      dom.channelGrid.appendChild(more);
    }
  }

  function createChannelCard(channel) {
    var card = document.createElement("button");
    card.className = "channel-card";
    if (state.currentId === channel.id) {
      card.className += " is-current";
    }
    if (state.favorites[channel.id]) {
      card.className += " is-favorite";
    }
    card.setAttribute("data-focusable", "true");
    card.setAttribute("data-channel-id", channel.id);

    var favoriteDot = document.createElement("span");
    favoriteDot.className = "favorite-dot";
    card.appendChild(favoriteDot);

    var logo = createLogoThumb(channel.logo, channel.name);

    var meta = document.createElement("div");
    meta.className = "channel-meta";

    var title = document.createElement("strong");
    title.textContent = channel.name;

    var group = document.createElement("span");
    group.textContent = formatCategoryTitle(channel.group || "Sem grupo", state.module);

    meta.appendChild(title);
    meta.appendChild(group);
    card.appendChild(logo);
    card.appendChild(meta);

    card.addEventListener("click", function () {
      openChannel(channel.id);
    });

    return card;
  }

  function selectGroup(event) {
    state.activeGroup = event.currentTarget.getAttribute("data-group");
    state.renderLimit = FIRST_RENDER_LIMIT;
    persist();
    renderGroups();
    renderChannels();
    focusFirstChannelOrGroup(event.currentTarget);
  }

  function filteredChannels() {
    var channels = currentModuleChannels().slice();
    var query = state.query;

    if (state.activeGroup === "favorites") {
      channels = channels.filter(function (channel) {
        return !!state.favorites[channel.id];
      });
    } else if (state.activeGroup === "recent") {
      channels = recentChannels();
    } else if (state.activeGroup === "movies:collections") {
      channels = channels.filter(function (channel) {
        return isCollectionLikeGroup(channel.group);
      });
    } else if (state.activeGroup.indexOf("group:") === 0) {
      var groupName = state.activeGroup.substring(6);
      channels = channels.filter(function (channel) {
        return channel.group === groupName;
      });
    }

    if (query) {
      channels = channels.filter(function (channel) {
        var qn = channel.qName;
        var qg = channel.qGroup;
        if (qn == null) {
          qn = normalizeText(channel.name);
        }
        if (qg == null) {
          qg = normalizeText(channel.group);
        }
        return qn.indexOf(query) !== -1 || qg.indexOf(query) !== -1;
      });
    }

    return sortAdultChannelsLast(channels);
  }

  function recentChannels() {
    var byId = {};
    var output = [];
    var i;

    for (i = 0; i < state.channels.length; i += 1) {
      byId[state.channels[i].id] = state.channels[i];
    }

    for (i = 0; i < state.recent.length; i += 1) {
      if (byId[state.recent[i]] && byId[state.recent[i]].module === state.module) {
        output.push(byId[state.recent[i]]);
      }
    }

    return output;
  }

  function isAdultLikeText(text) {
    var t = normalizeText(text || "");
    var markers = [
      "adult",
      "adulto",
      "porno",
      "xxx",
      "+18",
      "18+",
      "erotic",
      "erotico",
      "prive",
      "livesex",
      "sexo",
      "playboy",
      "forbidden",
      "proibido",
      "sensual"
    ];
    var i;
    for (i = 0; i < markers.length; i += 1) {
      if (t.indexOf(markers[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function isAdultLikeChannel(channel) {
    return isAdultLikeText(
      String(channel.name || "") + " " + String(channel.group || "")
    );
  }

  function sortAdultChannelsLast(channels) {
    var head = [];
    var tail = [];
    var i;
    for (i = 0; i < channels.length; i += 1) {
      if (isAdultLikeChannel(channels[i])) {
        tail.push(channels[i]);
      } else {
        head.push(channels[i]);
      }
    }
    return head.concat(tail);
  }

  function sortGroupNamesAdultLast(names) {
    var head = [];
    var tail = [];
    var i;
    for (i = 0; i < names.length; i += 1) {
      if (isAdultLikeText(names[i])) {
        tail.push(names[i]);
      } else {
        head.push(names[i]);
      }
    }
    head.sort(function (a, b) {
      return a.localeCompare(b);
    });
    tail.sort(function (a, b) {
      return a.localeCompare(b);
    });
    return head.concat(tail);
  }

  function isCollectionLikeGroup(group) {
    var t = normalizeText(group || "");
    if (!t) {
      return false;
    }
    return (
      t.indexOf("colecao") !== -1 ||
      t.indexOf("collection") !== -1 ||
      t.indexOf("boxset") !== -1 ||
      t.indexOf("box set") !== -1 ||
      t.indexOf("saga") !== -1 ||
      t.indexOf("antologia") !== -1 ||
      t.indexOf("trilogia") !== -1 ||
      t.indexOf("franquia") !== -1 ||
      t.indexOf("universo") !== -1 ||
      t.indexOf("completo") !== -1 ||
      t.indexOf("complete") !== -1 ||
      t.indexOf("anthology") !== -1
    );
  }

  function countCollectionChannels(moduleList) {
    var n = 0;
    var i;
    for (i = 0; i < moduleList.length; i += 1) {
      if (isCollectionLikeGroup(moduleList[i].group)) {
        n += 1;
      }
    }
    return n;
  }

  function openPlaylistModal() {
    dom.playlistModal.hidden = false;
    dom.modalMessage.textContent = "";
    setModalMode(state.modalMode || "m3u");
    setTimeout(function () {
      if (state.modalMode === "xtream") {
        dom.xtreamServerInput.focus();
      } else {
        dom.m3uUrlInput.focus();
      }
    }, 0);
  }

  function closePlaylistModal() {
    dom.playlistModal.hidden = true;
    focusCurrentView();
  }

  function setModalMode(mode) {
    state.modalMode = mode;
    dom.m3uForm.hidden = mode !== "m3u";
    dom.xtreamForm.hidden = mode !== "xtream";
    dom.m3uModeButton.className = mode === "m3u" ? "segment is-active" : "segment";
    dom.xtreamModeButton.className =
      mode === "xtream" ? "segment is-active" : "segment";
  }

  function loadM3uUrl(rawUrl) {
    var url = trim(rawUrl);
    if (!url) {
      setModalMessage("Informe a URL da lista M3U.");
      return;
    }

    var hadModal = !dom.playlistModal.hidden;
    dom.playlistModal.hidden = true;

    importFromUrl(
      url,
      {
        type: "m3u-url",
        url: url,
        label: "M3U remoto"
      },
      { recoverModalOnFail: hadModal }
    );
  }

  function loadXtream() {
    var server = trim(dom.xtreamServerInput.value);
    var username = trim(dom.xtreamUserInput.value);
    var password = dom.xtreamPasswordInput.value;

    if (!server || !username || !password) {
      setModalMessage("Preencha servidor, usuario e senha.");
      return;
    }

    var url = buildXtreamM3uUrl(server, username, password);
    var hadModal = !dom.playlistModal.hidden;
    dom.playlistModal.hidden = true;

    importFromUrl(
      url,
      {
        type: "xtream",
        server: server,
        username: username,
        password: password,
        label: "Xtream"
      },
      { recoverModalOnFail: hadModal }
    );
  }

  function loadPlaylistFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    setModalMessage("Lendo arquivo...");

    var reader = new FileReader();
    reader.onload = function () {
      var hadModal = !dom.playlistModal.hidden;
      try {
        dom.playlistModal.hidden = true;
        showAppLoader("A importar canais...");
        applyPlaylist(
          String(reader.result || ""),
          {
            type: "file",
            label: file.name || "Arquivo M3U"
          },
          { recoverModalOnFail: hadModal }
        );
      } catch (error) {
        hideAppLoader();
        if (state.channels.length > 0) {
          showLive();
        } else {
          showHome();
        }
        if (hadModal || state.channels.length === 0) {
          dom.playlistModal.hidden = false;
        }
        setModalMessage(error.message || "Nao foi possivel abrir o arquivo.");
      }
    };
    reader.onerror = function () {
      setModalMessage("Nao foi possivel ler o arquivo selecionado.");
    };
    reader.readAsText(file);
  }

  function refreshPlaylist() {
    if (!state.source) {
      return;
    }

    if (state.source.type === "m3u-url") {
      importFromUrl(state.source.url, state.source);
    } else if (state.source.type === "xtream") {
      importFromUrl(
        buildXtreamM3uUrl(
          state.source.server,
          state.source.username,
          state.source.password
        ),
        state.source
      );
    }
  }

  function importFromUrl(url, source, options) {
    options = options || {};

    if (!options.noSplash) {
      showAppLoader(options.loaderText || "A descarregar lista...");
    }

    if (!options.quietRefresh) {
      showToast("Carregando lista IPTV");
    }

    requestText(url, function (error, text) {
      var message =
        "Nao foi possivel carregar. Verifique a URL, a rede ou o CORS no teste pelo navegador.";

      if (error) {
        hideAppLoader();
        if (options.quietRefresh) {
          log("Atualizacao em segundo plano falhou", error);
          return;
        }
        if (state.channels.length > 0) {
          showLive();
        } else {
          showHome();
        }
        if (options.recoverModalOnFail || state.channels.length === 0) {
          dom.playlistModal.hidden = false;
        }
        setModalMessage(message);
        showToast("Falha ao carregar lista");
        log(message, error);
        return;
      }

      try {
        applyPlaylist(text, source, options);
      } catch (parseError) {
        hideAppLoader();
        if (options.quietRefresh) {
          log(parseError.message || parseError, parseError);
          return;
        }
        if (state.channels.length > 0) {
          showLive();
        } else {
          showHome();
        }
        if (options.recoverModalOnFail || state.channels.length === 0) {
          dom.playlistModal.hidden = false;
        }
        setModalMessage(parseError.message || "Lista M3U invalida.");
        showToast("Lista invalida");
      }
    });
  }

  function applyPlaylist(text, source, options) {
    options = options || {};
    dom.playlistModal.hidden = true;

    var channels = parseM3u(text);

    if (channels.length === 0) {
      hideAppLoader();
      if (state.channels.length > 0) {
        showLive();
        if (options.recoverModalOnFail) {
          dom.playlistModal.hidden = false;
        }
      } else {
        showHome();
        dom.playlistModal.hidden = false;
      }
      throw new Error("Nenhum canal encontrado na lista.");
    }

    state.channels = channels;
    rebuildModuleBuckets();
    state.source = source;
    state.activeGroup = "all";
    state.renderLimit = FIRST_RENDER_LIMIT;
    state.query = "";
    dom.searchInput.value = "";
    state.recent = pruneIds(state.recent);
    state.favorites = pruneMap(state.favorites);

    showLive();
    hideAppLoader();
    if (!options.skipSuccessToast) {
      showToast(pluralize(channels.length, "canal carregado", "canais carregados"));
    }
    setTimeout(function () {
      persist();
    }, 0);
  }

  function parseM3u(text) {
    var lines = String(text || "").replace(/\r/g, "").split("\n");
    var channels = [];
    var seenIds = {};
    var pending = null;
    var pendingGroup = "";

    for (var i = 0; i < lines.length; i += 1) {
      var line = trim(lines[i]);

      if (!line) {
        continue;
      }

      if (line.indexOf("#EXTINF") === 0) {
        pending = parseExtInf(line);
        if (pendingGroup && !pending.group) {
          pending.group = pendingGroup;
        }
        continue;
      }

      if (line.indexOf("#EXTGRP:") === 0) {
        pendingGroup = trim(line.substring(8));
        if (pending && !pending.group) {
          pending.group = pendingGroup;
        }
        continue;
      }

      if (line.charAt(0) === "#") {
        continue;
      }

      if (pending) {
        pending.url = line;
        channels.push(normalizeChannel(pending, channels.length, seenIds));
        pending = null;
      }
    }

    return channels;
  }

  function parseExtInf(line) {
    var commaIndex = line.indexOf(",");
    var head = commaIndex >= 0 ? line.substring(0, commaIndex) : line;
    var displayName = commaIndex >= 0 ? trim(line.substring(commaIndex + 1)) : "";
    var attrs = {};
    var attrPattern = /([A-Za-z0-9_-]+)="([^"]*)"/g;
    var match;

    while ((match = attrPattern.exec(head))) {
      attrs[match[1].toLowerCase()] = match[2];
    }

    return {
      tvgId: attrs["tvg-id"] || "",
      tvgName: attrs["tvg-name"] || "",
      name: displayName || attrs["tvg-name"] || "Canal",
      logo: attrs["tvg-logo"] || "",
      group: attrs["group-title"] || "",
      url: ""
    };
  }

  function normalizeChannel(channel, index, seenIds) {
    var name = trim(channel.name || channel.tvgName || "Canal " + (index + 1));
    var group = trim(channel.group || "Sem grupo");
    var url = trim(channel.url);
    var idSeed = channel.tvgId || (channel.tvgName ? channel.tvgName + "|" + url : name + "|" + url);

    return {
      id: uniqueChannelId(stableId(idSeed), seenIds),
      name: name,
      group: group,
      logo: trim(channel.logo),
      url: url,
      module: inferModuleFromGroup(group),
      qName: normalizeText(name),
      qGroup: normalizeText(group)
    };
  }

  function requestText(url, callback) {
    if (window.fetch) {
      fetch(url, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP " + response.status);
          }
          return response.text();
        })
        .then(function (text) {
          callback(null, text);
        }, function (error) {
          callback(error);
        });
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) {
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          callback(null, xhr.responseText);
        } else {
          callback(new Error("HTTP " + xhr.status));
        }
      };
      xhr.send();
    } catch (error) {
      callback(error);
    }
  }

  function openChannel(id) {
    var channel = findChannel(id);
    if (!channel) {
      return;
    }

    state.currentId = channel.id;
    addRecent(channel.id);
    persist();
    renderNowPlaying();
    renderChannels();
    startPlayback(channel);
  }

  function startPlayback(channel) {
    state.isPlayerOpen = true;
    state.isPaused = false;
    dom.playerScreen.hidden = false;
    dom.playerTitle.textContent = channel.name;
    dom.playerGroup.textContent = formatCategoryTitle(
      channel.group || "Ao vivo",
      channelModule(channel)
    );
    updatePlayPauseButton();
    renderFavoriteButton();
    showPlayerStatus("Carregando");
    showPlayerOverlay();

    if (canUseAvPlay()) {
      dom.playerScreen.className = "player-screen is-avplay";
      playWithAvPlay(channel.url);
    } else {
      dom.playerScreen.className = "player-screen";
      playWithHtmlVideo(channel.url);
    }

    setTimeout(function () {
      dom.playPauseButton.focus();
    }, 0);
  }

  function canUseAvPlay() {
    return !!(window.webapis && webapis.avplay);
  }

  function playWithAvPlay(url) {
    try {
      stopAvPlay();
      webapis.avplay.open(url);
      webapis.avplay.setListener({
        onbufferingstart: function () {
          showPlayerStatus("Carregando");
        },
        onbufferingprogress: function (percent) {
          showPlayerStatus("Carregando " + percent + "%");
        },
        onbufferingcomplete: function () {
          showPlayerStatus("Ao vivo");
          hidePlayerStatusLater();
        },
        onstreamcompleted: function () {
          showPlayerStatus("Transmissao finalizada");
        },
        onerror: function (eventType) {
          showPlayerStatus("Erro no player: " + eventType);
        }
      });
      resizeAvPlay();
      webapis.avplay.prepareAsync(
        function () {
          webapis.avplay.play();
          showPlayerStatus("Ao vivo");
          hidePlayerStatusLater();
        },
        function (error) {
          showPlayerStatus("Nao foi possivel iniciar: " + error);
        }
      );
    } catch (error) {
      showPlayerStatus("Erro ao abrir stream");
      log("AVPlay erro", error);
    }
  }

  function playWithHtmlVideo(url) {
    try {
      dom.htmlPlayer.pause();
      dom.htmlPlayer.removeAttribute("src");
      dom.htmlPlayer.load();
      dom.htmlPlayer.src = url;
      dom.htmlPlayer.controls = false;
      dom.htmlPlayer.autoplay = true;
      dom.htmlPlayer.onplaying = htmlPlayingOnce;
      dom.htmlPlayer.onerror = htmlErrorOnce;

      var result = dom.htmlPlayer.play();
      if (result && result["catch"]) {
        result["catch"](function () {
          showPlayerStatus("O navegador bloqueou o autoplay.");
        });
      }
    } catch (error) {
      showPlayerStatus("Erro ao abrir stream");
      log("HTML video erro", error);
    }
  }

  function htmlPlayingOnce() {
    showPlayerStatus("Ao vivo");
    hidePlayerStatusLater();
  }

  function htmlErrorOnce() {
    showPlayerStatus("Stream nao suportado neste navegador");
  }

  function closePlayer() {
    state.isPlayerOpen = false;
    clearTimeout(overlayTimer);
    stopPlayback();
    dom.playerScreen.hidden = true;
    dom.playerOverlay.className = "player-overlay";
    renderChannels();
    focusCurrentChannel();
  }

  function stopPlayback() {
    if (canUseAvPlay()) {
      stopAvPlay();
    }

    try {
      dom.htmlPlayer.pause();
      dom.htmlPlayer.removeAttribute("src");
      dom.htmlPlayer.load();
    } catch (error) {
      log("Nao foi possivel parar HTML video", error);
    }
  }

  function stopAvPlay() {
    try {
      if (window.webapis && webapis.avplay) {
        var status = webapis.avplay.getState();
        if (status !== "NONE") {
          webapis.avplay.stop();
          webapis.avplay.close();
        }
      }
    } catch (error) {
      log("Nao foi possivel parar AVPlay", error);
    }
  }

  function resizeAvPlay() {
    if (!state.isPlayerOpen || !canUseAvPlay()) {
      return;
    }

    try {
      webapis.avplay.setDisplayRect(0, 0, 1920, 1080);
      if (webapis.avplay.setDisplayMethod) {
        webapis.avplay.setDisplayMethod("PLAYER_DISPLAY_MODE_LETTER_BOX");
      }
    } catch (error) {
      log("Nao foi possivel redimensionar AVPlay", error);
    }
  }

  function togglePause() {
    showPlayerOverlay();

    if (canUseAvPlay()) {
      try {
        if (state.isPaused) {
          webapis.avplay.play();
          state.isPaused = false;
        } else {
          webapis.avplay.pause();
          state.isPaused = true;
        }
      } catch (error) {
        log("Nao foi possivel alternar pausa", error);
      }
    } else {
      if (dom.htmlPlayer.paused) {
        dom.htmlPlayer.play();
        state.isPaused = false;
      } else {
        dom.htmlPlayer.pause();
        state.isPaused = true;
      }
    }

    updatePlayPauseButton();
  }

  function updatePlayPauseButton() {
    if (!dom.playPauseButton) {
      return;
    }
    dom.playPauseButton.classList.toggle("is-paused", state.isPaused);
    dom.playPauseButton.setAttribute(
      "aria-label",
      state.isPaused ? "Reproduzir" : "Pausar"
    );
  }

  function playAdjacent(direction) {
    var channels = filteredChannels();
    var index = -1;
    var i;

    for (i = 0; i < channels.length; i += 1) {
      if (channels[i].id === state.currentId) {
        index = i;
        break;
      }
    }

    if (index === -1 && channels.length) {
      index = 0;
    } else {
      index += direction;
    }

    if (index < 0) {
      index = channels.length - 1;
    }
    if (index >= channels.length) {
      index = 0;
    }

    if (channels[index]) {
      openChannel(channels[index].id);
    }
  }

  function renderNowPlaying() {
    var channel = findChannel(state.currentId);
    if (!channel) {
      dom.nowTitle.textContent = "Nenhum canal";
      dom.nowGroup.textContent = state.channels.length ? "Escolha um canal" : "Selecione uma lista";
      return;
    }

    dom.nowTitle.textContent = channel.name;
    dom.nowGroup.textContent = formatCategoryTitle(
      channel.group || "Sem grupo",
      channelModule(channel)
    );
  }

  function toggleFavorite(id) {
    if (!id) {
      return;
    }

    var channel = findChannel(id);
    if (!channel) {
      return;
    }

    if (state.favorites[id]) {
      delete state.favorites[id];
      showToast("Removido dos favoritos");
    } else {
      state.favorites[id] = true;
      showToast("Adicionado aos favoritos");
    }

    persist();
    renderGroups();
    renderChannels();
    renderFavoriteButton();
  }

  function renderFavoriteButton() {
    if (!dom.favoriteButton) {
      return;
    }
    var on = !!state.favorites[state.currentId];
    dom.favoriteButton.classList.toggle("is-active", on);
    dom.favoriteButton.setAttribute(
      "aria-label",
      on ? "Remover favorito" : "Adicionar favorito"
    );
  }

  function addRecent(id) {
    var output = [id];
    for (var i = 0; i < state.recent.length; i += 1) {
      if (state.recent[i] !== id && output.length < 30) {
        output.push(state.recent[i]);
      }
    }
    state.recent = output;
  }

  function showPlayerOverlay() {
    if (!state.isPlayerOpen) {
      return;
    }

    clearTimeout(overlayTimer);
    dom.playerOverlay.className = "player-overlay";
    overlayTimer = setTimeout(function () {
      dom.playerOverlay.className = "player-overlay is-dimmed";
    }, OVERLAY_HIDE_MS);
  }

  function showPlayerStatus(message) {
    dom.playerStatus.textContent = message;
    dom.playerStatus.className = "player-status";
    showPlayerOverlay();
  }

  function hidePlayerStatusLater() {
    setTimeout(function () {
      dom.playerStatus.className = "player-status is-hidden";
    }, 1600);
  }

  function handleKeyDown(event) {
    var key = normalizeKey(event);
    var active = document.activeElement;

    if (state.isPlayerOpen) {
      showPlayerOverlay();
    }

    if (isTextInput(active) && allowTextKey(key)) {
      return;
    }

    if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      moveFocus(key);
      return;
    }

    if (key === "Enter") {
      if (active && active.click) {
        event.preventDefault();
        active.click();
      }
      return;
    }

    if (key === "Back" || key === "Escape") {
      event.preventDefault();
      handleBack();
      return;
    }

    if (key === "MediaPlayPause") {
      event.preventDefault();
      if (state.isPlayerOpen) {
        togglePause();
      }
      return;
    }

    if (key === "MediaStop") {
      event.preventDefault();
      if (state.isPlayerOpen) {
        closePlayer();
      }
      return;
    }

    if (key === "ChannelUp") {
      event.preventDefault();
      if (state.isPlayerOpen) {
        playAdjacent(1);
      }
      return;
    }

    if (key === "ChannelDown") {
      event.preventDefault();
      if (state.isPlayerOpen) {
        playAdjacent(-1);
      }
      return;
    }

    if (key === "ColorF0Red") {
      event.preventDefault();
      if (state.currentId) {
        toggleFavorite(state.currentId);
      } else {
        var focusedChannel = focusedChannelId();
        if (focusedChannel) {
          toggleFavorite(focusedChannel);
        }
      }
      return;
    }

    if (key === "ColorF1Green") {
      event.preventDefault();
      openPlaylistModal();
      return;
    }

    if (key === "ColorF2Yellow") {
      event.preventDefault();
      if (state.view !== "live") {
        showLive();
      }
      dom.searchInput.focus();
      return;
    }

    if (key === "ColorF3Blue") {
      event.preventDefault();
      refreshPlaylist();
    }
  }

  function normalizeKey(event) {
    var key = event.key;

    if (event.keyCode === 10009 || event.keyCode === 461) {
      return "Back";
    }

    if (key === "Esc") {
      return "Escape";
    }

    return key || String(event.keyCode);
  }

  function allowTextKey(key) {
    return (
      key !== "ArrowUp" &&
      key !== "ArrowDown" &&
      key !== "Enter" &&
      key !== "Back" &&
      key !== "Escape"
    );
  }

  function handleBack() {
    if (state.isPlayerOpen) {
      closePlayer();
      return;
    }

    if (!dom.playlistModal.hidden) {
      closePlaylistModal();
      return;
    }

    if (state.view === "live") {
      showHome();
      return;
    }

    exitApplication();
  }

  function exitApplication() {
    try {
      if (window.tizen && tizen.application) {
        tizen.application.getCurrentApplication().exit();
      }
    } catch (error) {
      log("Nao foi possivel sair pelo Tizen", error);
    }
  }

  function handleFocusIn(event) {
    if (event.target && event.target.classList) {
      event.target.classList.add("is-focused");
      scrollIntoViewIfNeeded(event.target);
    }
  }

  function handleFocusOut(event) {
    if (event.target && event.target.classList) {
      event.target.classList.remove("is-focused");
    }
  }

  function moveFocus(direction) {
    var current = document.activeElement;
    var candidates = focusableElements();
    var currentRect;
    var best = null;
    var bestScore = Infinity;
    var i;

    if (!current || candidates.indexOf(current) === -1) {
      focusFirstAvailable();
      return;
    }

    currentRect = current.getBoundingClientRect();

    for (i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      if (candidate === current) {
        continue;
      }

      var score = scoreCandidate(currentRect, candidate.getBoundingClientRect(), direction);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best) {
      best.focus();
    }
  }

  function scoreCandidate(currentRect, targetRect, direction) {
    var currentX = currentRect.left + currentRect.width / 2;
    var currentY = currentRect.top + currentRect.height / 2;
    var targetX = targetRect.left + targetRect.width / 2;
    var targetY = targetRect.top + targetRect.height / 2;
    var dx = targetX - currentX;
    var dy = targetY - currentY;
    var primary;
    var secondary;

    if (direction === "ArrowRight" && dx <= 8) {
      return Infinity;
    }
    if (direction === "ArrowLeft" && dx >= -8) {
      return Infinity;
    }
    if (direction === "ArrowDown" && dy <= 8) {
      return Infinity;
    }
    if (direction === "ArrowUp" && dy >= -8) {
      return Infinity;
    }

    if (direction === "ArrowRight" || direction === "ArrowLeft") {
      primary = Math.abs(dx);
      secondary = Math.abs(dy);
    } else {
      primary = Math.abs(dy);
      secondary = Math.abs(dx);
    }

    return primary * 1000 + secondary;
  }

  function focusableElements() {
    var nodes = document.querySelectorAll("[data-focusable]");
    var output = [];

    for (var i = 0; i < nodes.length; i += 1) {
      if (isVisible(nodes[i]) && !nodes[i].disabled) {
        output.push(nodes[i]);
      }
    }

    return output;
  }

  function focusFirstAvailable() {
    var items = focusableElements();
    if (items.length) {
      items[0].focus();
    }
  }

  function focusCurrentView() {
    if (state.view === "live") {
      focusLiveList();
      return;
    }

    if (dom.liveTile) {
      dom.liveTile.focus();
    } else {
      focusFirstAvailable();
    }
  }

  function focusLiveList() {
    var firstGroup = dom.groupList.querySelector("[data-focusable]");
    if (firstGroup) {
      firstGroup.focus();
      return;
    }

    focusFirstChannelOrGroup(dom.emptyImportButton);
  }

  function focusFirstChannelOrGroup(fallback) {
    var firstChannel = dom.channelGrid.querySelector("[data-focusable]");
    if (firstChannel) {
      firstChannel.focus();
    } else if (fallback) {
      fallback.focus();
    }
  }

  function focusCurrentChannel() {
    var target = state.currentId
      ? dom.channelGrid.querySelector('[data-channel-id="' + cssEscape(state.currentId) + '"]')
      : null;
    if (target) {
      target.focus();
    } else {
      focusFirstAvailable();
    }
  }

  function focusedChannelId() {
    var active = document.activeElement;
    return active ? active.getAttribute("data-channel-id") : "";
  }

  function scrollIntoViewIfNeeded(element) {
    if (!element || !element.scrollIntoView) {
      return;
    }

    try {
      element.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
    } catch (error) {
      element.scrollIntoView(false);
    }
  }

  function isVisible(element) {
    if (!element || element.disabled) {
      return false;
    }

    if (element.offsetWidth === 0 && element.offsetHeight === 0) {
      return false;
    }

    var node = element;
    while (node && node !== document.body) {
      if (node.hidden) {
        return false;
      }
      node = node.parentNode;
    }

    return true;
  }

  function isTextInput(element) {
    if (!element) {
      return false;
    }
    var tag = String(element.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea";
  }

  function buildGroups(channels) {
    var seen = {};
    var groups = [];

    for (var i = 0; i < channels.length; i += 1) {
      var group = channels[i].group || "Sem grupo";
      if (!seen[group]) {
        seen[group] = true;
        groups.push(group);
      }
    }

    groups.sort(function (a, b) {
      return a.localeCompare(b);
    });
    return groups;
  }

  function countByGroup(channels) {
    var counts = {};
    for (var i = 0; i < channels.length; i += 1) {
      var group = channels[i].group || "Sem grupo";
      counts[group] = (counts[group] || 0) + 1;
    }
    return counts;
  }

  function groupLabel(groupId) {
    if (groupId === "all") {
      return "ALL";
    }
    if (groupId === "favorites") {
      return "FAVOURITE";
    }
    if (groupId === "recent") {
      return "RECENTES";
    }
    if (groupId === "movies:collections") {
      return "Coleções";
    }
    if (groupId.indexOf("group:") === 0) {
      return formatCategoryTitle(groupId.substring(6), state.module);
    }
    return "Canais";
  }

  function describeSource() {
    if (!state.source) {
      return "Sem lista";
    }
    return state.source.label || "Lista carregada";
  }

  function buildXtreamM3uUrl(server, username, password) {
    var base = trim(server).replace(/\/+$/, "");
    return (
      base +
      "/get.php?username=" +
      encodeURIComponent(username) +
      "&password=" +
      encodeURIComponent(password) +
      "&type=m3u_plus&output=m3u8"
    );
  }

  function findChannel(id) {
    for (var i = 0; i < state.channels.length; i += 1) {
      if (state.channels[i].id === id) {
        return state.channels[i];
      }
    }
    return null;
  }

  function pruneIds(ids) {
    var existing = {};
    var output = [];
    var i;

    for (i = 0; i < state.channels.length; i += 1) {
      existing[state.channels[i].id] = true;
    }

    for (i = 0; i < ids.length; i += 1) {
      if (existing[ids[i]]) {
        output.push(ids[i]);
      }
    }

    return output;
  }

  function pruneMap(map) {
    var ids = mapToArray(map);
    var valid = pruneIds(ids);
    return arrayToMap(valid);
  }

  function stableId(seed) {
    var text = String(seed || "channel");
    var hash = 0;

    for (var i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    return "ch_" + Math.abs(hash);
  }

  function uniqueChannelId(id, seenIds) {
    if (!seenIds[id]) {
      seenIds[id] = 1;
      return id;
    }

    seenIds[id] += 1;
    return id + "_" + seenIds[id];
  }

  function initialsFor(name) {
    var words = trim(name).split(/\s+/);
    var output = "";

    for (var i = 0; i < words.length && output.length < 2; i += 1) {
      if (words[i]) {
        output += words[i].charAt(0).toUpperCase();
      }
    }

    return output || "TV";
  }

  function normalizeText(value) {
    var text = String(value || "").toLowerCase();

    if (text.normalize) {
      text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return text;
  }

  function trim(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "");
  }

  function pluralize(count, singular, plural) {
    return count + " " + (count === 1 ? singular : plural);
  }

  function pad2(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function mapToArray(map) {
    var output = [];
    for (var key in map) {
      if (Object.prototype.hasOwnProperty.call(map, key) && map[key]) {
        output.push(key);
      }
    }
    return output;
  }

  function arrayToMap(array) {
    var map = {};
    for (var i = 0; i < array.length; i += 1) {
      map[array[i]] = true;
    }
    return map;
  }

  function setModalMessage(message) {
    dom.modalMessage.textContent = message;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.className = "toast is-visible";
    toastTimer = setTimeout(function () {
      dom.toast.className = "toast";
    }, 2600);
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) {
      return CSS.escape(value);
    }
    return String(value).replace(/"/g, '\\"');
  }

  function log(message, error) {
    if (window.console && console.warn) {
      console.warn(message, error || "");
    }
  }
})();
