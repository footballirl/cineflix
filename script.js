
const API_URL = "https://cineflix-api.arounarazak140.workers.dev";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

// Add only films you have permission to stream.
const FREE_MOVIES = [];

const $ = (id) => document.getElementById(id);


// API CONNECTION

async function apiFetch(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

async function getMovies(endpoint) {
  try {
    const data = await apiFetch(endpoint);
    return data.results || [];
  } catch (error) {
    console.error("CineFlix API:", error);
    return [];
  }
}


// MOVIE CARDS

function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";

  const poster = document.createElement("img");

  poster.src = movie.poster_path
    ? IMAGE_URL + movie.poster_path
    : movie.poster || "https://placehold.co/300x450/222/fff?text=No+Poster";

  poster.alt = movie.title || "Movie poster";
  poster.loading = "lazy";

  const title = document.createElement("h3");
  title.textContent = movie.title || "Untitled";

  const rating = document.createElement("p");

  rating.textContent =
    `⭐ ${Number(movie.vote_average || 0).toFixed(1)} · ` +
    `${(movie.release_date || "").slice(0, 4) || "N/A"}`;

  card.append(poster, title, rating);

  card.addEventListener("click", () => showMovieDetails(movie));

  return card;
}

function displayMovies(containerId, movies) {
  const container = $(containerId);

  if (!container) return;

  container.replaceChildren();

  if (!movies.length) {
    container.textContent = "No movies found. Please try again.";
    return;
  }

  movies.forEach(movie => {
    container.appendChild(createMovieCard(movie));
  });
}


// MOVIE DETAILS

async function showMovieDetails(movie) {
  $("movieModal").hidden = false;
document.body.style.overflow = "hidden";

  $("modalTitle").textContent = movie.title || "Movie details";

  $("modalRating").textContent =
    `⭐ ${Number(movie.vote_average || 0).toFixed(1)} / 10`;

  $("modalOverview").textContent =
    movie.overview || "No description available.";

  $("modalPoster").src = movie.poster_path
    ? IMAGE_URL + movie.poster_path
    : "https://placehold.co/300x450/222/fff?text=No+Poster";

  $("modalMeta").textContent = "Loading movie information...";
  $("modalGenres").replaceChildren();
  $("modalCast").textContent = "Loading cast...";
  $("modalTrailer").replaceChildren();
  $("similarMovies").textContent = "Loading recommendations...";

  try {
    const [details, credits, videos, similar] =
      await Promise.all([
        apiFetch(`/movie/${movie.id}`),
        apiFetch(`/movie/${movie.id}/credits`),
        apiFetch(`/movie/${movie.id}/videos`),
        apiFetch(`/movie/${movie.id}/similar`)
      ]);

    $("modalMeta").textContent =
      `${details.release_date || "Release date unknown"} · ` +
      `${details.runtime ? details.runtime + " min" : "Runtime unknown"}`;

    (details.genres || []).forEach(genre => {
      const tag = document.createElement("span");
      tag.textContent = genre.name;
      $("modalGenres").appendChild(tag);
    });

    // CAST

    $("modalCast").replaceChildren();

    (credits.cast || []).slice(0, 10).forEach(person => {
      const card = document.createElement("div");
      card.className = "cast-card";

      const img = document.createElement("img");

      img.src = person.profile_path
        ? IMAGE_URL + person.profile_path
        : "https://placehold.co/100x120/222/fff?text=Actor";

      img.alt = person.name || "Actor";

      const name = document.createElement("p");
      name.textContent = person.name || "Unknown";

      const character = document.createElement("p");
      character.textContent = person.character || "";

      card.append(img, name, character);
      $("modalCast").appendChild(card);
    });

    // TRAILER

    const trailer = (videos.results || []).find(
      video =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        video.official
    ) || (videos.results || []).find(
      video =>
        video.site === "YouTube" &&
        video.type === "Trailer"
    );

    if (trailer) {
      const frame = document.createElement("iframe");

      frame.className = "trailer-frame";

      frame.src =
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}`;

      frame.title = `${movie.title} trailer`;
      frame.allowFullscreen = true;

      frame.allow =
        "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";

      $("modalTrailer").appendChild(frame);
    } else {
      $("modalTrailer").textContent = "No trailer available.";
    }

    // SIMILAR MOVIES

    $("similarMovies").replaceChildren();

    (similar.results || []).slice(0, 6).forEach(item => {
      const card = document.createElement("div");

      const img = document.createElement("img");

      img.src = item.poster_path
        ? IMAGE_URL + item.poster_path
        : "https://placehold.co/150x225/222/fff?text=No+Poster";

      img.alt = item.title || "Movie";
      img.loading = "lazy";

      const title = document.createElement("p");
      title.textContent = item.title || "Untitled";

      card.append(img, title);

      card.addEventListener("click", () => {
        showMovieDetails(item);
      });

      $("similarMovies").appendChild(card);
    });

  } catch (error) {
    console.error("Movie details:", error);

    $("modalMeta").textContent =
      "Unable to load additional movie information.";
  }

  // WATCH BUTTON

  $("watchMovieBtn").onclick = () => {
    const film = FREE_MOVIES.find(item => item.id === movie.id);

    if (film) {
      playMovie(film);
    } else {
      alert(
        "No authorized full-length stream has been added for this movie yet."
      );
    }
  };

  // MY LIST BUTTON

  $("addToListBtn").onclick = () => {
    addToMyList(movie);
  };
}


// VIDEO PLAYER

function playMovie(film) {
  $("movieModal").hidden = true;
  $("playerSection").hidden = false;
  $("playerTitle").textContent = film.title;

  const container = $("videoContainer");
  container.replaceChildren();

  if (film.type === "mp4") {
    const video = document.createElement("video");

    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";

    const source = document.createElement("source");

    source.src = film.video;
    source.type = "video/mp4";

    video.appendChild(source);
    container.appendChild(video);

  } else if (film.type === "embed") {
    const frame = document.createElement("iframe");

    frame.src = film.video;
    frame.title = film.title;
    frame.allowFullscreen = true;
    frame.allow = "fullscreen; picture-in-picture";

    container.appendChild(frame);

  } else {
    container.textContent = "Unsupported video format.";
  }

  $("playerSection").scrollIntoView({
    behavior: "smooth"
  });
}


// HOME PAGE

async function loadHomePage() {
  const [trending, popular, topRated] = await Promise.all([
    getMovies("/trending/movie/week"),
    getMovies("/movie/popular"),
    getMovies("/movie/top_rated")
  ]);

  displayMovies("trendingMovies", trending);
  displayMovies("popularMovies", popular);
  displayMovies("topRatedMovies", topRated);
  displayMovies("freeMovies", FREE_MOVIES);

  if (trending.length) {
    const featured = trending[0];

    $("heroTitle").textContent = featured.title || "Featured movie";

    $("heroDescription").textContent =
      featured.overview || "Discover movies on CineFlix.";

    const hero = document.querySelector(".hero");

    if (hero && featured.backdrop_path) {
      hero.style.backgroundImage = `
        linear-gradient(90deg, #080808 5%, rgba(8,8,8,.85) 40%, transparent),
        linear-gradient(0deg, #080808, transparent 50%),
        url("${BACKDROP_URL + featured.backdrop_path}")
      `;
    }

    $("heroDetails").onclick = () => {
      showMovieDetails(featured);
    };
  }
}


// SEARCH

async function searchMovies() {
  const query = $("searchInput").value.trim();

  if (!query) return;

  $("searchResults").hidden = false;
  $("searchMovies").textContent = "Searching...";

  const results = await getMovies(
    `/search/movie?query=${encodeURIComponent(query)}`
  );

  displayMovies("searchMovies", results);

  $("searchResults").scrollIntoView({
    behavior: "smooth"
  });
}

$("searchBtn").addEventListener("click", searchMovies);

$("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchMovies();
  }
});

// CLOSE MOVIE MODAL
function closeMovieModal() {
  $("movieModal").hidden = true;
  document.body.style.overflow = "";
}

// Close button
$("closeModal").addEventListener("click", closeMovieModal);

// Close when clicking outside the popup
$("movieModal").addEventListener("click", event => {
  if (event.target === $("movieModal")) {
    closeMovieModal();
  }
});

// Close using Escape key
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("movieModal").hidden) {
    closeMovieModal();
  }
});;


// CLOSE PLAYER

$("closePlayer").addEventListener("click", () => {
  const video = $("videoContainer").querySelector("video");

  if (video) video.pause();

  $("videoContainer").replaceChildren();
  $("playerSection").hidden = true;
});


// MY LIST

function getMyList() {
  try {
    return JSON.parse(
      localStorage.getItem("cineflixMyList")
    ) || [];
  } catch {
    return [];
  }
}

function addToMyList(movie) {
  const list = getMyList();

  if (list.some(item => item.id === movie.id)) {
    alert("This movie is already in your list.");
    return;
  }

  list.push({
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    vote_average: movie.vote_average,
    release_date: movie.release_date,
    overview: movie.overview
  });

  localStorage.setItem(
    "cineflixMyList",
    JSON.stringify(list)
  );

  displayMyList();

  alert("Movie added to My List!");
}

function displayMyList() {
  const movies = getMyList();
  const container = $("myListMovies");

  if (!container) return;

  container.replaceChildren();

  if (!movies.length) {
    container.textContent = "No saved movies yet.";
    return;
  }

  movies.forEach(movie => {
    const card = createMovieCard(movie);

    const remove = document.createElement("button");

    remove.textContent = "Remove";
    remove.style.marginTop = "8px";
    remove.style.background = "#333";
    remove.style.color = "white";

    remove.addEventListener("click", event => {
      event.stopPropagation();

      const updated = getMyList().filter(
        item => item.id !== movie.id
      );

      localStorage.setItem(
        "cineflixMyList",
        JSON.stringify(updated)
      );

      displayMyList();
    });

    card.appendChild(remove);
    container.appendChild(card);
  });
}


// GENRE CATEGORIES

async function loadGenre(genreId, button) {
  const section = $("genreResults");

  section.hidden = false;
  $("genreMovies").textContent = "Loading movies...";

  document.querySelectorAll(".category-list button")
    .forEach(btn => btn.classList.remove("active"));

  button.classList.add("active");

  const movies = await getMovies(
    `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`
  );

  displayMovies("genreMovies", movies);

  section.scrollIntoView({
    behavior: "smooth"
  });
}

document.querySelectorAll(".category-list button")
  .forEach(button => {
    button.addEventListener("click", () => {
      loadGenre(button.dataset.genre, button);
    });
  });


// START CINEFLIX

// LOAD MORE MOVIES

const moviePages = {
  trending: 1,
  popular: 1,
  topRated: 1
};

const loadingMore = {
  trending: false,
  popular: false,
  topRated: false
};

async function loadMoreMovies(type, endpoint, containerId, buttonId) {
  if (loadingMore[type]) return;

  const button = $(buttonId);

  loadingMore[type] = true;
  button.disabled = true;
  button.textContent = "Loading...";

  const nextPage = moviePages[type] + 1;

  const movies = await getMovies(
    `${endpoint}?page=${nextPage}`
  );

  const container = $(containerId);

  if (movies.length) {
    movies.forEach(movie => {
      container.appendChild(createMovieCard(movie));
    });

    moviePages[type] = nextPage;
    button.textContent = "Load More";
  } else {
    button.textContent = "No More Movies";
    button.disabled = true;
  }

  loadingMore[type] = false;

  if (movies.length) {
    button.disabled = false;
  }
}


// BUTTON EVENTS

$("loadMoreTrending").addEventListener("click", () => {
  loadMoreMovies(
    "trending",
    "/trending/movie/week",
    "trendingMovies",
    "loadMoreTrending"
  );
});

$("loadMorePopular").addEventListener("click", () => {
  loadMoreMovies(
    "popular",
    "/movie/popular",
    "popularMovies",
    "loadMorePopular"
  );
});

$("loadMoreTopRated").addEventListener("click", () => {
  loadMoreMovies(
    "topRated",
    "/movie/top_rated",
    "topRatedMovies",
    "loadMoreTopRated"
  );
});

// DISCOVER AND FILTER MOVIES

async function discoverMovies() {
  const sort = $("sortMovies").value;
  const year = $("filterYear").value.trim();
  const button = $("discoverBtn");

  if (year && (!/^\d{4}$/.test(year) ||
      Number(year) < 1900 ||
      Number(year) > 2100)) {
    alert("Please enter a valid four-digit release year.");
    return;
  }

  button.disabled = true;
  button.textContent = "Searching...";

  $("discoverMovies").textContent = "Finding movies...";

  const params = new URLSearchParams();

  params.set("sort_by", sort);

  if (year) {
    params.set("primary_release_year", year);
  }

  params.set("vote_count.gte", "10");

  const movies = await getMovies(
    `/discover/movie?${params.toString()}`
  );

  displayMovies("discoverMovies", movies);

  button.disabled = false;
  button.textContent = "Find Movies";

  $("discover").scrollIntoView({
    behavior: "smooth"
  });
}

$("discoverBtn").addEventListener("click", discoverMovies);

displayMyList();
loadHomePage();
