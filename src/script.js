const movieList = document.getElementById('movieList');
const trendingList = document.getElementById('trendingList');
const tvList = document.getElementById('tvList');
const suggestionsList = document.getElementById('suggestionsList');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const toggleDarkMode = document.getElementById('toggleDarkMode');
const sortBy = document.getElementById('sortBy');
const searchButton = document.getElementById('searchButton');
const categoryFilter = document.getElementById('categoryFilter');

// Navigation links
const navLinks = document.querySelectorAll('.navbar a');

// TMDB Configuration
const TMDB_API_KEY = 'af3eec10393bb0a131b4d0c7eb69133d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

let movies = [];
let tvShows = [];
let trending = [];
let suggestions = [];
let allContent = [];
let lastFocusedElement = null;
let allGenres = [];
let currentView = 'all'; // all, movies, tv, trending, suggestions

// Local storage
let upvoteCounts = JSON.parse(localStorage.getItem('upvoteCounts')) || {};
let downvoteCounts = JSON.parse(localStorage.getItem('downvoteCounts')) || {};
let customMovies = JSON.parse(localStorage.getItem('customMovies')) || [];

// Startup
document.addEventListener('DOMContentLoaded', async () => {
  applySavedTheme();
  await fetchGenres();
  await fetchAllData();
  
  // Navigation click handlers
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href === '#trending') {
        currentView = 'trending';
        showTrendingView();
      } else if (href === '#movies') {
        currentView = 'movies';
        showMoviesView();
      } else if (href === '#tvshows') {
        currentView = 'tvshows';
        showTVShowsView();
      } else if (href === '#suggestions') {
        currentView = 'suggestions';
        showSuggestionsView();
      } else if (href === '#contact') {
        currentView = 'contact';
        scrollToContact();
      }
    });
  });
  
  searchInput.addEventListener('input', debounce(handleSearch, 500));
  genreFilter.addEventListener('change', filterAndRender);
  sortBy.addEventListener('change', filterAndRender);
  categoryFilter.addEventListener('change', filterAndRender);
  searchButton.addEventListener('click', handleSearch);

  if (toggleDarkMode) {
    toggleDarkMode.addEventListener('click', toggleTheme);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (trailerModal && trailerModal.style.display === 'flex') closeTrailerModal();
    if (detailsModal && detailsModal.style.display === 'flex') closeDetailsModal();
    if (editModal && editModal.style.display === 'flex') editModal.style.display = 'none';
    if (addModal && addModal.style.display === 'flex') addModal.style.display = 'none';
  });
});

// View functions
function showTrendingView() {
  currentView = 'trending';
  // Hide all sections
  document.querySelectorAll('.movie-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById('trending').style.display = 'block';
  filterAndRender();
}

function showMoviesView() {
  currentView = 'movies';
  document.querySelectorAll('.movie-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById('movies').style.display = 'block';
  filterAndRender();
}

function showTVShowsView() {
  currentView = 'tvshows';
  document.querySelectorAll('.movie-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById('tvshows').style.display = 'block';
  filterAndRender();
}

function showSuggestionsView() {
  currentView = 'suggestions';
  document.querySelectorAll('.movie-section').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById('suggestions').style.display = 'block';
  filterAndRender();
}

function scrollToContact() {
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

// Show all sections (for search/all view)
function showAllSections() {
  document.querySelectorAll('.movie-section').forEach(section => {
    section.style.display = 'block';
  });
}

// Fetch all data
async function fetchAllData() {
  try {
    await Promise.all([
      fetchTrending(),
      fetchLatestMovies(),
      fetchTVShows(),
      fetchSuggestions()
    ]);
    
    // Combine all content for searching
    allContent = [...movies, ...tvShows, ...trending, ...suggestions];
    allContent = [...new Map(allContent.map(item => [item.id, item])).values()];
    
    filterAndRender();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Fetch trending (movies + TV)
async function fetchTrending() {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    trending = data.results.slice(0, 20).map(item => ({
      id: `trending_${item.media_type}_${item.id}`,
      title: item.title || item.name,
      genre: getGenreName(item.genre_ids),
      year: item.release_date ? new Date(item.release_date).getFullYear() : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A'),
      image: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : 'https://via.placeholder.com/300x450',
      backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE}${item.backdrop_path}` : null,
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.title || item.name) + ' trailer')}`,
      description: item.overview || 'No description available.',
      voteAverage: item.vote_average,
      mediaType: item.media_type,
      isCustom: false
    }));
    renderTrending();
  } catch (error) {
    console.error('Error fetching trending:', error);
  }
}

// Fetch latest movies
async function fetchLatestMovies() {
  try {
    const pagesToFetch = [1, 2];
    const allMoviePromises = pagesToFetch.map(page => 
      fetch(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`)
        .then(res => res.json())
    );
    
    const allResponses = await Promise.all(allMoviePromises);
    let allTmdbMovies = [];
    allResponses.forEach(response => {
      if (response.results) {
        allTmdbMovies = [...allTmdbMovies, ...response.results];
      }
    });
    
    movies = allTmdbMovies.map(movie => ({
      id: `movie_${movie.id}`,
      title: movie.title,
      genre: getGenreName(movie.genre_ids),
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
      image: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/300x450',
      backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : null,
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' official trailer')}`,
      description: movie.overview || 'No description available.',
      voteAverage: movie.vote_average,
      mediaType: 'movie',
      isCustom: false
    }));
    
    // Add custom movies
    const customMovieItems = customMovies.filter(c => c.type === 'movie');
    movies = [...movies, ...customMovieItems];
    
    renderMovies();
  } catch (error) {
    console.error('Error fetching movies:', error);
  }
}

// Fetch TV shows
async function fetchTVShows() {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    const data = await response.json();
    
    tvShows = data.results.map(show => ({
      id: `tv_${show.id}`,
      title: show.name,
      genre: getGenreName(show.genre_ids),
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A',
      image: show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : 'https://via.placeholder.com/300x450',
      backdrop: show.backdrop_path ? `${TMDB_IMAGE_BASE}${show.backdrop_path}` : null,
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent(show.name + ' trailer')}`,
      description: show.overview || 'No description available.',
      voteAverage: show.vote_average,
      mediaType: 'tv',
      isCustom: false
    }));
    
    // Add custom TV shows
    const customTVItems = customMovies.filter(c => c.type === 'tv');
    tvShows = [...tvShows, ...customTVItems];
    
    renderTVShows();
  } catch (error) {
    console.error('Error fetching TV shows:', error);
  }
}

// Fetch suggestions (recommendations based on popular)
async function fetchSuggestions() {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    const data = await response.json();
    
    suggestions = data.results.slice(0, 20).map(movie => ({
      id: `suggestion_${movie.id}`,
      title: movie.title,
      genre: getGenreName(movie.genre_ids),
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
      image: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/300x450',
      backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : null,
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`,
      description: movie.overview || 'No description available.',
      voteAverage: movie.vote_average,
      mediaType: 'movie',
      isCustom: false
    }));
    renderSuggestions();
  } catch (error) {
    console.error('Error fetching suggestions:', error);
  }
}

// Render functions
function renderTrending() {
  if (!trendingList) return;
  trendingList.innerHTML = trending.map(item => `
    <div class="movie-card" data-id="${item.id}" data-type="trending">
      <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
    </div>
  `).join('');
  attachCardClickListeners(trendingList, trending);
}

function renderMovies() {
  if (!movieList) return;
  const filtered = filterContent(movies);
  const sorted = sortContent(filtered);
  movieList.innerHTML = sorted.map(item => `
    <div class="movie-card" data-id="${item.id}" data-type="movie">
      <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
    </div>
  `).join('');
  attachCardClickListeners(movieList, sorted);
}

function renderTVShows() {
  if (!tvList) return;
  const filtered = filterContent(tvShows);
  const sorted = sortContent(filtered);
  tvList.innerHTML = sorted.map(item => `
    <div class="movie-card" data-id="${item.id}" data-type="tv">
      <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
    </div>
  `).join('');
  attachCardClickListeners(tvList, sorted);
}

function renderSuggestions() {
  if (!suggestionsList) return;
  suggestionsList.innerHTML = suggestions.map(item => `
    <div class="movie-card" data-id="${item.id}" data-type="suggestion">
      <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
    </div>
  `).join('');
  attachCardClickListeners(suggestionsList, suggestions);
}

// Filter content based on search and genre
function filterContent(contentArray) {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedGenre = genreFilter.value;
  const selectedCategory = categoryFilter.value;
  
  return contentArray.filter(item => {
    const matchesSearch = searchTerm === '' || item.title.toLowerCase().includes(searchTerm);
    const matchesGenre = selectedGenre === '' || item.genre === selectedGenre;
    const matchesCategory = selectedCategory === 'all' || item.mediaType === selectedCategory;
    return matchesSearch && matchesGenre && matchesCategory;
  });
}

// Sort content by year
function sortContent(contentArray) {
  const sortOrder = sortBy.value;
  if (sortOrder === 'asc') {
    return [...contentArray].sort((a, b) => a.year - b.year);
  } else if (sortOrder === 'desc') {
    return [...contentArray].sort((a, b) => b.year - a.year);
  }
  return contentArray;
}

// Filter and render based on current view
function filterAndRender() {
  if (currentView === 'trending') {
    const filtered = filterContent(trending);
    const sorted = sortContent(filtered);
    trendingList.innerHTML = sorted.map(item => `
      <div class="movie-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
      </div>
    `).join('');
    attachCardClickListeners(trendingList, sorted);
  } else if (currentView === 'movies') {
    renderMovies();
  } else if (currentView === 'tvshows') {
    renderTVShows();
  } else if (currentView === 'suggestions') {
    const filtered = filterContent(suggestions);
    const sorted = sortContent(filtered);
    suggestionsList.innerHTML = sorted.map(item => `
      <div class="movie-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
      </div>
    `).join('');
    attachCardClickListeners(suggestionsList, sorted);
  } else {
    renderMovies();
    renderTVShows();
    renderTrending();
    renderSuggestions();
  }
}

// Handle search
function handleSearch() {
  const query = searchInput.value.trim();
  if (query.length > 2) {
    searchAllContent(query);
  } else if (query.length === 0) {
    fetchAllData();
  } else {
    filterAndRender();
  }
}

// Search all content
async function searchAllContent(query) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
    const data = await response.json();
    
    const searchResults = data.results.filter(item => item.media_type !== 'person').slice(0, 30).map(item => ({
      id: `search_${item.media_type}_${item.id}`,
      title: item.title || item.name,
      genre: getGenreName(item.genre_ids),
      year: item.release_date ? new Date(item.release_date).getFullYear() : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A'),
      image: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : 'https://via.placeholder.com/300x450',
      backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE}${item.backdrop_path}` : null,
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent((item.title || item.name) + ' trailer')}`,
      description: item.overview || 'No description available.',
      voteAverage: item.vote_average,
      mediaType: item.media_type,
      isCustom: false
    }));
    
    // Show search results in movies section
    currentView = 'search';
    document.querySelectorAll('.movie-section').forEach(section => {
      section.style.display = 'none';
    });
    document.getElementById('movies').style.display = 'block';
    document.querySelector('#movies .section-title').textContent = `🔍 Search Results for "${query}"`;
    
    movieList.innerHTML = searchResults.map(item => `
      <div class="movie-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450'" />
      </div>
    `).join('');
    attachCardClickListeners(movieList, searchResults);
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Attach click listeners to cards
function attachCardClickListeners(container, items) {
  if (!container) return;
  const cards = container.querySelectorAll('.movie-card');
  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      openDetailsModal(items[index]);
    });
  });
}

// Fetch genres from TMDB
async function fetchGenres() {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`);
    const data = await response.json();
    allGenres = data.genres || [];
    
    // Populate genre filter
    genreFilter.innerHTML = '<option value="">All Genres</option>';
    allGenres.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre.name;
      option.textContent = genre.name;
      genreFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    allGenres = [];
  }
}

// Get genre name from ID
function getGenreName(genreIds) {
  if (!genreIds || !Array.isArray(genreIds)) return 'Unknown';
  const genreNames = genreIds.map(id => {
    const genre = allGenres.find(g => g.id === id);
    return genre ? genre.name : 'Unknown';
  });
  return genreNames.length ? genreNames.join(', ') : 'Unknown';
}

// Debounce helper
function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

// Theme toggling - FIXED
function toggleTheme() {
  const body = document.body;
  body.classList.toggle('dark-mode');
  
  const isDark = body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  
  // Update button icon
  const toggleBtn = document.getElementById('toggleDarkMode');
  if (toggleBtn) {
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
  }
  
  // Update navbar links color
  const navbarLinks = document.querySelectorAll('.navbar a');
  navbarLinks.forEach(link => {
    if (isDark) {
      link.style.color = '#e5e5e5';
    } else {
      link.style.color = '#333';
    }
  });
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('darkMode');
  const toggleBtn = document.getElementById('toggleDarkMode');
  
  if (savedTheme === 'true') {
    document.body.classList.add('dark-mode');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    if (toggleBtn) toggleBtn.textContent = '🌙';
  }
}

// Trailer modal
const trailerModal = document.getElementById('trailerModal');
const trailerFrame = document.getElementById('trailerFrame');
const trailerClose = document.querySelector('.close-btn');

function openTrailerModal(movie) {
  const searchQuery = `${movie.title} ${typeof movie.year === 'number' ? movie.year : ''} official trailer`;
  const modalContent = trailerModal.querySelector('.modal-content');
  modalContent.innerHTML = `
    <span class="close-btn">❌</span>
    <h3 style="color: #e50914; margin-bottom: 1rem;">🎬 ${movie.title} - Trailer</h3>
    <p>Watch the trailer on YouTube:</p>
    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}" target="_blank" style="color: #e50914; font-size: 1.1rem; display: inline-block; margin: 1rem 0; text-decoration: none; background: #333; padding: 0.5rem 1rem; border-radius: 4px;">▶ Watch on YouTube</a>
    <div style="margin-top: 1rem;">
      <iframe width="100%" height="300" src="https://www.youtube.com/embed?listType=search&q=${encodeURIComponent(searchQuery)}" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe>
    </div>
  `;
  trailerModal.style.display = 'flex';
  const newClose = trailerModal.querySelector('.close-btn');
  newClose.addEventListener('click', closeTrailerModal);
}

function closeTrailerModal() {
  trailerModal.style.display = 'none';
  const modalContent = trailerModal.querySelector('.modal-content');
  modalContent.innerHTML = `
    <span class="close-btn">❌</span>
    <iframe id="trailerFrame" width="100%" height="500" frameborder="0" allowfullscreen></iframe>
  `;
  if (lastFocusedElement) lastFocusedElement.focus();
}

if (trailerClose) trailerClose.addEventListener('click', closeTrailerModal);

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', handleContactForm);
}

function handleContactForm(e) {
  e.preventDefault();
  const msgBox = document.getElementById('formMessage');
  msgBox.textContent = 'Sending message...';
  msgBox.className = 'form-message';

  setTimeout(() => {
    msgBox.textContent = "Thank you for your message! We'll get back to you soon.";
    msgBox.className = 'form-message success';
    e.target.reset();
  }, 1000);
}

// Edit modal
const editModal = document.getElementById('editModal');
const editClose = document.querySelector('.close-edit-btn');
const editForm = document.getElementById('editForm');
const editTitle = document.getElementById('editTitle');
const editGenre = document.getElementById('editGenre');
const editYear = document.getElementById('editYear');
const editImage = document.getElementById('editImage');
const editTrailer = document.getElementById('editTrailer');
let currentEditId = null;

if (editClose) {
  editClose.addEventListener('click', () => {
    editModal.style.display = 'none';
    currentEditId = null;
  });
}

if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditId) return;

    const updated = {
      id: currentEditId,
      title: editTitle.value.trim(),
      genre: editGenre.value.trim(),
      year: parseInt(editYear.value, 10),
      image: editImage.value.trim() || 'https://via.placeholder.com/300x450',
      trailer: editTrailer.value.trim(),
      description: 'User added item',
      isCustom: true
    };

    const index = customMovies.findIndex(m => m.id === currentEditId);
    if (index !== -1) {
      customMovies[index] = updated;
      localStorage.setItem('customMovies', JSON.stringify(customMovies));
    }

    editModal.style.display = 'none';
    currentEditId = null;
    await fetchAllData();
  });
}

// Add Movie Modal
const addModal = document.getElementById('addModal');
const addForm = document.getElementById('addForm');
const addBtn = document.getElementById('addMovieBtn');
const addClose = document.querySelector('.close-add-btn');
const addTitle = document.getElementById('addTitle');
const addGenre = document.getElementById('addGenre');
const addYear = document.getElementById('addYear');
const addType = document.getElementById('addType');
const addImage = document.getElementById('addImage');
const addTrailer = document.getElementById('addTrailer');

if (addBtn) addBtn.addEventListener('click', () => addModal.style.display = 'flex');
if (addClose) addClose.addEventListener('click', () => {
  addModal.style.display = 'none';
  if (addForm) addForm.reset();
});

if (addForm) {
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newItem = {
      id: `custom_${Date.now()}`,
      title: addTitle.value.trim(),
      genre: addGenre.value.trim(),
      year: parseInt(addYear.value, 10),
      type: addType.value,
      image: addImage.value.trim() || 'https://via.placeholder.com/300x450',
      trailer: addTrailer.value.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(addTitle.value.trim() + ' trailer')}`,
      description: 'User added item',
      mediaType: addType.value,
      isCustom: true
    };

    customMovies.push(newItem);
    localStorage.setItem('customMovies', JSON.stringify(customMovies));

    addModal.style.display = 'none';
    addForm.reset();
    await fetchAllData();
  });
}

// Details modal
const detailsModal = document.getElementById('detailsModal');
const detailsContent = document.getElementById('detailsContent');
const detailsClose = document.getElementById('detailsCloseBtn');

function openDetailsModal(item) {
  const upvoteCount = upvoteCounts[item.id] || 0;
  const downvoteCount = downvoteCounts[item.id] || 0;
  
  detailsContent.innerHTML = `
    <div class="details-container">
      <div class="details-backdrop" style="background-image: url('${item.backdrop || item.image}')">
        <div class="details-overlay"></div>
      </div>
      <div class="details-content-wrapper">
        <div class="details-poster">
          <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/300x450'" />
        </div>
        <div class="details-info">
          <h2>${item.title} <span class="details-year">(${item.year})</span></h2>
          <p class="details-genre"><strong>Genre:</strong> ${item.genre}</p>
          <p class="details-type"><strong>Type:</strong> ${item.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show'}</p>
          ${item.voteAverage ? `<p class="details-rating"><strong>⭐ Rating:</strong> ${item.voteAverage}/10</p>` : ''}
          <p class="details-description"><strong>Description:</strong> ${item.description}</p>
          
          <div class="details-vote-buttons">
            <button class="upvote-btn details-upvote" data-id="${item.id}">👍 <span>${upvoteCount}</span></button>
            <button class="downvote-btn details-downvote" data-id="${item.id}">👎 <span>${downvoteCount}</span></button>
          </div>

          <div class="details-action-buttons">
            <button class="trailer-btn details-trailer">▶ Watch Trailer</button>
            ${item.isCustom ? `
              <button class="edit-btn details-edit" data-id="${item.id}">✏️ Edit</button>
              <button class="delete-btn details-delete" data-id="${item.id}">🗑️ Delete</button>
            ` : '<p class="tmdb-note">📽️ Data from TMDB</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
  
  detailsModal.style.display = 'flex';
  if (detailsClose) detailsClose.focus();
  
  // Vote button listeners
  const upvoteBtn = detailsContent.querySelector('.details-upvote');
  const downvoteBtn = detailsContent.querySelector('.details-downvote');
  
  if (upvoteBtn) {
    upvoteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      upvoteCounts[item.id] = (upvoteCounts[item.id] || 0) + 1;
      localStorage.setItem('upvoteCounts', JSON.stringify(upvoteCounts));
      upvoteBtn.querySelector('span').textContent = upvoteCounts[item.id];
    });
  }
  
  if (downvoteBtn) {
    downvoteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downvoteCounts[item.id] = (downvoteCounts[item.id] || 0) + 1;
      localStorage.setItem('downvoteCounts', JSON.stringify(downvoteCounts));
      downvoteBtn.querySelector('span').textContent = downvoteCounts[item.id];
    });
  }
  
  // Trailer button
  const trailerBtn = detailsContent.querySelector('.details-trailer');
  if (trailerBtn) {
    trailerBtn.addEventListener('click', () => {
      closeDetailsModal();
      openTrailerModal(item);
    });
  }
  
  // Edit button
  const editBtn = detailsContent.querySelector('.details-edit');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      currentEditId = item.id;
      editTitle.value = item.title;
      editGenre.value = item.genre;
      editYear.value = item.year;
      editImage.value = item.image;
      editTrailer.value = item.trailer;
      editModal.style.display = 'flex';
    });
  }
  
  // Delete button
  const deleteBtn = detailsContent.querySelector('.details-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this item?')) {
        const index = customMovies.findIndex(m => m.id === item.id);
        if (index !== -1) {
          customMovies.splice(index, 1);
          localStorage.setItem('customMovies', JSON.stringify(customMovies));
          await fetchAllData();
          closeDetailsModal();
        }
      }
    });
  }
}

function closeDetailsModal() {
  detailsModal.style.display = 'none';
}

if (detailsClose) detailsClose.addEventListener('click', closeDetailsModal);