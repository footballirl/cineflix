
const API_KEY = "PASTE_YOUR_TMDB_V3_API_KEY_HERE";
const API_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

// Add only films you have permission to stream.
// Example format:
// { id: 1, title: "Film title", poster: "https://...", video: "https://...", type: "mp4" }
const FREE_MOVIES = [];

const $ = (id) => document.getElementById(id);

async function getMovies(endpoint) {
  try {
    const response = await fetch(
      `${API_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";

  const poster = document.createElement("img");
  poster.src = movie.poster_path
    ? IMAGE_URL + movie.poster_path
    : "https://placehold.co/300x450/222/fff?text=No+Poster";
  poster.alt = movie.title || "Movie poster";
  poster.loading = "lazy";

  const title = document.createElement("h3");
  title.textContent = movie.title || "Untitled";

  const rating = document.createElement("p");
  rating.textContent = `⭐ ${Number(movie.vote_average || 0).toFixed(1)} · ${
    (movie.release_date || "").slice(0, 4) || "N/A"
  }`;

  card.append(poster, title, rating);
  card.addEventListener("click", () => showMovieDetails(movie));

  return card;
}

function displayMovies(containerId, movies) {
  const container = $(containerId);
  container.replaceChildren();

  if (!movies.length) {
    container.textContent = "No movies found. Please try again.";
    return;
  }

  movies.forEach(movie => {
    container.appendChild(createMovieCard(movie));
  });
}

function showMovieDetails(movie) {
  $("modalTitle").textContent = movie.title || "Movie details";
  $("modalRating").textContent =
    `⭐ ${Number(movie.vote_average || 0).toFixed(1)} / 10`;

  $("modalOverview").textContent =
    movie.overview || "No description available.";

  $("modalPoster").src = movie.poster_path
    ? IMAGE_URL + movie.poster_path
    : "https://placehold.co/300x450/222/fff?text=No+Poster";

  $("watchMovieBtn").onclick = () => {
    const film = FREE_MOVIES.find(item => item.id === movie.id);

    if (film) {
      playMovie(film);
    } else {
      alert(
        "This movie is currently available for discovery only. No authorized full-length stream has been added."
      );
    }
  };

  $("movieModal").hidden = false;
}

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

  $("playerSection").scrollIntoView({ behavior: "smooth" });
}

async function loadHomePage() {
  if (!API_KEY || API_KEY === "PASTE_YOUR_TMDB_V3_API_KEY_HERE") {
    alert("Please add your TMDB API key inside script.js.");
    return;
  }

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

    $("heroTitle").textContent = featured.title;
    $("heroDescription").textContent = featured.overview;

    const hero = document.querySelector(".hero");

    if (featured.backdrop_path) {
      hero.style.backgroundImage = `
        linear-gradient(90deg, #080808 5%, rgba(8,8,8,.85) 40%, transparent),
        linear-gradient(0deg, #080808, transparent 50%),
        url("${BACKDROP_URL + featured.backdrop_path}")
      `;
    }

    $("heroDetails").onclick = () => showMovieDetails(featured);
  }
}

async function searchMovies() {
  const query = $("searchInput").value.trim();

  if (!query) return;

  $("searchResults").hidden = false;
  $("searchMovies").textContent = "Searching...";

  const results = await getMovies(
    `/search/movie?query=${encodeURIComponent(query)}`
  );

  displayMovies("searchMovies", results);
  $("searchResults").scrollIntoView({ behavior: "smooth" });
}

$("searchBtn").addEventListener("click", searchMovies);

$("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") searchMovies();
});

$("closeModal").addEventListener("click", () => {
  $("movieModal").hidden = true;
});

$("closePlayer").addEventListener("click", () => {
  const video = $("videoContainer").querySelector("video");

  if (video) video.pause();

  $("videoContainer").replaceChildren();
  $("playerSection").hidden = true;
});

loadHomePage();
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

  section.scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll(".category-list button")
  .forEach(button => {
    button.addEventListener("click", () => {
      loadGenre(button.dataset.genre, button);
    });
  });
