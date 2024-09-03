---
title: "3rd Joint Congress on Evolutionary Biology"
date: 2024-07-30
layout: archive
author_profile: true
excerpt_separator: "<!--news-excerpt-->"
---
{{ page.date | date: "%B %d, %Y" }} -

<div style="display: flex; align-items: flex-start; flex-wrap: wrap;">
  <img src="/images/posts/EVO2024-title.jpg" 
       style="max-height: 200px; width: auto; max-width: 100%; margin-right: 15px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); flex-shrink: 0;" 
       onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" 
       onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" 
       alt="Title slide from Jake's talk"/>
  <p style="font-size: 0.85em; margin: 0; flex-basis: 100%; flex-grow: 1;">Jake attended the 3rd Joint Congress on Evolutionary Biology in Montreal, QC, Canada, where he gave a talk on his research into applications of computer vision to studies of bird skeleton evolution. His talk, titled (in jest) '15,000 Skeletons, or How I Learned to Stop Worrying and Love the Phenotype', was recorded and is available on YouTube <a href="https://www.youtube.com/watch?v=i4mPfi5_5wk&t=1735s">here</a></p>
</div>

<style>
  @media (max-width: 768px) {
    .flex-container {
      flex-direction: column;
      align-items: center;
    }

    .flex-container img {
      margin-right: 0;
      margin-bottom: 10px;
    }

    .flex-container p {
      text-align: center;
      width: 100%;
    }
  }
</style>


<!--news-excerpt-->
<br>
The 3rd Joint Congress on Evolutionary Biology is the joint meeting of the American Society of Naturalists, the European Society for Evolutionary Biology, the Society of Systematic Biologists and the Society for the Study of Evolution. The meeting is one of the premiere international opportunities for sharing research on evolutionary biology.

15,000 Skeletons, or How I Learned to Stop Worrying and Love the Phenotype
Authors: Jake Berv, Santiago Claramunt, David Fouhey, Brian weeks

Abstract:
Computer vision is poised to revolutionize our ability to generate and analyze phenotypic data. We developed and applied a new AI pipeline leveraging U-Net and Mask R-CNN approaches to measure thousands of avian skeleton specimens. Our approach is trained to identify and generate linear measurements of the legs, torso, wings, hand, and skull with low error (RMSE ~0.89 mm). We further develop approaches using multivariate phylogenetic models to impute missing data with similarly low error rates, leading to datasets that are 100% complete at the specimen level across entire collections. These new data present exciting opportunities to investigate the evolution of allometric scaling and integration across Passeriform songbirds, a hyper-diverse avian order (~6,500 species). Here, we present an overview of this dataset and showcase the potential of leveraging specimen metadata (e.g. sex, mass) to analyze nuanced macroevolutionary patterns. We developed a new phylogenetic comparative method that can efficiently identify shifts in patterns of multivariate evolution across thousands of species and potentially hundreds of trait dimensions. Our research in progress investigates how broad-scale patterns of skeletal variation co-vary with important biotic and abiotic factors, including life history and climate parameters. We show that the origins of many avian taxa may be associated with shifts in patterns of body-plan evolution and that the overwhelming macroevolutionary signal of skeleton evolution is characterized by nested “early bursts” poorly fit by simple models of continuous rate change. The ‘Skelevision’ system is inexpensive, portable, and can accommodate training new features, including shape and 3D geometry. We expect to extend our ‘imageomics’ approaches to enable high-dimensional phenotyping of entire museum collections within a few years.

