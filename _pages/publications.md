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


<!-- Chart Container to center the canvas element and give it a flexible but controlled environment -->
<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
  <canvas id="citationsChart"></canvas>
</div>

<!-- Chart Initialization Script -->
<script>
  // Getting the context of the canvas where the chart will be drawn
  const ctx = document.getElementById('citationsChart').getContext('2d');

  // Assuming dynamic data is loaded correctly from your site's data files
  const citationsData = {{ site.data.scholar_metrics.cites_per_year | jsonify }};
  const labels = Object.keys(citationsData);
  const data = Object.values(citationsData);

  // Initializing the chart with your data
  const citationsChart = new Chart(ctx, {
    type: 'bar',  // Chart type is set to 'bar'
    data: {
      labels: labels,  // Labels are the years
      datasets: [{
        label: 'Citations per Year',  // Label for the data set
        data: data,  // Array of data points
        backgroundColor: 'rgba(75, 192, 192, 0.2)',  // Background color of bars
        borderColor: 'rgba(75, 192, 192, 1)',  // Border color of bars
        borderWidth: 1  // Width of the border around bars
      }]
    },
    options: {
      responsive: true,  // Chart is responsive to the size of its container
      maintainAspectRatio: false,  // Chart does not maintain the aspect ratio
      scales: {
        y: {  // Configuration for the y-axis
          beginAtZero: true  // Ensures the y-axis starts from zero
        }
      }
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


