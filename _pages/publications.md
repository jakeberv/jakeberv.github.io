---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
read_more: "enabled"
---

<style>
/* === Anchor offset for sticky header === */
.pub-year { 
  scroll-margin-top: 96px; 
}
.pub-year:target::before {
  content: "";
  display: block;
  height: 96px;
  margin-top: -96px;
}

/* Jump nav + year headings */
.pubs-jump { margin: .5rem 0 1rem 0; font-size: .95em; }
.pubs-jump a { text-decoration: none; margin-right: .6em; }

/* Year headings */
.pub-year {
  margin: 1.1rem 0 .55rem 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: .25rem;
  font-weight: 600;
}

/* List spacing */
.pub-list { list-style: none; margin: 0 0 1rem 0; padding: 0; }
.pub-list > li { margin: 0 0 .6rem 0; }

/* Publication item formatting */
.archive__item { gap: .9rem; }
.archive__item-details { flex-grow: 1; width: auto; }

.archive__item-title {
  margin-bottom: .12rem;
  line-height: 1.25;
  font-weight: 600;
}
.archive__item-title a { text-decoration: none; }
.archive__item-title a:hover { text-decoration: underline; }

.archive__item-details p {
  margin: .15rem 0 .25rem 0;
  font-size: .95em;
  color: #555;
  line-height: 1.45;
}

/* Icons */
.archive__item-details a .fa,
.archive__item-details a .fas,
.archive__item-details a .fab {
  opacity: .8;
  transform: translateY(0);
  transition: opacity .12s ease, transform .12s ease;
}
.archive__item-details a:hover .fa,
.archive__item-details a:hover .fas,
.archive__item-details a:hover .fab {
  opacity: 1;
  transform: translateY(-1px);
}

/* Altmetric column */
.archive__item-altmetric { width: 15%; min-width: 140px; }
@media (max-width: 860px) {
  .archive__item { flex-direction: column; align-items: flex-start; }
  .archive__item-altmetric { width: 100%; padding-left: 0; margin: .35rem 0 0 0; }
}

/* Cover image row */
figure[style*="display: flex"] { gap: 1rem; flex-wrap: wrap; }
figure[style*="display: flex"] img { max-height: 240px; height: auto; }
@media (max-width: 720px) {
  figure[style*="display: flex"] { justify-content: center; }
}
</style>

<figure style="max-width: 100%; display: flex; justify-content: space-between; align-items: center;">
  <a href="https://doi.org/10.1016/j.cub.2018.04.062" target="_blank" style="flex: 1; display: flex; justify-content: center;" rel="noopener">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/CurrBio.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Current Biology cover">
  </a>
  <a href="http://digitallibrary.amnh.org/handle/2246/7237" target="_blank" style="flex: 1; display: flex; justify-content: center;" rel="noopener">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/amnh_bulletin.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="AMNH Bulletin cover">
  </a>
  <a href="https://doi.org/10.1093/sysbio/syx064" target="_blank" style="flex: 1; display: flex; justify-content: center;" rel="noopener">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/syst_biol.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Systematic Biology cover">
  </a>
  <a href="https://doi.org/10.1126/sciadv.adp0114" target="_blank" style="flex: 1; display: flex; justify-content: center;" rel="noopener">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/science_advances.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Science Advances cover">
  </a>
</figure>

{% if author.googlescholar %}
<p>You can also find my articles on <a href="{{ author.googlescholar }}" target="_blank" rel="noopener">my Google Scholar profile</a>.</p>
{% endif %}

{% include base_path %}

{% assign pubs = site.publications | where_exp: "p","p.date" | sort: "date" | reverse %}
{% assign groups = pubs | group_by_exp: "p", "p.date | date: '%Y'" %}

{% if groups.size > 0 %}
<p class="pubs-jump">Jump to:
{% for y in groups %}<a href="#y{{ y.name }}">{{ y.name }}</a>{% endfor %}
</p>
{% endif %}

{% for y in groups %}
<h3 id="y{{ y.name }}" class="pub-year">{{ y.name }}</h3>
<ul class="pub-list">
{% for post in y.items %}
  <li>{% include archive-single-pubs.html %}</li>
{% endfor %}
</ul>
{% endfor %}

---

See CV for other publications