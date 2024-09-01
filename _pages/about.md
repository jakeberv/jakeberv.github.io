---
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

# About me

I am an evolutionary biologist interested in building and deciphering the tree of life. My research integrates data from natural history, ecology, genomics, and paleontology---often through the application of novel computation tools---in order to understand the links between micro- and macroevolution.

I am currently supported by an [Eric and Wendy Schmidt AI in Science Postdoctoral Fellowship](https://midas.umich.edu/news/michigan-institute-for-data-science-announces-new-fellows/) at the University of Michigan.

<figure style="max-width: 100%; display: flex; justify-content: space-between; align-items: center;">
  <a href="https://doi.org/10.1016/j.cub.2018.04.062" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/CurrBio.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Current Biology cover"/>
  </a>
  <a href="http://digitallibrary.amnh.org/handle/2246/7237" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/amnh_bulletin.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="AMNH Bulletin cover"/>
  </a>
  <a href="https://doi.org/10.1093/sysbio/syx064" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/syst_biol.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Systematic Biology cover"/>
  </a>
  <a href="https://doi.org/10.1126/sciadv.adp0114" target="_blank" style="flex: 1; display: flex; justify-content: center;">
    <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/science_advances.jpg" style="max-height: 250px; width: auto; max-width: 100%; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" alt="Science Advances cover"/>
  </a>
</figure>

[Go Directly to Research](https://www.jakeberv.com/research){: .btn--research}

## News
{% for item in site.news limit:5 %}
  <h4 style="font-size: 1.25em;">{{ item.title }}</h4>
  <p>{{ item.date | date: "%B %d, %Y" }} - {{ item.excerpt }}</p>
  <a href="{{ item.url | prepend: site.baseurl }}">Read more</a>
{% endfor %}


<small>
  The site's banner is a portion of Salvador Dali's "Persistence of Memory." Dawn Adès wrote, "The soft watches are an unconscious symbol of the relativity of space and time, a Surrealist meditation on the collapse of our notions of a fixed cosmic order." In evolutionary biology, time is often relative and (outside of paleontology) rarely absolute. Dalí's olive tree with its cut branches, overlain by time, is a reminder of the challenges we face in understanding the tree of life. To the top left, an allusion to Charles Darwin's note, "I think", from his famous <a href="https://www.amnh.org/exhibitions/darwin/the-idea-takes-shape/i-think">illustration of a phylogenetic tree</a>.
</small>
