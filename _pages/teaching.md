---
layout: archive
permalink: /teaching/
title: "Teaching"
---

{% assign eval_data = site.data.teaching_evaluations_aggregated %}
{% assign top_items = eval_data.top_positive_teaching_items %}
{% assign question_aggregates = eval_data.question_aggregates %}

<div class="teaching-page">

<figure>
  <img src="/images/research/Anthropomorphic_Echo_web.jpg" alt="Anthropomorphic Echo by Salvador Dalí"/>
  <figcaption>Anthropomorphic Echo by Salvador Dalí</figcaption>
</figure>

<div class="teaching-intro">
  <p>I teach evolution because, as Theodosius Dobzhansky wrote, “Nothing in biology makes sense except in the light of evolution.” My goal is to help students think like evolutionary biologists, even if they do not pursue evolutionary science professionally.</p>
  <p>This approach emphasizes primary literature, writing-intensive assignments, discussion, and regular feedback. It aligns with four core dimensions of scientific literacy discussed by <a href="https://royalsocietypublishing.org/doi/full/10.1098/rspb.2022.1077">Brandt <em>et al.</em> (2022)</a>: content knowledge, procedural knowledge, epistemic knowledge, and application of knowledge.</p>
</div>

<div class="teaching-links">
  <a href="https://github.com/jakeberv/jakeberv.github.io/raw/master/files/pdf/teaching/teaching_philosophy.pdf">Teaching dossier</a>
  <a href="{{ '/cv/' | relative_url }}">CV</a>
  <a href="https://bit.ly/Berv_EARTH437_2021">Recorded teaching demo</a>
</div>

<section class="teaching-block">
  <p class="teaching-kicker">Teaching Profile</p>

  <div class="teaching-grid teaching-grid--profile">
    <article class="teaching-card">
      <h3>Focus Areas</h3>
      <ul>
        <li>Evolution</li>
        <li>Phylogenetics and comparative methods</li>
        <li>Macroevolution</li>
        <li>Quantitative biology</li>
      </ul>
    </article>

    <article class="teaching-card">
      <h3>Formats and Mentorship</h3>
      <ul>
        <li>Writing-intensive seminars, field courses, and invited guest lectures</li>
        <li>Mentorship: 8 undergraduate and 6 graduate advisees</li>
        <li>Integrated emphasis on critical reading, scientific writing, and discussion</li>
      </ul>
    </article>

    <article class="teaching-card">
      <h3>Pedagogy Training</h3>
      <ul>
        <li>Postdoctoral Short Course on College Teaching in Science and Engineering (UM CRLT)</li>
        <li>Teaching in STEM certificate training (UM)</li>
        <li>Writing in the Majors pedagogical training (Cornell Knight Institute)</li>
      </ul>
    </article>
  </div>
</section>

<section class="teaching-block">
  <article class="teaching-chart-card">
    <h2>Aggregated Rankings</h2>
    <p class="teaching-chart-help">
      Weighted mean instructor-performance scores (1-5), BIOEE 1780 (Fall 2013, 2014, 2015, 2018).
    </p>
    <div class="teaching-chart-wrap">
      <canvas id="teaching-aggregated-rankings" aria-label="Aggregated Rankings" role="img"></canvas>
    </div>
    <p id="teaching-aggregated-hint" class="teaching-chart-help"></p>
  </article>

  <noscript>
    <p><strong>Top aggregated items:</strong></p>
    <ul>
      {% for rank in top_items %}
        {% assign n_answered = "" %}
        {% for q in question_aggregates %}
          {% if q.question_id == rank.question_id %}
            {% assign n_answered = q.n_answered %}
          {% endif %}
        {% endfor %}
        <li>{{ rank.item }} — {{ rank.weighted_mean }} (n={{ n_answered }})</li>
      {% endfor %}
    </ul>
  </noscript>
</section>

<section class="teaching-block">
  <p class="teaching-kicker">Selected Experience</p>

  <div class="teaching-ledger">
    <article class="teaching-ledger-row">
      <h3>University of Michigan</h3>
      <ul>
        <li>EARTH 444 (Analytical Paleobiology): guest lectures in November 2023 and November 2025</li>
        <li>EARTH 437 (Vertebrate Paleontology): guest lecture in December 2021 — <a href="https://bit.ly/Berv_EARTH437_2021">recording</a></li>
        <li>Faculty invitations from <a href="https://lsa.umich.edu/earth/people/faculty/matt-friedman.html">Matt Friedman</a> and <a href="https://lsa.umich.edu/earth/people/faculty/wilsonja.html">Jeffrey Wilson Mantilla</a></li>
      </ul>
    </article>

    <article class="teaching-ledger-row">
      <h3>Cornell University</h3>
      <ul>
        <li>BIOEE 1780 <a href="https://knight.as.cornell.edu/writing-in-the-majors">Writing in the Majors</a> seminar (Fall 2013, 2014, 2015, 2018), including four 15-week sections designed and led independently</li>
        <li>BIOEE 2650 Tropical Field Ecology and Behavior (Kenya), Winter 2014</li>
        <li>BioEE 3730 guest lecture in phylogenetic systematics</li>
      </ul>
    </article>

    <article class="teaching-ledger-row teaching-ledger-row--midas">
      <h3>MIDAS GenAI Workshops</h3>
      <ul>
        <li><strong>MIDAS Generative AI Tutorial Series</strong> (University of Michigan): workshop leadership focused on practical, inclusive use of AI tools in academic settings</li>
        <li><strong>Visualizing and Presenting Data</strong> (May 2024, November 2024) — interactive workshop on data communication and visualization design (<a href="https://bit.ly/jb_midas_2024a">session link</a>)</li>
        <li><strong>Technology Meets Creativity</strong> (March 2024): AI-for-the-arts workshop designed to engage participants from varied disciplinary backgrounds</li>
      </ul>
    </article>
  </div>
</section>

<section class="teaching-block teaching-block--methods">
  <p class="teaching-kicker">Methods and Source</p>
  <p>
    Evaluation aggregates are parsed from the <a href="https://github.com/jakeberv/jakeberv.github.io/raw/master/files/pdf/teaching/teaching_philosophy.pdf">teaching dossier PDF</a> and stored in <code>_data/teaching_evaluations_aggregated.yml</code> (Q08-Q22 instructor-performance items; Q23-Q25 self-report tracked separately). Additional activities and recordings are listed in the <a href="{{ '/cv/' | relative_url }}">CV</a>.
  </p>
</section>

<script>
document.addEventListener("DOMContentLoaded", function () {
  var canvas = document.getElementById("teaching-aggregated-rankings");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  var topItems = {{ top_items | jsonify }};
  var questionRows = {{ question_aggregates | jsonify }};
  var overallTeachingMean = Number({{ eval_data.overall.teaching_questions.weighted_mean | jsonify }});
  var byQuestionId = {};
  questionRows.forEach(function (row) {
    byQuestionId[row.question_id] = row;
  });

  var shortLabelMap = {
    q16: "Conveys enthusiasm",
    q12: "Open classroom questions",
    q11: "Stimulates deeper thinking",
    q15: "Helps outside class",
    q08: "Knowledgeable in subject",
    q14: "Interest in student learning"
  };

  var rows = topItems.map(function (item) {
    var agg = byQuestionId[item.question_id] || {};
    return {
      label: shortLabelMap[item.question_id] || item.item,
      fullLabel: item.item,
      mean: Number(item.weighted_mean),
      n: Number(agg.n_answered || 0),
      noResponse: Number(agg.no_response || 0),
      pct45: Number(agg.pct_4_5 || 0)
    };
  });

  if (!rows.length) {
    return;
  }

  var hint = document.getElementById("teaching-aggregated-hint");
  var minN = rows.reduce(function (minValue, row) {
    return Math.min(minValue, row.n);
  }, Number.POSITIVE_INFINITY);
  var maxN = rows.reduce(function (maxValue, row) {
    return Math.max(maxValue, row.n);
  }, Number.NEGATIVE_INFINITY);
  var sampleSummary = minN === maxN ? ("n=" + maxN + " per item") : ("n range " + minN + "-" + maxN);
  if (hint) {
    if (isFinite(overallTeachingMean)) {
      hint.textContent = "Overall mean " + overallTeachingMean.toFixed(2) + "/5; " + sampleSummary + ".";
    } else {
      hint.textContent = sampleSummary + ".";
    }
  }

  var valueLabelPlugin = {
    id: "valueLabelPlugin",
    afterDatasetsDraw: function (chart) {
      var meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data) {
        return;
      }

      var ctx = chart.ctx;
      var rightEdge = chart.chartArea ? chart.chartArea.right : 0;
      ctx.save();
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillStyle = "#2f4f6e";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      meta.data.forEach(function (bar, index) {
        var label = rows[index].mean.toFixed(2);
        var x = Math.min(bar.x + 6, rightEdge + 6);
        ctx.fillText(label, x, bar.y);
      });

      ctx.restore();
    }
  };

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: rows.map(function (r) { return r.label; }),
      datasets: [{
        label: "Weighted mean (1-5)",
        data: rows.map(function (r) { return r.mean; }),
        backgroundColor: "rgba(57, 122, 180, 0.62)",
        borderColor: "rgba(40, 103, 178, 0.90)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: "start",
        barThickness: 21
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: {
        padding: { top: 2, right: 46, bottom: 0, left: 2 }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 0.5,
            font: {
              size: 11
            },
            callback: function (value) {
              var numeric = Number(value);
              return isFinite(numeric) ? numeric.toFixed(1) : "";
            }
          },
          title: {
            display: true,
            text: "Weighted mean score (1-5)"
          }
        },
        y: {
          ticks: {
            autoSkip: false,
            color: "#2e3f51",
            padding: 4,
            font: {
              size: 15,
              weight: 500
            }
          },
          grid: {
            color: "rgba(18, 36, 54, 0.10)",
            drawTicks: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(16, 33, 49, 0.95)",
          borderColor: "rgba(136, 163, 186, 0.48)",
          borderWidth: 1,
          cornerRadius: 7,
          bodySpacing: 2,
          callbacks: {
            title: function (items) {
              if (!items || items.length === 0) return "";
              return rows[items[0].dataIndex].fullLabel;
            },
            label: function (ctx) {
              var row = rows[ctx.dataIndex];
              return [
                "Weighted mean: " + ctx.raw.toFixed(2),
                "Sample size: n=" + row.n,
                "% 4-5 ratings: " + row.pct45.toFixed(2) + "%",
                "No response: " + row.noResponse
              ];
            }
          }
        }
      }
    },
    plugins: [valueLabelPlugin]
  });
});
</script>

</div>
