# Lantern

A design concept: a static multi-page site for **Lantern**, a fictional pocket distress beacon for sailors. The product, people, rescue story and figures are all fictional.

Live site: https://naserdemiraj.github.io/lantern-site/

## Pages

- `index.html`: the landing page, with the storm video hero, the problem, the tagline reveal, links into the other pages, quotes and the offer
- `rescue.html`: a sideways, minute-by-minute timeline of a rescue
- `beacon.html`: a real-time three.js model of the beacon, what it does, and the specs
- `faq.html`: questions and answers
- `reserve.html`: the reservation form (front end only; nothing is sent)
- `404.html`: the not-found page

## Stack

Plain HTML, CSS and JavaScript with no build step.

- [GSAP](https://gsap.com) and ScrollTrigger for the scroll animations
- [three.js](https://threejs.org) r170 for the 3D beacon, loaded through an import map
- Manrope from Google Fonts

To run it locally, serve the folder with any static server, for example `npx serve .`. The 3D model and the page transitions need a server, so opening the files directly won't show them.

## Credits

Background footage and still © [GetLayers](https://getlayers.ai).
