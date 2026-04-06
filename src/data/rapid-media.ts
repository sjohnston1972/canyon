export interface RapidMedia {
  type: 'photo' | 'video'
  url: string
  thumb: string
  title: string
  source: string
}

export const rapidMedia: Record<string, RapidMedia[]> = {
  badger: [
    { type: 'photo', url: '/media/rapids/badger-historic.jpg', thumb: '/media/rapids/badger-historic.jpg', title: 'Badger Creek Rapid — Historic NPS river photo', source: 'Wikimedia Commons / NPS' },
  ],
  'soap-creek-rapid': [
    { type: 'photo', url: '/media/rapids/soap-creek-historic.jpg', thumb: '/media/rapids/soap-creek-historic.jpg', title: 'Soap Creek Rapid — Historic NPS river photo', source: 'Wikimedia Commons / NPS' },
    { type: 'photo', url: '/media/rapids/soap-creek-run.jpg', thumb: '/media/rapids/soap-creek-run.jpg', title: 'Soap Creek Rapid — Running the rapid', source: 'Wikimedia Commons / NPS' },
  ],
  'house-rock': [
    { type: 'video', url: 'https://www.youtube.com/watch?v=PdCaCKWuKdw', thumb: '/media/rapids/vid-house-rock.jpg', title: 'Houserock Rapid', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=1oAxGN4fkJM', thumb: '/media/rapids/vid-house-rock.jpg', title: 'Mile 17 — House Rock Rapid, Grand Canyon', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=FsHNgKZpirk', thumb: '/media/rapids/vid-house-rock-2024.jpg', title: 'House Rock Rapid — January 2024', source: 'YouTube' },
  ],
  'hance-rapid': [
    { type: 'photo', url: '/media/rapids/hance-panorama.jpg', thumb: '/media/rapids/hance-panorama.jpg', title: 'Hance Rapid Panorama', source: 'Wikimedia Commons / NPS' },
    { type: 'photo', url: '/media/rapids/hance-dory.jpg', thumb: '/media/rapids/hance-dory.jpg', title: 'Dory in Hance Rapid', source: 'Wikimedia Commons / NPS' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=q7L7zvpgxRM', thumb: '/media/rapids/vid-hance-2024.jpg', title: 'Hance Rapid — January 2024', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=XEOqSYaOHtw', thumb: '/media/rapids/vid-hance-flip.jpg', title: 'Flip in Hance Rapid @ 9000cfs', source: 'YouTube' },
  ],
  sockdolager: [
    { type: 'photo', url: '/media/rapids/sockdolager-overview.png', thumb: '/media/rapids/sockdolager-overview.png', title: 'Sockdolager Rapid overview', source: 'Wikimedia Commons' },
    { type: 'photo', url: '/media/rapids/sockdolager-left.jpg', thumb: '/media/rapids/sockdolager-left.jpg', title: 'Sockdolager Rapids — Left bank view', source: 'Wikimedia Commons / USGS' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=Zb9797C_BXw', thumb: '/media/rapids/vid-sockdolager-2026.jpg', title: 'Sockdolager Rapid — February 2026', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=n31IF-oveSI', thumb: '/media/rapids/vid-sockdolager-2023.jpg', title: 'Sockdolager Rapid — July 2023', source: 'YouTube' },
  ],
  'grapevine-rapid': [
    { type: 'photo', url: '/media/rapids/grapevine-left.jpg', thumb: '/media/rapids/grapevine-left.jpg', title: 'Grapevine Rapid — Left bank view', source: 'Wikimedia Commons / USGS' },
  ],
  'horn-creek': [
    { type: 'video', url: 'https://www.youtube.com/watch?v=JQ0KptoTbSA', thumb: '/media/rapids/vid-horn-flip.jpg', title: 'Flip at Horn Creek Rapid — January 2025', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=tdOyn6bwYH0', thumb: '/media/rapids/vid-horn-split.jpg', title: 'Splitting the Horns at Horn Creek — 2023', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=jlQOLCpZcRE', thumb: '/media/rapids/vid-horn-2026.jpg', title: 'Horn Creek Rapid — February 2026', source: 'YouTube' },
  ],
  'granite-rapid': [
    { type: 'photo', url: '/media/rapids/granite-aerial.png', thumb: '/media/rapids/granite-aerial.png', title: 'Granite Rapid — Mile 93.5 aerial', source: 'Wikimedia Commons' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=YjxvHrywwn8', thumb: '/media/rapids/vid-granite-2026.jpg', title: 'Granite Rapid — February 2026', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=PGuERgW3xhM', thumb: '/media/rapids/vid-granite-2024.jpg', title: 'Granite Rapid — February 2024', source: 'YouTube' },
  ],
  'hermit-rapid': [
    { type: 'photo', url: '/media/rapids/hermit-nps.jpg', thumb: '/media/rapids/hermit-nps.jpg', title: 'Hermit Rapid — NPS photo', source: 'Wikimedia Commons / NPS' },
    { type: 'photo', url: '/media/rapids/hermit-raft.jpg', thumb: '/media/rapids/hermit-raft.jpg', title: 'Private raft in Hermit Rapid', source: 'Wikimedia Commons' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=jxeaTy4F3IM', thumb: '/media/rapids/vid-hermit-flip.jpg', title: 'Flipping in Hermit Rapid', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=F9HfHI-aQzA', thumb: '/media/rapids/vid-hermit-2024.jpg', title: 'Hermit Rapid — February 2024', source: 'YouTube' },
  ],
  crystal: [
    { type: 'photo', url: '/media/rapids/crystal-nps.jpg', thumb: '/media/rapids/crystal-nps.jpg', title: 'Crystal Rapid — NPS overview', source: 'Wikimedia Commons / NPS' },
    { type: 'photo', url: '/media/rapids/crystal-stuck.jpg', thumb: '/media/rapids/crystal-stuck.jpg', title: 'Raft stuck in Crystal Rapid', source: 'Wikimedia Commons' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=fXtdqzQYBO4', thumb: '/media/rapids/vid-crystal-2024.jpg', title: 'Crystal Rapid — February 2024', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=egbW5YQC2BI', thumb: '/media/rapids/vid-crystal-highflow.jpg', title: 'HIGH FLOW — 40k cfs at Crystal Rapid', source: 'YouTube' },
  ],
  'upset-rapid': [
    { type: 'photo', url: '/media/rapids/upset-middle.jpg', thumb: '/media/rapids/upset-middle.jpg', title: 'Upset Rapid — Middle section from right', source: 'Wikimedia Commons / USGS' },
    { type: 'photo', url: '/media/rapids/upset-upper.jpg', thumb: '/media/rapids/upset-upper.jpg', title: 'Upset Rapid — Upper section from right', source: 'Wikimedia Commons / USGS' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=0lHSxvLlMTI', thumb: '/media/rapids/vid-upset-2024.jpg', title: 'Upset Rapid — February 2024', source: 'YouTube' },
  ],
  'lava-falls': [
    { type: 'photo', url: '/media/rapids/lava-volcanic.jpg', thumb: '/media/rapids/lava-volcanic.jpg', title: 'Lava Falls — Uinkaret Volcanic Field meets the canyon', source: 'Wikimedia Commons' },
    { type: 'photo', url: '/media/rapids/lava-vulcans-throne.jpg', thumb: '/media/rapids/lava-vulcans-throne.jpg', title: "Vulcan's Throne and Lava Falls", source: 'Wikimedia Commons' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=4G0NxCp7hQk', thumb: '/media/rapids/vid-lava-carnage.jpg', title: 'Lava Falls Carnage Compilation', source: 'YouTube' },
    { type: 'video', url: 'https://www.youtube.com/watch?v=KhnYU7RqRAE', thumb: '/media/rapids/vid-lava-2024.jpg', title: 'Lava Falls Rapid — February 2024', source: 'YouTube' },
  ],
}
