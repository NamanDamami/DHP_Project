const charts = {};

function showSection(id) {
  const sections = document.querySelectorAll('.chart-section');
  sections.forEach(section => {
    if (section.id === `${id}-section`) {
      section.style.display = 'block';
      setTimeout(() => {
        section.classList.add('active');
        section.style.opacity = '1';
      }, 10);
    } else {
      section.style.opacity = '0';
      section.classList.remove('active');
      setTimeout(() => {
        section.style.display = 'none';
      }, 500); // Match transition duration
    }
  });
}


async function fetchChartData(url, canvasId, chartType = 'bar', label = 'Value') {
  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.error) throw new Error(json.error);

    const ctx = document.getElementById(canvasId).getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    charts[canvasId] = new Chart(ctx, {
      type: chartType,
      data: {
        labels: json.labels,
        datasets: [{
          label,
          data: json.data,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          title: { display: true, text: canvasId }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    createDownloadButton(canvasId, ctx);
  } catch (err) {
    console.error(`Error loading ${canvasId} from ${url}:`, err);
  }
}

function loadAllCharts() {
  const apiUrls = [
    { url: '/api/movie/year_distribution', canvasId: 'movieByYear' },
    { url: '/api/game/publisher_distribution', canvasId: 'gamePublishers' },
    { url: '/api/game/year_distribution', canvasId: 'gameByYear' },
  ];

  apiUrls.forEach(({ url, canvasId }) => fetchChartData(url, canvasId));

  fetchCombinedGenreDistribution();
  fetchAvgGenreRating();
}


// Average IMDb Rating per Genre
async function fetchGenreAvgRatingChart() {
  const response = await fetch("/api/movie/genre_avg_rating");
  const result = await response.json();

  const genres = result.genres;
  const counts = result.counts;
  const ratings = result.ratings;

  const data = {
    labels: genres,
    datasets: [
      {
        type: 'bar',
        label: 'Movie Count',
        data: counts,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        yAxisID: 'y-left'
      },
      {
        type: 'line',
        label: 'Average IMDb Rating',
        data: ratings,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.3)',
        fill: false,
        tension: 0.3,
        yAxisID: 'y-right'
      }
    ]
  };

  const config = {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top 25 Genres: Movie Count & Average IMDb Rating'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Genre'
          },
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 30
          }
        },
        'y-left': {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Number of Movies'
          },
          beginAtZero: true
        },
        'y-right': {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'Average IMDb Rating'
          },
          min: 0,
          max: 10,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  };

  new Chart(document.getElementById("movieratingyear"), config);
}

fetchGenreAvgRatingChart();


    
fetch("/api/anime/episode_type_distribution")
  .then(response => response.json())
  .then(data => {
    const ctx = document.getElementById("episodeTypeChart").getContext("2d");

    const backgroundColors = [
      "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
      "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"
    ];

    const datasets = data.datasets.map((ds, index) => {
      const isLine = ds.type === "line";
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: isLine ? "rgba(0,0,0,0)" : backgroundColors[index % backgroundColors.length],
        borderColor: isLine ? "#000" : undefined,
        borderWidth: isLine ? 2 : undefined,
        type: isLine ? "line" : "bar",
        yAxisID: ds.yAxisID,
        fill: isLine ? false : true,
        tension: isLine ? 0.3 : undefined,
        pointRadius: isLine ? 4 : 0
      };
    });

    new Chart(ctx, {
      data: {
        labels: data.bins,
        datasets: datasets
      },
      options: {
        responsive: true,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          title: {
            display: true,
            text: "Anime Episode Count Distribution by Type",
            font: {
              size: 18
            }
          },
          tooltip: {
            mode: "index",
            intersect: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Episode Count Ranges"
            },
            stacked: true
          },
          "left-y": {
            position: "left",
            title: {
              display: true,
              text: "Number of Titles by Type"
            },
            stacked: true,
            beginAtZero: true
          },
          "right-y": {
            position: "right",
            title: {
              display: true,
              text: "Total Titles per Range"
            },
            beginAtZero: true,
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  });



fetch("/api/anime/genre_type_distribution")
  .then((res) => res.json())
  .then((data) => {
    const ctx = document.getElementById("animeGenre").getContext("2d");

    const typeColors = [
      "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
      "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ab"
    ];

    const datasets = data.datasets.map((ds, index) => {
      // Keep Total Titles line black
      if (ds.label === "Total Titles") {
        return {
          ...ds,
          borderColor: "black",
          backgroundColor: "black",
          pointBackgroundColor: "black",
          borderWidth: 2
        };
      }

      // Assign a color from the palette
      return {
        ...ds,
        backgroundColor: typeColors[index % typeColors.length],
        borderColor: typeColors[index % typeColors.length],
        borderWidth: 1
      };
    });

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.genres,
        datasets: datasets
      },
      options: {
        responsive: true,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          "left-y": {
            position: "left",
            stacked: true,
            title: {
              display: true,
              text: "Type (TV, Movie, OVA, etc.)"
            }
          },
          "right-y": {
            position: "right",
            stacked: false,
            title: {
              display: true,
              text: "Total Titles per Genre"
            },
            grid: {
              drawOnChartArea: false
            }
          },
          x: {
            title: {
              display: true,
              text: "Top 25 Genres"
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: "Anime Genre-Type Trend"
          },
          legend: {
            position: "top"
          }
        }
      }
    });
  });

// Anime Ratings Chart
fetch('/api/anime/top25_genre_ratings')
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    return response.json();
  })
  .then(data => {
    console.log("Received data:", data); // Log data for debugging

    // Ensure the data contains the expected properties
    if (!data.genres || !data.ratings || !data.counts) {
      console.error("Invalid data structure:", data);
      return;
    }

    const ctx = document.getElementById('animeRatingsChart').getContext('2d');

    // Destroy existing chart if it exists
    if (charts['animeRatingsChart']) charts['animeRatingsChart'].destroy();

    // Create the chart
    charts['animeRatingsChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.genres, // X-axis shows genres
        datasets: [
          {
            label: 'Average Rating',
            data: data.ratings, // Average ratings data
            backgroundColor: 'rgba(123, 104, 238, 0.6)',
            borderColor: 'rgba(123, 104, 238, 1)',
            borderWidth: 1,
            yAxisID: 'y-rating' // Left y-axis
          },
          {
            label: 'Number of Titles',
            data: data.counts, // Number of titles per genre
            type: 'line', // Line chart for count
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            yAxisID: 'y-count', // Right y-axis
            fill: false,
            tension: 0.3 // Smooth line curve
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 25 Anime Genres by Rating and Their Total Title'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          },
          legend: {
            position: 'top'
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            title: { display: true, text: 'Genre' },
            ticks: {
              autoSkip: true,
              maxRotation: 45,
              minRotation: 45
            }
          },
          'y-rating': {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            max: 10,
            title: { display: true, text: 'Average Rating' }
          },
          'y-count': {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Number of Titles' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });

    // Create download button (assuming a function exists to handle this)
    createDownloadButton('animeRatingsChart', ctx);
  })
  .catch(error => {
    console.error("Error loading anime genre data:", error);
  });


// Game Genre Trend
fetch('/api/game/genre_trend')
  .then(response => response.json())
  .then(data => {
    const ctx = document.getElementById('gamecharttrend').getContext('2d');

    const colors = [
      "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
      "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe"
    ];

    const datasets = data.genres.map((genre, index) => ({
      label: genre,
      data: data.data[index],
      borderColor: colors[index % colors.length],
      fill: false,
      tension: 0.2
    }));

    charts['gamecharttrend'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.years,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Game Genre Popularity Over Time',
            font: { size: 18 }
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          x: { title: { display: true, text: 'Year' } },
          y: { title: { display: true, text: 'Number of Games Released' } }
        }
      }
    });

    createDownloadButton('gamecharttrend', ctx);
  })
  .catch(error => console.error("Error loading genre trend data:", error));

// Game Platform Sales
fetch('/api/game/platform_sales_trend')
  .then(response => response.json())
  .then(data => {
    const ctx = document.getElementById('gamePlatformsales').getContext('2d');

    const colors = [
      "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0",
      "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8",
      "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080", "#ffffff",
      "#000000", "#c0c0c0", "#ff4500", "#00ced1"
    ];

    const datasets = data.platforms.map((platform, index) => ({
      label: platform,
      data: data.data[index],
      borderColor: colors[index % colors.length],
      fill: false,
      tension: 0.1
    }));

    charts['gamePlatformsales'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.years,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Game Platform Sales Trend (Per Year)',
            font: { size: 18 }
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          x: { title: { display: true, text: 'Year' } },
          y: { title: { display: true, text: 'Global Sales (Millions)' } }
        }
      }
    });

    createDownloadButton('gamePlatformsales', ctx);
  })
  .catch(error => console.error("Error fetching data:", error));

function fetchCombinedGenreDistribution() {
  fetch("/api/combined/genre_distribution")
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);

      const ctx = document.getElementById("combinedGenreDistribution").getContext("2d");
      if (charts["combinedGenreDistribution"]) charts["combinedGenreDistribution"].destroy();

      charts["combinedGenreDistribution"] = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.labels,
          datasets: [
            { label: "Anime", data: data.anime_data, backgroundColor: "rgba(255, 99, 132, 0.6)" },
            { label: "Movies", data: data.movie_data, backgroundColor: "rgba(54, 162, 235, 0.6)" },
            { label: "Games", data: data.game_data, backgroundColor: "rgba(75, 192, 192, 0.6)" }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top" },
            title: { display: true, text: "Genre Distribution (All)" },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: { stacked: false, title: { display: true, text: "Genres" } },
            y: { beginAtZero: true, title: { display: true, text: "Count" } }
          }
        }
      });

      createDownloadButton('combinedGenreDistribution', ctx);
    })
    .catch(err => console.error("Failed to load genre distribution:", err));
}

function fetchAvgGenreRating() {
  fetch('/api/combined/avg_rating_by_genre')
    .then(res => res.json())
    .then(json => {
      const ctx = document.getElementById('avgGenreRating').getContext('2d');
      if (charts['avgGenreRating']) charts['avgGenreRating'].destroy();

      charts['avgGenreRating'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: json.labels,
          datasets: [
            { label: 'Anime', data: json.anime_data, backgroundColor: 'rgba(255, 99, 132, 0.6)' },
            { label: 'Movie', data: json.movie_data, backgroundColor: 'rgba(54, 162, 235, 0.6)' }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Average Ratings by Genre (Anime vs Movie)' }
          },
          scales: { y: { beginAtZero: true, max: 10 } }
        }
      });

      createDownloadButton('avgGenreRating', ctx);
    })
    .catch(error => console.error('Error loading avg ratings by genre:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle
  const themeToggleIcon = document.querySelector('.theme-toggle i');
  themeToggleIcon?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggleIcon.classList.toggle('fa-moon');
    themeToggleIcon.classList.toggle('fa-sun');
  });

  // FAB Menu Toggle
  document.getElementById('fab-button')?.addEventListener('click', () => {
    document.querySelector('.fab-menu')?.classList.toggle('active');
  });

  // Scroll to Top Button
  const scrollTopBtn = document.getElementById('scroll-to-top');
  window.addEventListener('scroll', () => {
    scrollTopBtn?.classList.toggle('visible', window.scrollY > 300);
  });
  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Category Navigation
  document.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', () => {
      const category = el.getAttribute('data-category');
      showSection(category);

      document.querySelectorAll('.desktop-nav a, .mobile-category-nav button, .fab-item')
        .forEach(item => item.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // Chart Toggle Collapse
  document.querySelectorAll('.toggle-chart-btn').forEach(button => {
    button.addEventListener('click', () => {
      const chartBody = button.closest('.chart-container')?.querySelector('.chart-body');
      chartBody?.classList.toggle('collapsed');
      const icon = button.querySelector('i');
      icon?.classList.toggle('fa-chevron-down');
      icon?.classList.toggle('fa-chevron-up');
    });
  });

  // Default Section & Load Charts
  showSection('anime');
  loadAllCharts();
});

// Genre Popularity Over Time Trend

fetch("/api/movie/genre-trend")
  .then(response => response.json())
  .then(data => {
    const ctx = document.getElementById("multiGenreTrendChart").getContext("2d");

    // Compute top 10-15 genres based on total count
    const genreCounts = Object.entries(data).map(([genre, values]) => ({
      genre,
      total: values.counts.reduce((sum, val) => sum + val, 0)
    }));

    const topGenres = genreCounts
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map(entry => entry.genre);

    const allYears = Array.from(
      new Set(
        topGenres.flatMap(genre => data[genre].years)
      )
    ).sort((a, b) => a - b);

    const colors = [
      "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
      "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe"
    ];

    // Prepare combined datasets: count lines (solid) + rating lines (dashed)
    const datasets = [];

    topGenres.forEach((genre, index) => {
      const genreData = data[genre];
      const yearToCount = Object.fromEntries(genreData.years.map((y, i) => [y, genreData.counts[i]]));
      const yearToRating = Object.fromEntries(genreData.years.map((y, i) => [y, genreData.ratings[i]]));

      // Count line (left y-axis)
      datasets.push({
        label: `${genre} - Count`,
        data: allYears.map(y => yearToCount[y] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length],
        yAxisID: 'y',
        fill: false,
        tension: 0.3,
        pointRadius: 2
      });

      // Rating line (right y-axis, dashed)
      datasets.push({
        label: `${genre} - Rating`,
        data: allYears.map(y => yearToRating[y] || null),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length],
        borderDash: [5, 5],
        yAxisID: 'y1',
        fill: false,
        tension: 0.3,
        pointRadius: 2
      });
    });

    // Create chart
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: allYears,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Movies Genre Popularity Over Time (Count & Rating)',
            font: { size: 20 }
          },
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Year'
            }
          },
          y: {
            position: 'left',
            title: {
              display: true,
              text: 'Number of Titles'
            },
            beginAtZero: true
          },
          y1: {
            position: 'right',
            title: {
              display: true,
              text: 'Average IMDb Rating'
            },
            min: 0,
            max: 10,
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  })
  .catch(error => console.error("Error loading genre trend data:", error));


async function fetchAndRenderChart() {
  try {
    const response = await fetch('/api/combined/titles_by_year');
    const data = await response.json();

    const ctx = document.getElementById('combinedTitlesYear').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Movies',
            data: data.movies,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Games',
            data: data.games,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            stacked: false,
            title: {
              display: true,
              text: 'Year'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Titles'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Number of Movies and Games Released per Year'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
  }
}
fetchAndRenderChart();

async function drawHistogram() {
  try {
    const res = await fetch('/api/combined/rating_distribution');
    const data = await res.json();

    const ctx = document.getElementById('combinedAvgRating').getContext('2d');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Anime',
            data: data.anime,
            backgroundColor: 'rgba(153, 102, 255, 0.7)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          },
          {
            label: 'Movie',
            data: data.movie,
            backgroundColor: 'rgba(255, 159, 64, 0.7)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Rating Range'
            },
            stacked: false
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Titles'
            },
            stacked: false
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Distribution of Ratings for Anime and Movies'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching or rendering histogram:', error);
  }
}

// Call the function to render the chart
drawHistogram();
