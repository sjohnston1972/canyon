// Dark tactical map style — preserves natural terrain/water colors
export const tacticalMapStyles: google.maps.MapTypeStyle[] = [
  // Darken the base geometry
  {
    elementType: 'geometry',
    stylers: [{ saturation: -40 }, { lightness: -30 }],
  },
  // Subdue labels
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1a1a1a' }, { weight: 3 }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a7a' }],
  },
  // Keep landscape natural but darken
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ saturation: -20 }, { lightness: -25 }],
  },
  // Terrain shading — keep it visible
  {
    featureType: 'landscape.natural.terrain',
    elementType: 'geometry',
    stylers: [{ saturation: -10 }, { lightness: -20 }],
  },
  // Water — keep the blue/teal visible
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1a4a5a' }, { saturation: 10 }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a8a9a' }],
  },
  // Parks/protected land — subtle green tint
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ saturation: -30 }, { lightness: -30 }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6a8a5a' }],
  },
  // Other POIs — very muted
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  // Roads — very subtle
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ saturation: -80 }, { lightness: -40 }],
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6a6a5a' }],
  },
  // Highways slightly more visible
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ saturation: -60 }, { lightness: -30 }],
  },
  // Admin boundaries — subtle
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ saturation: -80 }, { lightness: -40 }],
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7a7a6a' }],
  },
  // Transit — hide
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
]
