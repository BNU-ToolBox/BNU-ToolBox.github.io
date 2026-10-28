# BNU-ToolBox Website

Static landing page for BNU-ToolBox, published with GitHub Pages.

The download buttons query the public GitHub Releases API at page load. They
automatically select the newest non-draft release containing a
`BNU-ToolBox-Setup-*.exe` asset and retain a built-in fallback URL.
