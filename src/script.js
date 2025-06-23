const movieList = document.getElementById('movieList');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const toggleDarkMode = document.getElementById('toggleDarkMode');

let movies = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchMovies();
  searchInput.addEventListener('input', renderMovies);
  genreFilter.addEventListener('change', renderMovies);
  toggleDarkMode.addEventListener('click', toggleTheme);
});

function fetchMovies() {
  fetch('http://localhost:3000/movies') // or replace with public API
    .then(response => response.json())
    .then(data => {
      movies = data;
      populateGenres(data);
      renderMovies();
    })
    .catch(error => console.error('Fetch error:', error));
}

function populateGenres(data) {
  const genres = [...new Set(data.map(movie => movie.genre))];
  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });
}

function renderMovies() {
  console.log("Search Term:", searchInput.value);

  const searchTerm = searchInput.value.toLowerCase();
  const selectedGenre = genreFilter.value;

  const filteredMovies = movies.filter(movie => {
    const matchTitle = movie.title.toLowerCase().includes(searchTerm);
    const matchGenre = selectedGenre ? movie.genre === selectedGenre : true;
    return matchTitle && matchGenre;
  });

  movieList.innerHTML = filteredMovies.map(movie => `
    <div class="movie-card">
    <img src="${movie.image}" alt="${movie.title} Poster" class="movie-poster" />
      <h3>${movie.title}</h3>
      <p><strong>Genre:</strong> ${movie.genre}</p>
      <p><strong>Year:</strong> ${movie.year}</p>
    </div>
  `).join('');
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  toggleDarkMode.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
