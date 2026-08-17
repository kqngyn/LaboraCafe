Videos used across the site.

Home hero — one per column (index.html), lazy-loaded on hover:
  menu.mov
  about.mov
  careers.mov
  locations.mov
  contact.mp4

Inner page heroes reuse the same clip as their home column, and
transition.js resumes it at the timestamp the column was at:
  menu.html      -> menu.mov
  about.html     -> about.mov
  locations.html -> locations.mov

Locations page store footage (locations.js loads these on scroll):
  convoy-location.mov  -> KEARNY MESA
  np-location.mov      -> NORTH PARK

Compat / weight notes:
  - These are HEVC (hvc1) and will NOT play in Firefox, and only play in
    Chrome with hardware HEVC support:
        menu.mov, convoy-location.mov, np-location.mov
    Re-encode each to H.264, then update the data-video paths:
      ffmpeg -i menu.mov -c:v libx264 -crf 23 -preset slow -an \
             -movflags +faststart -pix_fmt yuv420p menu.mp4
  - about/careers/locations .mov are H.264 -> play everywhere.
  - contact.mp4 is 89 MB, far too heavy for a web background. Target ~3-8 MB:
      ffmpeg -i contact.mp4 -vf "scale=-2:1080" -c:v libx264 -crf 28 -preset slow \
             -an -movflags +faststart -pix_fmt yuv420p contact-web.mp4
  - Videos are muted + looping, so strip audio (-an) to save bytes.
  - Always add -movflags +faststart so playback can begin before the full
    file downloads.
  - The hero resume needs HTTP Range support. GitHub Pages and Netlify have
    it; Python's http.server does not (the clip just starts from 0 there).

loader.mp4 is referenced by the homepage loader but has not been added yet.
