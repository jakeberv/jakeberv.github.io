---
layout: about
permalink: /
title: "Jacob S. Berv"
excerpt: "Evolutionary and Systematic Biologist"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
header:
  og_image: "research/persistence_of_memory-research.jpg"
  overlay_image: "research/persistence_of_memory-about-header.jpg"
  overlay_filter: 0.35
---

<div class="about-page">

<strong>Jacob (Jake) Berv</strong> is an evolutionary biologist interested in building and deciphering the tree of life. His research integrates data from natural history, ecology, genomics, and paleontology—often through the application of novel computational tools—in order to understand the links between micro- and macroevolution.
{: .about-intro}

##  News

{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}

{% for item in news_items limit:10 %}
  <div class="about-news-item">
    <p class="about-news-item__titleline">
      <strong>{{ item.date | date: "%B %-d, %Y" }}</strong> — 
      <a class="about-news-item__link" href="{{ item.url | relative_url }}">
        {{ item.title }}
      </a>
    </p>
    <p class="about-news-item__excerpt">
      {{ item.excerpt }}
    </p>
  </div>
{% endfor %}

<p class="about-news-more">
  <a class="about-news-more__link" href="{{ '/news/' | relative_url }}">
    View all news →
  </a>
</p>

<br>

<small class="about-banner-note">
The banner shows a portion of Salvador Dalí’s <em>Persistence of Memory</em>. Art historian Dawn Adès described the melting clocks as “an unconscious symbol of the relativity of space and time.” In evolutionary biology, time is also relative — and, outside paleontology, rarely absolute. Dalí’s pruned olive tree, overtaken by time, echoes the challenge of reconstructing the tree of life. In the upper left is a nod to Charles Darwin’s note, “I think,” from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">sketch of a phylogenetic tree</a>.
</small>

</div>