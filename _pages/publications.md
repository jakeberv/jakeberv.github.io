---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---

<h1 style="margin-top: 10px; margin-bottom: 20px;">Impact</h1>

<h2 style="margin-top: 10px; margin-bottom: 20px;text-align: center;">Citation Geography</h2>
<figure style="width: 90%; margin: auto; position: relative;">
    <div id="geochartWrapper" style="width: 100%; height: auto; position: relative;">
        <canvas id="GeoBubbleChart"></canvas>
    </div>
    <figcaption style="text-align: left; margin-top: 2px;">This graphic uses Chart.js Geo to display the geographic distribution of authors who have cited my publications, based on a sample of verified records from Web of Science (08/19/24).</figcaption>
</figure>

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
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            outlineBackgroundColor: '#f0f0f0',
            data: mapData.map(d => ({
                x: d.lon,
                y: d.lat,
                r: Math.sqrt(d.publicationCount) * 2,
                value: d.publicationCount,
                address: d.address
            })),
            hoverBackgroundColor: 'rgba(0, 133, 183, 0.75)',
            hoverRadius: (context) => {
                return context.raw.r * 1.5;
            }
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
                    axis: 'x',
                    size: [1, 20],
                    display: false
                }
            }
        }
    };
    const ctx = document.getElementById('GeoBubbleChart').getContext('2d');
    new Chart(ctx, config);
}
</script>

<br>

<h2 style="margin-top: 10px; margin-bottom: 20px; text-align: center;">Citations Over Time</h2>
<figure id="citationsFigure" style="width: 40%; margin: auto; position: relative;">
    <div id="chartWrapper" style="width: 100%; height: 250px; position: relative;">
        <canvas id="citationsChart"></canvas>
    </div>
    <figcaption style="text-align: left; margin-top: 2px; width: 100%;">This graphic uses Chart.js to display the number of citations of my publications over time, based on all records from Google Scholar</figcaption>
</figure>

<style>
  /* Media query for mobile devices */
  @media (max-width: 768px) {
    #citationsFigure {
      width: 100%;
    }
  }
</style>

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
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(0, 133, 183, 0.75)',
        hoverBorderColor: 'rgba(0, 133, 183, 1)',
        hoverBorderWidth: 2
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


<br>

<h1 style="margin-top: 10px; margin-bottom: 20px;">Publications</h1>
{% if author.googlescholar %} You can also find my articles on <u><a href="{{author.googlescholar}}">my Google Scholar profile</a>.</u> {% endif %}

{% include base_path %}

{% for post in site.publications reversed %} {% include archive-single-pubs.html %} {% endfor %}

---

See CV for other publications



