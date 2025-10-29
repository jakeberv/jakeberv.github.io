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

<style>
  /* match the news excerpt text on the homepage */
  .about-intro { font-size: 0.9em; line-height: 1.35; color: #333; margin: 0 0 0.6em 0; }
  .about-intro a { text-decoration: none; }
</style>

<strong>Jacob (Jake) Berv</strong> is an evolutionary biologist interested in building and deciphering the tree of life. His research integrates data from natural history, ecology, genomics, and paleontology—often through the application of novel computational tools—in order to understand the links between micro- and macroevolution.
{: .about-intro}

##  News
{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}

{% for item in news_items limit:10 %}
  <div style="margin-bottom: 0.25em; line-height: 1.35; font-size: 0.85em;">
    <p style="margin: 0;">
      <strong>{{ item.date | date: "%B %-d, %Y" }}</strong> — 
      <a href="{{ item.url | relative_url }}" style="text-decoration: none;">
        {{ item.title }}
      </a>
    </p>
    <p style="margin: 0.15em 0 0 0; font-size: 0.9em;">
      {{ item.excerpt }}
    </p>
  </div>
{% endfor %}

<p style="margin-top: 0.8em;">
  <a href="{{ '/news/' | relative_url }}" style="font-weight: 600; text-decoration: none;">
    View all news →
  </a>
</p>

<br>

<small style="line-height: 1 !important; display: block; margin: 0;">
The banner shows a portion of Salvador Dalí’s <em>Persistence of Memory</em>. Art historian Dawn Adès described the melting clocks as “an unconscious symbol of the relativity of space and time.” In evolutionary biology, time is also relative — and, outside paleontology, rarely absolute. Dalí’s pruned olive tree, overtaken by time, echoes the challenge of reconstructing the tree of life. In the upper left is a nod to Charles Darwin’s note, “I think,” from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">sketch of a phylogenetic tree</a>.
</small>