/**
 * AB 2801 Room Labels & Utilities
 *
 * Default room list and helpers for generating inspection room sets
 * based on property characteristics (beds/baths).
 */

export interface RoomConfig {
  name: string;
  /** Recommended minimum photos: 1 wide + 1 close-up per notable surface */
  recommendedPhotos: number;
}

export const ALL_ROOMS: RoomConfig[] = [
  { name: 'Entry/Hallway', recommendedPhotos: 2 },
  { name: 'Living Room', recommendedPhotos: 4 },
  { name: 'Kitchen', recommendedPhotos: 6 },
  { name: 'Master Bedroom', recommendedPhotos: 4 },
  { name: 'Bedroom 2', recommendedPhotos: 4 },
  { name: 'Bedroom 3', recommendedPhotos: 4 },
  { name: 'Bathroom 1', recommendedPhotos: 4 },
  { name: 'Bathroom 2', recommendedPhotos: 4 },
  { name: 'Laundry', recommendedPhotos: 2 },
  { name: 'Garage', recommendedPhotos: 2 },
  { name: 'Exterior/Yard', recommendedPhotos: 4 },
];

/**
 * Return the room list filtered to match a property's bed/bath count.
 * If beds/baths are unknown, returns the full default list.
 */
export function getRoomsForProperty(beds?: number, baths?: number): RoomConfig[] {
  const rooms: RoomConfig[] = [
    { name: 'Entry/Hallway', recommendedPhotos: 2 },
    { name: 'Living Room', recommendedPhotos: 4 },
    { name: 'Kitchen', recommendedPhotos: 6 },
  ];

  const bedroomCount = beds ?? 3;
  rooms.push({ name: 'Master Bedroom', recommendedPhotos: 4 });
  if (bedroomCount >= 2) rooms.push({ name: 'Bedroom 2', recommendedPhotos: 4 });
  if (bedroomCount >= 3) rooms.push({ name: 'Bedroom 3', recommendedPhotos: 4 });

  const bathroomCount = baths ?? 2;
  rooms.push({ name: 'Bathroom 1', recommendedPhotos: 4 });
  if (bathroomCount >= 2) rooms.push({ name: 'Bathroom 2', recommendedPhotos: 4 });

  rooms.push(
    { name: 'Laundry', recommendedPhotos: 2 },
    { name: 'Garage', recommendedPhotos: 2 },
    { name: 'Exterior/Yard', recommendedPhotos: 4 },
  );

  return rooms;
}

/** Total recommended photo count across all rooms */
export function totalRecommendedPhotos(rooms: RoomConfig[]): number {
  return rooms.reduce((sum, r) => sum + r.recommendedPhotos, 0);
}

/**
 * Photo guidance text shown to the user during capture.
 * Per AB 2801 best practices: wide shot for context + close-up for detail.
 */
export const PHOTO_GUIDANCE = {
  wide: 'Take a wide-angle photo showing the full room or area for context.',
  closeUp: 'Take close-up photos of any damage, stains, wear, or notable conditions.',
  tip: 'Use the same camera angles at move-in and move-out for direct comparison.',
} as const;
