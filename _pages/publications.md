---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
read_more: "enabled"
---

<div class="pubs-page">

<figure class="pub-covers">
  <a href="https://doi.org/10.1016/j.cub.2018.04.062" target="_blank" rel="noopener">
    <img src="/images/research/CurrBio.jpg" alt="Current Biology cover">
  </a>
  <a href="http://digitallibrary.amnh.org/handle/2246/7237" target="_blank" rel="noopener">
    <img src="/images/research/amnh_bulletin.jpg" alt="AMNH Bulletin cover">
  </a>
  <a href="https://doi.org/10.1093/sysbio/syx064" target="_blank" rel="noopener">
    <img src="/images/research/syst_biol.jpg" alt="Systematic Biology cover">
  </a>
  <a href="https://doi.org/10.1126/sciadv.adp0114" target="_blank" rel="noopener">
    <img src="/images/research/science_advances.jpg" alt="Science Advances cover">
  </a>
</figure>

{% capture _pubs_feed %}{{ '/feed/publications.xml' | relative_url }}{% endcapture %}
<link rel="alternate" type="application/atom+xml" title="Publications — {{ site.title }}" href="{{ _pubs_feed }}">

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

<hr>

<p>See CV for other publications.</p>

{% include publications-faq-jsonld.html %}

</div>
