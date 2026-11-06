from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import cairosvg, io, random, math
out=Path('/mnt/data/bloom_fix_work/assets/images/storybook/heroes/v2')
W,H=900,583
PAL={
'rose': dict(top='#F4BED1', mid='#FCE3D3',far='#E9ABC0',ground='#F0D2C3',dark='#6F4353',wood='#A96B66',leaf='#9BAF85',flower='#F277A7',accent='#E88F85',paper='#FFF1DC',hill='#C4B9A3',light='#FFEDD3'),
'garden': dict(top='#A9DCC8',mid='#EAF2D9',far='#96C9B5',ground='#C3DDAB',dark='#315F52',wood='#7A8971',leaf='#4F9D75',flower='#FFE3A1',accent='#8BC5AC',paper='#FEF5D8',hill='#82B19C',light='#FFF0C4'),
'heritage': dict(top='#F6BA88',mid='#FFDBA0',far='#D9A47B',ground='#D4B084',dark='#634530',wood='#995D43',leaf='#B87936',flower='#E8BC77',accent='#D98756',paper='#FFE6B3',hill='#AB8561',light='#FFF2BC'),
'midnight': dict(top='#17294E',mid='#5D5689',far='#384C7B',ground='#333C62',dark='#F2E6E0',wood='#6A587B',leaf='#566D88',flower='#AB8DCD',accent='#CEB2F2',paper='#F1E7FA',hill='#2B3458',light='#FFD596')}
def stars(p):
 r=random.Random(777)
 return ''.join(f'<circle cx="{r.randrange(28,875)}" cy="{r.randrange(24,230)}" r="{r.choice([1,1.4,2])}" fill="{p["light"]}" opacity="{r.choice([.35,.55,.75])}"/>' for _ in range(50))
def blossom(x,y,r,p):
 return f'''<g transform="translate({x},{y})"><circle r="{r*1.3:.2f}" fill="{p['flower']}" opacity=".12"/>{''.join(f'<ellipse cx="0" cy="{-r*.65}" rx="{r*.42}" ry="{r*.72}" fill="{p['flower']}" transform="rotate({q})" opacity=".88"/>' for q in (0,72,144,216,288))}<circle r="{r*.32}" fill="{p['light']}"/></g>'''
def florals(p,seed):
 r=random.Random(seed); e=''
 for i in range(42):
  x=r.choice([r.randrange(0,195),r.randrange(700,900)])
  y=r.randrange(180,510)
  k=r.randrange(4,12)
  e+=f'<path d="M{x} {y+50} Q{x+r.randrange(-25,25)} {y+24} {x} {y}" stroke="{p["leaf"]}" stroke-width="2" fill="none"/>'
  e+=blossom(x,y,k,p)
 return e
def base(p,theme):
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
 <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{p['top']}"/><stop offset="1" stop-color="{p['mid']}"/></linearGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{p['ground']}"/><stop offset="1" stop-color="{p['mid']}"/></linearGradient><radialGradient id="sun"><stop stop-color="{p['light']}" stop-opacity=".9"/><stop offset="1" stop-color="{p['light']}" stop-opacity="0"/></radialGradient><filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter></defs>
 <rect width="900" height="583" fill="url(#sky)"/><circle cx="730" cy="115" r="165" fill="url(#sun)"/>
 <path d="M0 330 Q125 226 242 300 T450 294 T670 285 T900 310 V583 H0" fill="{p['far']}" opacity=".40"/>
 <path d="M0 388 Q175 319 360 377 T700 353 T900 380 V583 H0" fill="{p['hill']}" opacity=".56"/>
 <path d="M0 432 Q160 380 330 428 T655 404 T900 430 V583 H0" fill="url(#floor)"/>
 {stars(p) if theme=='midnight' else ''}
'''
def family(p):
 s=f'''<ellipse cx="455" cy="478" rx="310" ry="48" fill="{p['dark']}" opacity=".10" filter="url(#shadow)"/>
 <path d="M402 470 Q420 367 397 259 Q374 176 272 137 L286 116 Q400 158 448 230 Q480 170 555 100 L576 121 Q508 191 474 259 Q501 185 638 177 L632 201 Q520 217 488 294 Q472 378 492 470 Z" fill="{p['wood']}" stroke="{p['dark']}" stroke-opacity=".25" stroke-width="8"/>
 <g fill="{p['leaf']}" opacity=".90">{''.join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x,y,r in ((282,157,89),(365,127,90),(484,142,96),(582,148,84),(420,83,79),(631,228,67),(211,217,63)))}</g>
 <g fill="{p['flower']}" opacity=".65">{''.join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x,y,r in ((280,116,14),(385,83,15),(508,114,13),(601,151,12),(221,195,11),(640,223,9)))}</g>
 <path d="M245 477 H645" stroke="{p['dark']}" stroke-width="13" stroke-linecap="round" opacity=".2"/>
'''
 for x,y,r in ((302,234,46),(460,165,49),(568,259,43),(408,327,43)):
  s+=f'''<g><path d="M{x} {y-65} v-33" stroke="{p['paper']}" stroke-width="3"/><circle cx="{x}" cy="{y-65}" r="5" fill="{p['light']}"/><circle cx="{x}" cy="{y}" r="{r+6}" fill="{p['dark']}" opacity=".18"/><circle cx="{x}" cy="{y}" r="{r+1}" fill="{p['paper']}"/><circle cx="{x}" cy="{y}" r="{r-6}" fill="{p['accent']}" opacity=".6"/><circle cx="{x}" cy="{y-13}" r="{r*.32}" fill="{p['paper']}"/><path d="M{x-r*.52} {y+r*.6} Q{x-r*.52} {y+r*.10} {x} {y+r*.15} Q{x+r*.52} {y+r*.10} {x+r*.52} {y+r*.60}" fill="{p['paper']}"/></g>'''
 return s

def moments(p):
 s=f'''<path d="M95 341 L792 289 L827 503 L64 534 Z" fill="{p['wood']}" opacity=".83"/><path d="M95 343 L790 290" stroke="{p['light']}" stroke-width="7" opacity=".6"/>
 <g transform="rotate(-8 417 378)"><rect x="210" y="213" width="438" height="292" rx="22" fill="{p['dark']}" opacity=".15" filter="url(#shadow)"/><rect x="200" y="206" width="438" height="292" rx="18" fill="{p['paper']}"/><path d="M419 210 V494" stroke="{p['wood']}" stroke-width="8"/><path d="M420 218 Q375 205 217 225 L217 473 Q351 447 420 478" fill="{p['light']}" opacity=".6"/><path d="M422 218 Q498 208 623 230 L623 469 Q490 451 422 478" fill="{p['mid']}" opacity=".63"/>
 <g transform="rotate(-8 303 333)"><rect x="242" y="248" width="120" height="163" rx="4" fill="#FFF9EE"/><rect x="249" y="257" width="106" height="115" fill="{p['far']}"/><path d="M249 359 Q293 281 354 349 V373 H249" fill="{p['leaf']}"/><circle cx="321" cy="297" r="20" fill="{p['light']}"/></g>
 <g transform="rotate(9 526 331)"><rect x="461" y="246" width="130" height="159" rx="4" fill="#FFF9EE"/><rect x="469" y="255" width="114" height="111" fill="{p['accent']}"/><path d="M469 354 Q505 283 581 331 V366 H469" fill="{p['leaf']}"/></g>
 </g>
 <g transform="translate(663 275) rotate(10)"><rect x="0" y="0" width="135" height="106" rx="14" fill="{p['dark']}"/><rect x="12" y="-15" width="64" height="20" rx="7" fill="{p['dark']}"/><circle cx="75" cy="48" r="39" fill="{p['paper']}"/><circle cx="75" cy="48" r="30" fill="{p['accent']}"/><circle cx="75" cy="48" r="18" fill="{p['dark']}"/><circle cx="22" cy="16" r="7" fill="{p['light']}"/></g>'''
 return s

def learning(p):
 s=f'''<rect x="128" y="77" width="644" height="318" rx="14" fill="{p['wood']}" opacity=".55"/><rect x="149" y="92" width="604" height="273" fill="{p['light']}" opacity=".69"/><rect x="168" y="104" width="565" height="245" fill="url(#sky)"/>
 <path d="M170 294 Q300 210 405 268 T732 251 V352 H170" fill="{p['hill']}"/><path d="M452 102 V351 M168 227 H733" stroke="{p['wood']}" stroke-width="15"/>
 <g>{''.join(f'<rect x="{210+i*46}" y="{171+i%3*1}" width="{18+i%3*6}" height="{165+i%2*10}" rx="3" fill="{[p["accent"],p["leaf"],p["dark"],p["flower"]][i%4]}" opacity=".8"/>' for i in range(5))}</g>
 <path d="M90 400 L826 390 L862 520 L57 528 Z" fill="{p['wood']}"/><path d="M81 397 L821 386" stroke="{p['light']}" stroke-width="9"/>
 <g><path d="M288 357 Q370 325 449 372 Q520 338 605 357 L626 455 Q509 420 449 465 Q370 419 264 455 Z" fill="{p['paper']}" stroke="{p['wood']}" stroke-width="6"/><path d="M449 372 V461" stroke="{p['wood']}" stroke-width="5"/>{''.join(f'<path d="M{292+i*4} {385+i*17} Q360 {360+i*17} 420 {391+i*17} M475 {389+i*17} Q542 {360+i*17} 598 {385+i*17}" stroke="{p["dark"]}" stroke-opacity=".25" fill="none" stroke-width="3"/>' for i in range(3))}</g>
 <g transform="translate(680 335)"><path d="M0 6 Q20 -99 60 -87 Q100 -73 87 -2" fill="none" stroke="{p['dark']}" stroke-width="14"/><path d="M24 -104 L105 -102 L88 -59 L47 -59 Z" fill="{p['accent']}"/><circle cx="70" cy="-79" r="12" fill="{p['light']}"/><rect x="-20" y="5" width="135" height="12" rx="6" fill="{p['dark']}"/></g>
 <g transform="translate(173 338)"><rect x="0" y="0" width="87" height="76" rx="5" fill="{p['flower']}"/><path d="M8 -14 H93 V5 H8" fill="{p['paper']}"/><rect x="15" y="-33" width="91" height="18" rx="3" fill="{p['leaf']}"/></g>'''
 return s

def events(p):
 s=f'''<path d="M130 415 Q150 110 440 137 Q745 104 769 422" fill="none" stroke="{p['wood']}" stroke-width="30" stroke-linecap="round"/><path d="M150 414 Q170 137 445 164 Q704 139 750 413" fill="none" stroke="{p['leaf']}" stroke-width="45" stroke-linecap="round" stroke-dasharray="9 13" opacity=".86"/>
 <path d="M132 210 Q456 375 774 209" fill="none" stroke="{p['dark']}" stroke-width="4"/>
 {''.join(f'<path d="M{x} {257-64*math.sin(i*math.pi/9)} l12 24 l-28 -4 Z" fill="{[p["flower"],p["light"],p["accent"]][i%3]}" opacity=".94"/>' for i,x in enumerate(range(183,728,58)))}
 {''.join(f'<g><circle cx="{x}" cy="{217+75*math.sin(i*math.pi/10)}" r="11" fill="{p["light"]}"/><circle cx="{x}" cy="{217+75*math.sin(i*math.pi/10)}" r="23" fill="{p["light"]}" opacity=".17"/></g>' for i,x in enumerate(range(170,751,58)))}
 <ellipse cx="455" cy="475" rx="230" ry="45" fill="{p['dark']}" opacity=".12" filter="url(#shadow)"/>
 <rect x="276" y="396" width="356" height="21" rx="8" fill="{p['paper']}"/><path d="M292 415 L313 493 H350 L351 415 M580 415 L579 493 H608 L625 415" fill="{p['wood']}"/>
 <path d="M287 409 Q453 477 618 409 V475 Q450 503 287 475 Z" fill="{p['paper']}" opacity=".88"/>
 <path d="M455 393 V342" stroke="{p['wood']}" stroke-width="6"/><g transform="translate(454 336)"><circle r="27" fill="{p['flower']}" opacity=".9"/>{blossom(0,0,10,p)}</g>
 <g>{''.join(f'<ellipse cx="{x}" cy="{y}" rx="13" ry="25" fill="{p["accent"]}" opacity=".75"/>' for x,y in ((253,313),(649,291),(660,360)))}</g>'''
 return s

def settings(p):
 s=f'''<path d="M130 348 Q450 252 762 352 V470 H130 Z" fill="{p['leaf']}" opacity=".5"/><path d="M440 495 Q400 407 454 365 Q520 412 508 495" fill="{p['paper']}" opacity=".72"/>
 <rect x="259" y="101" width="371" height="326" rx="20" fill="{p['wood']}"/><rect x="279" y="121" width="330" height="283" rx="12" fill="{p['paper']}"/><path d="M444 125 V401" stroke="{p['wood']}" stroke-width="8"/><rect x="305" y="148" width="116" height="223" rx="10" fill="{p['mid']}"/><rect x="469" y="148" width="116" height="223" rx="10" fill="{p['mid']}"/>
 <g transform="translate(477 253)"><circle r="12" fill="{p['light']}" stroke="{p['wood']}" stroke-width="3"/></g>
 <path d="M195 439 Q290 395 375 438" stroke="{p['wood']}" stroke-width="17" fill="none"/><rect x="172" y="426" width="220" height="20" rx="8" fill="{p['dark']}" opacity=".65"/><path d="M200 444 L193 497 M373 444 L380 497" stroke="{p['wood']}" stroke-width="10"/>
 <g transform="translate(672 350)"><path d="M0 90 Q-10 25 36 12 Q80 -1 75 90" fill="{p['wood']}"/><circle cx="37" cy="-18" r="43" fill="{p['leaf']}"/><circle cx="2" cy="5" r="33" fill="{p['leaf']}"/><circle cx="77" cy="11" r="33" fill="{p['leaf']}"/></g>
 <g transform="translate(194 320)"><rect x="-15" y="0" width="34" height="67" rx="10" fill="{p['wood']}"/><circle cx="0" cy="-14" r="30" fill="{p['leaf']}"/>{blossom(0,-23,9,p)}</g>
 <g transform="translate(730 165)"><path d="M0 0 V85" stroke="{p['wood']}" stroke-width="5"/><path d="M-18 65 H18 L26 93 H-26 Z" fill="{p['dark']}"/><circle cy="79" r="16" fill="{p['light']}"/></g>'''
 return s
fn={'family':family,'moments':moments,'learning':learning,'events':events,'settings':settings}
for scene,drawer in fn.items():
 for theme,p in PAL.items():
  svg=base(p,theme)+drawer(p)+florals(p,scene+theme)+'</svg>'
  png=cairosvg.svg2png(bytestring=svg.encode(),output_width=W,output_height=H)
  im=Image.open(io.BytesIO(png)).convert('RGBA')
  # Fade to zero at lower 30%; preserve color of original art, natural blend to current page background.
  px=im.load()
  for y in range(405,H):
   a=max(0,min(255,int(255*(1-(y-405)/(H-405))**1.05)))
   for x in range(W):
    r,g,b,aa=px[x,y]; px[x,y]=(r,g,b,aa*a//255)
  im.save(out/f'{scene}_{theme}.png',optimize=True)
  thumb=im.resize((200,130),Image.Resampling.LANCZOS)
  thumb.save(out/'thumbs'/f'{scene}_{theme}.png',optimize=True)
print('Created independent hero scenes, 20 assets + thumbs')
