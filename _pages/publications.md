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

<h2>Citations Over Time</h2>
<canvas id="citationsChart" width="200" height="200"></canvas> <!-- Adjusted size -->

<script>
  const ctx = document.getElementById('citationsChart').getContext('2d');

  const citationsData = {{ site.data.scholar_metrics.cites_per_year | jsonify }};
  const labels = Object.keys(citationsData);
  const data = Object.values(citationsData);

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
      scales: {
        y: {
          beginAtZero: true
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


