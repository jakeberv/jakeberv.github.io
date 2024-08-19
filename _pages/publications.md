---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---
<h2 style="margin-top: 0px;">Citations Over Time</h2>
<div id="chartWrapper" style="width: 80%; height: 250px; position: relative;">
  <canvas id="citationsChart"></canvas>
</div>

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
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
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

<canvas id="GeoBubbleChart"></canvas>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-chart-geo"></script>

<script>
fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
    .then(response => response.json())
    .then(countriesData => {
        const countries = ChartGeo.topojson.feature(countriesData, countriesData.objects.countries).features;
        const mapData = {{ site.data.map_data | jsonify }};
        initGeoBubbleChart(countries, mapData);
    });

function initGeoBubbleChart(countries, mapData) {
    const data = {
        labels: mapData.map(d => d.address),
        datasets: [{
            label: '',
            outline: countries,
            showOutline: true,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            data: mapData.map(d => ({
                longitude: d.lon,
                latitude: d.lat,
                value: d.publicationCount
            }))
        }]
    };
    const config = {
        type: 'bubbleMap',
        data: data,
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'point',
                    callbacks: {
                        label: function(context) {
                            const data = context.raw;
                            return `${data.address}: ${data.value} publications`;
                        }
                    }
                }
            },
            scales: {
                projection: {
                    axis: 'x',
                    projection: 'equalEarth'
                },
                size: {
                    display: false,
                    axis: 'x',
                    size: [1, 20]
                },
                radiusScale: {
                    display: false,
                    range: [1, 20],
                    property: 'value'
                }
            }
        }
    };
    const ctx = document.getElementById('GeoBubbleChart').getContext('2d');
    new Chart(ctx, config);
}
</script>



