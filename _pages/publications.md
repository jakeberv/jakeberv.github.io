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
  #citationsChartWrapper {
    display: inline-block; /* or block depending on your layout */
    position: relative;
    width: 400px; /* Fixed width */
    height: 200px; /* Fixed height */
  }
</style>

<h2>Citations Over Time</h2>
<div id="citationsChartWrapper">
  <canvas id="citationsChart"></canvas>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('citationsChart').getContext('2d');

    // Ensure that 'citationsData' is correctly prepared and jsonified from Jekyll's data
    // Replace 'site.data.scholar_metrics.cites_per_year' with your actual data path
    // The '{{ }}' syntax is specific to Jekyll/Liquid templates, make sure it's processed server-side
    const citationsData = {{ site.data.scholar_metrics.cites_per_year | jsonify }};
    
    // Ensuring labels and data are fetched properly from the citationsData
    const labels = Object.keys(citationsData);
    const data = Object.values(citationsData);

    // Create the chart
    const citationsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels, // Year labels from your data
        datasets: [{
          label: 'Citations per Year', // Dataset label
          data: data, // Corresponding data for each year
          backgroundColor: 'rgba(75, 192, 192, 0.2)', // Color of the bars
          borderColor: 'rgba(75, 192, 192, 1)', // Border color of the bars
          borderWidth: 1 // Border width
        }]
      },
      options: {
        responsive: true, // Makes the chart responsive
        maintainAspectRatio: false, // Adjusts the chart size to the container
        scales: {
          y: {
            beginAtZero: true // Starts the scale at zero
          }
        }
      }
    });
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


