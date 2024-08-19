---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---
<br>
<figure style="max-width: 100%;">
  <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/publication_headers.png" alt="Journal cover images from my research"/>
  <figcaption>  </figcaption>
</figure>

<figure style="max-width: 50%;">
  <a href="https://doi.org/10.1126/sciadv.adp0114">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/sciadv.2024.10.issue-31.largecover.jpg" alt="July 31 2024 cover for Science Advances"/>
  </a>
  <figcaption> Journal cover images (articles below) </figcaption>
</figure>

<style>
  #chartWrapper {
    width: 400px;  /* Desired width set in pixels */
    height: 200px; /* Desired height set in pixels */
    position: relative;
  }
</style>

<h2>Citations Over Time</h2>
<div id="chartWrapper">
  <canvas id="citationsChart"></canvas>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded: DOM fully loaded and parsed.");

    const canvas = document.getElementById('citationsChart');
    if (!canvas) {
      console.error("Canvas element not found!");
      return;
    } else {
      console.log("Canvas element found.");
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Failed to get canvas context!");
      return;
    } else {
      console.log("Canvas context acquired.");
    }

    console.log("Attempting to fetch and parse chart data...");
    // Simulate the data since the actual template processing needs to run server-side with Jekyll
    const citationsData = { "2018": 50, "2019": 75, "2020": 100, "2021": 125 };  // Replace with actual data fetching logic
    console.log("Data fetched:", citationsData);

    const labels = Object.keys(citationsData);
    const data = Object.values(citationsData);
    console.log("Data labels:", labels);
    console.log("Data values:", data);

    try {
      const citationsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Citations per Year',
            data: data,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      console.log("Chart initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize the chart:", e);
    }
  });
</script>



{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single-pubs.html %} {% endfor %}

---

See CV for other publications

## Citation Map

<figure style="max-width: 100%;">
  <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/citation_map_3_19_23.png" alt="Citation Map"/>
  <figcaption> For each article in the Web of Science Core Collection that cited the researcher's work, a city with a contributing author's institution represents a data point </figcaption>
</figure>


