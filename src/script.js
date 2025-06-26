const movieList       = document.getElementById('movieList');
const searchInput     = document.getElementById('searchInput');
const genreFilter     = document.getElementById('genreFilter');
const toggleDarkMode  = document.getElementById('toggleDarkMode');
const sortBy          = document.getElementById('sortBy');
const searchButton    = document.getElementById('searchButton');


let movies =  [];             // All movie objects
let lastFocusedElement = null; // Stores the element that had focus before opening a modal

// Debounce helper 
function debounce (fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

// Local‑storage‑backed vote counters 
let upvoteCounts   = JSON.parse(localStorage.getItem('upvoteCounts'))   || {};
let downvoteCounts = JSON.parse(localStorage.getItem('downvoteCounts')) || {};

// Startup 
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();   // 1. Respect saved dark/light choice
  fetchMovies();       // 2. Retrieve data from db.json / API

  // 3. Wire UI controls 
  searchInput .addEventListener('input', debounce(renderMovies, 300));
  genreFilter.addEventListener('change',  renderMovies);
  toggleDarkMode.addEventListener('click', toggleTheme);
  sortBy      .addEventListener('change',  renderMovies);
  searchButton.addEventListener('click',   renderMovies);

  // Close any modal on ESC 
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (trailerModal.style.display === 'flex') closeTrailerModal();
    if (detailsModal.style.display === 'flex') closeDetailsModal();
  });
});

// Fetch & transform data ------------------------------------------------------
function fetchMovies () {
  fetch('https://my-json-server-api.onrender.com/movies')
    .then(res => res.json())
    .then(data => {
      movies = data.filter(item => !item.type || item.type === 'movie');
      populateGenres(movies);
      renderMovies();
    })
    .catch(err => {
      console.error('Fetch error:', err);
      movieList.innerHTML = '<p class="no-results">Sorry, we couldn\'t load movies. Please try again later.</p>';
    });
}

// Populate <select> with unique genres
function populateGenres (movieArray) {
  genreFilter.innerHTML = '<option value="">All Genres</option>'; // reset
  [...new Set(movieArray.map(m => m.genre))].sort().forEach(genre => {
    const opt = document.createElement('option');
    opt.value = genre;
    opt.textContent = genre;
    genreFilter.appendChild(opt);
  });
}

// Core render function --------------------------------------------------------
function renderMovies () {
  if (!Array.isArray(movies) || !movies.length) {
    movieList.innerHTML = '<p class="no-results">No movie data available.</p>';
    return;
  }

  const searchTerm    = searchInput.value.trim().toLowerCase();
  const selectedGenre = genreFilter.value;
  const sortOrder     = sortBy.value; // '', 'asc', 'desc'

  let filtered = movies.filter(({ title, genre }) => {
    const matchesTitle = title.toLowerCase().includes(searchTerm);
    const matchesGenre = selectedGenre ? genre === selectedGenre : true;
    return matchesTitle && matchesGenre;
  });

  if (!filtered.length) {
    movieList.innerHTML = '<p class="no-results">No results found.</p>';
    return;
  }

  
  if (sortOrder === 'asc')  filtered.sort((a, b) => a.year - b.year);
  if (sortOrder === 'desc') filtered.sort((a, b) => b.year - a.year);

  // Build HTML 
  movieList.innerHTML = filtered.map(movie => `
    <div class="movie-card">
      <img src="${movie.image}" alt="${movie.title} Poster" class="movie-poster" />
      <h3>${movie.title}</h3>
      <p><strong>Genre:</strong> ${movie.genre}</p>
      <p><strong>Year:</strong> ${movie.year}</p>

      <div class="vote-buttons">
        <button class="upvote-btn"   data-id="${movie.id}">👍 <span>${upvoteCounts[movie.id]   || 0}</span></button>
        <button class="downvote-btn" data-id="${movie.id}">👎 <span>${downvoteCounts[movie.id] || 0}</span></button>
      </div>

      <button class="watch-trailer-btn" data-trailer="${movie.trailer}">🎬 Trailer</button>

      <div class="button-row">
        <button class="edit-btn"   data-id="${movie.id}">Edit</button>
        <button class="delete-btn" data-id="${movie.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // Attach dynamic listeners 
  addVoteListeners();
  
  attachEditListeners();
  attachDeleteListeners();

  // Trailer buttons
  document.querySelectorAll('.watch-trailer-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      lastFocusedElement = e.currentTarget;
      openTrailerModal(e.currentTarget.dataset.trailer);
    });
  });

  // Card click ➜ Details modal (ignore clicks that originated inside <button>)
  document.querySelectorAll('.movie-card').forEach((card, idx) => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return; // ignore buttons inside card
      openDetailsModal(filtered[idx]);
    });
  });
}

// Vote handling 
function addVoteListeners () {
  document.querySelectorAll('.upvote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      btn.disabled = true; setTimeout(() => (btn.disabled = false), 500);
      const id = btn.dataset.id;
      upvoteCounts[id] = (upvoteCounts[id] || 0) + 1;
      btn.querySelector('span').textContent = upvoteCounts[id];
      localStorage.setItem('upvoteCounts', JSON.stringify(upvoteCounts));
      btn.classList.add('upvote-animate');
      setTimeout(() => btn.classList.remove('upvote-animate'), 300);
    });
  });

  document.querySelectorAll('.downvote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      btn.disabled = true; setTimeout(() => (btn.disabled = false), 500);
      const id = btn.dataset.id;
      downvoteCounts[id] = (downvoteCounts[id] || 0) + 1;
      btn.querySelector('span').textContent = downvoteCounts[id];
      localStorage.setItem('downvoteCounts', JSON.stringify(downvoteCounts));
      btn.classList.add('downvote-animate');
      setTimeout(() => btn.classList.remove('downvote-animate'), 300);
    });
  });
}

// Theme toggling 
function toggleTheme () {
  const dark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', dark);
  toggleDarkMode.textContent = dark ? '☀' : '🌙';
}

function applySavedTheme () {
  const dark = localStorage.getItem('darkMode') === 'true';
  if (dark) document.body.classList.add('dark-mode');
  toggleDarkMode.textContent = dark ? '☀' : '🌙';
}


// Trailer modal 
const trailerModal  = document.getElementById('trailerModal');
const trailerFrame  = document.getElementById('trailerFrame');
const trailerClose  = document.querySelector('.close-btn');

function openTrailerModal (url) {
  if (!url) return;
  const idMatch = url.match(/(?:v=|\.be\/)([^&]+)/);
  const videoId = idMatch ? idMatch[1] : null;
  if (!videoId) return;

  trailerFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  trailerModal.style.display = 'flex';
  trailerClose.focus();
}

function closeTrailerModal () {
  trailerFrame.src = '';
  trailerModal.style.display = 'none';
  if (lastFocusedElement) lastFocusedElement.focus();
}

trailerClose.addEventListener('click', closeTrailerModal);

// Contact form 
document.getElementById('contactForm').addEventListener('submit', handleContactForm);

function handleContactForm (e) {
  e.preventDefault();
  const msgBox = document.getElementById('formMessage');
  msgBox.textContent = 'Sending message...';
  msgBox.className = 'form-message';

  // Simulate async request 
  setTimeout(() => {
    msgBox.textContent = "Thank you for your message! We'll get back to you soon.";
    msgBox.className = 'form-message success';
    e.target.reset();
  }, 1000);
}

// Edit modal

const editModal   = document.getElementById('editModal');
const editClose   = document.querySelector('.close-edit-btn');
const editForm    = document.getElementById('editForm');
const editTitle   = document.getElementById('editTitle');
const editGenre   = document.getElementById('editGenre');
const editYear    = document.getElementById('editYear');
let currentEditId = null;

function attachEditListeners () {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const movie = movies.find(m => m.id == id);
      if (!movie) return;
      currentEditId  = id;
      editTitle.value = movie.title;
      editGenre.value = movie.genre;
      editYear.value  = movie.year;
      editModal.style.display = 'flex';
      editClose.focus();
    });
  });
}

editClose.addEventListener('click', () => {
  editModal.style.display = 'none';
  currentEditId = null;
});

editForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentEditId) return;
  const updated = {
    title: editTitle.value.trim(),
    genre: editGenre.value.trim(),
    year: parseInt(editYear.value, 10)
  };

  await fetch(`https://my-json-server-api.onrender.com/movies/${currentEditId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  });


  editModal.style.display = 'none';
  currentEditId = null;
  fetchMovies();
});

// Delete
function attachDeleteListeners () {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Are you sure you want to delete this movie?')) return;
      await fetch(`https://my-json-server-api.onrender.com/movies/${id}`, { method: 'DELETE' });
      fetchMovies();
    });
  });
}


const addModal  = document.getElementById('addModal');
const addForm   = document.getElementById('addForm');
const addBtn    = document.getElementById('addMovieBtn');
const addClose  = document.querySelector('.close-add-btn');
const addTitle  = document.getElementById('addTitle');
const addGenre  = document.getElementById('addGenre');
const addYear   = document.getElementById('addYear');
const addImage  = document.getElementById('addImage');
const addTrailer= document.getElementById('addTrailer');

addBtn  .addEventListener('click', () => addModal.style.display = 'flex');
addClose.addEventListener('click', () => {
  addModal.style.display = 'none';
  addForm.reset();
});

addForm.addEventListener('submit', async e => {
  e.preventDefault();

  const newMovie = {
    title:   addTitle.value.trim(),
    genre:   addGenre.value.trim(),
    year:    parseInt(addYear.value, 10),
    image:   addImage.value.trim()   || 'https://via.placeholder.com/200x300',
    trailer: addTrailer.value.trim()
  };

  await fetch('https://my-json-server-api.onrender.com/movies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newMovie)
  });

  addModal.style.display = 'none';
  addForm.reset();
  fetchMovies();
});


// Details modal 

const detailsModal  = document.getElementById('detailsModal');
const detailsContent= document.getElementById('detailsContent');
const detailsClose  = document.getElementById('detailsCloseBtn');

function openDetailsModal (movie) {
  detailsContent.innerHTML = `
    <h2>${movie.title} (${movie.year})</h2>
    <img src="${movie.image}" alt="${movie.title} Poster" style="max-width:200px; float:right; margin-left:1rem; border-radius:8px;" />
    <p><strong>Genre:</strong> ${movie.genre}</p>
    <p><strong>Description:</strong> ${movie.description || 'No description available.'}</p>
    <p><strong>Director:</strong> ${movie.director || 'Unknown'}</p>
    <p><strong>Cast:</strong> ${(movie.cast || []).join(', ') || 'Unknown'}</p>
    <div style="clear:both;"></div>
  `;
  detailsModal.style.display = 'flex';
  detailsClose.focus();
}

function closeDetailsModal () {
  detailsModal.style.display = 'none';
}

detailsClose.addEventListener('click', closeDetailsModal);

function loadMoviesFromStorage() {
    try {
        const stored = localStorage.getItem('movieBrowserData');
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    } catch (error) {
        console.error('Error loading movies:', error);
        return null;
    }
}

function saveMoviesToStorage(moviesArray) {
    try {
        localStorage.setItem('movieBrowserData', JSON.stringify(moviesArray));
        console.log('Movies saved successfully');
    } catch (error) {
        console.error('Error saving movies:', error);
    }
}

