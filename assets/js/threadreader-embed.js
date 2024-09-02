// threadreader-embed.js

// Inject CSS styling into the document
const style = document.createElement('style');
style.textContent = `
    /* Center the container and restrict to 40% width */
    .threadreader-wrapper {
        display: flex;
        justify-content: center;
        padding: 20px 0;
    }

    .threadreader-container {
        width: 40%;
        background-color: #ffffff;
        border: 1px solid #e1e8ed;
        border-radius: 8px;
        padding: 15px;
        margin: 0 auto;
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
`;

// Append the style element to the document head
document.head.appendChild(style);

// JavaScript logic to fetch and display Thread Reader content
(async function() {
    async function fetchThreadReaderContent(container, threadUrl) {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        try {
            const response = await fetch(proxyUrl + threadUrl);
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

            // Inject the user info into the container
            container.innerHTML = `
                <div id="thread-header" class="d-flex align-items-center">
                    ${userInfo}
                </div>
                <div id="thread-content"></div>
            `;

            // Loop through each tweet and inject it into the container
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

            container.querySelector('#thread-content').innerHTML = contentHtml;

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
            container.innerHTML = '<p>Sorry, there was an error loading the thread.</p>';
        }
    }

    // Automatically find all elements with the data-threadreader-url attribute
    document.querySelectorAll('[data-threadreader-url]').forEach(container => {
        const threadUrl = container.getAttribute('data-threadreader-url');
        fetchThreadReaderContent(container, threadUrl);
    });
})();