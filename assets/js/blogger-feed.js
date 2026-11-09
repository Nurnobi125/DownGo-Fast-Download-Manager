(() => {
  const status = document.getElementById('blogger-feed-status');
  const list = document.getElementById('blogger-feed-items');
  if (!status || !list) return;

  const blogHome = 'https://downgoartical.blogspot.com/';
  const safePostUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'downgoartical.blogspot.com'
        ? url.href
        : null;
    } catch (_) { return null; }
  };
  const makeExcerpt = (html) => {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  };

  window.DownGoBloggerFeed = (data) => {
    const entries = data && data.feed && Array.isArray(data.feed.entry) ? data.feed.entry : [];
    const posts = entries.map((entry) => {
      const alternate = (entry.link || []).find((item) => item.rel === 'alternate');
      const url = alternate && safePostUrl(alternate.href);
      const title = entry.title && entry.title.$t ? String(entry.title.$t).trim() : '';
      const body = entry.summary && entry.summary.$t ? entry.summary.$t : entry.content && entry.content.$t;
      const excerpt = makeExcerpt(body);
      const published = entry.published && entry.published.$t ? entry.published.$t : '';
      return url && title ? { url, title, excerpt, published } : null;
    }).filter(Boolean);

    list.replaceChildren();
    if (!posts.length) {
      status.textContent = 'No Blogger articles yet. New public posts will appear here when published.';
      return;
    }

    status.textContent = `${posts.length} recent article${posts.length === 1 ? '' : 's'} from Blogger`;
    for (const post of posts) {
      const card = document.createElement('article');
      card.className = 'info-card';
      const heading = document.createElement('h3');
      const link = document.createElement('a');
      link.href = post.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = post.title;
      heading.append(link);
      card.append(heading);
      if (post.published) {
        const time = document.createElement('time');
        time.dateTime = post.published;
        const date = new Date(post.published);
        time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
        card.append(time);
      }
      if (post.excerpt) {
        const excerpt = document.createElement('p');
        excerpt.textContent = post.excerpt;
        card.append(excerpt);
      }
      const read = document.createElement('a');
      read.className = 'card-link';
      read.href = post.url;
      read.target = '_blank';
      read.rel = 'noopener noreferrer';
      read.textContent = 'Read on Blogger →';
      card.append(read);
      list.append(card);
    }
  };

  const feedScript = document.createElement('script');
  feedScript.src = `${blogHome}feeds/posts/default?alt=json-in-script&max-results=10&callback=DownGoBloggerFeed`;
  feedScript.async = true;
  feedScript.onerror = () => {
    status.textContent = 'Could not load Blogger posts right now. You can visit the DownGo Blogger site directly.';
  };
  document.head.append(feedScript);
  window.setTimeout(() => {
    if (status.textContent === 'Loading articles from Blogger…') {
      status.textContent = 'Blogger did not respond. Try again later or visit the blog directly.';
    }
  }, 10000);
})();
