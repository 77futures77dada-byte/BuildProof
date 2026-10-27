export type HousePart = 'foundation' | 'frame' | 'roof' | 'windows' | 'door' | 'electric' | 'plumbing' | 'finish' | 'handover'
export type Point3 = readonly [number, number, number]
/** `element` groups the segments of one countable item (a window, a cable run, a pipe section). */
export interface HouseLine { part: HousePart; element: number; points: Point3[] }

export const HOUSE = { width: 10, depth: 7, wallHeight: 6, floorHeight: 3, foundationWidth: 10.6, foundationDepth: 7.6, foundationHeight: .4, roofRise: 2.8, overhang: .5, centerY: 4.2 } as const
const xWall = HOUSE.width / 2, zWall = HOUSE.depth / 2, xRoof = xWall + HOUSE.overhang, zRoof = zWall + HOUSE.overhang
const lines: HouseLine[] = []
const elementCounter = new Map<HousePart, number>()
let element = 0
/** Starts the next countable element of `part`; following lines belong to it. */
const nextElement = (part: HousePart) => { element = elementCounter.get(part) ?? 0; elementCounter.set(part, element + 1) }
const line = (part: HousePart, ...points: Point3[]) => lines.push({ part, element, points })
const rect = (part: HousePart, a: Point3, b: Point3, c: Point3, d: Point3) => { line(part,a,b); line(part,b,c); line(part,c,d); line(part,d,a) }

// Foundation, its full 10.6 × 0.4 × 7.6 envelope, top at y=0.
const fx=HOUSE.foundationWidth/2, fz=HOUSE.foundationDepth/2
nextElement('foundation')
for (const y of [-.4,0]) rect('foundation',[-fx,y,-fz],[fx,y,-fz],[fx,y,fz],[-fx,y,fz])
for (const x of [-fx,fx]) for (const z of [-fz,fz]) line('foundation',[x,-.4,z],[x,0,z])

// Exterior wall envelope and timber frame: posts every 2.5 m on long walls,
// floor beams and continuous perimeter plates at y=0, 3, and 6.
nextElement('frame')
for (const z of [-zWall,zWall]) for (const x of [-xWall,-xWall/2,0,xWall/2,xWall]) line('frame',[x,0,z],[x,6,z])
for (const x of [-xWall,xWall]) for (const z of [-zWall/2,0,zWall/2]) line('frame',[x,0,z],[x,6,z])
for (const y of [0,3,6]) {
  for (const z of [-zWall,zWall]) line('frame',[-xWall,y,z],[xWall,y,z])
  for (const x of [-xWall,xWall]) line('frame',[x,y,-zWall],[x,y,zWall])
}

// Gable roof: ridge 2.8 m above the wall, supported at y=6, with a 0.5 m
// horizontal eave and 0.5 m end overhang. Rafters run along both roof planes.
nextElement('roof')
for (const x of [-xRoof,xRoof]) {
  line('roof',[x,8.8,0],[x,6,-zWall]); line('roof',[x,8.8,0],[x,6,zWall])
  line('roof',[x,6,-zWall],[x,6,zWall])
}
line('roof',[-xRoof,8.8,0],[xRoof,8.8,0])
for (const z of [-zWall,zWall]) {
  line('roof',[-xRoof,6,z],[xRoof,6,z])
  line('roof',[-xRoof,6,z * (1 + HOUSE.overhang / zWall)],[xRoof,6,z * (1 + HOUSE.overhang / zWall)])
}
for (const x of [-xWall,-xWall/2,0,xWall/2,xWall]) {
  line('roof',[x,8.8,0],[x,6,-zWall]); line('roof',[x,8.8,0],[x,6,zWall])
}

// Dimension-derived window centers leave room for the centered front door.
// Each window is one element.
const longCenters = [-3.6,-1.8,3.6]
const upperCenters = [-3.6,0,3.6]
for (const z of [-zWall,zWall]) for (const floor of [0,1]) {
  const sill=floor*3+.9
  const centers = z===zWall && floor===0 ? longCenters : upperCenters
  for (const x of centers) { nextElement('windows'); rect('windows',[x-.6,sill,z],[x+.6,sill,z],[x+.6,sill+1.4,z],[x-.6,sill+1.4,z]) }
}
for (const x of [-xWall,xWall]) for (const floor of [0,1]) {
  const sill=floor*3+.9
  nextElement('windows'); rect('windows',[x,sill,-.6],[x,sill,.6],[x,sill+1.4,.6],[x,sill+1.4,-.6])
}
nextElement('door')
rect('door',[-.5,0,zWall],[.5,0,zWall],[.5,2.1,zWall],[-.5,2.1,zWall])

// Electrical routes on the interior face of each wall. One element = one cable
// run at one height on one wall, together with the socket marks on it.
for (const y of [.4,1.2,3.4,4.2]) {
  for (const z of [-3.48,3.48]) {
    nextElement('electric'); line('electric',[-4.8,y,z],[4.8,y,z])
    for (const x of [-4,-2,0,2,4]) { line('electric',[x-.04,y,z],[x+.04,y,z]); line('electric',[x,y-.04,z],[x,y+.04,z]) }
  }
  for (const x of [-4.98,4.98]) { nextElement('electric'); line('electric',[x,y,-3.2],[x,y,3.2]) }
}

// Stacked bathroom/kitchen plumbing: two risers (one element each), then a
// floor branch with its outlet mark per level and side.
for (const x of [-2,2]) { nextElement('plumbing'); line('plumbing',[x,.2,-3.2],[x,5.8,-3.2]) }
for (const y of [.6,1.4,3.6,4.4]) {
  for (const [from, to, outlet] of [[-2,-4.5,-4],[2,4.5,3.5]]) {
    nextElement('plumbing')
    line('plumbing',[from,y,-3.2],[to,y,-3.2])
    line('plumbing',[outlet-.1,y,-3.2],[outlet+.1,y,-3.2])
    line('plumbing',[outlet,y-.1,-3.2],[outlet,y+.1,-3.2])
  }
}

// Interior finish panel seams, placed on the room side of the exterior walls.
nextElement('finish')
for (const z of [-3.46,3.46]) for (const x of [-5,-2.5,0,2.5,5]) line('finish',[x,0,z],[x,6,z])
for (const x of [-4.96,4.96]) for (const z of [-3.5,-1.75,0,1.75,3.5]) line('finish',[x,0,z],[x,6,z])

// The contour geometry is shown only after all seven real stages complete.
nextElement('handover')
for (const z of [-zRoof,zRoof]) line('handover',[-xRoof,6,z],[xRoof,6,z])
for (const x of [-xWall,xWall]) { line('handover',[x,0,-zWall],[x,6,-zWall]); line('handover',[x,0,zWall],[x,6,zWall]) }
for (const x of [-xRoof,xRoof]) { line('handover',[x,6,-zWall],[x,8.8,0]); line('handover',[x,8.8,0],[x,6,zWall]) }
line('handover',[-xRoof,8.8,0],[xRoof,8.8,0])

export const HOUSE_LINES: readonly HouseLine[] = lines
export const HOUSE_BOUNDS = { min: [-5.5,-.4,-4] as Point3, max: [5.5,8.8,4] as Point3 }
