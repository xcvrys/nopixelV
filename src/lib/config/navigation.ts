export type NavigationItem = {
  label: string;
  href: string;
  available: boolean;
  badge?: "PREVIEW";
};

export type NavigationSection = {
  label: string;
  showVolumeControl: boolean;
  items: NavigationItem[];
};

export const navigationSections: NavigationSection[] = [
  {
    label: "MINIGAMES",
    showVolumeControl: true,
    items: [
      { label: "LOCKPICK", href: "/minigames/lockpick", available: true },
      { label: "TRACEROUTE", href: "/minigames/traceroute", available: true },
      {
        label: "STORE SAFE",
        href: "/minigames/store-safe",
        available: false,
      },
    ],
  },
  {
    label: "RESOURCES",
    showVolumeControl: false,
    items: [
      {
        label: "MACHINERY",
        href: "/calculation/machinery",
        available: true,
        badge: "PREVIEW",
      },
    ],
  },
];
