---
layout: about
permalink: /
title: "Jacob S. Berv"
excerpt: "Evolutionary and Systematic Biologist"
#title: "Jacob S. Berv, PhD"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
header:
  og_image: "research/persistence_of_memory-research.jpg"
  #image: "research/persistence_of_memory-about-header.jpg"
  overlay_image: "research/persistence_of_memory-about-header.jpg"
  overlay_filter: 0.35 # same as adding an opacity of 0.5 to a black background
  #caption: "**Salvador Dalí**"
  #actions:
  #  - label: "Download"
  #    url: "https://github.com"
---

# Welcome

I am an evolutionary biologist interested in building and deciphering the tree of life. My research integrates data from natural history, ecology, genomics, and paleontology—often through the application of novel computational tools—in order to understand the links between micro- and macroevolution.

I am currently supported by an [Eric and Wendy Schmidt AI in Science Postdoctoral Fellowship](https://midas.umich.edu/news/michigan-institute-for-data-science-announces-new-fellows/) at the University of Michigan.

## News
<style>
  /* Page-local styles for the news list on About */
  .about-news {
    list-style: none;
    margin: 0.25rem 0 0.75rem 0;
    padding: 0;
  }
  .about-news li {
    margin: 0;                       /* tighten */
    padding: 0.35rem 0;              /* subtle breathing room */
    border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.08));
  }
  .about-news li:last-child { border-bottom: 0; }

  .about-news .news-line {
    margin: 0;
    line-height: 1.35;
  }
  .about-news .news-date {
    color: var(--color-muted, #6b7280);   /* muted */
    font-size: 0.9em;
    white-space: nowrap;
  }
  .about-news a.news-title {
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .about-news a.news-title:hover { border-bottom-color: currentColor; }

  .about-news .news-excerpt {
    margin: 0.15rem 0 0 0;           /* small gap under title line */
    font-size: 0.92em;               /* lighter visual weight */
    color: var(--color-muted, #6b7280);
  }

  /* Dark-mode friendly defaults if your theme doesn't set CSS vars */
  @media (prefers-color-scheme: dark) {
    .about-news li { border-bottom-color: rgba(255,255,255,0.12); }
    .about-news .news-date,
    .about-news .news-excerpt { color: rgba(255,255,255,0.7); }
  }
</style>

{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}

<ul class="about-news">
{% for item in news_items limit:10 %}
  <li>
    <p class="news-line">
      <span class="news-date">{{ item.date | date: "%b %-d, %Y" }}</span>
      &nbsp;—&nbsp;
      <a class="news-title" href="{{ item.url | relative_url }}">{{ item.title }}</a>
    </p>
    {% if item.excerpt %}
    <p class="news-excerpt">{{ item.excerpt }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>

<p style="margin-top: 0.8em;">
  <a href="{{ '/news/' | relative_url }}" style="font-weight: 600; text-decoration: none;">
    View all news →
  </a>
</p>

<br>

<small style="line-height: 1 !important; display: block; margin: 0;">
The banner shows a portion of Salvador Dalí’s <em>Persistence of Memory</em>. Art historian Dawn Adès described the melting clocks as “an unconscious symbol of the relativity of space and time.” In evolutionary biology, time is also relative — and, outside paleontology, rarely absolute. Dalí’s pruned olive tree, overtaken by time, echoes the challenge of reconstructing the tree of life. In the upper left is a nod to Charles Darwin’s note, “I think,” from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">sketch of a phylogenetic tree</a>.
</small>