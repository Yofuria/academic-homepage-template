# Academic Homepage Template

A quiet, single-column academic homepage with complete research descriptions, publication filters, a news archive, institution logos, and a project-page template. Static HTML, CSS, JavaScript, and JSON; no build step.

[Live demo](https://yofuria.github.io/academic-homepage-template/) · [Use this template](https://github.com/Yofuria/academic-homepage-template/generate) · [中文说明](docs/README-zh.md)

![Homepage preview](docs/preview.jpg)

## Start your own homepage

1. Click **Use this template → Create a new repository**.
2. For a personal site, name the repository **YOUR-USERNAME.github.io**. For a project site, choose any repository name.
3. Update the sample content using the file guide below.
4. Open **Settings → Pages**, choose **Deploy from a branch**, and select **main / (root)**.
5. Open the Pages URL shown by GitHub.

All pages use the same stylesheet and script. Asset and data paths work both at the domain root and under a repository subpath.

## Customize

| File | What to edit |
| --- | --- |
| [data/site.json](data/site.json) | Name, optional Chinese name, role, affiliations, email, location, portrait, social links, and homepage description |
| [index.html](index.html) | Biography, research interests and directions, project descriptions, education, experience, and service |
| [data/publications.json](data/publications.json) | Titles, author lists, venues, years, links, first-author flags, and homepage visibility |
| [data/news.json](data/news.json) | Short news items, newest first; homepage shows three and the archive shows all |
| [projects/example/index.html](projects/example/index.html) | Project title, authors, figure, abstract, method description, and BibTeX |
| [homepage.css](homepage.css) | Shared colors, typography, spacing, and responsive layout |
| [assets](assets) | Portrait, favicon, institution logos, and project figures |

The name in browser titles and footers is loaded from the shared site settings. Biography and CV text are edited directly in the homepage HTML; publication author lists and project citations are edited with their own content.

Use repository-relative asset paths such as **assets/portrait.svg** and **projects/example/**. Keep these paths relative so copies also work as GitHub Pages project sites.

### Publication fields

- **type**: accepted or preprint.
- **isFirstAuthor**: true for first or equal-first authors; controls the first-author filter.
- **showOnHomepage**: false hides an item on the homepage while keeping it in the full list.
- **featuredOrder**: optional numeric priority on the homepage; lower values appear first.
- **venueFullName / venueShortName**: optional display overrides, useful for named workshops. For example: “Example Research Workshop · NeurIPS'26”.
- **tags**: resource labels and links. A link of **#** renders as a disabled placeholder.

The archive groups papers by year. The demo papers, news, affiliations, and project are illustrative; replace them with your own information.

### Portrait and logos

The desktop portrait automatically matches the height of the text beside it. On narrow screens it sits beside the name and role, with affiliations and links below. Replace the placeholder portrait and logos with your own assets and update their paths.

## Preview and check

From the repository directory:

    python3 tools/check_site.py
    python3 -m http.server 8000 --bind 127.0.0.1

Then open [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Serve the folder over HTTP so the browser can load the JSON files.

Before publishing, check the homepage, both archives, the example project, publication filters, and mobile layout. After changing the shared CSS or JavaScript, update its version query in all four HTML files.

## Privacy and dependencies

The template ships with original SVG placeholders, generic example content, and no Analytics tracker. It contains no personal photos, institutional brand assets, citation-crawler credentials, or JavaScript package dependencies.

## Credits and license

Adapted from the homepage at [Yofuria.github.io](https://yofuria.github.io/) and [AcaNova-X](https://github.com/yihangtao/AcaNova-X), with upstream credit to [AcadHomepage](https://github.com/RayeRen/acad-homepage.github.io/), [Minimal Mistakes](https://github.com/mmistakes/minimal-mistakes), and [Academic Pages](https://github.com/academicpages/academicpages.github.io).

Released under the [MIT License](LICENSE). The original Yi Ren copyright notice is preserved.
