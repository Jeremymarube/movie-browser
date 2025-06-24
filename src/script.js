const movieList = document.getElementById('movieList');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const toggleDarkMode = document.getElementById('toggleDarkMode');
const sortBy = document.getElementById('sortBy');
const searchButton = document.getElementById('searchButton');

let movies = [];
let lastFocusedElement = null;

// Debounce helper function
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Run when page loads
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();             // Apply dark/light mode from storage
  fetchMovies();                 // Load movies

  // Event listeners
  searchInput.addEventListener('input', debounce(renderMovies, 300)); // debounce search input
  genreFilter.addEventListener('change', renderMovies);
  toggleDarkMode.addEventListener('click', toggleTheme);
  sortBy.addEventListener('change', renderMovies);
  searchButton.addEventListener('click', renderMovies);

  // Modal keyboard accessibility: close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && modal.style.display === 'flex') {
      closeModal();
    }
  });
});

// Fetch movie data from server or API
function fetchMovies() {
  fetch('http://localhost:3000/movies')
    .then(response => response.json())
    .then(data => {
      movies = data;
      populateGenres(data);
      renderMovies();
    })
    .catch(error => {
      console.error('Fetch error:', error);
      movieList.innerHTML = `<p class="no-results">Sorry, we couldn't load movies. Please try again later.</p>`;
    });
}

// Fill dropdown with unique genres
function populateGenres(data) {
  // Clear existing options except first "All Genres"
  genreFilter.innerHTML = '<option value="">All Genres</option>';
  const genres = [...new Set(data.map(movie => movie.genre))];
  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });
}

// Load saved votes from localStorage or create empty objects
let upvoteCounts = JSON.parse(localStorage.getItem('upvoteCounts')) || {};
let downvoteCounts = JSON.parse(localStorage.getItem('downvoteCounts')) || {};

// Render filtered movies
function renderMovies() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedGenre = genreFilter.value;
  const sortOrder = sortBy.value;

  if (!Array.isArray(movies)) {
    movieList.innerHTML = `<p class="no-results">No movie data available.</p>`;
    return;
  }

  let filteredMovies = movies.filter(movie => {
    const matchTitle = movie.title.toLowerCase().includes(searchTerm);
    const matchGenre = selectedGenre ? movie.genre === selectedGenre : true;
    return matchTitle && matchGenre;
  });

  if (!filteredMovies.length) {
    movieList.innerHTML = `<p class="no-results">No results found.</p>`;
    return;
  }

  // Sort if needed
  if (sortOrder === 'asc') {
    filteredMovies.sort((a, b) => a.year - b.year);
  } else if (sortOrder === 'desc') {
    filteredMovies.sort((a, b) => b.year - a.year);
  }

  movieList.innerHTML = filteredMovies.map(movie => `
    <div class="movie-card">
      <img src="${movie.image}" alt="${movie.title} Poster" class="movie-poster" />
      <h3>${movie.title}</h3>
      <p><strong>Genre:</strong> ${movie.genre}</p>
      <p><strong>Year:</strong> ${movie.year}</p>
      <div class="vote-buttons">
        <button class="upvote-btn" data-id="${movie.id}">👍 <span>${upvoteCounts[movie.id] || 0}</span></button>
        <button class="downvote-btn" data-id="${movie.id}">👎 <span>${downvoteCounts[movie.id] || 0}</span></button>
      </div>
      <button class="watch-trailer-btn" data-trailer="${movie.trailer}">🎬 Trailer</button>
    </div>
  `).join('');

  addVoteListeners();

  // Add trailer button event listeners here, after rendering movies
  document.querySelectorAll('.watch-trailer-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      lastFocusedElement = e.target;
      const trailerUrl = e.target.getAttribute('data-trailer');
      openModal(trailerUrl);
    });
  });
}

function addVoteListeners() {
  const upbuttons = document.querySelectorAll('.upvote-btn');
  upbuttons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return; // prevent multiple rapid clicks
      button.disabled = true;
      setTimeout(() => button.disabled = false, 500);

      const movieId = button.getAttribute('data-id');
      let count = upvoteCounts[movieId] || 0;
      count++;
      upvoteCounts[movieId] = count;
      button.querySelector('span').textContent = count;
      localStorage.setItem('upvoteCounts', JSON.stringify(upvoteCounts));
      button.classList.add('upvote-animate');
      setTimeout(() => button.classList.remove('upvote-animate'), 300);
    });
  });

  const downButtons = document.querySelectorAll('.downvote-btn');
  downButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      button.disabled = true;
      setTimeout(() => button.disabled = false, 500);

      const movieId = button.getAttribute('data-id');
      let count = downvoteCounts[movieId] || 0;
      count++;
      downvoteCounts[movieId] = count;
      button.querySelector('span').textContent = count;
      localStorage.setItem('downvoteCounts', JSON.stringify(downvoteCounts));
      button.classList.add('downvote-animate');
      setTimeout(() => button.classList.remove('downvote-animate'), 300);
    });
  });
}

// Toggle theme and save preference
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark); // Save user choice
  toggleDarkMode.textContent = isDark ? '☀️' : '🌙';
}

// Apply saved theme on first load
function applySavedTheme() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
    toggleDarkMode.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    toggleDarkMode.textContent = '🌙';
  }
}

// Modal related code
const modal = document.getElementById('trailerModal');
const trailerFrame = document.getElementById('trailerFrame');
const closeBtn = document.querySelector('.close-btn');

function openModal(url) {
  if (!url) return;

  // Convert YouTube URL to embeddable format
  const videoIdMatch = url.match(/v=([^&]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  if (!videoId) return;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  trailerFrame.src = embedUrl;
  modal.style.display = 'flex';

  // Focus modal close button for accessibility
  closeBtn.focus();
}

function closeModal() {
  trailerFrame.src = ''; // stop video
  modal.style.display = 'none';

  // Return focus to last focused element (e.g., trailer button)
  if (lastFocusedElement) lastFocusedElement.focus();
}

closeBtn.addEventListener('click', closeModal);


