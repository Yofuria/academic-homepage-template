const SITE_ROOT = new URL('.', document.currentScript.src);

function loadSite() {
    fetch(getDataPath('site.json'))
        .then(handleJsonResponse)
        .then(site => {
            const pageTitle = document.body.dataset.pageTitle;
            document.title = pageTitle ? pageTitle + ' - ' + site.name : site.name;
            if (!pageTitle && site.description) {
                document.querySelector('meta[name="description"]').content = site.description;
            }
            document.querySelectorAll('[data-site]').forEach(element => {
                const value = site[element.dataset.site];
                if (typeof value === 'string') element.textContent = value;
            });
            const heading = document.querySelector('[data-site-heading]');
            if (heading) {
                heading.replaceChildren(document.createTextNode(site.name));
                if (site.nativeName) {
                    const native = document.createElement('span');
                    native.lang = 'zh';
                    native.textContent = site.nativeName;
                    heading.append(document.createTextNode(' '), native);
                }
            }
            document.querySelectorAll('[data-site-affiliations]').forEach(element => {
                element.replaceChildren();
                (site.affiliations || []).forEach((line, index) => {
                    if (index) element.appendChild(document.createElement('br'));
                    element.appendChild(document.createTextNode(line));
                });
            });
            document.querySelectorAll('[data-site-email]').forEach(element => {
                element.textContent = site.email;
                element.href = 'mailto:' + site.email;
            });
            document.querySelectorAll('[data-site-portrait]').forEach(element => {
                element.src = normalizeAssetPath(site.portrait);
                element.alt = site.name;
            });
            document.querySelectorAll('[data-site-links]').forEach(element => {
                element.replaceChildren();
                if (site.email) {
                    const email = document.createElement('a');
                    email.href = 'mailto:' + site.email;
                    email.textContent = 'Email';
                    element.appendChild(email);
                }
                (site.links || []).forEach(link => {
                    if (!hasUsableLink(link.url)) return;
                    const anchor = document.createElement('a');
                    anchor.href = normalizeAssetPath(link.url);
                    anchor.textContent = link.label;
                    element.appendChild(anchor);
                });
            });
            makeAllLinksOpenInNewTab();
        })
        .catch(error => {
            console.error('Error loading site settings:', error);
        });
}

function showLoadError(containers, label) {
    containers.filter(Boolean).forEach(container => {
        const message = document.createElement('p');
        message.className = 'loading-message';
        message.setAttribute('role', 'alert');
        message.textContent = label + ' are temporarily unavailable.';
        container.replaceChildren(message);
    });
}

function setupBibtexCopy() {
    const button = document.getElementById('copyBtn');
    const citation = document.getElementById('bib');
    if (!button || !citation) return;
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(citation.textContent);
            button.textContent = 'Copied!';
        } catch {
            const range = document.createRange();
            range.selectNodeContents(citation);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            button.textContent = 'Select and copy';
        }
        setTimeout(() => { button.textContent = 'Copy'; }, 1800);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const currentYear = document.getElementById('current-year');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    loadSite();
    setupBibtexCopy();
    makeAllLinksOpenInNewTab();
    setupLinkObserver();

    loadNews();
    loadPublications();
});

function loadNews() {
    const homeContainer = document.getElementById('news-container');
    const allContainer = document.getElementById('all-news-container');

    if (!homeContainer && !allContainer) {
        return;
    }

    fetch(getDataPath('news.json'))
        .then(handleJsonResponse)
        .then(items => {
            if (homeContainer) {
                renderNewsItems(items.slice(0, 3), homeContainer);
            }
            if (allContainer) {
                renderNewsItems(items, allContainer);
            }
        })
        .catch(error => {
            console.error('Error loading news data:', error);
            showLoadError([homeContainer, allContainer], 'News');
        });
}

function loadPublications() {
    const featuredContainer = document.getElementById('featured-publications-container');
    const preprintContainer = document.getElementById('featured-preprints-container');
    const allContainer = document.getElementById('all-publications-container');

    if (!featuredContainer && !preprintContainer && !allContainer) {
        return;
    }

    fetch(getDataPath('publications.json'))
        .then(handleJsonResponse)
        .then(publications => {
            if (featuredContainer) {
                const accepted = publications
                    .filter(pub => pub.showOnHomepage !== false && String(pub.type || '').toLowerCase() === 'accepted')
                    .sort(compareFeaturedPublications);
                renderFeaturedPublications(featuredContainer, accepted);
            }

            if (preprintContainer) {
                const preprints = publications
                    .filter(pub => pub.showOnHomepage !== false && String(pub.type || '').toLowerCase() !== 'accepted')
                    .sort(compareFeaturedPublications);
                renderFeaturedPublications(preprintContainer, preprints);
            }

            if (allContainer) {
                renderAllPublicationsPage(allContainer, publications);
            }
        })
        .catch(error => {
            console.error('Error loading publications data:', error);
            showLoadError([featuredContainer, preprintContainer, allContainer], 'Publications');
        });
}

function renderFeaturedPublications(container, publications) {
    container.innerHTML = '';

    if (!publications.length) {
        container.innerHTML = '<p>No featured publications available.</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'pub-list-ul';

    publications.forEach(pub => {
        list.appendChild(createPublicationItem(pub));
    });

    container.appendChild(list);
}

function renderAllPublicationsPage(container, publications) {
    const filter = getPublicationFilter();
    const filterIndicator = document.getElementById('filter-indicator');

    let filtered = publications.slice();

    if (filter === 'first-author') {
        filtered = filtered.filter(pub => pub.isFirstAuthor === true);
        if (filterIndicator) {
            filterIndicator.textContent = '(First Author)';
        }
    } else if (filter === 'accepted') {
        filtered = filtered.filter(pub => String(pub.type || '').toLowerCase() === 'accepted');
        if (filterIndicator) {
            filterIndicator.textContent = '(Accepted)';
        }
    } else if (filter === 'preprint') {
        filtered = filtered.filter(pub => String(pub.type || '').toLowerCase() !== 'accepted');
        if (filterIndicator) {
            filterIndicator.textContent = '(Preprints)';
        }
    } else if (filterIndicator) {
        filterIndicator.textContent = '';
    }

    updateFilterButtons(filter);
    renderAllPublications(container, filtered);
}

function renderAllPublications(container, publications) {
    container.innerHTML = '';

    if (!publications.length) {
        container.innerHTML = '<p class="empty-state">No publications found for this filter.</p>';
        return;
    }

    const grouped = new Map();

    publications
        .slice()
        .sort(compareAllPublications)
        .forEach(pub => {
            const yearLabel = getYearLabel(pub);
            if (!grouped.has(yearLabel)) {
                grouped.set(yearLabel, []);
            }
            grouped.get(yearLabel).push(pub);
        });

    Array.from(grouped.entries()).forEach(([year, items]) => {
        const group = document.createElement('div');
        group.className = 'pub-year-group';

        const header = document.createElement('h2');
        header.className = 'pub-year-header';
        header.textContent = year;
        group.appendChild(header);

        const list = document.createElement('ul');
        list.className = 'pub-list-ul';
        items.forEach(pub => {
            list.appendChild(createPublicationItem(pub));
        });

        group.appendChild(list);
        container.appendChild(group);
    });
}

function createPublicationItem(pub) {
    const item = document.createElement('li');
    item.className = 'pub-list-item';

    const content = document.createElement('div');
    content.className = 'pub-content-wrapper';

    const line1 = document.createElement('div');
    line1.className = 'pub-line-1';

    const title = document.createElement('span');
    title.className = 'pub-title-text';
    title.textContent = pub.displayTitle || pub.title || 'Untitled Publication';
    line1.appendChild(title);
    content.appendChild(line1);

    const line2 = document.createElement('div');
    line2.className = 'pub-line-2';
    line2.innerHTML = pub.authors || '';
    content.appendChild(line2);

    const line3 = document.createElement('div');
    line3.className = 'pub-line-3';

    const venueFullName = pub.venueFullName || getVenueFullName(pub.venue, pub.year);
    const venueShortName = pub.venueShortName || getVenueShortName(pub.venue, pub.year);
    const venueText = venueFullName || pub.venue || 'Preprint';

    const venueNameSpan = document.createElement('span');
    venueNameSpan.textContent = venueText;
    line3.appendChild(venueNameSpan);

    if (shouldShowVenueTag(pub.venue, venueFullName, venueShortName)) {
        const venueTag = document.createElement('span');
        venueTag.className = 'pub-venue-tag pub-venue-inline-tag';
        venueTag.textContent = venueShortName;

        const lowerVenue = venueShortName.toLowerCase();
        if (lowerVenue.includes('under review') || lowerVenue.includes('preprint') || lowerVenue.includes('arxiv')) {
            venueTag.classList.add('tag-under-review');
        } else {
            venueTag.classList.add('tag-conference');
        }

        line3.appendChild(venueTag);
    }

    const badgeText = getHighlightBadge(pub.highlight);
    if (badgeText) {
        const badge = document.createElement('span');
        badge.className = 'pub-badge-highlight';
        badge.textContent = badgeText;
        line3.appendChild(badge);
    }

    content.appendChild(line3);

    if (pub.tags && Array.isArray(pub.tags)) {
        const line4 = document.createElement('div');
        line4.className = 'pub-line-4';

        pub.tags.forEach(tag => {
            const label = tag.text === 'Paper' ? 'PDF' : (tag.text || 'Link');
            const usableLink = hasUsableLink(tag.link);

            const button = document.createElement(usableLink ? 'a' : 'span');
            button.className = 'pub-link-btn';
            button.textContent = label;

            if (usableLink) {
                button.href = normalizeAssetPath(tag.link);
                if (shouldOpenInNewTab(button.href)) {
                    button.target = '_blank';
                    button.rel = 'noopener noreferrer';
                }
            } else {
                button.classList.add('is-placeholder');
                button.title = 'Link coming soon';
            }

            line4.appendChild(button);
        });

        if (line4.children.length > 0) {
            content.appendChild(line4);
        }
    }

    item.appendChild(content);

    return item;
}

function renderNewsItems(newsData, container) {
    container.innerHTML = '';

    newsData.forEach(newsItem => {
        const newsElement = document.createElement('div');
        newsElement.className = 'news-item';

        const dateElement = document.createElement('span');
        dateElement.className = 'news-date';
        dateElement.textContent = newsItem.date || '';

        const contentElement = document.createElement('div');
        contentElement.className = 'news-content';

        const textSpan = document.createElement('span');
        textSpan.innerHTML = newsItem.content || '';
        contentElement.appendChild(textSpan);

        if (Array.isArray(newsItem.links)) {
            newsItem.links.forEach(link => {
                const space = document.createTextNode(' ');
                contentElement.appendChild(space);

                const anchor = document.createElement('a');
                anchor.href = normalizeAssetPath(link.url || '#');
                anchor.textContent = link.text || 'Link';
                if (shouldOpenInNewTab(anchor.getAttribute('href'))) {
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                }
                contentElement.appendChild(anchor);
            });
        }

        newsElement.appendChild(dateElement);
        newsElement.appendChild(contentElement);
        container.appendChild(newsElement);
    });
}

function compareFeaturedPublications(a, b) {
    const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
        return orderA - orderB;
    }
    return compareAllPublications(a, b);
}

function compareAllPublications(a, b) {
    const yearA = getComparableYear(a);
    const yearB = getComparableYear(b);
    if (yearA !== yearB) {
        return yearB - yearA;
    }

    const acceptedA = String(a.type || '').toLowerCase() === 'accepted' ? 1 : 0;
    const acceptedB = String(b.type || '').toLowerCase() === 'accepted' ? 1 : 0;
    if (acceptedA !== acceptedB) {
        return acceptedB - acceptedA;
    }

    const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
        return orderA - orderB;
    }

    return String(a.title || '').localeCompare(String(b.title || ''));
}

function getComparableYear(pub) {
    const parsedYear = parseInt(pub.year, 10);
    if (!Number.isNaN(parsedYear)) {
        return parsedYear;
    }
    return String(pub.type || '').toLowerCase() === 'accepted' ? 0 : 9999;
}

function getYearLabel(pub) {
    const parsedYear = parseInt(pub.year, 10);
    if (!Number.isNaN(parsedYear)) {
        return String(parsedYear);
    }
    return 'Preprints / Under Review';
}

function getPublicationFilter() {
    const params = new URLSearchParams(window.location.search);
    return params.get('filter') || 'all';
}

function updateFilterButtons(filter) {
    document.querySelectorAll('.filter-link').forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    });

    let activeId = 'filter-all';
    if (filter === 'first-author') {
        activeId = 'filter-first';
    } else if (filter === 'accepted') {
        activeId = 'filter-accepted';
    } else if (filter === 'preprint') {
        activeId = 'filter-preprint';
    }
    const element = document.getElementById(activeId);
    if (element) {
        element.classList.add('active');
        element.setAttribute('aria-current', 'page');
    }
}

function getHighlightBadge(highlightText) {
    const text = String(highlightText || '').toLowerCase();
    if (text.includes('oral')) {
        return 'Oral';
    }
    if (text.includes('spotlight')) {
        return 'Spotlight';
    }
    return '';
}

function getVenueShortName(venueStr, year) {
    if (!venueStr) {
        return 'Preprint';
    }

    if (/\bworkshop\b/i.test(venueStr)) {
        return venueStr.trim();
    }

    let revisionSuffix = '';
    if (venueStr.toLowerCase().includes('major revision')) {
        revisionSuffix = ', Major';
    } else if (venueStr.toLowerCase().includes('minor revision')) {
        revisionSuffix = ', Minor';
    }

    let s = venueStr.replace(/\d{4}/g, '').trim();
    let suffix = '';

    const conferences = ['NeurIPS', 'ICML', 'ICLR', 'EMNLP', 'ACL', 'CVPR', 'ICCV', 'ECCV', 'ICRA', 'AAAI', 'GLOBECOM', 'INFOCOM', 'MOBICOM'];
    for (const conf of conferences) {
        if (s.includes(conf)) {
            if (year) {
                const yearStr = String(year);
                if (yearStr.length === 4) {
                    suffix = "'" + yearStr.substring(2);
                }
            }
            return conf + suffix + revisionSuffix;
        }
    }

    if (s.toLowerCase().includes('arxiv')) {
        return 'ArXiv' + revisionSuffix;
    }

    if (s.includes('TMLR')) return 'TMLR' + revisionSuffix;

    if (s.includes('TDSC')) return 'IEEE TDSC' + revisionSuffix;
    if (s.includes('TMC')) return 'IEEE TMC' + revisionSuffix;
    if (s.includes('JSAC')) return 'IEEE JSAC' + revisionSuffix;
    if (s.includes('TGCN')) return 'IEEE TGCN' + revisionSuffix;
    if (s.includes('LNET')) return 'IEEE LNET' + revisionSuffix;
    if (s.includes('TNSE')) return 'IEEE TNSE' + revisionSuffix;
    if (s.includes('IOTJ') || s.includes('IoTJ')) return 'IEEE IoTJ' + revisionSuffix;

    return s || 'Preprint';
}

function getVenueFullName(venueStr) {
    if (!venueStr) {
        return '';
    }

    if (/\bworkshop\b/i.test(venueStr)) {
        return venueStr.trim();
    }

    const s = venueStr.replace(/\d{4}/g, '').trim();

    if (s.includes('TDSC')) return 'IEEE Transactions on Dependable and Secure Computing';
    if (s.includes('TMC')) return 'IEEE Transactions on Mobile Computing';
    if (s.includes('JSAC')) return 'IEEE Journal on Selected Areas in Communications';
    if (s.includes('TGCN')) return 'IEEE Transactions on Green Communications and Networking';
    if (s.includes('TNSE')) return 'IEEE Transactions on Network Science and Engineering';
    if (s.includes('IoTJ') || s.includes('IOTJ')) return 'IEEE Internet of Things Journal';
    if (s.includes('LNET') || s.includes('LNet')) return 'IEEE Networking Letters';

    if (s.includes('NeurIPS')) return 'Annual Conference on Neural Information Processing Systems';
    if (s.includes('ICML')) return 'International Conference on Machine Learning';
    if (s.includes('CVPR')) return 'IEEE/CVF Conference on Computer Vision and Pattern Recognition';
    if (s.includes('ICCV')) return 'IEEE/CVF International Conference on Computer Vision';
    if (s.includes('ECCV')) return 'European Conference on Computer Vision';
    if (s.includes('ICRA')) return 'IEEE International Conference on Robotics and Automation';
    if (s.includes('AAAI')) return 'AAAI Conference on Artificial Intelligence';
    if (s.includes('GLOBECOM')) return 'IEEE Global Communications Conference';
    if (s.includes('INFOCOM')) return 'IEEE International Conference on Computer Communications';
    if (s.includes('MOBICOM')) return 'Annual International Conference on Mobile Computing and Networking';

    if (s.includes('ICLR')) return 'International Conference on Learning Representations';
    if (s.includes('EMNLP')) return 'Conference on Empirical Methods in Natural Language Processing';
    if (s.includes('ACL')) return 'Annual Meeting of the Association for Computational Linguistics';
    if (s.includes('TMLR')) return 'Transactions on Machine Learning Research';

    if (s.toLowerCase().includes('arxiv')) return 'arXiv preprint';

    return s;
}

function shouldShowVenueTag(venueStr, fullVenueName, venueShort) {
    if (!venueShort) {
        return false;
    }

    const shortLower = venueShort.toLowerCase().trim();
    const fullLower = String(fullVenueName || '').toLowerCase().trim();

    if (!fullLower || shortLower === fullLower) {
        return false;
    }

    if (venueStr && venueStr.toLowerCase().includes('under review')) {
        return false;
    }

    return true;
}

function getDataPath(fileName) {
    const url = new URL('data/' + fileName, SITE_ROOT);
    url.searchParams.set('v', Date.now());
    return url.href;
}

function normalizeAssetPath(path) {
    if (!path || path.startsWith('#')) return path;
    return new URL(path, SITE_ROOT).href;
}

function hasUsableLink(path) {
    return Boolean(path) && path !== '#';
}

function handleJsonResponse(response) {
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}

function makeAllLinksOpenInNewTab() {
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (shouldOpenInNewTab(href)) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });
}

function shouldOpenInNewTab(href) {
    if (!href || href.startsWith('#')) return false;
    try {
        const url = new URL(href, window.location.href);
        return /^https?:$/.test(url.protocol) && url.origin !== window.location.origin;
    } catch {
        return false;
    }
}

function setupLinkObserver() {
    if (!document.body) {
        return;
    }

    const observer = new MutationObserver(mutations => {
        let shouldRefreshLinks = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldRefreshLinks = true;
                break;
            }
        }

        if (shouldRefreshLinks) {
            makeAllLinksOpenInNewTab();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
