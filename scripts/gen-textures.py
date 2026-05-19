#!/usr/bin/env python3
"""Generate SVG texture data URIs for theme backgrounds."""
import base64

textures = {}

# 1. Parchment - warm cream with paper grain
parchment_data = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="5" seed="42" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="greyNoise"/>
      <feComponentTransfer in="greyNoise" result="faintNoise">
        <feFuncA type="linear" slope="0.08"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="faintNoise" mode="multiply"/>
    </filter>
    <filter id="fibers" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.5 0.02" numOctaves="3" seed="77" result="fibers"/>
      <feColorMatrix type="saturate" values="0" in="fibers" result="greyFibers"/>
      <feComponentTransfer in="greyFibers" result="faintFibers">
        <feFuncA type="linear" slope="0.04"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="faintFibers" mode="multiply"/>
    </filter>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="transparent" stop-opacity="0"/>
      <stop offset="60%" stop-color="transparent" stop-opacity="0"/>
      <stop offset="85%" stop-color="#3a2010" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1a0a00" stop-opacity="0.3"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="#f5e6c8" filter="url(#grain)"/>
  <rect width="400" height="400" fill="#f5e6c8" filter="url(#fibers)"/>
  <rect width="400" height="400" fill="url(#vignette)"/>
</svg>"""

encoded = base64.b64encode(parchment_data.encode()).decode()
textures['--bg-texture-parchment'] = f"url(\"data:image/svg+xml;base64,{encoded}\")"

# 2. Cyberpunk grid
grid_data = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#ff00ff" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" fill="transparent"/>
  <rect x="0" y="0" width="40" height="1" fill="url(#glow)"/>
  <rect x="0" y="0" width="1" height="40" fill="url(#glow)"/>
  <circle cx="40" cy="40" r="2" fill="#00e5ff" opacity="0.4"/>
  <circle cx="0" cy="40" r="1.5" fill="#ff00ff" opacity="0.3"/>
</svg>"""

encoded = base64.b64encode(grid_data.encode()).decode()
textures['--bg-texture-grid'] = f"url(\"data:image/svg+xml;base64,{encoded}\")"

# 3. Warhammer grunge
grunge_data = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <filter id="grunge" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="6" seed="13" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="greyNoise"/>
      <feComponentTransfer in="greyNoise" result="grit">
        <feFuncA type="discrete" tableValues="0 0 0 0 0.02 0.03 0.04"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="256" height="256" fill="transparent"/>
  <rect width="256" height="256" fill="transparent" filter="url(#grunge)"/>
</svg>"""

encoded = base64.b64encode(grunge_data.encode()).decode()
textures['--bg-texture-grunge'] = f"url(\"data:image/svg+xml;base64,{encoded}\")"

# 4. Pathfinder gold sparkle
sparkle_data = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <filter id="sparkle">
      <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="3" seed="99" result="noise"/>
      <feColorMatrix type="matrix" values="
        0 0 0 0 0.5
        0 0 0 0 0.3
        0 0 0 0 0.05
        0 0 0 0.06 0" in="noise" result="sparks"/>
    </filter>
  </defs>
  <rect width="200" height="200" fill="transparent"/>
  <rect width="200" height="200" fill="transparent" filter="url(#sparkle)"/>
</svg>"""

encoded = base64.b64encode(sparkle_data.encode()).decode()
textures['--bg-texture-sparkle'] = f"url(\"data:image/svg+xml;base64,{encoded}\")"

# Output
for name, value in textures.items():
    print(f"  {name}: {value};")
