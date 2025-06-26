# 🎬 Movie Browser SPA

A responsive, single-page Movie Browser application built with **HTML, CSS, and JavaScript**. Users can explore a list of movies fetched from a local API (`json-server`), search by title, filter by genre, and toggle between light and dark mode — all without any page reloads.

---
## Demo
![2025-06-26](https://github.com/user-attachments/assets/88dc40d2-6607-46f6-9b48-83558948632d)

---
## 📌 Features

-  View a list of movies (fetched from local JSON API)
-  Search movies by title
-  Filter movies by genre
-  Toggle dark mode
-  Asynchronous data fetching
-  Clean, modular JavaScript code following DRY principles
-  Built as a **Single Page Application** (SPA) with **no reloads or redirects**

---
## 🛠️ Tech Stack

- **HTML** — structure and layout
- **CSS** — styling and dark mode toggle
- **JavaScript (ES6+)** — interactivity and data logic
- **json-server** — mock API server for local movie data

 ---
 
## 📂 Project Structure

```
movie-browser/
├── readme.md         # This file
├── index.html        # SPA layout
├── css/
│   └── style.css     # Styles for light and dark mode
├── src/
│   └── script.js     # Main JavaScript logic
└── db.json           # Local movie data served by json-server
 
```
---

## 🗃️ Data Source
- The app fetches data from a local JSON-server that returns a collection of movie objects. Each movie object has at least three attributes:
```
json
{
  "id": 1,
  "title": "Inception",
  "genre": "Sci-Fi",
  "year": 2010
}
```
- You can customize the db.json to include your own movie entries or more data.

  ---
  
## 🚀 Getting Started
1. Clone this repository:


```
git clone https://github.com/your-username/movie-browser.git
cd movie-browser
```
2. Install json-server globally (if you haven't already):

```
npm install -g json-server
```
3. Start the server:

```
json-server --watch db.json
```
4. Open index.html in your browser.

---
## 🧪 Events Implemented
| Event Type | Description              | Element            |
| ---------- | ------------------------ | ------------------ |
| `click`    | Toggle light/dark mode   | Mode toggle button |
| `input`    | Live search              | Search input field |
| `change`   | Filter by selected genre | Genre dropdown     |


---

## 🧠 JavaScript Concepts Used
- DOM manipulation

- Event handling

- Array methods (filter, forEach)

- Asynchronous operations with fetch()

- Conditional rendering

- Modular, reusable functions

---

## ✍️ Author
**Jeremy Marube**
---
