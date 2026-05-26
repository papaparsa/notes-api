---
applyTo: "next-front/**"
---

You are working in the Next.js frontend in the `next-front` folder.
Follow these conventions:

- Next.js (App Router). I am using it as react basically.
- React Bootstrap
- There are two views for rending a note. There is the small view and the complete render. I have customize the markdown rendering.
- The notes are organized into categories. The hashtags are clickable, so it searchs for the hashtag when clicked
- notes are usually presented in lists. Three pages use the NoteLists component: The main home page (feed), the page that shows a notes of certain category, and the search page
- there is a show toast function under `next-front/app/(notes)/layout.js` 