---
title: "New paper in Science Advances"
date: 2024-08-01
layout: archive
author_profile: true
excerpt_separator: "<!--news-excerpt-->"
---

<div style="display: flex; align-items: flex-start;">
  <img src="https://github.com/jakeberv/jakeberv.github.io/raw/master/images/research/science_advances.jpg" 
       style="max-height: 250px; width: auto; max-width: 100%; margin-right: 15px; box-shadow: 0 8px 16px rgba(0,0,0,0.2);" 
       onmouseover="this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)'" 
       onmouseout="this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" 
       alt="Science Advances cover"/>
  <p>The primary work from Jake's first postdoc is now published as the cover article in Science Advances. In this study, Jake examined how bird genomes evolved after the end-Cretaceous mass extinction 66 million years ago. By analyzing different genetic regions, Jake and his team identified key shifts in DNA sequences linked to changes in development, body size, and metabolism. These findings suggest that the mass extinction played a crucial role in shaping the evolution and early diversification of modern birds.</p>
</div>

<!--news-excerpt-->

I've written some additional comments about this work in the twitter thread here:

<div style="display: flex; justify-content: center;">
  <blockquote class="twitter-tweet" data-theme="light" style="width: 30%;">
    <p lang="en" dir="ltr">
      Back from a fantastic 
      <a href="https://twitter.com/hashtag/Evol2024?src=hash&amp;ref_src=twsrc%5Etfw">#Evol2024</a> 
      meeting in Montreal, and I’m very pleased to officially talk about this project again, now published in 
      <a href="https://twitter.com/ScienceAdvances?ref_src=twsrc%5Etfw">@ScienceAdvances</a> 
      <a href="https://t.co/RstUs2bzvF">https://t.co/RstUs2bzvF</a>
    </p>&mdash; Jake Berv (@jakeberv) 
    <a href="https://twitter.com/jakeberv/status/1819085303795372413?ref_src=twsrc%5Etfw">August 1, 2024</a>
  </blockquote>
</div>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


{% raw %}
<!-- Thread Reader Embed Start -->
<div class="container">
    <div id="thread-header" class="d-flex align-items-center">
        <!-- User Profile Info -->
    </div>
    <div id="thread-content">
        <!-- Tweets Content -->
    </div>
</div>

<style>
    /* Basic page styling */
    .container {
        max-width: 600px;
        background-color: #ffffff;
        border: 1px solid #e1e8ed;
        border-radius: 8px;
        padding: 15px;
        margin: 20px auto;
    }

    /* User Profile Header */
    #thread-header {
        border-bottom: 1px solid #e1e8ed;
        padding-bottom: 15px;
        margin-bottom: 15px;
    }

    .prof-image img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }

    .twitter_name {
        font-size: 18px;
        font-weight: bold;
        color: #14171a;
    }

    .screenName {
        color: #657786;
        font-size: 14px;
    }

    .thread-info {
        color: #657786;
        font-size: 12px;
    }

    /* Tweet Styling */
    .content-tweet {
        padding: 10px 0;
        border-bottom: 1px solid #e1e8ed;
    }

    .content-tweet:last-child {
        border-bottom: none;
    }

    .content-tweet a {
        color: #1b95e0;
        text-decoration: none;
    }

    .content-tweet a:hover {
        text-decoration: underline;
    }

    .tweet-footer {
        margin-top: 10px;
        color: #657786;
        font-size: 12px;
    }
</style>

<script>
    async function fetchThreadReaderContent() {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = 'https://threadreaderapp.com/thread/1819085303795372413';
        try {
            const response = await fetch(proxyUrl + targetUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            // Extract relevant parts of the document
            const userInfoElement = doc.querySelector('.prof-image').parentElement;

            // Remove the subscribe button from the user profile
            const subscribeButton = userInfoElement.querySelector('form');
            if (subscribeButton) {
                subscribeButton.remove();
            }

            const userInfo = userInfoElement.innerHTML;
            const tweets = doc.querySelectorAll('.content-tweet');

            // Inject the user info into the page
            document.getElementById('thread-header').innerHTML = userInfo;

            // Loop through each tweet and inject it into the page
            let contentHtml = '';
            tweets.forEach((tweet, index) => {
                // Remove the chain link symbol and attached links
                const linkIcon = tweet.querySelector('.tw-permalink');
                if (linkIcon) {
                    linkIcon.remove();
                }

                contentHtml += `
                    <div class="content-tweet">
                        ${tweet.innerHTML}
                        <div class="tweet-footer">
                            <span>${index + 1}/${tweets.length}</span>
                        </div>
                    </div>
                `;
            });
            document.getElementById('thread-content').innerHTML = contentHtml;

            // Initialize Twitter widgets
            window.twttr = (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0],
                    t = window.twttr || {};
                if (d.getElementById(id)) return t;
                js = d.createElement(s);
                js.id = id;
                js.src = "https://platform.twitter.com/widgets.js";
                fjs.parentNode.insertBefore(js, fjs);

                t._e = [];
                t.ready = function(f) {
                    t._e.push(f);
                };

                return t;
            }(document, "script", "twitter-wjs"));
        } catch (error) {
            console.error('Error fetching thread:', error);
        }
    }

    // Fetch and display the content when the page loads
    fetchThreadReaderContent();
</script>
<!-- Thread Reader Embed End -->
{% endraw %}

