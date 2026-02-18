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

<div class="home-intro">
  <div class="home-intro__text">
    <p class="about-intro"><strong>Jacob (Jake) Berv</strong> is an evolutionary biologist interested in building and deciphering the tree of life. His research integrates data from natural history, ecology, genomics, and paleontology—often through the application of novel computational tools—in order to understand the links between micro- and macroevolution.</p>
    <p class="about-intro about-intro--follow">He is the lead developer of <code>bifrost</code> and a contributor to <code>janus</code>; explore featured tools on the <a href="{{ '/software/' | relative_url }}">Software page</a>.</p>
    <div class="home-intro__badges" aria-label="Software badges">
      <a class="home-intro__badge home-intro__badge--bifrost" href="{{ '/software/' | relative_url }}" title="bifrost software card on the Software page">
        <img src="https://raw.githubusercontent.com/jakeberv/bifrost/main/man/figures/logo.png" alt="bifrost logo" loading="lazy" decoding="async" />
      </a>
      <a class="home-intro__badge home-intro__badge--janus" href="{{ '/software/' | relative_url }}" title="janus software card on the Software page">
        <img src="/images/software/janus.webp" alt="janus logo" loading="lazy" decoding="async" />
      </a>
    </div>
  </div>
  <figure class="home-intro__media">
    <a class="home-intro__media-link" href="{{ '/background/' | relative_url }}" title="View Background page">
      <img src="/images/research/home-intro-binoculars.jpg" alt="Jacob Berv during bird survey fieldwork" loading="lazy" decoding="async" />
    </a>
  </figure>
</div>

## Recent News
{% assign news_items = site.news
  | where_exp: "i", "i.date"
  | where_exp: "i", "i.date <= site.time"
  | sort: "date"
  | reverse %}

{% for item in news_items limit:5 %}
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
